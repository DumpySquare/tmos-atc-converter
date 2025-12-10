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

'use strict';

const assert = require('assert');
const handleObjectRef = require('../../../utils/handleObjectRef');
const hyphensToCamel = require('../../../utils/hyphensToCamel');
const ipUtils = require('../../../utils/ipUtils');
const GlobalObject = require('../../../utils/globalRenameAndSkippedObject');
const constants = require('../../../constants');

// custom diff func w/ concept of allowlist
const customDiff = (obj1, obj2, allowlist) => {
    const obj1Props = Object.keys(obj1);
    for (let i = 0; i < obj1Props.length; i += 1) {
        const prop = obj1Props[i];

        if (!allowlist.includes(prop)) {
            if (typeof obj1[prop] !== 'object' && obj1[prop] !== obj2[prop]) {
                return false;
            }

            // compare arrays of monitors
            if (Array.isArray(obj1[prop])) {
                try {
                    assert.deepStrictEqual(obj1[prop], obj2[prop]);
                } catch (e) {
                    return false;
                }
            }
        }
    }
    return true;
};

const dedupe = (arr, propsToMerge, membersPath) => {
    const newArr = [];
    //  we need to keep track of number of merged members
    // otherwise indexing goes wrong and we delete wrong items
    let deletedCount = 0;

    // no merge required
    if (arr.length === 1) return arr;

    // merge possibly required
    for (let i = 0; i < arr.length; i += 1) {
        // check if dupe exists
        const originalItem = arr[i];
        let dupe = false;
        let idx = 0;
        for (let j = 0; j < newArr.length; j += 1) {
            const newArrItem = newArr[j];
            const diff = customDiff(originalItem, newArrItem, propsToMerge);
            if (diff) {
                dupe = diff;
                idx = j;
            }
        }

        // if dupe, concat serverAddress and servers
        if (dupe) {
            if (newArr[idx].serverAddresses && arr[i].serverAddresses) {
                newArr[idx].serverAddresses = newArr[idx].serverAddresses.concat(arr[i].serverAddresses);
            } else if (newArr[idx].servers && arr[i].servers) {
                newArr[idx].servers = newArr[idx].servers.concat(arr[i].servers);
            } else if (newArr[idx].serverAddresses) {
                newArr[idx].servers = arr[i].servers;
            } else {
                newArr[idx].serverAddresses = arr[i].serverAddresses;
            }

            // deleting duplicated members
            GlobalObject.deleteProperty(membersPath, `[${i - deletedCount}]`, 'RenamedProperty');
            deletedCount += 1;
        // else push entire member
        } else {
            newArr.push(arr[i]);
        }
    }
    return newArr;
};

/**
 * Move property to a new object while removing hyphens.
 * Convert the values to integer.
 *
 * @param {object} oldObj
 * @param {string} oldPath
 * @param {string} oldProp
 * @param {object} newObj
 * @param {string} newPath
 */
function moveRenameAndConvertToInt(memberName, oldObj, tmshPath, oldProp, newObj, newPath) {
    if (oldObj[oldProp]) {
        const newProp = hyphensToCamel(oldProp);
        newObj[newProp] = parseInt(oldObj[oldProp], 10);
        GlobalObject.addProperty(newPath, newProp, tmshPath, { members: { [memberName]: { [oldProp]: null } } });
    }
}

