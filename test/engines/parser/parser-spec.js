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
const sinon = require('sinon');

const assert = require('../../testUtils/assert');
const parse = require('../../../src/parser');
const inputReader = require('../../../src/io/inputReader');
const log = require('../../../src/utils/log');
const testGenUtils = require('../../testUtils/testsGenerator');

describe('Parse the config (parse.js)', () => {
    describe('auto-tests', () => {
        const SEARCH_DIR = __dirname;

        const autotestFiles = testGenUtils.findAutoTests(SEARCH_DIR);
        if (autotestFiles.length === 0) {
            process.stderr.write(`No .autotest.json files found inside of "${SEARCH_DIR}"`);
            return;
        }

        autotestFiles
            .map((f) => testGenUtils.makeTestcase(f, SEARCH_DIR))
            .forEach((testcase) => testGenUtils.renderTestcase(testcase, (spec) => {
                let expected;

                try {
                    expected = JSON.parse(fs.readFileSync(spec.output));
                } catch (err) {
                    throw new Error(`Unable to read and parse "${spec.output}":\n${err}`);
                }

                return async () => {
                    const data = await inputReader.read(spec.files.map((f) => f.fullPath));
                    const json = parse(data);
                    assert.deepStrictEqual(json, expected);
                };
            }));
    });

    it('should throw an exception for mis-indented "}"', async () => {
        const data = await inputReader.read(['./test/engines/parser/mis-indented_curly_brace.conf']);
        assert.throws(
            () => parse(data),
            /.*Missing or mis-indented '}' for line: ' {4}devices {'$/
        );
    });

    it('should give a warning for mis-indented property', async () => {
        const consoleLogSpy = sinon.spy(log, 'warn');
        const data = await inputReader.read(['./test/engines/parser/warning_for_mis-indented_property.conf']);
        parse(data);
        sinon.assert.callCount(consoleLogSpy, 1);
        sinon.assert.calledWith(consoleLogSpy, "UNRECOGNIZED LINE: 'auto-sync enabled'");
    });
});
