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

import path from 'path';
import enabledToEnable from '../../../utils/enabledToEnable';
import getObjectType from '../../../utils/getObjectType';
import GlobalObject from '../../../utils/globalRenameAndSkippedObject';
import handleObjectRef from '../../../utils/handleObjectRef';
import ipUtils from '../../../utils/ipUtils';
import log from '../../../utils/log';
import portDict from '../../../data/portDict.json';
import returnEmptyObjIfNone from '../../../utils/returnEmptyObjIfNone';

const handleSharedPath = (propertyPath: string): string => {
    const splitPath = propertyPath.split('/');
    const tenant = splitPath[1];
    const application = splitPath[2];
    if (splitPath.length === 3) {
        propertyPath = propertyPath.replace(`/${tenant}/`, `/${tenant}/Shared/`);
    } else if (tenant === 'Common' && application.includes('.app')) {
        propertyPath = propertyPath.replace(`/${tenant}/${application}/`, `/${tenant}/Shared/`);
    }
    return propertyPath;
};

const isTypeInProfiles = (profiles: string[], type: string, file: any): boolean => {
    for (let i = 0; i < profiles.length; i += 1) {
        const profile = profiles[i];
        if (getObjectType(profile, file) === type) return true;
    }
    return false;
};

const getServiceType = (obj: Record<string, any>, file: any, globalPath: string): Record<string, any> => {
    const profs = Object.keys(obj);
    let service: Record<string, any>;

    // Service_HTTP/Service_HTTPS
    if (isTypeInProfiles(profs, 'http', file)) {
        if (isTypeInProfiles(profs, 'client-ssl', file)) {
            service = { class: 'Service_HTTPS', template: 'https' };
        } else if (isTypeInProfiles(profs, 'fastl4', file)) {
            service = { class: 'Service_L4', template: 'l4' };
        } else {
            service = { class: 'Service_HTTP', template: 'http' };
        }
    } else if (isTypeInProfiles(profs, 'udp', file)) {
        // Service_UDP
        service = { class: 'Service_UDP', template: 'udp' };
    } else if (isTypeInProfiles(profs, 'fastl4', file)) {
        // Service_L4
        service = { class: 'Service_L4', template: 'l4' };
    } else if (isTypeInProfiles(profs, 'tcp', file)) {
        // Service_TCP
        service = { class: 'Service_TCP', template: 'tcp' };
    } else if (isTypeInProfiles(profs, 'sctp', file)) {
        // Service_SCTP
        service = { class: 'Service_SCTP', template: 'sctp' };
    } else if (isTypeInProfiles(profs, 'fasthttp', file)) {
        // Service_HTTP
        service = { class: 'Service_HTTP', template: 'http' };
    } else {
        // Service_Generic
        service = { class: 'Service_Generic', template: 'generic' };
    }

    // Determine if any profiles attached
    const serviceProfileProperties: Record<string, string> = {
        'bot-defense': 'profileBotDefense',
        'client-ssl': 'serverTLS',
        'diameter-endpoint': 'profileDiameterEndpoint',
        'http-compression': 'profileHTTPCompression',
        'one-connect': 'profileMultiplex',
        'protocol-inspection': 'profileProtocolInspection',
        'request-adapt': 'profileRequestAdapt',
        'request-log': 'profileTrafficLog',
        'response-adapt': 'profileResponseAdapt',
        'server-ssl': 'clientTLS',
        'subscriber-mgmt': 'profileSubscriberManagement',
        'tcp-analytics': 'profileAnalyticsTcp',
        'web-acceleration': 'profileHTTPAcceleration',
        analytics: 'profileAnalytics',
        apm: 'policyEndpoint',
        asm: 'policyWAF',
        classification: 'profileClassification',
        dns: 'profileDNS',
        dos: 'profileDOS',
        fastl4: 'profileL4',
        fix: 'profileFIX',
        ftp: 'profileFTP',
        html: 'profileHTML',
        http: 'profileHTTP',
        http2: 'profileHTTP2',
        httprouter: 'httpMrfRoutingEnabled',
        icap: 'profileICAP',
        ipother: 'profileIPOther',
        ntlm: 'profileNTLM',
        radius: 'profileRADIUS',
        rewrite: 'profileRewrite',
        sctp: 'profileSCTP',
        sip: 'profileSIP',
        spm: 'profileEnforcement',
        stream: 'profileStream',
        tcp: 'profileTCP',
        udp: 'profileUDP'
    };

    profs.forEach((prof) => {
        const profType = getObjectType(prof, file);
        const profDict = serviceProfileProperties[profType];
        const sourceInfo = GlobalObject.getTmshInfoWrapper(`${globalPath}/profiles`, prof, true);
        if (profDict) {
            if (profDict === 'clientTLS' || profDict === 'serverTLS') {
                if (!service[profDict]) service[profDict] = [];
                if (!getObjectType(prof, '')) {
                    service[profDict].push({ bigip: handleSharedPath(prof) });
                    GlobalObject.addProperty(globalPath, profDict, sourceInfo.tmshHeader, sourceInfo.tmshPath);
                } else {
                    service[profDict].push(handleObjectRef(prof));
                    GlobalObject.addProperty(globalPath, profDict, sourceInfo.tmshHeader, sourceInfo.tmshPath);
                }
            } else if (profDict === 'profileTCP' || profDict === 'profileHTTP2') {
                if (!service[profDict]) service[profDict] = {};
                if (obj[prof].context === 'clientside') {
                    service[profDict].ingress = handleObjectRef(prof);
                    GlobalObject.addProperty(globalPath, profDict, sourceInfo.tmshHeader, sourceInfo.tmshPath);
                } else if (obj[prof].context === 'serverside') {
                    service[profDict].egress = handleObjectRef(prof);
                    GlobalObject.addProperty(globalPath, profDict, sourceInfo.tmshHeader, sourceInfo.tmshPath);
                } else {
                    service[profDict] = handleObjectRef(prof);
                    GlobalObject.addProperty(globalPath, profDict, sourceInfo.tmshHeader, sourceInfo.tmshPath);
                }
            } else {
                service[profDict] = handleObjectRef(prof);
                GlobalObject.addProperty(globalPath, profDict, sourceInfo.tmshHeader, sourceInfo.tmshPath);
            }
        } else {
            log.warn(`Invalid reference dropped: ${prof}`);
        }
    });

    // make clean up for ssl profiles
    ['clientTLS', 'serverTLS'].forEach((prof) => {
        if (Object.keys(service).includes(prof) && service[prof].length === 1) {
            const tmp = service[prof][0];

            // if profile is not default and not in /Common/, use just name
            if (getObjectType(tmp.bigip, '')) {
                service[prof] = tmp;
            } else if (tmp.bigip.startsWith('/Common/')) {
                service[prof] = handleSharedPath(tmp.bigip);
            } else {
                service[prof] = tmp.bigip.split('/').pop();
            }

        // if we have multiple profiles, all of them should be just in /Common
        } else if (Object.keys(service).includes(prof) && service[prof].length > 1) {
            const tmp = service[prof];
            for (let i = 0; i < tmp.length; i += 1) {
                /* Clean up duplicate profiles here.
                    If we have profiles 'profile-name', 'profile-name-1', 'profile-name-2',
                    they might be created by AS3 Core (due to the old version BIG-IP Core limitations)
                    and ACC tries to merge them back into the intended (originally desired by user) profile.
                    'profile-name' will be `baseProfile` in this example.
                    If `baseProfile` is not present in `tmp` we assume that 'profile-name-1', 'profile-name-2'
                    are the names defined by the user and they should not be merged (the internal loop checks that).
                    Note, ideally should check all profiles names in the BIG-IP configuration,
                    but due to the complexity we are checking only the profiles of this server. */
                if ((tmp[i].bigip || tmp[i].use).match(/[_.-]\d+-{0,1}$/ig)) {
                    const baseProfile = (tmp[i].bigip || tmp[i].use).replace(/[_.-]\d+-{0,1}$/, '');
                    for (let j = 0; j < tmp.length; j += 1) {
                        if (i !== j && (baseProfile === tmp[j].use || baseProfile === tmp[j].bigip)) {
                            // found `baseProfile`, removing the duplicate
                            tmp.splice(i, 1);
                            i -= 1;
                            break;
                        }
                    }
                }
            }
            /* should be a separate loop because it changes the names,
                and in the previous loop we are comparing the names */
            for (let i = 0; i < tmp.length; i += 1) {
                tmp[i] = { bigip: `/Common/${path.basename(tmp[i].bigip || tmp[i].use)}` };
            }
            // Check if we still have multiple profiles
            service[prof] = (tmp.length === 1) ? handleSharedPath(tmp[0].bigip) : tmp;
        }
    });
    return service;
};

