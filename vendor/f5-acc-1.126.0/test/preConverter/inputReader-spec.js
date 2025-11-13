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

const assert = require('../testUtils/assert');
const inputReader = require('../../src/preConverter/inputReader');

describe('Input Reader (inputReader.js)', () => {
    beforeEach(() => {
        inputReader.cleanup();
    });

    afterEach(() => {
        inputReader.cleanup();
    });

    describe('Read config ', () => {
        it('should read files from a config', async () => {
            const files = await inputReader.read(['./test/main/main.conf']);
            assert.isString(files['./test/main/main.conf']);
        });

        it('should reject when unable to read non-existing conf file', () => assert.isRejected(
            inputReader.read('no-such-file.conf')
        ));

        it('should allow to specify all input variations', async () => {
            const inputs = [
                './test/main/main.conf',
                {
                    path: './test/server/server.conf',
                    type: 'conf'
                },
                {
                    path: './test/server/server2.conf',
                    type: 'conf',
                    buffer: Buffer.from('{')
                }
            ];
            const data = await inputReader.read(inputs);
            assert.hasAllKeys(data, [
                './test/main/main.conf',
                './test/server/server.conf',
                './test/server/server2.conf'
            ]);
        });
    });

    describe('UCS extraction (extract.js)', () => {
        it('should reject when unable to read non-existing UCS file', () => assert.isRejected(
            inputReader.read('no-such-file.ucs')
        ));

        it('should reject when unable to read encrypted UCS file', () => assert.isRejected(
            inputReader.read('./test/main/encrypted.ucs'),
            /Unable to extract data/
        ));

        it('should reject when unable to read corrupted UCS file', () => assert.isRejected(
            inputReader.read('./test/basic_install_corrupted.ucs'),
            /Unable to extract data/
        ));

        it('should read files from a UCS', async () => {
            const fileList = [
                'config/bigip_user.conf',
                'config/bigip_base.conf',
                'config/.bigip_emergency.conf',
                'config/bigip.conf',
                'config/partitions/AS3_Tenant/bigip.conf'
            ];
            const files = await inputReader.read(['./test/basic_install.ucs']);
            assert.hasAllKeys(files, fileList);
            assert.isString(files['config/bigip.conf']);
            assert.isString(files['config/bigip_base.conf']);
        });
    });

    it('should persist the data via inputReader.data and cleanup data from prevous run', async () => {
        const firstRunFiles = [
            'config/bigip_user.conf',
            'config/bigip_base.conf',
            'config/.bigip_emergency.conf',
            'config/bigip.conf',
            'config/partitions/AS3_Tenant/bigip.conf'
        ];
        const firstRun = await inputReader.read(['./test/basic_install.ucs']);
        assert.deepStrictEqual(firstRun, inputReader.data);
        assert.hasAllKeys(firstRun, firstRunFiles);

        const secondRunFiles = [
            './test/main/main.conf'
        ];
        const secondRun = await inputReader.read(['./test/main/main.conf']);
        assert.notDeepEqual(firstRun, inputReader.data);
        assert.deepStrictEqual(secondRun, inputReader.data);
        assert.hasAllKeys(secondRun, secondRunFiles);

        inputReader.cleanup();
        assert.isEmpty(inputReader.data);
    });
});
