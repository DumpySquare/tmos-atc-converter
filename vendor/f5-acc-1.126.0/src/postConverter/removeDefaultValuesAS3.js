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

/* eslint-disable consistent-return */

const as3SchemaCore = require('@automation-toolchain/f5-appsvcs-classic-schema/schema/adc-schema');
const as3SchemaNext = require('@automation-toolchain/f5-appsvcs-schema/artifacts/schema-next.json');
const log = require('../util/log');
const objectUtil = require('../util/object');
const GlobalObject = require('../util/globalRenameAndSkippedObject');

// list of default profiles by service name
const defaultProfilesPerService = {
    Service_Forwarding: {
        profileL4: '/Common/fastL4'
    },
    Service_Generic: {
        profileIPOther: '/Common/ipother'
    },
    Service_HTTP: {
        profileTCP: '/Common/f5-tcp-progressive',
        profileHTTP: '/Common/http'
    },
    Service_HTTPS: {
        profileTCP: '/Common/f5-tcp-progressive',
        profileHTTP: '/Common/http'
    },
    Service_L4: {
        profileL4: '/Common/fastL4'
    },
    Service_SCTP: {
        profileSCTP: '/Common/sctp'
    },
    Service_TCP: {
        profileTCP: '/Common/f5-tcp-progressive'
    },
    Service_UDP: {
        profileUDP: '/Common/udp'
    }
};

module.exports = (declaration, isNext) => {
    const newObj = { ...declaration };
    findProfiles(newObj, isNext);
    return newObj;
};

// schema objects are extended. traverse and find default.
function findSchemaDefault(as3Class, propName, isNext) {
    const as3Schema = isNext ? as3SchemaNext : as3SchemaCore;
    const definition = as3Schema.definitions[as3Class];
    if (!definition) return;

    const propDefinition = definition.properties[propName];
    if (objectUtil.has(propDefinition, 'default')) {
        return propDefinition.default;
    }

    // improve this check on the 'if' property. if isn't always true, sometimes it's an object
    if (objectUtil.has(propDefinition, 'if')) {
        const ref = propDefinition.then.$ref || propDefinition.else.$ref;
        if (ref) {
            const refClass = ref.split('/')[2];
            const refDef = as3Schema.definitions[refClass];
            if (refDef.properties) {
                const refPropDef = refDef.properties[propName];
                if (objectUtil.has(refPropDef, 'default')) {
                    return refPropDef.default;
                }
            }
        }
    }
}

const arrayEquals = (a, b) => Array.isArray(a)
    && Array.isArray(b)
    && a.length === b.length
    && a.every((val, i) => val === b[i]);

// match and remove default values
function matchDefaults(as3Obj, isNext, currentPath) {
    Object.keys(as3Obj)
        .filter((k) => k !== 'class')
        .forEach((propName) => {
            try {
                const propVal = as3Obj[propName];
                const propDefault = findSchemaDefault(as3Obj.class, propName, isNext);

                // need to deep check here. include strings and arrays
                if (propDefault !== 'undefined'
                    && (propVal === propDefault || arrayEquals(propVal, propDefault))) {
                    log.debug(`Deleting default schema value ${propVal} for: ${as3Obj.class}.${propName}`);
                    delete as3Obj[propName];
                    GlobalObject.deleteProperty(currentPath, propName, 'This property is not supported', false, null, 'Contact F5 Support', `Deleted default schema value ${propVal} for: ${as3Obj.class}.${propName}`);
                }
            } catch (e) {
                log.warn(`Failed to find default schema value for: ${as3Obj.class}.${propName}`);
            }
        });
    return as3Obj;
}

// delete default profiles of a service
function removeDefaultProfiles(as3Obj, currentPath) {
    const defaultProfiles = defaultProfilesPerService[as3Obj.class];
    if (typeof defaultProfiles === 'object') {
        Object.keys(defaultProfiles)
            .forEach((profileType) => {
                if (typeof as3Obj[profileType] === 'object'
                     && as3Obj[profileType].bigip === defaultProfiles[profileType]) {
                    delete as3Obj[profileType];
                    GlobalObject.deleteProperty(currentPath, profileType, 'This property is not supported', false, null, 'Contact F5 Support', `Deleting default profile ${profileType} for: ${as3Obj.class}`);
                }
            });
    }
    return as3Obj;
}

// recursive function to find AS3 objects
function findProfiles(obj, isNext, path = '') {
    Object.keys(obj)
        .filter((k) => typeof obj[k] === 'object' && obj[k].class)
        .forEach((key) => {
            const currentPath = path ? `${path}/${key}` : key;
            if (obj[key].class === 'Tenant' || obj[key].class === 'Application') {
                return findProfiles(obj[key], isNext, currentPath);
            }
            obj[key] = matchDefaults(obj[key], isNext, `/${currentPath}`);
            return removeDefaultProfiles(obj[key], `/${currentPath}`);
        });
    return obj;
}