const serviceMap = {

    // Service
    'ltm virtual': {
        class: 'UNCERTAIN_SERVICE',

        keyValueRemaps: {
            autoLasthop: (key: string, val: any, _: any, tmosPath: string) => {
                GlobalObject.moveProperty(tmosPath, key, tmosPath, 'lastHop');
                return { lastHop: enabledToEnable(val) };
            },

            clonePools: (key: string, val: any) => {
                const obj: Record<string, any> = {};
                Object.keys(val).forEach((x) => {
                    if (val[x].context === 'clientside') obj.ingress = handleObjectRef(x);
                    if (val[x].context === 'serverside') obj.egress = handleObjectRef(x);
                });
                return { clonePools: obj };
            },

            fallbackPersistenceMethod: (key: string, val: any) => ({ fallbackPersistenceMethod: handleObjectRef(val) }),

            mirroring: (key: string, val: any) => returnEmptyObjIfNone(val, { mirroring: 'L4' }),

            policyFirewallEnforced: (key: string, val: any) => ({ policyFirewallEnforced: handleObjectRef(val) }),

            policyFirewallStaged: (key: string, val: any) => ({ policyFirewallStaged: handleObjectRef(val) })
        },

        customHandling: (rootObj: any, loc: any, file: any, promotedObjects: any) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj: Record<string, any> = {};
            const orig = file[loc.original];

            // check disabled status
            if (Object.hasOwn(rootObj, 'disabled')) {
                rootObj.adminState = 'disable';
                delete rootObj.disabled;
                GlobalObject.moveProperty(globalPath, 'disabled', globalPath, 'adminState');
            }

            // fix for un-prefixed profiles on /Common 16.1
            rootObj.profiles = Object.assign(...Object.keys(rootObj.profiles).map((prof) => {
                const newKey = !prof.includes('/') ? `/Common/${prof}` : prof;
                return { [newKey]: rootObj.profiles[prof] };
            }));

            // set Service class and template (plus any refs in properties)
            const serviceType = getServiceType(rootObj.profiles, file, globalPath);
            if (loc.profile === 'serviceMain') {
                newObj.template = serviceType.template;
            }
            delete serviceType.template;
            rootObj = Object.assign(rootObj, serviceType);

            // add redirect80
            if (rootObj.class === 'Service_HTTPS') {
                rootObj.redirect80 = false;
                GlobalObject.addProperty(globalPath, 'redirect80', loc.original, { redirect80: null });
            }

            // ipForward
            if (rootObj.ipForward === '' || rootObj.l2Forward === '') {
                rootObj.class = 'Service_Forwarding';
                if (rootObj.ipForward === '') {
                    rootObj.forwardingType = 'ip';
                    delete rootObj.ipForward;
                    GlobalObject.moveProperty(globalPath, 'ipForward', globalPath, 'forwardingType');
                }
                if (rootObj.l2Forward === '') {
                    rootObj.forwardingType = 'l2';
                    delete rootObj.l2Forward;
                    GlobalObject.moveProperty(globalPath, 'l2Forward', globalPath, 'forwardingType');
                }
            }

            // handle pool ref
            if (rootObj.pool) {
                const poolSplit = rootObj.pool.split('/');
                if (loc.tenant === poolSplit[1]
                    && (loc.app === poolSplit[2] || (loc.app === 'Shared' && poolSplit.length === 3))
                ) {
                    // same application or both are in /Tenant/Shared (reference still points to old location)
                    rootObj.pool = poolSplit.at(-1); // use pool's name as relative reference
                } else {
                    rootObj.pool = handleSharedPath(rootObj.pool);
                }
            }

            // internal virtual server
            if (rootObj.internal !== undefined) {
                rootObj.class = 'Service_TCP';
                rootObj.sourceAddress = rootObj.source;
                rootObj.virtualType = 'internal';
                delete rootObj.internal;
                GlobalObject.moveProperty(globalPath, 'internal', globalPath, 'virtualType');
                delete rootObj.source;
                GlobalObject.moveProperty(globalPath, 'source', globalPath, 'sourceAddress');
                delete rootObj.vlansEnabled;
                GlobalObject.deleteProperty(globalPath, 'vlansEnabled', 'RenamedProperty');
                delete rootObj.destination;
                GlobalObject.deleteProperty(globalPath, 'destination', 'RenamedProperty');
            }

            // parse virtualAddresses and virtualPort
            if (rootObj.destination) {
                const ipData = ipUtils.parseIpAddress(rootObj.destination);
                let addr = ipData.ipWithRoute;

                if (addr && !ipUtils.isIPv4(addr) && !ipUtils.isIPv6(addr)) {
                    addr = handleObjectRef(`${path.dirname(rootObj.destination)}/${ipData.ipWithRoute}`);
                }

                rootObj.virtualAddresses = [addr];
                GlobalObject.addProperty(globalPath, 'virtualAddresses', loc.original, { destination: null });
                rootObj.virtualPort = portDict[ipData.port] || parseInt(ipData.port, 10);
                GlobalObject.addProperty(globalPath, 'virtualPort', loc.original, { virtualPort: null });
                delete rootObj.destination;
                GlobalObject.deleteProperty(globalPath, 'destination', 'RenamedProperty');
            }

            // calculate netmask for 'destination'
            if (rootObj.mask && rootObj.mask !== '255.255.255.255' && rootObj.virtualType !== 'internal') {
                const cidr = ipUtils.getCidrFromNetmask(rootObj.mask);
                rootObj.virtualAddresses = rootObj.virtualAddresses.map((x: any) => ((typeof x === 'string') ? `${x}${cidr}` : x));
            }
            delete rootObj.mask;

            // 'traffic-matching-criteria' -> virtualAddresses/virtualPort (v14.1)
            const tmc = orig['traffic-matching-criteria'];
            if (tmc) {
                const ref = `ltm traffic-matching-criteria ${tmc}`;

                /* Here we are dealing with virtual addresses of tmc only.
                    Virtual ports of tmc are dealt with in as3Converter.js,
                    because it might require access to the port list object. */
                const addrList = file[ref]['destination-address-list'];
                if (addrList) {
                    /* If the service uses an address list, mark the list to ensure later
                        that it is not listed as unconverted to Next. */
                    promotedObjects[addrList] = loc;
                    rootObj.virtualAddresses = Object.keys(file[`net address-list ${addrList}`].addresses);
                } else if (file[ref]['destination-address-inline']) {
                    const address = file[ref]['destination-address-inline'];
                    rootObj.virtualAddresses = Array.isArray(address) ? address : [address];
                }
                GlobalObject.addProperty(globalPath, 'virtualAddresses', loc.original, { destination: null });
            }

            // handle 'source'
            if (rootObj.source && rootObj.source !== '0.0.0.0/0') {
                rootObj.virtualAddresses = rootObj.virtualAddresses.map((x: any) => [x, rootObj.source]);
                GlobalObject.addProperty(globalPath, 'virtualAddresses', loc.original, { destination: null });
            }
            delete rootObj.source;
            GlobalObject.deleteProperty(globalPath, 'source', 'RenamedProperty');

            // used with client/server side of http2 profile
            if (rootObj.httpMrfRoutingEnabled) {
                rootObj.httpMrfRoutingEnabled = true;
            }

            // handle irules refs
            if (rootObj.iRules) {
                rootObj.iRules = Object.keys(rootObj.iRules)
                    .map((x) => handleObjectRef(x));
            }

            // handle persist ref
            if (rootObj.class !== 'Service_Forwarding') {
                if (rootObj.persistenceMethods) {
                    const arr: any[] = [];
                    Object.keys(rootObj.persistenceMethods).forEach((x, index) => {
                        x = !x.includes('/') ? `/Common/${x}` : x;
                        const y = x;
                        x = handleObjectRef(x);
                        if (x.bigip) {
                            x = x.bigip.replace('source_addr', 'source-address')
                                .replace('dest_addr', 'destination-address')
                                .split('/')[2];
                        }
                        arr.push(x);
                        const persistRulesPath = `${globalPath}/persistenceMethods/${index}`;
                        GlobalObject.addProperty(persistRulesPath, 'use', loc.original, { persist: { [y]: null } });
                    });
                    rootObj.persistenceMethods = arr;
                } else {
                    rootObj.persistenceMethods = [];
                    GlobalObject.addProperty(globalPath, 'persistenceMethods', loc.original, { persistenceMethods: null });
                }
            }

            // remap snat
            rootObj.snat = rootObj.type;
            if (rootObj.snat === 'automap') rootObj.snat = 'auto';
            if (rootObj.snat === 'snat') rootObj.snat = 'self';
            if (!rootObj.snat) rootObj.snat = 'none';
            if (rootObj.snat === 'lsn') delete rootObj.snat;
            else if (rootObj.snatPool) rootObj.snat = handleObjectRef(rootObj.snatPool);

            delete rootObj.snatPool;
            GlobalObject.deleteProperty(globalPath, 'snatPool', 'RenamedProperty');
            delete rootObj.type;
            GlobalObject.moveProperty(globalPath, 'type', globalPath, 'snat');

            // handle allowVlans and rejectVlans
            if (Object.keys(rootObj).includes('vlansEnabled')) {
                rootObj.allowVlans = Object.keys(rootObj.vlans || {}).map((x) => ({ bigip: x }));
                GlobalObject.moveProperty(globalPath, 'vlans', globalPath, 'allowVlans');
            } else if (rootObj.vlans) {
                rootObj.rejectVlans = Object.keys(rootObj.vlans).map((x) => ({ bigip: x }));
                GlobalObject.moveProperty(globalPath, 'vlans', globalPath, 'rejectVlans');
            }
            delete rootObj.vlansEnabled;
            GlobalObject.deleteProperty(globalPath, 'vlansEnabled', 'RenamedProperty');
            delete rootObj.vlansDisabled;
            GlobalObject.deleteProperty(globalPath, 'vlansDisabled');
            delete rootObj.vlans;

            // service_l4 specific props
            if (rootObj.class === 'Service_L4' && !rootObj.layer4) {
                rootObj.layer4 = 'any';
                GlobalObject.addProperty(globalPath, 'layer4', loc.original, { layer4: null });
            }

            // policyNAT
            const natPolicy = orig['security-nat-policy'];
            if (natPolicy && natPolicy.policy) {
                rootObj.policyNAT = handleObjectRef(natPolicy.policy);
                GlobalObject.addProperty(globalPath, 'policyNat', loc.original, { policyNat: null });
            }

            // policyEndpoint
            if (rootObj.policies) {
                rootObj.policyEndpoint = handleSharedPath(Object.keys(rootObj.policies)[0]);
                delete rootObj.policies;
                GlobalObject.moveProperty(globalPath, 'policies', globalPath, 'policyEndpoint');
            }

            // policyBandwidthControl
            const bwcPolicy = orig['bwc-policy'];
            if (bwcPolicy) {
                rootObj.policyBandwidthControl = handleObjectRef(bwcPolicy);
                GlobalObject.addProperty(globalPath, 'policyBandwidthControl', loc.original, { policyBandwidthControl: null });
            }

            // policyIdleTimeout
            if (rootObj.servicePolicy) {
                const listOfKeys = Object.keys(file);
                const ref = file[listOfKeys.find((elem) => elem.includes(rootObj.servicePolicy))];
                rootObj.policyIdleTimeout = handleObjectRef(ref['timer-policy']);
                delete rootObj.servicePolicy;
                GlobalObject.moveProperty(globalPath, 'servicePolicy', globalPath, 'policyIdleTimeout');
            }

            // securityLogProfiles
            if (rootObj.securityLogProfiles) {
                rootObj.securityLogProfiles = Object.keys(rootObj.securityLogProfiles)
                    .map((x) => handleObjectRef(x));
            }

            // Cleanup indirect service refs
            delete rootObj.bwcPolicy;
            delete rootObj.policy;
            delete rootObj.profiles;
            GlobalObject.deleteProperty(globalPath, 'bwcPolicy');
            GlobalObject.deleteProperty(globalPath, 'policy');
            GlobalObject.deleteProperty(globalPath, 'profiles', 'RenamedProperty');

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // used when rootObj has 'traffic-matching-criteria' property
    'ltm traffic-matching-criteria': {
        noDirectMap: true
    },

    'ltm virtual source-address-translation': {
        class: 'PHANTOM_SNAT',

        // Rename pool so it does not overwrite 'ltm virtual' pool name
        keyValueRemaps: {
            pool: (key: string, val: any, _: any, tmosPath: string) => {
                GlobalObject.moveProperty(tmosPath, key, tmosPath, 'snatPool');
                return { snatPool: val };
            }
        }
    }
};

export default serviceMap;
module.exports = serviceMap;
