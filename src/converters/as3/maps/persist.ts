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

import buildProtectedObj from '../../../utils/buildProtectedObj';
import GlobalObject from '../../../utils/globalRenameAndSkippedObject';

const iruleRef = (val: string): string => {
    const split = val.split('/').slice(1);
    if (split[0] === 'Common' && split[1] !== 'Shared') {
        return `/Common/Shared/${split[1]}`;
    }
    return val;
};

const persistMap = {

    // Persist (cookie)
    'ltm persistence cookie': {
        class: 'Persist',

        keyValueRemaps: {
            cookieName: (key: string, val: any) => ({ cookieName: (val === 'none' ? '' : val) }),

            count: (key: string, val: any, options: any, path: string) => {
                GlobalObject.moveProperty(path, key, path, 'hashCount');
                return { hashCount: val };
            },

            duration: (key: string, val: any) => ({ duration: val === 'indefinite' ? 0 : val }),

            iRule: (key: string, val: any) => ({ iRule: iruleRef(val) }),

            passphrase: (key: string, val: any) => ({ passphrase: buildProtectedObj(val) }),

            ttl: (key: string, val: any) => {
                if (typeof val === 'string' && val.includes(':')) {
                    const split = val.split(':');
                    const hours = parseInt(split[0], 10) * 3600 * 7;
                    const minutes = parseInt(split[1], 10) * 60 * 7;
                    const seconds = parseInt(split[2], 10) * 7;
                    const rmdr = split[2] === '59' ? 6 : 0;
                    return { ttl: hours + minutes + seconds + rmdr };
                }
                return { ttl: val };
            }
        },

        customHandling: (rootObj: any, loc: any) => {
            const newObj: Record<string, any> = {};
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            rootObj.persistenceMethod = 'cookie';
            GlobalObject.addProperty(globalPath, 'persistenceMethod', loc.original, { persistenceMethod: null });
            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Persist (dest-addr)
    'ltm persistence dest-addr': {
        class: 'Persist',

        keyValueRemaps: {
            addressMask: (key: string, val: any) => ({ addressMask: val === 'none' ? '' : val }),

            duration: (key: string, val: any) => ({ duration: val === 'indefinite' ? 0 : val }),

            iRule: (key: string, val: any) => ({ iRule: iruleRef(val) })
        },

        customHandling: (rootObj: any, loc: any) => {
            const newObj: Record<string, any> = {};
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            rootObj.persistenceMethod = 'destination-address';
            GlobalObject.addProperty(globalPath, 'persistenceMethod', loc.original, { persistenceMethod: null });
            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Persist (hash)
    'ltm persistence hash': {
        class: 'Persist',

        keyValueRemaps: {
            endPattern: (key: string, val: any) => ({ endPattern: val.replace(/\\\\/g, '\\').replace(/\\\?/g, '?') }),

            iRule: (key: string, val: any) => ({ iRule: iruleRef(val) }),

            startPattern: (key: string, val: any) => ({ startPattern: val.replace(/\\\\/g, '\\') })
        },

        customHandling: (rootObj: any, loc: any) => {
            const newObj: Record<string, any> = {};
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            rootObj.persistenceMethod = 'hash';
            GlobalObject.addProperty(globalPath, 'persistenceMethod', loc.original, { persistenceMethod: null });
            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Persist (msrdp)
    'ltm persistence msrdp': {
        class: 'Persist',

        keyValueRemaps: {
            iRule: (key: string, val: any) => ({ iRule: iruleRef(val) })
        },

        customHandling: (rootObj: any, loc: any) => {
            const newObj: Record<string, any> = {};
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            rootObj.persistenceMethod = 'msrdp';
            GlobalObject.addProperty(globalPath, 'persistenceMethod', loc.original, { persistenceMethod: null });
            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Persist (sip-info)
    'ltm persistence sip': {
        class: 'Persist',

        keyValueRemaps: {
            iRule: (key: string, val: any) => ({ iRule: iruleRef(val) })
        },

        customHandling: (rootObj: any, loc: any) => {
            const newObj: Record<string, any> = {};
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            rootObj.persistenceMethod = 'sip-info';
            GlobalObject.addProperty(globalPath, 'persistenceMethod', loc.original, { persistenceMethod: null });
            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Persist (source-addr)
    'ltm persistence source-addr': {
        class: 'Persist',

        keyValueRemaps: {
            addressMask: (key: string, val: any) => ({ addressMask: val === 'none' ? '' : val }),

            duration: (key: string, val: any) => ({ duration: val === 'indefinite' ? 0 : val }),

            iRule: (key: string, val: any) => ({ iRule: iruleRef(val) })
        },

        customHandling: (rootObj: any, loc: any) => {
            const newObj: Record<string, any> = {};
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            rootObj.persistenceMethod = 'source-address';
            GlobalObject.addProperty(globalPath, 'persistenceMethod', loc.original, { persistenceMethod: null });
            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Persist (tls-session-id)
    'ltm persistence ssl': {
        class: 'Persist',

        keyValueRemaps: {
            iRule: (key: string, val: any) => ({ iRule: iruleRef(val) })
        },

        customHandling: (rootObj: any, loc: any) => {
            const newObj: Record<string, any> = {};
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            rootObj.persistenceMethod = 'tls-session-id';
            GlobalObject.addProperty(globalPath, 'persistenceMethod', loc.original, { persistenceMethod: null });
            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Persist (universal)
    'ltm persistence universal': {
        class: 'Persist',

        keyValueRemaps: {
            iRule: (key: string, val: any) => ({ iRule: iruleRef(val) })
        },

        customHandling: (rootObj: any, loc: any) => {
            const newObj: Record<string, any> = {};
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            rootObj.persistenceMethod = 'universal';
            GlobalObject.addProperty(globalPath, 'persistenceMethod', loc.original, { persistenceMethod: null });
            newObj[loc.profile] = rootObj;
            return newObj;
        }
    }
};

export default persistMap;
module.exports = persistMap;
