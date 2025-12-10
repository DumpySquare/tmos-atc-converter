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

const range = require('lodash/range');
const handleObjectRef = require('../../../utils/handleObjectRef');
const GlobalObject = require('../../../utils/globalRenameAndSkippedObject');

const splitRate = (str) => {
    let i;
    for (i = 0; i < str.length; i += 1) {
        const char = str[i];
        if (!/^[0-9]+$/.test(char)) {
            break;
        }
    }

    // identify if unit has a prefix
    return {
        unit: str.slice(i).length === 4 ? `${str[i].toUpperCase()}${str.slice(i + 1)}` : str[i].slice(i),
        value: parseInt(str.slice(0, i), 10)
    };
};

const factorUnits = (int) => {
    if (int % 1000000000 === 0) return { unit: 'Gpps', value: int / 1000000000 };
    if (int % 1000000 === 0) return { unit: 'Mpps', value: int / 1000000 };
    if (int % 1000 === 0) return { unit: 'Kpps', value: int / 1000000 };
    return { unit: 'pps', value: int };
};

/**
 * Convert an array of ascending ports to an array ranges and single ports
 * e.g.[ 443, 6443, "8443-8453"]
 *
 * @param {Array<integer>} intArray - nonempty array of ports (integers) in the ascending order
 *
 * @returns {Array<string>} array of strings, each of which is either a range of ports or a single port
 */
function rollupPorts(intArray) {
    if (intArray.length < 2) {
        return intArray.slice();
    }

    function portRange(start, end) {
        return start === end
            ? `${intArray[start]}`
            : `${intArray[start]}-${intArray[end]}`;
    }

    const rollup = [];
    let rangeStartIdx = 0;
    for (let i = 1; i < intArray.length; i += 1) {
        if (intArray[i - 1] + 1 !== intArray[i]) {
            rollup.push(portRange(rangeStartIdx, i - 1));
            rangeStartIdx = i;
        }
    }
    rollup.push(portRange(rangeStartIdx, intArray.length - 1));
    return rollup;
}

module.exports = {

    // Net_Address_List
    'net address-list': {
        class: 'Net_Address_List',

        keyValueRemaps: {
            addresses: (key, val) => ({ addresses: Object.keys(val) }),

            addressLists: (key, val) => ({ addressLists: Object.keys(val).map((x) => handleObjectRef(x)) })
        }
    },

    // Bandwidth_Control_Policy
    'net bwc policy': {
        class: 'Bandwidth_Control_Policy',

        keyValueRemaps: {
            logPublisher: (key, val) => ({ logPublisher: handleObjectRef(val) })
        },

        customHandling: (rootObj, loc) => {
            const newObj = {};
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            // categories
            if (rootObj.categories) {
                rootObj.categories = Object.keys(rootObj.categories).map((x, index) => {
                    const catObj = rootObj.categories[x];
                    const obj = {};

                    if (x !== 'undefined') {
                        obj.name = x;
                        GlobalObject.addProperty(`${globalPath}/categories/${index}`, 'name', loc.original, {
                            categories: {
                                undefined: {
                                    [index]: {
                                        name: null
                                    }
                                }
                            }
                        });
                    }
                    if (catObj['ip-tos']) {
                        obj.markIP = parseInt(catObj['ip-tos'], 10);
                        GlobalObject.addProperty(`${globalPath}/categories/${index}`, 'markIP', loc.original, {
                            categories: {
                                undefined: {
                                    [index]: {
                                        'ip-tos': null
                                    }
                                }
                            }
                        });
                    }
                    if (catObj['link-qos']) {
                        obj.markL2 = parseInt(catObj['link-qos'], 10);
                        GlobalObject.addProperty(`${globalPath}/categories/${index}`, 'markL2', loc.original, {
                            categories: {
                                undefined: {
                                    [index]: {
                                        'link-qos': null
                                    }
                                }
                            }
                        });
                    }
                    if (catObj['max-cat-rate-percentage']) {
                        obj.maxBandwidth = parseInt(catObj['max-cat-rate-percentage'], 10);
                        obj.maxBandwidthUnit = '%';
                        GlobalObject.addProperty(`${globalPath}/categories/${index}`, 'maxBandwidth', loc.original, {
                            categories: {
                                undefined: {
                                    [index]: {
                                        'max-cat-rate-percentage': null
                                    }
                                }
                            }
                        });
                    } else {
                        obj.maxBandwidth = splitRate(catObj['max-cat-rate']).value;
                        obj.maxBandwidthUnit = splitRate(catObj['max-cat-rate']).unit;
                        GlobalObject.addProperty(`${globalPath}/categories/${index}`, 'maxBandwidth', loc.original, {
                            categories: {
                                undefined: {
                                    [index]: {
                                        'max-cat-rate': null
                                    }
                                }
                            }
                        });
                    }
                    GlobalObject.deleteProperty(`${globalPath}/categories`, 'undefined', 'RenamedProperty');
                    return obj;
                });
            }

            // maxBandwidth
            if (rootObj.maxBandwidth) {
                const maxBand = splitRate(rootObj.maxBandwidth);
                rootObj.maxBandwidth = maxBand.value;
                rootObj.maxBandwidthUnit = maxBand.unit;
                GlobalObject.addProperty(globalPath, 'maxBandwidthUnit', loc.original, { maxBandwidth: null });
            }

            // maxUserBandwidth
            if (rootObj.maxUserBandwidth) {
                const maxBand = splitRate(rootObj.maxUserBandwidth);
                rootObj.maxUserBandwidth = maxBand.value;
                rootObj.maxUserBandwidthUnit = maxBand.unit;
                GlobalObject.addProperty(globalPath, 'maxUserBandwidthUnit', loc.original, { maxUserBandwidth: null });
            }

            // maxUserPPS
            if (rootObj.maxUserPPS) {
                const factor = factorUnits(rootObj.maxUserPPS);
                rootObj.maxUserPPS = factor.value;
                rootObj.maxUserPPSUnit = factor.unit;
                GlobalObject.addProperty(globalPath, 'maxUserPPSUnit', loc.original, { maxUserPPS: null });
            }

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Net_Port_List
    'net port-list': {
        class: 'Net_Port_List',
        keyValueRemaps: {
            ports: (key, val) => {
                const portList = Object.keys(val)
                    .map((x) => {
                        // if we have port range '55-58'
                        if (x.includes('-')) {
                            const r = x.split('-').map((t) => parseInt(t, 10));
                            return range(r[0], r[1] + 1);
                        }
                        return parseInt(x, 10);
                    })
                    /* Replace [85, [81, 82]] -> [81, 82, 85]
                        Not clear if multilayer arrays are allowed for ports of TMSH, so 'flat' might be redundant.
                        Multilayer arrays are allowed for post lists in AS3 Core schema,
                        but this is not where ACC converts from. */
                    .flat()
                    .sort((a, b) => a - b);

                return { ports: rollupPorts(portList) };
            }
        }
    }
};
