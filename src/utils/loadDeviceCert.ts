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

/* eslint-disable @typescript-eslint/no-require-imports */
const inputReader = require('../io/inputReader') as { data: Record<string, string> };

const certPath = 'var/tmp/cert_temp/conf/ssl.crt/server.crt';
const keyPath = 'var/tmp/cert_temp/conf/ssl.key/server.key';

export interface DeviceCert {
    certificate: string;
    privateKey: string;
}

export interface DataCertInput {
    [key: string]: string;
}

/**
 * Load device certificate and key
 *
 * @param dataCert - optional certificate data override
 * @returns device certificate object or false if not found
 */
function loadDeviceCert(dataCert?: DataCertInput): DeviceCert | false {
    const deviceCert: Partial<DeviceCert> = {};
    deviceCert.certificate = (dataCert?.[certPath]) ? dataCert[certPath] : inputReader.data[certPath];
    deviceCert.privateKey = (dataCert?.[keyPath]) ? dataCert[keyPath] : inputReader.data[keyPath];

    if (deviceCert.certificate && deviceCert.privateKey) {
        return deviceCert as DeviceCert;
    }
    return false;
}

export default loadDeviceCert;
module.exports = loadDeviceCert;
