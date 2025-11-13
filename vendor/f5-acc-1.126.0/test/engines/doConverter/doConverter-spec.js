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
const groupBy = require('lodash/groupBy');

const assert = require('../../testUtils/assert');
const doConverter = require('../../../src/engines/doConverter');
const doConvHelper = require('../../testUtils/doConverterHelpers');
const parse = require('../../../src/engines/parser');
const inputReader = require('../../../src/preConverter/inputReader');
const testGenUtils = require('../../testUtils/testsGenerator');
const validator = require('../../testUtils/validators/doAdapter');

describe('Declarative Onboarding (doConverter.js)', () => {
    const SEARCH_DIR = __dirname;

    const autotestFiles = testGenUtils.findAutoTests(SEARCH_DIR);
    if (autotestFiles.length === 0) {
        process.stderr.write(`No .autotest.json files found inside of "${SEARCH_DIR}"`);
        return;
    }

    const testcases = autotestFiles.map((f) => testGenUtils.makeTestcase(f, SEARCH_DIR));
    Object.entries(groupBy(testcases, (t) => t.suite))
        .map(([title, tests]) => ({
            title,
            tests,
            type: 'suite'
        }))
        .forEach((suite) => testGenUtils.renderTestcase(suite, (spec) => {
            let expected;

            try {
                expected = JSON.parse(fs.readFileSync(spec.output));
            } catch (err) {
                throw new Error(`Unable to read and parse "${spec.output}":\n${err}`);
            }

            const title = doConvHelper.getTestcaseOption(expected, 'title', '');
            if (title) {
                spec.title = `${title} (${spec.title})`;
            }

            return async () => {
                /**
                 * .autotest.json content may be wrapped with parent object that contains some runtime options
                 */
                const needCompare = doConvHelper.getTestcaseOption(expected, 'compare', true);
                const needValidation = doConvHelper.getTestcaseOption(expected, 'validate', true);
                const isOutputValid = doConvHelper.getTestcaseOption(expected, 'isValid', true);
                expected = doConvHelper.getTestcaseOption(expected, 'expectedData', expected);

                const data = await inputReader.read(spec.files.map((f) => f.fullPath));
                const parsed = parse(data);
                const actual = await doConverter(parsed);

                if (needCompare) {
                    assert.declDeepStrictEqual(actual, expected);
                }
                if (needValidation) {
                    const result = await validator(actual);
                    assert.deepStrictEqual(
                        result.isValid,
                        isOutputValid,
                        `should be ${isOutputValid ? '' : 'in'}valid:\n${JSON.stringify(result, null, 4)}`
                    );
                }
            };
        }));
});
