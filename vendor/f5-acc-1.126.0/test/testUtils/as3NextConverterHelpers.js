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

const objectGet = require('lodash/get');

const ProcessingLogs = require('../../src/processingLog/index');
const assert = require('./assert');
const as3NextConverter = require('../../src/engines/as3Converter');
const objectUtil = require('../../src/util/object');
const parse = require('../../src/engines/parser');
const inputReader = require('../../src/preConverter/inputReader');
const validator = require('./validators/as3NextAdapter');

/**
 * Read configuration from file, parse and convert it to AS3 Declaration
 *
 * @param {String} path - path
 * @param {Object} [options] - convert options
 *
 * @returns {Promise} resolved with converted output
 */
async function readAndConvertFromFiles(path, options) {
    return as3NextConverter(parse(await inputReader.read(Array.isArray(path) ? path : [path])), options || {});
}

module.exports = {
    /**
     * Compare and validate AS3 Next data
     *
     * @param {object} actual
     * @param {object} expected
     */
    async compareAndValidate(actual, expected) {
        assert.declDeepStrictEqual(
            actual,
            expected
        );
        return this.validate(actual);
    },

    /**
     * Parse and convert BIG-IP config files
     *
     * @param {...string} files - files to convert
     * @param {object} [options] - converter options
     * @param {Object} [options.classicConverterConfig] - config for 'classic' converter
     * @param {Object} [options.nextConverterConfig] - config for 'next' converter
     *
     * @return {Promise<Object>} resolved with 'next' and 'classic' properties
     */
    async convertConfigFiles(...files) {
        let options = files.at(-1);
        if (typeof options === 'object') {
            files.pop();
        } else {
            options = {};
        }

        // Test ProcessingLogs
        options.nextConverterConfig.requestContext = new ProcessingLogs();
        return {
            classic: await readAndConvertFromFiles(files, options?.classicConverterConfig),
            next: await readAndConvertFromFiles(files, options?.nextConverterConfig)
        };
    },

    /**
     * Read and get testcase option
     *
     * @param {object} testcase
     * @param {string} key
     * @param {any} defValue - default value
     *
     * @returns {any}
     */
    getTestcaseOption(testcase, key, defValue) {
        return testcase?.type === 'testcase'
            ? objectGet(testcase, key, defValue)
            : defValue;
    },

    /**
     * Validate AS3 Next data
     *
     * @param {object} decl - declaration to validate
     */
    async validate(decl) {
        const result = await validator(decl);
        assert.isTrue(result.isValid, JSON.stringify(result, null, 4));
    },

    /**
     * Verify that every path in 'notSupportedPaths' points to object with 'class' property
     *
     * @param {Object} as3Classic - classic (reference) AS3 declaration as source of truth
     * @param {Array<String>} notSupportedPaths - list of TMOS paths that points to removed objects
     */
    verifyNotSupportedObjects(as3Classic, notSupportedPaths) {
        const makeSharedAgain = (p) => p.replace(/^\/Common\//, '/Common/Shared/');

        (notSupportedPaths || []).forEach((path) => {
            const originPath = path;
            if (!objectUtil.has(as3Classic, path, { tmosPath: true })
                && objectUtil.has(as3Classic, makeSharedAgain(path), { tmosPath: true })) {
                path = makeSharedAgain(path);
            }
            assert.isTrue(
                objectUtil.has(as3Classic, path, { tmosPath: true }),
                `should have path "${originPath}" (or "${path}") in classic AS3 declaration`
            );
            assert.isTrue(
                Object.hasOwn(
                    objectUtil.get(as3Classic, path, { tmosPath: true }),
                    'class'
                ),
                `should have "class" property (path "${originPath}" (or "${path}"))`
            );
        });
    }
};
