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

const path = require('path');
const groupBy = require('lodash/groupBy');

const { config } = require('process');
const assert = require('../../testUtils/assert');
const as3Converter = require('../../../src/engines/as3Converter');
const as3ConvHelper = require('../../testUtils/as3ConverterHelpers');
const parse = require('../../../src/engines/parser');
const inputReader = require('../../../src/preConverter/inputReader');
const testGenUtils = require('../../testUtils/testsGenerator');
const validator = require('../../testUtils/validators/as3ClassicAdapter');

describe('AS3 Classic Converter', () => {
    const DEVICE_CERTS_DIR = '/var/tmp/filestore_temp/files_d';
    const SEARCH_DIR = __dirname;

    const autotestFiles = testGenUtils.findAutoTests(SEARCH_DIR);
    if (autotestFiles.length === 0) {
        process.stderr.write(`No .autotest.json files found inside of "${SEARCH_DIR}"`);
        return;
    }

    const renderer = testGenUtils.createRenderer();
    const testcases = autotestFiles.map((f) => testGenUtils.makeTestcase(f, SEARCH_DIR));
    Object.entries(groupBy(testcases, (t) => t.suite))
        .map(([title, tests]) => ({
            title,
            tests,
            type: 'suite'
        }))
        .forEach((suite) => testGenUtils.renderTestcase(suite, (spec) => {
            /**
             * .autotest.json files may contain nunjucks template expression, need to render it first
             */
            const certsMgr = new testGenUtils.CertsManager();
            let expected;

            try {
                expected = renderer.render(spec.output, { certs: certsMgr });
                expected = JSON.parse(expected);
            } catch (err) {
                throw new Error(`Unable to read and parse "${spec.output}":\n${err}`);
            }

            const title = as3ConvHelper.getTestcaseOption(expected, 'title', '');
            if (title) {
                spec.title = `${title} (${spec.title})`;
            }

            return async () => {
                /**
                 * .autotest.json content may be wrapped with parent object that contains some runtime options
                 */
                const needCompare = as3ConvHelper.getTestcaseOption(expected, 'compare', true);
                const needValidation = as3ConvHelper.getTestcaseOption(expected, 'validate', true);
                const isOutputValid = as3ConvHelper.getTestcaseOption(expected, 'isValid', true);
                expected = as3ConvHelper.getTestcaseOption(expected, 'expectedData', expected);

                const data = await inputReader.read(spec.files.map((f) => f.fullPath));

                /**
                 * Inject certificates data that might be used by nunjuck template defined in expected output
                 */
                Object.assign(data, Object.fromEntries(
                    Object.entries(certsMgr.virtualData())
                        .map(([key, value]) => [path.join(DEVICE_CERTS_DIR, key), value])
                ));

                const parsed = parse(data);
                const actual = (await as3Converter(parsed, config));

                if (needCompare) {
                    assert.declDeepStrictEqual(actual.declaration, expected);
                    assert.isEmpty(actual.keyClassicNotSupported, 'should have no unsupported keys');
                }
                if (needValidation) {
                    const result = await validator(actual.declaration);
                    assert.deepStrictEqual(
                        result.isValid,
                        isOutputValid,
                        `should be ${isOutputValid ? '' : 'in'}valid:\n${JSON.stringify(result, null, 4)}`
                    );
                }
            };
        }));
});
