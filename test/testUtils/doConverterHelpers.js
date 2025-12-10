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

const assert = require('./assert');
const doConverter = require('../../src/converters/do');
const parse = require('../../src/parser');
const inputReader = require('../../src/io/inputReader');
const validator = require('./validators/doAdapter');

module.exports = {
    /**
     * Compare and validate DO Classic data
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
     *
     * @returns {Promise<object>} converted data
     */
    async convertConfigFiles(...files) {
        const data = await inputReader.read(files);
        const parsed = parse(data);
        return doConverter(parsed);
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
     * Validate DO Classic data
     *
     * @param {object} decl - declaration to validate
     */
    async validate(decl) {
        const result = await validator(decl);
        assert.isTrue(result.isValid, JSON.stringify(result, null, 4));
    }
};
