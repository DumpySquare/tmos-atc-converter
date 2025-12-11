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
import convertToNameValueObj from '../../../utils/convertToNameValueObj';
import enabledToEnable from '../../../utils/enabledToEnable';
import handleObjectRef from '../../../utils/handleObjectRef';
import loadCertsAndKeys from '../../../utils/loadCertsAndKeys';
import returnEmptyObjIfNone from '../../../utils/returnEmptyObjIfNone';
import unquote from '../../../utils/unquote';
import GlobalObject from '../../../utils/globalRenameAndSkippedObject';

import defaults from '../../../data/defaults.json';

/**
 * Removes suffix from string '100Mb' and return number.
 *
 * @param {Number | String} str - property to parse integer
 *
 * @returns {Number} number
 */
const removeSuffix = (str: number | string): number | false => {
    if (typeof str === 'number') return str;
    const match = str.match(/^(\d+)/);
    return match ? parseInt(match[0], 10) : false;
};

const profileMap = {

    // Adapt_Profile (Request)
    'ltm profile request-adapt': {
        class: 'Adapt_Profile',

        keyValueRemaps: {
            internalService: (key: string, val: any) => returnEmptyObjIfNone(val, {
                internalService: handleObjectRef(val)
            })
        },

        customHandling: (rootObj: Record<string, any>, loc: any) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj: Record<string, any> = {};

            rootObj.messageType = 'request';
            GlobalObject.addProperty(globalPath, 'messageType', loc.original, { messageType: null });

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Adapt_Profile (Response)
    'ltm profile response-adapt': {
        class: 'Adapt_Profile',

        keyValueRemaps: {
            internalService: (key: string, val: any) => returnEmptyObjIfNone(val, {
                internalService: handleObjectRef(val)
            })
        },

        customHandling: (rootObj: Record<string, any>, loc: any) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj: Record<string, any> = {};

            rootObj.messageType = 'response';
            GlobalObject.addProperty(globalPath, 'messageType', loc.original, { messageType: null });

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Analytics_Profile
    'ltm profile analytics': {
        class: 'Analytics_Profile',

        keyValueRemaps: {
            countriesForStatCollection: (key: string, val: any) => {
                if (Array.isArray(val)) {
                    return { countriesForStatCollection: val };
                }

                // if there is an entry quoted with spaces then list not converted to array by parser
                // example from parser - "{ Ecuador "Falkland Islands (Malvinas)" }""
                val = val.match(/\w+|"[^"]+"/g);
                return { countriesForStatCollection: val.map((x: string) => unquote(x)) };
            },

            externalLoggingPublisher: (key: string, val: any) => returnEmptyObjIfNone(val, {
                externalLoggingPublisher: handleObjectRef(val)
            })
        },

        customHandling: (rootObj: Record<string, any>, loc: any) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj: Record<string, any> = {};

            rootObj.captureFilter = {};
            // nested_property
            [
                'capturedProtocols',
                'capturedReadyForJsInjection',
                'clientIps',
                'dosActivity',
                'methods',
                'nodeAddresses',
                'requestCapturedParts',
                'requestContentFilterSearchPart',
                'requestContentFilterSearchString',
                'responseCapturedParts',
                'responseCodes',
                'responseContentFilterSearchPart',
                'responseContentFilterSearchString',
                'virtualServers',
                'urlFilterType',
                'urlPathPrefixes',
                'userAgentSubstrings'
            ]
                .forEach((value) => {
                    if (rootObj[value]) {
                        rootObj.captureFilter[value] = rootObj[value];
                        GlobalObject.addProperty(
                            globalPath, value, loc.original, {
                                'traffic-capture': {
                                    'capture-for-f5-appsvcs': {
                                        [value]: null
                                    }
                                }
                            }
                        );
                        delete rootObj[value];
                        GlobalObject.deleteProperty(globalPath, value, 'nestedObjectsReassingment');
                    }
                });

            if (rootObj.requestCapturedParts) { // nested_property
                rootObj.captureFilter = {};
                rootObj.captureFilter.requestCapturedParts = rootObj.requestCapturedParts;
                delete rootObj.requestCapturedParts;
            }
            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Analytics_TCP_Profile
    'ltm profile tcp-analytics': {
        class: 'Analytics_TCP_Profile',

        keyValueRemaps: {
            externalLoggingPublisher: (key: string, val: any) => returnEmptyObjIfNone(val, {
                externalLoggingPublisher: handleObjectRef(val)
            })
        }
    },

    // Capture_Filter (Analytics_Profile subobject)
    'ltm profile analytics traffic-capture capture-for-f5-appsvcs': {
        class: 'Capture_Filter',

        keyValueRemaps: {
            nodeAddresses: (key: string, val: any) => {
                if (typeof val === 'object') {
                    return { nodeAddresses: Object.keys(val) };
                }
                return { nodeAddresses: val };
            },

            requestContentFilterSearchString: (key: string, val: any) => ({ requestContentFilterSearchString: val }),

            responseContentFilterSearchString: (key: string, val: any) => ({ responseContentFilterSearchString: val }),

            userAgentSubstrings: (key: string, val: any) => {
                if (Array.isArray(val)) {
                    return { userAgentSubstrings: val };
                }

                // if there is an entry quoted with spaces then list not converted to array by parser
                // example from parser - "{ "Mozilla (01" "Mozilla (02" "Mozilla (03" }""
                val = val.match(/\w+|"[^"]+"/g);
                return { userAgentSubstrings: val.map((x: string) => unquote(x)) };
            },

            virtualServers: (key: string, val: any) => {
                if (typeof val === 'object') {
                    return { virtualServers: Object.keys(val) };
                }
                return { virtualServers: val };
            }
        }
    },

    // Classification_Profile
    'ltm profile classification': {
        class: 'Classification_Profile',

        keyValueRemaps: {
            parentProfile: (key: string, val: any) => ({ parentProfile: handleObjectRef(val) }),

            logPublisher: (key: string, val: any) => ({ logPublisher: handleObjectRef(val) }),

            preset: (key: string, val: any) => ({ preset: handleObjectRef(val) }),

            statisticsPublisher: (key: string, val: any) => ({ statisticsPublisher: handleObjectRef(val) })
        }
    },

    // DNS_Profile
    'ltm profile dns': {
        class: 'DNS_Profile',

        keyValueRemaps: {
            cache: (key: string, val: any) => returnEmptyObjIfNone(val, { cache: { bigip: val } }),

            dns64Prefix: (key: string, val: any) => ({ dns64Prefix: val === 'any6' ? '0:0:0:0:0:0:0:0' : val }),

            loggingProfile: (key: string, val: any) => returnEmptyObjIfNone(val, { loggingProfile: { bigip: val } }),

            parentProfile: (key: string, val: any) => ({ parentProfile: handleObjectRef(val) }),

            securityProfile: (key: string, val: any) => returnEmptyObjIfNone(val, { securityProfile: { bigip: val } })

        }
    },

    // L4_Profile
    'ltm profile fastl4': {
        class: 'L4_Profile',

        keyValueRemaps: {
            keepAliveInterval: (key: string, val: any) => ({ keepAliveInterval: val !== 'disabled' ? val : 0 })
        }
    },

    // FIX_Profile
    'ltm profile fix': {
        class: 'FIX_Profile',

        keyValueRemaps: {
            fullLogonParsingEnabled: (key: string, val: any) => ({ fullLogonParsingEnabled: val === 'true' }),

            messageLogPublisher: (key: string, val: any) => returnEmptyObjIfNone(val, { messageLogPublisher: handleObjectRef(val) }),

            parentProfile: (key: string, val: any) => ({ parentProfile: handleObjectRef(val) }),

            quickParsingEnabled: (key: string, val: any) => ({ quickParsingEnabled: val === 'true' }),

            responseParsingEnabled: (key: string, val: any) => ({ responseParsingEnabled: val === 'true' }),

            reportLogPublisher: (key: string, val: any) => returnEmptyObjIfNone(val, { reportLogPublisher: handleObjectRef(val) }),

            senderTagMappingList: (key: string, val: any) => {
                if (val === 'none') return {};
                return {
                    senderTagMappingList: Object.keys(val).map((x) => ({
                        senderId: val[x]['sender-id'],
                        tagDataGroup: handleObjectRef(val[x]['tag-map-class'])
                    }))
                };
            }
        }
    },

    // FTP_Profile
    'ltm profile ftp': {
        class: 'FTP_Profile',

        keyValueRemaps: {
            allowFtps: () => ({ }),

            algLogProfile: (key: string, val: any) => returnEmptyObjIfNone(val, { algLogProfile: handleObjectRef(val) }),

            logPublisher: (key: string, val: any) => returnEmptyObjIfNone(val, { logPublisher: handleObjectRef(val) })
        }
    },

    // ICAP_Profile
    'ltm profile icap': {
        class: 'ICAP_Profile'
    },

    // Radius_Profile
    'ltm profile radius': {
        class: 'Radius_Profile',

        keyValueRemaps: {
            parentProfile: (key: string, val: any) => ({ parentProfile: handleObjectRef(val) }),

            protocolProfile: (key: string, val: any) => ({ protocolProfile: handleObjectRef(val) })
        }
    },

    // HTML_Profile
    'ltm profile html': {
        class: 'HTML_Profile',

        customHandling: (rootObj: Record<string, any>, loc: any) => {
            const newObj: Record<string, any> = {};

            if (rootObj.rules) {
                const rules = [];
                const keys = Object.keys(rootObj.rules);
                for (let i = 0; i < keys.length; i += 1) {
                    rules.push(handleObjectRef(keys[i]));
                }

                rootObj.rules = rules;
            }

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // HTTP_Acceleration_Profile
    'ltm profile web-acceleration': {
        class: 'HTTP_Acceleration_Profile',

        keyValueRemaps: {
            cacheSize: (key: string, val: any) => ({ cacheSize: removeSuffix(val) }),

            metadataMaxSize: (key: string, val: any) => ({ metadataMaxSize: removeSuffix(val) }),

            parentProfile: (key: string, val: any) => ({ parentProfile: handleObjectRef(val) })
        },

        customHandling: (rootObj: Record<string, any>, loc: any) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj: Record<string, any> = {};

            if (rootObj.cacheSize === false) {
                delete rootObj.cacheSize;
                GlobalObject.deleteProperty(globalPath, 'cacheSize');
            }
            if (rootObj.metadataMaxSize === false) {
                delete rootObj.metadataMaxSize;
                GlobalObject.deleteProperty(globalPath, 'metadataMaxSize');
            }

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // HTTP_Compress
    'ltm profile http-compression': {
        class: 'HTTP_Compress',

        keyValueRemaps: {
            contentTypeExclude: (key: string, val: any) => ({ contentTypeExcludes: val }),

            contentTypeInclude: (key: string, val: any) => ({ contentTypeIncludes: val }),

            gzipMemory: (key: string, val: any) => ({ gzipMemory: removeSuffix(val) }),

            gzipWindowSize: (key: string, val: any) => ({ gzipWindowSize: removeSuffix(val) }),

            uriExclude: (key: string, val: any) => ({ uriExcludes: val }),

            uriInclude: (key: string, val: any) => ({ uriIncludes: val })
        },

        customHandling: (rootObj: Record<string, any>, loc: any) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj: Record<string, any> = {};

            // Parse string like: '{ text/ "application/(xml|x-javascript)" }'
            if (rootObj.contentTypeIncludes && rootObj.contentTypeIncludes.includes('{')) {
                rootObj.contentTypeIncludes = rootObj.contentTypeIncludes.split(' ').slice(1, -1).map((x: string) => unquote(x));
            }
            if (rootObj.contentTypeExcludes && rootObj.contentTypeExcludes.includes('{')) {
                rootObj.contentTypeExcludes = rootObj.contentTypeExcludes.split(' ').slice(1, -1).map((x: string) => unquote(x));
            }

            if (rootObj.gzipMemory === false) {
                delete rootObj.gzipMemory;
                GlobalObject.deleteProperty(globalPath, 'gzipMemory');
            }
            if (rootObj.gzipWindowSize === false) {
                delete rootObj.gzipWindowSize;
                GlobalObject.deleteProperty(globalPath, 'gzipWindowSize');
            }

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // HTTP_Profile
    'ltm profile http': {
        class: 'HTTP_Profile',

        prependProps: ['hsts'],

        keyValueRemaps: {
            cookiePassphrase: (key: string, val: any) => ({ cookiePassphrase: buildProtectedObj(val) }),

            encryptCookies: (key: string, val: any) => returnEmptyObjIfNone(val, { encryptCookies: val }),

            fallbackRedirect: (key: string, val: any) => returnEmptyObjIfNone(val, { fallbackRedirect: val }),

            insertHeader: (key: string, val: any) => {
                if (val === 'none') return {};
                return { insertHeader: convertToNameValueObj(val) };
            },

            rewriteRedirects: (key: string, val: any) => ({ rewriteRedirects: (val === 'nodes' ? 'addresses' : val) }),

            whiteOutHeader: (key: string, val: any) => returnEmptyObjIfNone(val, { whiteOutHeader: val })
        },

        customHandling: (rootObj: Record<string, any>, loc: any) => {
            const newObj: Record<string, any> = {};

            // HTTP_Profile Explicit
            if (rootObj.resolver) rootObj.resolver = { bigip: rootObj.resolver };
            if (rootObj.routeDomain) rootObj.routeDomain = parseInt(rootObj.routeDomain.split('/Common/')[1], 10);

            // handle possible parser error (knownMethods should be array)
            if (rootObj.knownMethods && !Array.isArray(rootObj.knownMethods)) {
                const objKey = Object.keys(rootObj.knownMethods)[0];
                const objArr = rootObj.knownMethods[objKey].split(' ');
                objArr.unshift(objKey);
                rootObj.knownMethods = objArr;
            }

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // HTTP_Profile (websocket profile maps to http)
    'ltm profile websocket': {
        class: 'HTTP_Profile',

        customHandling: (rootObj: Record<string, any>, loc: any) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj: Record<string, any> = {};

            rootObj.webSocketsEnabled = true;
            GlobalObject.addProperty(
                globalPath, 'webSocketsEnabled', loc.original, { webSocketsEnabled: null }
            );

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // HTTP2_Profile
    'ltm profile http2': {
        class: 'HTTP2_Profile',

        keyValueRemaps: {
            activationMode: (key: string, val: any) => {
                let newVal = val;
                if (Array.isArray(val)) {
                    newVal = val[0];
                } else if (typeof val === 'object') {
                    newVal = Object.keys(val)[0];
                }
                return { activationMode: newVal };
            }
        }
    },

    // IP_Other_Profile
    'ltm profile ipother': {
        class: 'IP_Other_Profile',

        keyValueRemaps: {
            parentProfile: (key: string, val: any) => ({ parentProfile: handleObjectRef(val) })
        }
    },

    // Multiplex_Profile
    'ltm profile one-connect': {
        class: 'Multiplex_Profile',

        keyValueRemaps: {
            idleTimeoutOverride: (key: string, val: any) => ({ idleTimeoutOverride: (val === 'disabled' ? 0 : val) }),

            sourceMask: (key: string, val: any) => (val === 'any' ? {} : { sourceMask: val })
        }
    },

    // Traffic_Log_Profile
    'ltm profile request-log': {
        class: 'Traffic_Log_Profile',

        keyValueRemaps: {
            parentProfile: (key: string, val: any) => ({ parentProfile: handleObjectRef(val) }),

            proxyResponse: (key: string, val: any) => returnEmptyObjIfNone(val, { proxyResponse: unquote(val) }),

            requestErrorPool: (key: string, val: any) => returnEmptyObjIfNone(val, { requestErrorPool: handleObjectRef(val) }),

            requestErrorProtocol: (key: string, val: any) => returnEmptyObjIfNone(val, { requestErrorProtocol: val }),

            requestErrorTemplate: (key: string, val: any) => returnEmptyObjIfNone(val, { requestErrorTemplate: unquote(val) }),

            remark: (key: string, val: any) => returnEmptyObjIfNone(val, { remark: val }),

            requestPool: (key: string, val: any) => returnEmptyObjIfNone(val, { requestPool: handleObjectRef(val) }),

            requestProtocol: (key: string, val: any) => returnEmptyObjIfNone(val, { requestProtocol: val }),

            requestTemplate: (key: string, val: any) => returnEmptyObjIfNone(val, { requestTemplate: unquote(val) }),

            responseErrorPool: (key: string, val: any) => returnEmptyObjIfNone(val, { responseErrorPool: handleObjectRef(val) }),

            responseErrorProtocol: (key: string, val: any) => returnEmptyObjIfNone(val, { responseErrorProtocol: val }),

            responseErrorTemplate: (key: string, val: any) => returnEmptyObjIfNone(val, { responseErrorTemplate: val }),

            responsePool: (key: string, val: any) => returnEmptyObjIfNone(val, { responsePool: handleObjectRef(val) }),

            responseProtocol: (key: string, val: any) => returnEmptyObjIfNone(val, { responseProtocol: val }),

            responseTemplate: (key: string, val: any) => returnEmptyObjIfNone(val, { responseTemplate: val })
        },

        customHandling: (rootObj: Record<string, any>, loc: any) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj: Record<string, any> = {};
            const rootKeys = Object.keys(rootObj);

            // requestSettings
            const req: Record<string, any> = {};
            GlobalObject.addProperty(
                globalPath, 'requestSettings', loc.original, { requestSettings: null }
            );
            const reqArr = [
                'requestErrorLoggingEnabled',
                'proxyCloseOnErrorEnabled',
                'proxyRespondOnLoggingErrorEnabled',
                'proxyResponse',
                'requestEnabled',
                'requestErrorPool',
                'requestErrorProtocol',
                'requestErrorTemplate',
                'requestPool',
                'requestProtocol',
                'requestTemplate'
            ];
            for (let i = 0; i < reqArr.length; i += 1) {
                if (rootKeys.includes(reqArr[i])) req[reqArr[i]] = rootObj[reqArr[i]];
                delete rootObj[reqArr[i]];
                GlobalObject.moveProperty(globalPath, reqArr[i], `${globalPath}/requestSettings`, reqArr[i]);
            }

            // responseSettings
            const res: Record<string, any> = {};
            GlobalObject.addProperty(
                globalPath, 'responseSettings', loc.original, { responseSettings: null }
            );
            const resArr = [
                'byDefaultEnabled',
                'responseEnabled',
                'responseErrorLoggingEnabled',
                'responseErrorPool',
                'responseErrorProtocol',
                'responseErrorTemplate',
                'responsePool',
                'responseProtocol',
                'responseTemplate'
            ];
            for (let i = 0; i < resArr.length; i += 1) {
                if (rootKeys.includes(resArr[i])) res[resArr[i]] = rootObj[resArr[i]];
                delete rootObj[resArr[i]];
                GlobalObject.moveProperty(globalPath, resArr[i], `${globalPath}/responseSettings`, resArr[i]);
            }

            rootObj.requestSettings = req;
            rootObj.responseSettings = res;

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Rewrite_Profile
    'ltm profile rewrite': {
        class: 'Rewrite_Profile',

        keyValueRemaps: {
            certificate: (key: string, val: any) => {
                if (defaults.includes(val)) return {};
                return { certificate: val.replace(/\.crt$/g, '') };
            },

            defaultsFrom: () => ({}),

            javaCaFile: (key: string, val: any) => ({ javaCaFile: handleObjectRef(val) }),

            javaCrl: () => ({}),

            javaSignKey: () => ({}),

            setCookieRules: (key: string, val: any) => ({ setCookieRules: Object.keys(val).map((x) => val[x]) }),

            uriRules: (key: string, val: any) => ({ uriRules: Object.keys(val).map((x) => val[x]) })
        },

        customHandling: (rootObj: Record<string, any>, loc: any, file: any) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj: Record<string, any> = {};
            const orig = file[loc.original];
            const rootKeys = Object.keys(rootObj);

            // rootObj.javaSignKeyPassphrase
            const pass = orig['java-sign-key-passphrase-encrypted'];
            if (pass) {
                rootObj.javaSignKeyPassphrase = buildProtectedObj(pass);
            }

            // rootObj.requestSettings
            const req: Record<string, any> = {};

            // insertXforwardedForEnabled -> requestSettings.insertXforwardedForEnabled
            if (rootKeys.includes('insertXforwardedForEnabled')) req.insertXforwardedForEnabled = rootObj.insertXforwardedForEnabled;
            delete rootObj.insertXforwardedForEnabled;

            // insertXforwardedHostEnabled -> requestSettings.insertXforwardedHostEnabled
            if (rootKeys.includes('insertXforwardedHostEnabled')) req.insertXforwardedHostEnabled = rootObj.insertXforwardedHostEnabled;
            delete rootObj.insertXforwardedHostEnabled;

            // insertXforwardedProtoEnabled -> requestSettings.insertXforwardedProtoEnabled
            if (rootKeys.includes('insertXforwardedProtoEnabled')) req.insertXforwardedProtoEnabled = rootObj.insertXforwardedProtoEnabled;
            delete rootObj.insertXforwardedProtoEnabled;

            // rootObj.responseSettings
            const res: Record<string, any> = {};

            // rewriteContentEnabled -> responseSettings.rewriteContentEnabled
            if (rootKeys.includes('rewriteContentEnabled')) res.rewriteContentEnabled = rootObj.rewriteContentEnabled;
            delete rootObj.rewriteContentEnabled;

            // the rewriteHeadersEnabled option exists for both req and res, however one is being overwritten
            if (orig.request) req.rewriteHeadersEnabled = orig.request['rewrite-headers'] === 'enabled';
            if (orig.response) res.rewriteHeadersEnabled = orig.response['rewrite-headers'] === 'enabled';
            delete rootObj.rewriteHeadersEnabled;

            if (Object.keys(req).length) {
                rootObj.requestSettings = req;
                GlobalObject.addProperty(globalPath, 'requestSettings', loc.original, { requestSettings: null }); // nested_property
            }
            if (Object.keys(res).length) {
                rootObj.responseSettings = res;
                GlobalObject.addProperty(globalPath, 'responseSettings', loc.original, { responseSettings: null }); // nested_property
            }
            if (rootObj.uriRules) {
                for (let i = 0; i < rootObj.uriRules.length; i += 1) {
                    Object.entries(rootObj.uriRules[i]).forEach(([key, value]) => {
                        // If the value is an object and not a string, we might want to stringify it
                        if (value && typeof value === 'object') {
                            Object.entries(value).forEach(([nestedKey]) => {
                                GlobalObject.addProperty(`${globalPath}/uriRules/${i}/${key}`, nestedKey, loc.original, { 'uri-rules': { [i]: { [key]: { [nestedKey]: null } } } });
                            });
                        }
                        if (value && typeof value === 'string') {
                            GlobalObject.addProperty(`${globalPath}/uriRules/${i}`, key, loc.original, { 'uri-rules': { [i]: { [key]: null } } });
                        }
                    });
                }
            }
            if (rootObj.setCookieRules) {
                for (let i = 0; i < rootObj.setCookieRules.length; i += 1) {
                    Object.entries(rootObj.setCookieRules[i]).forEach(([key, value]) => {
                        // If the value is an object and not a string, we might want to stringify it
                        if (value && typeof value === 'object') {
                            Object.entries(value).forEach(([nestedKey]) => {
                                GlobalObject.addProperty(`${globalPath}/setCookieRules/${i}/${key}`, nestedKey, loc.original, { 'set-cookie-rules': { [i]: { [key]: { [nestedKey]: null } } } });
                            });
                        }
                        if (value && typeof value === 'string') {
                            GlobalObject.addProperty(`${globalPath}/setCookieRules/${i}/${key}`, key, loc.original, { 'set-cookie-rules': { [i]: { [key]: null } } });
                        }
                    });
                }
            }
            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // SIP_Profile
    'ltm profile sip': {
        class: 'SIP_Profile'
    },

    // Stream_Profile
    'ltm profile stream': {
        class: 'Stream_Profile',

        keyValueRemaps: {
            parentProfile: (key: string, val: any) => ({ parentProfile: handleObjectRef(val) })
        }
    },

    // TCP_Profile
    'ltm profile tcp': {
        class: 'TCP_Profile',

        customHandling: (rootObj: Record<string, any>, loc: any) => {
            const newObj: Record<string, any> = {};
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            if (rootObj.idleTimeout === -1) {
                GlobalObject.deleteProperty(globalPath, 'idleTimeout', 'RenamedProperty');
                delete rootObj.idleTimeout;
            }
            if (rootObj.tcpOptions) {
                let split = rootObj.tcpOptions.match(/{.+?}/g);
                split = split.map((x: string) => x.replace('{', '').replace('}', ''));
                const newOptions: any[] = [];
                split.forEach((value: string, index: number) => {
                    const newOption: Record<string, any> = {};
                    if (value.includes('first')) {
                        value = value.replace('first', '');
                        newOption.when = 'first';
                        newOption.option = parseInt(value, 10);
                        newOptions.push(newOption);
                    } else if (value.includes('last')) {
                        value = value.replace('last', '');
                        newOption.when = 'last';
                        newOption.option = parseInt(value, 10);
                        newOptions.push(newOption);
                    }
                    GlobalObject.addProperty(`${globalPath}/tcpOptions/${index}`, 'when', loc.original, { 'tcp-options': { [index]: { [newOption.when]: null } } });
                    GlobalObject.addProperty(`${globalPath}/tcpOptions/${index}`, 'option', loc.original, { 'tcp-options': { [index]: { [newOption.option]: null } } });
                });
                rootObj.tcpOptions = newOptions;
            }

            newObj[loc.profile] = rootObj;
            return newObj;
        },

        keyValueRemaps: {
            closeWaitTimeout: (key: string, val: any) => ({ closeWaitTimeout: val === 4294967295 ? -1 : val }),

            finWaitTimeout: (key: string, val: any) => ({ finWaitTimeout: val === 4294967295 ? -1 : val }),

            finWait2Timeout: (key: string, val: any) => ({ finWait2Timeout: val === 4294967295 ? -1 : val }),

            idleTimeout: (key: string, val: any) => ({ idleTimeout: val === 4294967295 ? -1 : val }),

            md5SignaturePassphrase: (key: string, val: any) => returnEmptyObjIfNone(
                val,
                { md5SignaturePassphrase: buildProtectedObj(val) }
            ),

            mptcp: (key: string, val: any) => ({ mptcp: enabledToEnable(val) }),

            nagle: (key: string, val: any) => ({ nagle: enabledToEnable(val) }),

            tcpOptions: (key: string, val: any) => returnEmptyObjIfNone(val, { tcpOptions: val }),

            timeWaitTimeout: (key: string, val: any) => ({ timeWaitTimeout: val === 'indefinite' ? -1 : val }),

            zeroWindowTimeout: (key: string, val: any) => ({ zeroWindowTimeout: val === 4294967295 ? -1 : val })
        }
    },

    // TLS_Client
    'ltm profile server-ssl': {
        class: 'TLS_Client',

        customHandling: (rootObj: Record<string, any>, loc: any, file: any) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj: Record<string, any> = {};

            if (rootObj.clientCertificate === '/Common/default.crt') {
                const certName = 'certificate_default';
                newObj.certificate_default = {
                    class: 'Certificate',
                    certificate: { bigip: '/Common/default.crt' },
                    privateKey: { bigip: '/Common/default.key' }
                };
                rootObj.clientCertificate = certName; // nested_property
            } else if (rootObj.clientCertificate && rootObj.clientCertificate !== 'none') {
                if (rootObj.clientCertificate.split('/').length >= 3) {
                    const certName = rootObj.clientCertificate.split('/').at(-1).replace(/\.crt$/g, '');
                    const rootObjKeys = Object.keys(rootObj);
                    newObj[certName] = { class: 'Certificate' }; // nested_property

                    if (rootObjKeys.includes('clientCertificate')) {
                        newObj[certName].certificate = { bigip: rootObj.clientCertificate }; // nested_property
                    }
                    if (rootObjKeys.includes('chain') && rootObj.chain !== 'none') {
                        newObj[certName].chainCA = { bigip: rootObj.chain }; // nested_property
                    }
                    if (rootObjKeys.includes('key')) {
                        newObj[certName].privateKey = { bigip: rootObj.key }; // nested_property
                    }
                    if (rootObjKeys.includes('passphrase')) {
                        newObj[certName].passphrase = buildProtectedObj(rootObj.passphrase); // nested_property
                    }
                }

                const cert = loadCertsAndKeys(rootObj.clientCertificate, loc, file);
                rootObj.clientCertificate = cert.name;
            }

            if (rootObj.clientCertificate === 'none') {
                delete rootObj.clientCertificate;
                GlobalObject.deleteProperty(globalPath, 'clientCertificate');
            }

            if (rootObj.ciphers === 'none' && rootObj.cipherGroup) {
                delete rootObj.ciphers;
                GlobalObject.deleteProperty(globalPath, 'ciphers');
            }

            delete rootObj.chain;
            delete rootObj.key;
            delete rootObj.passphrase;

            // Check different options enabled
            rootObj.tls1_0Enabled = !!((rootObj.options && !rootObj.options.includes('no-tlsv1')) || !rootObj.options);
            GlobalObject.addProperty(globalPath, 'tls1_0Enabled', loc.original, { tls1_0Enabled: null });
            rootObj.tls1_1Enabled = !!((rootObj.options && !rootObj.options.includes('no-tlsv1.1')) || !rootObj.options);
            GlobalObject.addProperty(globalPath, 'tls1_1Enabled', loc.original, { tls1_1Enabled: null });
            rootObj.tls1_2Enabled = !!((rootObj.options && !rootObj.options.includes('no-tlsv1.2')) || !rootObj.options);
            GlobalObject.addProperty(globalPath, 'tls1_2Enabled', loc.original, { tls1_2Enabled: null });
            rootObj.tls1_3Enabled = !!(((rootObj.options && !rootObj.options.includes('no-tlsv1.3')) || !rootObj.options) && rootObj.cipherGroup);
            GlobalObject.addProperty(globalPath, 'tls1_3Enabled', loc.original, { tls1_3Enabled: null });
            rootObj.singleUseDhEnabled = !!(rootObj.options && rootObj.options.includes('single-dh-use'));
            GlobalObject.addProperty(globalPath, 'singleUseDhEnabled', loc.original, { singleUseDhEnabled: null });
            rootObj.insertEmptyFragmentsEnabled = !!((rootObj.options && !rootObj.options.includes('dont-insert-empty-fragments')) || !rootObj.options);
            GlobalObject.addProperty(globalPath, 'insertEmptyFragmentsEnabled', loc.original, { insertEmptyFragmentsEnabled: null });
            delete rootObj.options;

            newObj[loc.profile] = rootObj;
            return newObj;
        },

        keyValueRemaps: {
            authenticationFrequency: (key: string, val: any) => ({ authenticationFrequency: val === 'once' ? 'one-time' : 'every-time' }),

            c3dCACertificate: (key: string, val: any) => returnEmptyObjIfNone(val, { c3dCACertificate: val }),

            c3dCAKey: (key: string, val: any) => returnEmptyObjIfNone(val, { c3dCAKey: val }),

            crlFile: (key: string, val: any) => returnEmptyObjIfNone(val, { crlFile: val }),

            trustCA: (key: string, val: any) => returnEmptyObjIfNone(val, { trustCA: val === '/Common/ca-bundle.crt' ? 'generic' : { use: val } }),

            cipherGroup: (key: string, val: any) => returnEmptyObjIfNone(val, { cipherGroup: handleObjectRef(val) })
        }
    },

    // TLS_Server
    'ltm profile client-ssl': {
        class: 'TLS_Server',

        customHandling: (rootObj: Record<string, any>, loc: any) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj: Record<string, any> = {};
            const certificates: any[] = [];

            const certKeys = Object.keys(rootObj.certificates);
            for (let i = 0; i < certKeys.length; i += 1) {
                const certKey = certKeys[i];
                const certConf = rootObj.certificates[certKey];

                // handle cert ref
                let certRef = certConf.cert;
                let obj: Record<string, any> = {};
                if (certRef === '/Common/default.crt') {
                    obj = { certificate: 'certificate_default' };
                    newObj.certificate_default = {
                        class: 'Certificate',
                        certificate: { bigip: '/Common/default.crt' },
                        privateKey: { bigip: '/Common/default.key' }
                    }; // nested_property
                } else {
                    if (!defaults.includes(certConf.cert)) {
                        const len = certRef.split('/').length;
                        if (len >= 3) {
                            let certName;

                            // cert /partition1/test_cert.crt
                            if (len === 3) {
                                certName = certRef.split('/')[2].replace(/\.crt$/g, '');

                                // Certificate class will end up in partition even if tmsh cert originally not
                                certRef = certRef.replace(`/${certRef.startsWith('/Common/') ? 'Common' : loc.tenant}/`, `/${loc.tenant}/${loc.app}/`);

                            // cert /Common/application_1/test_cert.crt
                            // and /Common/test/test_cert.crt -> /Common/Shared/test_cert.crt
                            } else {
                                certName = certRef.split('/')[3].replace(/\.crt$/g, '');

                                if (certRef.startsWith('/Common/')) {
                                    certRef = `/Common/Shared/${certName}`;
                                }
                            }

                            const certConfKeys = Object.keys(certConf);
                            if (certName.match(/^\d/)) {
                                /* The certificate name starts with a digit.
                                    That means that it was not renamed earlier at the deduplication stage.
                                    That means there was no 'sys file ssl-cert' for this certificate.
                                    Rename the certificate name in the way
                                    similar to the deduplication stage manner. */
                                certName = 'file_'.concat(certName);
                                // update certRef too, only the last portion of the path
                                const certRefParts = certRef.split('/');
                                certRefParts.splice(-1, 1, certName);
                                certRef = certRefParts.join('/');
                                rootObj.certificates[certName] = rootObj.certificates[certKey];
                                delete rootObj.certificates[certKey];
                            }
                            newObj[certName] = { class: 'Certificate' };

                            /* If the certificate file path was changed because it was starting with a digit
                                during the deduplication stage, restore it now */
                            const certPath = certConf.accOrigCert ? certConf.accOrigCert : certConf.cert;
                            if (certConfKeys.includes('cert')) newObj[certName].certificate = { bigip: certPath }; // nested_property
                            if (certConfKeys.includes('chain')) newObj[certName].chainCA = { bigip: certConf.chain }; // nested_property
                            if (certConfKeys.includes('key')) newObj[certName].privateKey = { bigip: certConf.key }; // nested_property
                            if (certConfKeys.includes('passphrase')) newObj[certName].passphrase = buildProtectedObj(certConf.passphrase); // nested_property
                        }

                        certRef = certRef.replace(/\.crt$/g, '');
                    }
                    obj = { certificate: certRef };
                }
                if (rootObj.matchToSNI && rootObj.matchToSNI !== 'none') obj.matchToSNI = rootObj.matchToSNI;
                certificates.push(obj);
            }

            if (rootObj.ciphers === 'none' && rootObj.cipherGroup) {
                delete rootObj.ciphers;
                GlobalObject.deleteProperty(globalPath, 'ciphers');
            }

            // Check different options enabled
            rootObj.tls1_0Enabled = !!((rootObj.options && !rootObj.options.includes('no-tlsv1')) || !rootObj.options);
            GlobalObject.addProperty(globalPath, 'tls1_0Enabled', loc.original, { tls1_0Enabled: null });
            rootObj.tls1_1Enabled = !!((rootObj.options && !rootObj.options.includes('no-tlsv1.1')) || !rootObj.options);
            GlobalObject.addProperty(globalPath, 'tls1_1Enabled', loc.original, { tls1_1Enabled: null });
            rootObj.tls1_2Enabled = !!((rootObj.options && !rootObj.options.includes('no-tlsv1.2')) || !rootObj.options);
            GlobalObject.addProperty(globalPath, 'tls1_2Enabled', loc.original, { tls1_2Enabled: null });
            rootObj.tls1_3Enabled = !!(((rootObj.options && !rootObj.options.includes('no-tlsv1.3')) || !rootObj.options) && rootObj.cipherGroup);
            GlobalObject.addProperty(globalPath, 'tls1_3Enabled', loc.original, { tls1_3Enabled: null });
            rootObj.singleUseDhEnabled = !!(rootObj.options && rootObj.options.includes('single-dh-use'));
            GlobalObject.addProperty(globalPath, 'singleUseDhEnabled', loc.original, { singleUseDhEnabled: null });
            rootObj.insertEmptyFragmentsEnabled = !!((rootObj.options && !rootObj.options.includes('dont-insert-empty-fragments')) || !rootObj.options);
            GlobalObject.addProperty(globalPath, 'insertEmptyFragmentsEnabled', loc.original, { insertEmptyFragmentsEnabled: null });
            delete rootObj.options;

            delete rootObj.matchToSNI;
            rootObj.certificates = certificates;
            newObj[loc.profile] = rootObj;
            return newObj;
        },

        keyValueRemaps: {
            authenticationFrequency: (key: string, val: any) => ({ authenticationFrequency: val === 'once' ? 'one-time' : 'every-time' }),

            authenticationInviteCA: (key: string, val: any) => {
                if (val === 'none') return {};
                return { authenticationInviteCA: handleObjectRef(val) };
            },

            authenticationTrustCA: (key: string, val: any) => {
                if (val === 'none') return {};
                return { authenticationTrustCA: handleObjectRef(val) };
            },

            c3dOCSP: (key: string, val: any) => returnEmptyObjIfNone(val, { c3dOCSP: val }),

            proxyCaCert: () => ({}),

            proxyCaKey: () => ({}),

            proxyCaPassphrase: () => ({}),

            cipherGroup: (key: string, val: any) => returnEmptyObjIfNone(val, { cipherGroup: handleObjectRef(val) }),

            crlFile: (key: string, val: any) => returnEmptyObjIfNone(val, { crlFile: val }),

            enabled: () => ({}),

            forwardProxyBypassAllowlist: (key: string, val: any) => returnEmptyObjIfNone(
                val,
                { forwardProxyBypassAllowlist: handleObjectRef(val) }
            ),

            sniDefault: () => ({})
        }
    },

    // UDP_Profile
    'ltm profile udp': {
        class: 'UDP_Profile',

        keyValueRemaps: {
            idleTimeout: (key: string, val: any) => ({ idleTimeout: val === 'indefinite' ? -1 : val })
        }
    }
};

export default profileMap;
module.exports = profileMap;
