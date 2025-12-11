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
import handleObjectRef from '../../../utils/handleObjectRef';

const dnsMap = {

    // DNS_TSIG_Key
    'ltm dns tsig-key': {
        class: 'DNS_TSIG_Key',

        keyValueRemaps: {
            secret: (key: string, val: any) => ({ secret: buildProtectedObj(val) })
        }
    },

    // DNS_Nameserver
    'ltm dns nameserver': {
        class: 'DNS_Nameserver',

        keyValueRemaps: {
            routeDomain: () => ({}),

            tsigKey: (key: string, val: any) => ({ tsigKey: handleObjectRef(val) })
        }
    },

    // DNS_Zone
    'ltm dns zone': {
        class: 'DNS_Zone',

        keyValueRemaps: {
            serverTsigKey: (key: string, val: any) => ({ serverTsigKey: handleObjectRef(val) }),

            transferClients: (key: string, val: any) => ({ transferClients: Object.keys(val).map((x) => handleObjectRef(x)) })
        },

        customHandling: (rootObj: any, loc: any) => {
            const newObj: Record<string, any> = {};

            // manually remap dnsExpress
            const dns: Record<string, any> = {};

            // dnsExpressAllowNotify -> dnsExpress.allowNotifyFrom
            if (rootObj.dnsExpressAllowNotify) dns.allowNotifyFrom = rootObj.dnsExpressAllowNotify;
            delete rootObj.dnsExpressAllowNotify;

            // dnsExpressEnabled -> dnsExpress.enabled
            if (Object.keys(rootObj).includes('dnsExpressEnabled')) dns.enabled = rootObj.dnsExpressEnabled;
            delete rootObj.dnsExpressEnabled;

            // dnsExpressNotifyTsigVerify -> dnsExpress.verifyNotifyTsig
            if (Object.keys(rootObj).includes('dnsExpressNotifyTsigVerify')) dns.verifyNotifyTsig = rootObj.dnsExpressNotifyTsigVerify;
            delete rootObj.dnsExpressNotifyTsigVerify;

            // dnsExpressNotifyAction -> dnsExpress.notifyAction
            if (rootObj.dnsExpressNotifyAction) dns.notifyAction = rootObj.dnsExpressNotifyAction;
            delete rootObj.dnsExpressNotifyAction;

            // dnsExpressServer -> dnsExpress.nameserver
            if (rootObj.dnsExpressServer) dns.nameserver = handleObjectRef(rootObj.dnsExpressServer);
            delete rootObj.dnsExpressServer;

            // attach to rootObj
            if (Object.keys(dns).length) rootObj.dnsExpress = dns;

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // DNS_Cache
    'ltm dns cache transparent': {
        class: 'DNS_Cache',

        keyValueRemaps: {
            localZones: (key: string, val: any) => ({
                localZones: Object.assign({}, ...Object.keys(val).map((z) => ({
                    [val[z].name]: {
                        type: 'transparent',
                        records: (val[z].records || '')
                            .replace('{', '').replace('}', '').trim()
                            .split(' "')
                            .map((x: string) => x.replace(/"/g, ''))
                            .filter((x: string) => x)
                    }
                })))
            }),

            messageCacheSize: (key: string, val: any) => ({ messageCacheSize: parseInt(val, 10) }),

            recordCacheSize: (key: string, val: any) => ({ recordCacheSize: parseInt(val, 10) })
        },

        customHandling: (rootObj: any, loc: any) => {
            rootObj.type = 'transparent';

            const newObj: Record<string, any> = {};
            newObj[loc.profile] = rootObj;
            return newObj;
        }
    }
};

export default dnsMap;
module.exports = dnsMap;
