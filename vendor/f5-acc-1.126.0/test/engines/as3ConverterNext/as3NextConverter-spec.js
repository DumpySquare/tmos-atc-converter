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
const as3NextConvHelper = require('../../testUtils/as3NextConverterHelpers');
const testGenUtils = require('../../testUtils/testsGenerator');
const validator = require('../../testUtils/validators/as3NextAdapter');

describe('AS3 Next Converter', () => {
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

            const title = as3NextConvHelper.getTestcaseOption(expected, 'title', '');
            if (title) {
                spec.title = `${title} (${spec.title})`;
            }

            return async () => {
                /**
                 * .autotest.json content may be wrapped with parent object that contains some runtime options
                 */
                const needCompare = as3NextConvHelper.getTestcaseOption(expected, 'compare', true);
                const needValidation = as3NextConvHelper.getTestcaseOption(expected, 'validate', true);
                const isOutputValid = as3NextConvHelper.getTestcaseOption(expected, 'isValid', true);

                const converted = await as3NextConvHelper.convertConfigFiles(
                    ...spec.files.map((f) => f.fullPath),
                    {
                        nextConverterConfig: Object.assign({
                            next: true,
                            nextNotConverted: true
                        }, as3NextConvHelper.getTestcaseOption(expected, ['converterConfig', 'next'], {}))
                    }
                );

                expected = as3NextConvHelper.getTestcaseOption(expected, 'expectedData', expected);

                if (needCompare) {
                    assert.declDeepStrictEqual(converted.next.declaration, expected);

                    // classic declaration has some unsupported keys removed already
                    // need to exlucde those keys from `next` unsupported keys too
                    const keyNextNotSupported = converted.next.keyNextNotSupported.filter(
                        (key) => !converted.classic.keyClassicNotSupported.includes(key)
                    );

                    as3NextConvHelper.verifyNotSupportedObjects(
                        converted.classic.declaration,
                        keyNextNotSupported
                    );

                    assert.isEmpty(converted.next.keyClassicNotSupported, 'should have no unsupported keys reported by AS3 Classic Converter');
                }
                if (needValidation) {
                    const result = await validator(converted.next.declaration);
                    assert.deepStrictEqual(
                        result.isValid,
                        isOutputValid,
                        `should be ${isOutputValid ? '' : 'in'}valid:\n${JSON.stringify(result, null, 4)}`
                    );
                }
            };
        }));
});
