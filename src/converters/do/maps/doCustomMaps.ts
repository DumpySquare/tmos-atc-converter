/**
 * Copyright 2024 F5, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck - Map files use dynamic property access patterns

// DO classes must be listed here for the converter to attempt a conversion
// if namedClass is true, then multiple instances can exist (with their own names)
// the 'properties' option will add to the configItems.json file (avoids upstream changes)
// keyValueRemaps allows both the key and value of a property to be manipulated

import portDict from '../../../data/portDict.json';
import unquote from '../../../utils/unquote';
import recursiveCamelize from '../../../utils/recursiveCamelize';

const doCustomMaps: Record<string, any> = {
    Analytics: {},

    Authentication: {
        properties: [
            { id: 'type', newId: 'enabledSourceType' }
        ],
        namedClass: true
    },

    ConfigSync: {
        namedClass: true
    },

    DagGlobals: {},

    DbVariables: {},

    // DeviceCertificate: custom handling, not in configItems
    DeviceCertificate: {},

    DeviceGroup: {
        properties: [
            { id: 'devices', newId: 'members' }
        ],
        namedClass: true,
        keyValueRemaps: {
            autoSync: (val: any) => ({ autoSync: val === 'enabled' }),
            members: (val: any) => ({ members: Object.keys(val).map((x: string) => x.replace('/Common/', '')) })
        },
        customHandling: (rootObj: any, className: string, name: string, currentDevice: string) => {
            const ind = rootObj.members.indexOf(currentDevice);
            rootObj.owner = (ind !== -1) ? `/Common/${name}/members/${ind}` : `/Common/${name}/members/0`;

            return { [className]: rootObj };
        }
    },

    DeviceTrust: {
        namedClass: true
    },

    DNS: {},

    DNS_Resolver: {
        namedClass: true,
        keyValueRemaps: {
            forwardZones: (val: any) => ({
                forwardZones: Object.keys(val).map((v: string) => ({
                    name: v,
                    nameservers: Object.keys(val[v].nameservers).map((x: string) => x.replace('domain', '53'))
                }))
            }),

            routeDomain: (val: string) => ({ routeDomain: val.replace('/Common/', '') })
        }
    },

    FailoverMulticast: {
        namedClass: true
    },

    FailoverUnicast: {
        namedClass: true,
        customHandling: (rootObj: any, className: string) => {
            if (rootObj.addressPorts) {
                rootObj.addressPorts = Object.keys(rootObj.addressPorts).map((key: string) => {
                    const tmpObj = rootObj.addressPorts[key];
                    return { address: tmpObj['effective-ip'], port: parseInt(tmpObj['effective-port'], 10) };
                });
            }

            return { [className]: rootObj };
        }
    },

    FirewallAddressList: {
        namedClass: true,
        keyValueRemaps: {
            addresses: (val: any) => ({ addresses: Object.keys(val) })
        }
    },

    FirewallPolicy: {
        namedClass: true,

        properties: [
            { id: 'rules' }
        ],

        customHandling: (rootObj: any, className: string) => {
            const cRoot = recursiveCamelize(rootObj);

            cRoot.rules = Object.keys(cRoot.rules).map((r: string) => {
                const rule = cRoot.rules[r];

                const newObj: Record<string, any> = {
                    destination: {},
                    source: {}
                };

                Object.keys(newObj).forEach((i: string) => {
                    ['addressLists', 'portLists', 'vlans'].forEach((p: string) => {
                        if (rule[i][p]) {
                            newObj[i][p] = Object.keys(rule[i][p]).map((ref: string) => `/Common/${ref}`);
                        }
                    });
                });

                return {
                    action: rule.action,
                    destination: newObj.destination,
                    loggingEnabled: rule.log === 'yes',
                    name: r,
                    protocol: rule.ipProtocol,
                    remark: unquote(rule.description),
                    source: newObj.source
                };
            });

            return { [className]: cRoot };
        }
    },

    FirewallPortList: {
        namedClass: true,
        keyValueRemaps: {
            ports: (val: any) => ({ ports: Object.keys(val) })
        }
    },

    GSLBDataCenter: {
        namedClass: true
    },

    GSLBGlobals: {
        customHandling: (rootObj: any, className: string) => {
            const general: Record<string, any> = {};
            Object.keys(rootObj)
                .filter((k: string) => k !== 'class')
                .forEach((k: string) => {
                    general[k] = rootObj[k];
                    delete rootObj[k];
                });
            rootObj.general = general;

            return { [className]: rootObj };
        }
    },

    GSLBProberPool: {
        namedClass: true,
        properties: [
            { id: 'members' }
        ],
        keyValueRemaps: {
            members: (val: any) => {
                const members = Object.keys(val).map((key: string) => {
                    const tempObj: Record<string, any> = {};
                    if (val[key].description) tempObj.remark = unquote(val[key].description);
                    tempObj.server = key;
                    return tempObj;
                });

                return { members };
            }
        }
    },

    GSLBMonitor: {
        namedClass: true,
        properties: [
            { id: 'defaultsFrom' }
        ],
        keyValueRemaps: {
            defaultsFrom: (val: string) => ({ monitorType: val.split('/').pop()?.replace('_', '-') })
        }
    },

    GSLBServer: {
        namedClass: true,
        properties: [
            { id: 'devices' }
        ],
        keyValueRemaps: {
            devices: (val: any) => {
                const devices = Object.keys(val).map((key: string) => {
                    const tempObj: Record<string, any> = {};
                    tempObj.address = Object.keys(val[key].addresses)[0];
                    if (val[key].description) tempObj.remark = unquote(val[key].description);
                    tempObj.addressTranslation = val[key].addresses[tempObj.address].translation;
                    return tempObj;
                });

                return { devices };
            },

            monitors: (val: string) => ({ monitors: val.split('and').map((item: string) => item.trim()) })
        }
    },

    HTTPD: {
        keyValueRemaps: {
            sslCiphersuite: (val: string) => ({ sslCiphersuite: val.split(':') })
        }
    },

    License: {},

    ManagementIp: {
        namedClass: true,
        customHandling: (rootObj: any, className: string, objName: string) => {
            rootObj.address = objName;
            return { [className]: rootObj };
        }
    },

    ManagementIpFirewall: {
        properties: [
            { id: 'rules' }
        ],

        customHandling: (rootObj: any, className: string) => {
            const cRoot = recursiveCamelize(rootObj);

            cRoot.rules = Object.keys(cRoot.rules).map((r: string) => {
                const rule = cRoot.rules[r];

                const newObj: Record<string, any> = {
                    destination: {},
                    source: {}
                };

                Object.keys(newObj).forEach((i: string) => {
                    ['addressLists', 'portLists'].forEach((p: string) => {
                        if (rule[i][p]) {
                            newObj[i][p] = Object.keys(rule[i][p]).map((ref: string) => `/Common/${ref}`);
                        }
                    });
                });

                return {
                    action: rule.action,
                    destination: newObj.destination,
                    loggingEnabled: rule.log === 'yes',
                    name: r,
                    protocol: rule.ipProtocol,
                    remark: unquote(rule.description),
                    source: newObj.source
                };
            });

            return { [className]: cRoot };
        }
    },

    ManagementRoute: {
        namedClass: true
    },

    MirrorIp: {
        namedClass: true
    },

    NTP: {},

    Provision: {},

    RemoteAuthRole: {
        properties: [{ id: 'roleInfo' }],

        reduceTmshPath: true,

        customHandling: (rootObj: any, className: string) => {
            // returns multiple DO stanzas from one tmsh object
            const cRoot = recursiveCamelize(rootObj);

            const roles = Object.keys(cRoot.roleInfo).map((r: string) => {
                if (cRoot.roleInfo[r].lineOrder) {
                    cRoot.roleInfo[r].lineOrder = parseInt(cRoot.roleInfo[r].lineOrder, 10);
                }
                cRoot.roleInfo[r].remoteAccess = !cRoot.roleInfo[r].deny;
                delete cRoot.roleInfo[r].deny;
                cRoot.roleInfo[r].class = className;
                return { [r]: cRoot.roleInfo[r] };
            });
            return Object.assign({}, ...roles);
        }
    },

    Route: {
        namedClass: true
    },

    RouteDomain: {
        namedClass: true,

        keyValueRemaps: {
            vlans: (val: any) => ({ vlans: Object.keys(val) }),
            routingProtocols: (val: any) => ({ routingProtocols: Object.keys(val) })
        },

        customHandling: (rootObj: any, className: string) => {
            // Don't convert default rd0
            if (rootObj.id === 0) return {};
            return { [className]: rootObj };
        }
    },

    RouteMap: {
        namedClass: true,

        properties: [
            { id: 'entries' }
        ],

        keyValueRemaps: {
            entries(val: any) {
                const cVal = recursiveCamelize(val);
                return {
                    entries: Object.keys(cVal).map((key: string) => {
                        cVal[key].name = key;
                        return cVal[key];
                    })
                };
            }
        }
    },

    RoutingBGP: {
        namedClass: true,

        properties: [
            { id: 'neighbor' },
            { id: 'peerGroup' }
        ],

        keyValueRemaps: {
            addressFamilies(val: any) {
                const cVal = recursiveCamelize(val);

                const addressFamilies = Object.keys(cVal)
                    .filter((key: string) => Object.keys(cVal[key]).length > 0)
                    .map((key: string) => {
                        cVal[key].internetProtocol = key;

                        if (cVal[key].redistribute) {
                            cVal[key].redistributionList = Object.keys(cVal[key].redistribute).map((item: string) => ({
                                routeMap: cVal[key].redistribute[item].routeMap,
                                routingProtocol: item
                            }));
                            delete cVal[key].redistribute;
                        }

                        return cVal[key];
                    });

                return { addressFamilies };
            },

            gracefulRestart(val: any) {
                const cVal = recursiveCamelize(val);
                if (cVal.gracefulReset) {
                    cVal.gracefulResetEnabled = cVal.gracefulReset === 'enabled';
                    delete cVal.gracefulReset;

                    if (cVal.restartTime) cVal.restartTime = parseInt(cVal.restartTime, 10);
                    if (cVal.stalepathTime) {
                        cVal.stalePathTime = parseInt(cVal.stalepathTime, 10);
                        delete cVal.stalepathTime;
                    }
                }
                return { gracefulRestart: cVal };
            },

            neighbor(val: any) {
                const cVal = recursiveCamelize(val);
                const neighbors = Object.keys(cVal).map((key: string) => ({
                    address: key,
                    ebgpMultihop: parseInt(cVal[key].ebgpMultihop, 10),
                    peerGroup: cVal[key].peerGroup
                }));

                return { neighbors };
            },

            peerGroup(val: any) {
                const cVal = recursiveCamelize(val);

                const peerGroups = Object.keys(cVal).map((key: string) => {
                    const addressFamilies = Object.keys(cVal[key].addressFamily)
                        .filter((item: string) => Object.keys(cVal[key].addressFamily[item]).length > 1)
                        .map((item: string) => ({
                            internetProtocol: item,
                            routeMap: cVal[key].addressFamily[item].routeMap,
                            softReconfigurationInboundEnabled: cVal[key].addressFamily[item].softReconfigurationInbound === 'enabled'
                        }));

                    return {
                        addressFamilies,
                        name: key,
                        remoteAS: parseInt(cVal[key].remoteAs, 10)
                    };
                });

                return { peerGroups };
            }
        }
    },

    RoutingAccessList: {
        namedClass: true,

        properties: [
            { id: 'entries' }
        ],

        keyValueRemaps: {
            entries(val: any) {
                const cVal = recursiveCamelize(val);
                const entries = Object.keys(cVal).map((key: string) => {
                    cVal[key].name = parseInt(key, 10);

                    if (cVal[key].exactMatch) {
                        cVal[key].exactMatchEnabled = cVal[key].exactMatch === 'enabled';
                        delete cVal[key].exactMatch;
                    }

                    return cVal[key];
                });
                return { entries };
            }
        }
    },

    RoutingAsPath: {
        namedClass: true,

        properties: [
            { id: 'entries' }
        ],

        keyValueRemaps: {
            entries(val: any) {
                const entries = Object.keys(val).map((key: string) => {
                    val[key].name = parseInt(key, 10);
                    val[key].regex = unquote(val[key].regex);
                    delete val[key].action;

                    return val[key];
                });
                return { entries };
            }
        }
    },

    RoutingPrefixList: {
        namedClass: true,

        properties: [
            { id: 'entries' }
        ],

        keyValueRemaps: {
            entries(val: any) {
                const cVal = recursiveCamelize(val);
                const entries = Object.keys(cVal).map((key: string) => {
                    cVal[key].name = parseInt(key, 10);

                    if (cVal[key].prefixLenRange) {
                        cVal[key].prefixLengthRange = cVal[key].prefixLenRange;
                        delete cVal[key].prefixLenRange;
                    }

                    return cVal[key];
                });
                return { entries };
            }
        }
    },

    SelfIp: {
        namedClass: true,

        keyValueRemaps: {
            allowService: (val: any) => {
                const newObj: Record<string, any> = { allowService: typeof (val) === 'object' ? Object.keys(val) : val };
                if (newObj.allowService[0] === 'default') return { allowService: 'default' };
                return newObj;
            },
            trafficGroup: (val: string) => ({ trafficGroup: val.split('/Common/').pop() })
        },

        customHandling: (rootObj: any, className: string) => {
            if (rootObj.allowService === undefined) rootObj.allowService = 'none';
            return { [className]: rootObj };
        }
    },

    SnmpAgent: {},

    SnmpCommunity: {
        namedClass: true,

        properties: [
            { id: 'communities' }
        ],

        reduceTmshPath: true,

        customHandling: (rootObj: any) => {
            // returns multiple DO stanzas from one tmsh object
            if (rootObj.communities) {
                const communities = Object.keys(rootObj.communities).map((s: string) => {
                    if (s === 'comm-public') return {};
                    rootObj.communities[s].class = rootObj.class;

                    if (rootObj.communities[s]['community-name']) {
                        rootObj.communities[s].name = rootObj.communities[s]['community-name'];
                        delete rootObj.communities[s]['community-name'];
                    }
                    if (rootObj.communities[s]['oid-subset']) {
                        rootObj.communities[s].oid = rootObj.communities[s]['oid-subset'];
                        delete rootObj.communities[s]['oid-subset'];
                    }

                    if (rootObj.communities[s].ipv6) {
                        rootObj.communities[s].ipv6 = rootObj.communities[s].ipv6 === 'enabled';
                    }

                    return { [s]: rootObj.communities[s] };
                });

                return Object.assign({}, ...communities);
            }
            return {};
        }
    },

    SnmpTrapDestination: {
        namedClass: true,

        properties: [
            { id: 'traps' }
        ],

        reduceTmshPath: true,

        customHandling: (rootObj: any) => {
            if (rootObj.traps) {
                const cRoot = recursiveCamelize(rootObj);
                const traps = Object.keys(cRoot.traps).map((s: string) => {
                    const trap = cRoot.traps[s];
                    trap.class = rootObj.class;

                    if (trap.authPassword) {
                        trap.authentication = {
                            password: Buffer.from(trap.authPassword).toString('base64'),
                            protocol: trap.authProtocol
                        };
                        delete trap.authPassword;
                        delete trap.authPasswordEncrypted;
                        delete trap.authProtocol;
                    }

                    if (trap.privacyPassword) {
                        trap.privacy = {
                            password: Buffer.from(trap.privacyPassword).toString('base64'),
                            protocol: trap.privacyProtocol
                        };
                        delete trap.privacyPassword;
                        delete trap.privacyPasswordEncrypted;
                        delete trap.privacyProtocol;
                        delete trap.securityLevel;
                    }

                    trap.destination = trap.host;
                    delete trap.host;

                    trap.port = parseInt(trap.port, 10);

                    return { [s]: trap };
                });

                return Object.assign({}, ...traps);
            }
            return {};
        }
    },

    SnmpTrapEvents: {},

    SnmpUser: {
        properties: [
            { id: 'users' }
        ],

        reduceTmshPath: true,

        customHandling: (rootObj: any, className: string) => {
            if (rootObj.users) {
                const cRoot = recursiveCamelize(rootObj);
                const users = Object.keys(cRoot.users).map((s: string) => {
                    const user = cRoot.users[s];
                    const usrObj: Record<string, any> = { class: className };

                    if (user.access) usrObj.access = user.access;

                    if (user.authPassword) {
                        usrObj.authentication = {
                            password: Buffer.from(user.authPassword).toString('base64'),
                            protocol: user.authProtocol
                        };
                    }

                    if (user.privacyPassword) {
                        usrObj.privacy = {
                            password: Buffer.from(user.privacyPassword).toString('base64'),
                            protocol: user.privacyProtocol
                        };
                    }

                    if (user.oidSubset) usrObj.oid = user.oidSubset;

                    return { [s]: usrObj };
                });

                return Object.assign({}, ...users);
            }
            return {};
        }
    },

    SSHD: {
        keyValueRemaps: {
            banner: (val: any, conf: any) => ({ banner: unquote(conf.bannerText) }),

            include: (val: string) => {
                const newObj: Record<string, any> = {};
                val.trim().split('\n').forEach((v: string) => {
                    let strKey = v.split(' ')[0];
                    if (strKey === 'MACs') {
                        strKey = 'MACS';
                    } else {
                        strKey = strKey[0].toLowerCase() + strKey.slice(1);
                    }

                    let strVal: string | string[] | number = v.split(' ')[1];
                    if (strVal.includes(',')) strVal = strVal.split(',');
                    if (!Array.isArray(strVal) && parseInt(strVal, 10)) {
                        strVal = parseInt(strVal, 10);
                    }
                    newObj[strKey] = strVal;
                });
                return newObj;
            }
        }
    },

    SyslogRemoteServer: {
        customHandling: (rootObj: any, className: string) => {
            // returns multiple DO stanzas from one tmsh object
            const cRoot = recursiveCamelize(rootObj);
            const servers = Object.keys(cRoot.remoteServers).map((s: string) => {
                cRoot.remoteServers[s].class = className;
                if (cRoot.remoteServers[s].remotePort) {
                    cRoot.remoteServers[s].remotePort = (portDict as Record<string, number>)[cRoot.remoteServers[s].remotePort];
                }
                return { [s]: cRoot.remoteServers[s] };
            });

            return Object.assign({}, ...servers);
        }
    },

    System: {
        keyValueRemaps: {
            mgmtDhcpEnabled: (val: any) => ({ mgmtDhcpEnabled: Boolean(val) })
        }
    },

    TrafficControl: {},

    TrafficGroup: {
        namedClass: true,

        keyValueRemaps: {
            haOrder: (val: any) => ({ haOrder: Object.keys(val) })
        }
    },

    Trunk: {
        namedClass: true,

        keyValueRemaps: {
            interfaces: (val: any) => ({ interfaces: Object.keys(val) })
        }
    },

    Tunnel: {
        namedClass: true
    },

    // User: custom handling, not in configItems
    User: {},

    VLAN: {
        namedClass: true,
        properties: [
            { id: 'interfaces' }
        ],
        keyValueRemaps: {
            interfaces: (val: any) => ({
                interfaces: Object.keys(val).map((name: string) => ({
                    name,
                    tagged: Object.keys(val[name])[0] === 'tagged'
                }))
            })
        }
    }
};

export default doCustomMaps;
module.exports = doCustomMaps;
