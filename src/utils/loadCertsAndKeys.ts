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

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */
const inputReader = require('../io/inputReader') as { data: Record<string, string> };
const log = require('./log') as { debug: (msg: string) => void };

export interface LocationInfo {
    tenant: string;
}

export interface CertKeyResult {
    name: string;
    value?: string;
}

/**
 * Load certificate or key from UCS file data
 *
 * @param mockPath - path to cert/key in TMOS config
 * @param loc - location info with tenant
 * @param file - parsed TMOS config file
 * @returns cert/key name and optional value
 */
function loadCertsAndKeys(
    mockPath: string,
    loc: LocationInfo,
    file: Record<string, any>
): CertKeyResult {
    const nameSplit = mockPath.split('/');
    const isKey = mockPath.includes('.key');
    const name = (nameSplit.at(-1) ?? '').replace(/.crt$/g, '');

    try {
        const sslType = isKey ? 'key' : 'cert';
        const fileEntry = file[`sys file ssl-${sslType} ${mockPath}`];
        if (!fileEntry) throw new Error();

        const certPath = fileEntry['cache-path'] as string;
        const fileName = certPath.split('/').at(-1)?.replace(/:/g, '') ?? '';
        const certType = isKey ? 'key_' : '';
        const value = inputReader.data[`/var/tmp/filestore_temp/files_d/${loc.tenant}_d/certificate_${certType}d/${fileName}`];

        if (!value) throw new Error();
        return {
            name,
            value
        };
    } catch {
        log.debug(`Unable to load ${isKey ? 'key' : 'cert'} ${mockPath}`);
        return { name };
    }
}

export default loadCertsAndKeys;
module.exports = loadCertsAndKeys;
