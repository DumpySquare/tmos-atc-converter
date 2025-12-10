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
const path = require('path');

const CERTS_DIR = './test_certs'; // relative to project's root
const ENCODING = ['base64', 'inline'];

class CertsManager {
    #mapping = {};

    virtualData() {
        return Object.fromEntries(
            Object.entries(this.#mapping)
                .map(([key, info]) => [key, info.data])
        );
    }

    /**
     * Get data for virtual path
     *
     * @param {string} virtualPath - virtual path
     * @param {string} [realName] - real file name from CERTS_DIR
     * @param {'inline' | 'base64'} [encoding] - by default 'inline'
     */
    get(virtualPath, realPath, encoding = 'inline') {
        if (arguments.length === 2) {
            if (ENCODING.includes(realPath)) {
                encoding = realPath;
                realPath = '';
            }
        }
        if (!ENCODING.includes(encoding)) {
            throw new Error(`Invalid encoding value '${encoding}' (allowed one of ${ENCODING})`);
        }
        if (!this.#mapping[virtualPath]) {
            if (!realPath) {
                throw new Error(`No data available for "${virtualPath}". You need to specify 'realPath' to read it first`);
            }
            if (!fs.readdirSync(CERTS_DIR).includes(realPath)) {
                throw new Error(`File "${realPath}" doesn't exist in "${CERTS_DIR}" directory!`);
            }
            this.#mapping[virtualPath] = {
                realPath,
                data: fs.readFileSync(path.join(CERTS_DIR, realPath), 'utf-8')
            };
        }
        if (realPath && this.#mapping[virtualPath].realPath !== realPath) {
            throw new Error(`Virtual path "${virtualPath}" linked to "${this.#mapping[virtualPath].realPath}" already (requesting "${realPath}")!`);
        }
        let result = this.#mapping[virtualPath].data;
        if (encoding === 'base64') {
            result = Buffer.from(result).toString('base64');
        } else {
            result = result.replace(/\r/g, '\\r').replace(/\n/g, '\\n');
        }
        return result;
    }
}

module.exports = CertsManager;