module.exports = {

    // Pool
    'ltm pool': {
        class: 'Pool',

        customHandling: (rootObj, loc, file) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj = {};
            const members = [];

            // find if 'minimumMonitors' or 'monitor' attached to pool
            const origObj = file[loc.original];
            const minMonitor = Object.keys(origObj).filter((x) => x.includes('monitor min'))[0];
            let monitorsTmshPath;
            if (origObj.monitor) {
                rootObj.monitors = origObj.monitor.split(' and ').map((m) => handleObjectRef(m));
                monitorsTmshPath = { monitor: null };
                // there is "monitors" property already in object, so first we delete it
                GlobalObject.deleteProperty(globalPath, 'monitors', 'RenamedProperty');
                GlobalObject.addProperty(globalPath, 'monitors', loc.original, monitorsTmshPath, []);
            } else if (minMonitor) {
                rootObj.minimumMonitors = parseInt(minMonitor.split(' ')[2], 10);
                rootObj.monitors = origObj[minMonitor].map((m) => handleObjectRef(m));
                monitorsTmshPath = { [minMonitor]: null };
                GlobalObject.addProperty(globalPath, 'minimumMonitors', loc.original, monitorsTmshPath);
                GlobalObject.addProperty(globalPath, 'monitors', loc.original, monitorsTmshPath, []);
            }
            if (rootObj.monitors && rootObj.monitors.length > 0) {
                for (let i = 0; i < rootObj.monitors.length; i += 1) {
                    const objKey = Object.keys(rootObj.monitors[i])[0];
                    // adding nth monitor element
                    GlobalObject.addProperty(
                        globalPath.concat(constants.GLOBAL_OBJECT_PATH_SEP, 'monitors', '[', i.toString(), ']'),
                        '',
                        loc.original,
                        monitorsTmshPath
                    );
                    // adding "bigip" or "use" key to monitor
                    GlobalObject.addProperty(
                        globalPath.concat(constants.GLOBAL_OBJECT_PATH_SEP, 'monitors', '[', i.toString(), ']'),
                        objKey,
                        loc.original,
                        monitorsTmshPath
                    );
                }
            }

            if (rootObj.members) {
                /* Cannot add directly to the top as 'members' because 'members' already exists.
                    So, creating a temporary object that would be moved later to 'members' */
                const tempPropName = 'tempProp';
                GlobalObject.addProperty(globalPath, tempPropName, loc.original, { members: null }, []);
                const keys = Object.keys(rootObj.members);
                for (let i = 0; i < keys.length; i += 1) {
                    const poolMemberPath = keys[i];
                    const poolMember = rootObj.members[poolMemberPath];
                    const memberJson = {};

                    /* Athough memberJson is attached at the end of the loop,
                        since we use addProperty for the shadow object,
                        it is better to create the sub-object at the beginning of the loop.
                        singleMemberSourcePath and singleMemberDestPath are paths for the current pool member */
                    const singleMemberTmshPath = { members: { [poolMemberPath]: null } };
                    const singleMemberDestPath = globalPath.concat(
                        constants.GLOBAL_OBJECT_PATH_SEP, tempPropName, '[', i.toString(), ']'
                    );
                    GlobalObject.addProperty(singleMemberDestPath, '', loc.original, singleMemberTmshPath);

                    // address discovery

                    if (poolMember.fqdn) {
                        memberJson.addressDiscovery = 'fqdn';
                        GlobalObject.addProperty(
                            singleMemberDestPath,
                            'addressDiscovery',
                            loc.original,
                            { members: { [poolMemberPath]: { fqdn: null } } }
                        );

                        memberJson.hostname = poolMember.fqdn.name;
                        GlobalObject.addProperty(
                            singleMemberDestPath,
                            'hostname',
                            loc.original,
                            { members: { [poolMemberPath]: { fqdn: { name: null } } } }
                        );
                    } else {
                        memberJson.addressDiscovery = 'static';
                        GlobalObject.addProperty(
                            singleMemberDestPath,
                            'addressDiscovery',
                            loc.original,
                            null
                        );
                    }

                    // parse ipv4/ipv6 or string with ipv4 port
                    memberJson.servicePort = parseInt(ipUtils.splitAddress(poolMemberPath).port, 10);
                    GlobalObject.addProperty(
                        singleMemberDestPath,
                        'servicePort',
                        loc.original,
                        null
                    );

                    // manually map poolMember properties
                    moveRenameAndConvertToInt(poolMemberPath, poolMember, loc.original, 'connection-limit', memberJson, singleMemberDestPath);
                    moveRenameAndConvertToInt(poolMemberPath, poolMember, loc.original, 'rate-limit', memberJson, singleMemberDestPath);
                    moveRenameAndConvertToInt(poolMemberPath, poolMember, loc.original, 'dynamic-ratio', memberJson, singleMemberDestPath);
                    moveRenameAndConvertToInt(poolMemberPath, poolMember, loc.original, 'ratio', memberJson, singleMemberDestPath);
                    moveRenameAndConvertToInt(poolMemberPath, poolMember, loc.original, 'priority-group', memberJson, singleMemberDestPath);

                    // handle members with directly-attached monitors
                    // parse  'monitor min 1 of': [ '/Common/http' ]
                    const membMinMon = Object.keys(poolMember).filter((x) => x.includes('monitor min'))[0];
                    let memberMonitorsTmshPath;
                    if (poolMember.monitor) {
                        memberJson.monitors = poolMember.monitor.split(' and ').map((m) => handleObjectRef(m));
                        memberMonitorsTmshPath = { members: { [poolMemberPath]: { monitor: null } } };
                        // there is "monitors" property already in object, so first we delete it
                        GlobalObject.deleteProperty(singleMemberDestPath, 'monitors');
                        GlobalObject.addProperty(singleMemberDestPath, 'monitors', loc.original, memberMonitorsTmshPath, []);// nested_property
                    } else if (membMinMon) {
                        memberJson.minimumMonitors = parseInt(membMinMon.split(' ')[2], 10);
                        memberJson.monitors = poolMember[membMinMon].map((m) => handleObjectRef(m));
                        memberMonitorsTmshPath = { members: { [poolMemberPath]: { [membMinMon]: null } } };
                        GlobalObject.addProperty(singleMemberDestPath, 'minimumMonitors', loc.original, memberMonitorsTmshPath, []);
                        GlobalObject.addProperty(singleMemberDestPath, 'monitors', loc.original, memberMonitorsTmshPath, []);
                    }
                    if (memberJson.monitors && memberJson.monitors.length > 0) {
                        for (let j = 0; j < memberJson.monitors.length; j += 1) {
                            const objKey = Object.keys(memberJson.monitors[j])[0];
                            // adding nth monitor element
                            GlobalObject.addProperty(
                                singleMemberDestPath.concat(constants.GLOBAL_OBJECT_PATH_SEP, 'monitors', '[', j.toString(), ']'),
                                '',
                                loc.original,
                                memberMonitorsTmshPath
                            );
                            // adding "bigip" or "use" key to monitor
                            GlobalObject.addProperty(
                                singleMemberDestPath.concat(constants.GLOBAL_OBJECT_PATH_SEP, 'monitors', '[', j.toString(), ']'),
                                objKey,
                                loc.original,
                                memberMonitorsTmshPath
                            );
                        }
                    }

                    if (poolMember.address) {
                        // If pool member name is the same as ip address
                        const poolMemberName = ipUtils.parseIpAddress(poolMemberPath).ipWithRoute;
                        if (poolMemberName === poolMember.address) {
                            memberJson.serverAddresses = [poolMember.address];
                            GlobalObject.addProperty(singleMemberDestPath, 'serverAddresses', loc.original, { members: { [poolMemberPath]: { address: null } } });
                        } else {
                            const tmpMember = {
                                name: poolMemberName,
                                address: poolMember.address
                            };
                            memberJson.servers = [tmpMember];
                            GlobalObject.addProperty(singleMemberDestPath, 'servers', loc.original, { members: { [poolMemberPath]: { address: null } } });
                        }
                        memberJson.shareNodes = true;
                        GlobalObject.addProperty(singleMemberDestPath, 'shareNodes', loc.original, null);
                    }
                    members.push(memberJson);
                }
                rootObj.members = dedupe(members, ['serverAddresses', 'servers'], globalPath.concat(constants.GLOBAL_OBJECT_PATH_SEP, tempPropName));
                GlobalObject.moveAll(globalPath, tempPropName, globalPath, 'members');
            }

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    }
};
