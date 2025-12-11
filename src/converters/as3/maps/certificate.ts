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

'use strict';

import buildProtectedObj from '../../../utils/buildProtectedObj';
import loadCertsAndKeys from '../../../utils/loadCertsAndKeys';
import GlobalObject from '../../../utils/globalRenameAndSkippedObject';

const certificateMap: Record<string, any> = {

    // Certificate and CA_Bundle
    'sys file ssl-cert': {
        class: 'UNCERTAIN_CERT',

        customHandling: (rootObj: any, loc: any, file: any) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj: Record<string, any> = {};

            const split = loc.original.split(' ');
            const path = split.at(-1);

            // skip certificates from /Common/
            if (path.startsWith('/Common/') && path.split('/').length === 3) return {};

            const cert = loadCertsAndKeys(path, loc, file);

            // only create declaration for certificate itself
            if (loc.original.includes('-bundle')) return {};

            // CA_Bundle
            if (cert && cert.value && cert.value.split('BEGIN CERTIFICATE').length > 2) {
                rootObj.class = 'CA_Bundle';
                rootObj.bundle = cert.value;
            } else {
                // Certificate
                rootObj.class = 'Certificate';
                const bundlePath = path.replace('.crt', '-bundle.crt');
                const bundle = loadCertsAndKeys(bundlePath, loc, file);
                const keyPath = path.replace('.crt', '.key');
                const key = loadCertsAndKeys(keyPath, loc, file);

                if (cert.value) {
                    rootObj.certificate = cert.value;
                }
                if (key.value) {
                    rootObj.privateKey = key.value;
                }
                if (bundle && bundle.value) {
                    rootObj.chainCA = bundle.value;
                }

                const sslKey = file[`sys file ssl-key ${keyPath}`];
                if (sslKey && sslKey.passphrase) {
                    GlobalObject.addProperty(globalPath, 'passphrase', `sys file ssl-key ${keyPath}`, { passphrase: null });
                    rootObj.passphrase = buildProtectedObj(sslKey.passphrase);
                }
            }
            delete rootObj.sourcePath;
            GlobalObject.deleteProperty(globalPath, 'sourcePath', 'RenamedProperty');
            newObj[cert.name] = rootObj;
            return newObj;
        }
    },

    // Certificate
    'sys file ssl-key': {
        noDirectMap: true
    },

    // Certificate_Validator_OCSP
    'ltm profile ocsp-stapling-params': {
        class: 'Certificate_Validator_OCSP',

        customHandling: (rootObj: any, loc: any, file: any) => {
            const newObj: Record<string, any> = {};
            const orig = file[loc.original];

            if (orig['dns-resolver']) rootObj.dnsResolver = { bigip: orig['dns-resolver'] };
            if (orig['responder-url']) rootObj.responderUrl = orig['responder-url'];
            if (orig.timeout) rootObj.timeout = parseInt(orig.timeout, 10);

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Certificate_Validator_OCSP
    'sys crypto cert-validator ocsp': {
        noDirectMap: true
    }
};

export default certificateMap;
module.exports = certificateMap;
