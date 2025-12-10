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

const fs = require('fs');

const doConverter = require('../../../../src/converters/do');
const miscUtils = require('../../../testUtils/misc');
const doConverterHelpers = require('../../../testUtils/doConverterHelpers');

describe('DO Converter: DeviceCertificate: server.key and server.crt', () => {
    // get certificate and key
    it('devicecertificate', async () => {
        const data = {};

        // Setup dynamic data
        const cert = fs.readFileSync('./test_certs/test-cert-1.crt', 'utf-8');
        const key = fs.readFileSync('./test_certs/test-cert-1.key', 'utf-8');
        const theCert = 'var/tmp/cert_temp/conf/ssl.crt/server.crt';
        const theKey = 'var/tmp/cert_temp/conf/ssl.key/server.key';
        data[theCert] = cert;
        data[theKey] = key;

        const json = doConverter(data);
        const originalDec = await miscUtils.loadJSON(`${__dirname}/devicecertificate.json`);

        // Inject dynamic data into expected config
        originalDec.Common.deviceCertificate.privateKey.base64 = Buffer.from(key).toString('base64');
        originalDec.Common.deviceCertificate.certificate.base64 = Buffer.from(cert).toString('base64');

        return doConverterHelpers.compareAndValidate(
            json,
            originalDec
        );
    });
});
