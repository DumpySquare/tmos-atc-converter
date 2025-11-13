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

const chai = require('chai');
const fs = require('fs');
const assert = require('assert');

const groupBy = require('lodash/groupBy');
const lodashAssign = require('lodash/assign');

const misc = require('../testUtils/misc');
const startServer = require('../../src/server');
const TestGenerator = require('../testUtils/testsGenerator');
const { removePropertyFromOutput } = require('../testUtils/misc');

async function loadChaiHttpInServerFullResponse() {
    const chaiHttp = await import('chai-http');
    chai.use(chaiHttp.default);
}

let server;

describe('ACC Full Server Conversion Response', async () => {
    before(async () => {
        server = await startServer();
        await loadChaiHttpInServerFullResponse();
    });
    after(() => {
        if (server) server.close();
    });

    const testsDir = __dirname;

    const autotestFiles = TestGenerator.findAutoTests(testsDir);
    if (autotestFiles.length === 0) {
        process.stderr.write(`No .autotest.json files found inside of "${testsDir}"`);
        return;
    }

    const testcases = autotestFiles.map((f) => TestGenerator.makeTestcase(f, testsDir));
    Object.entries(groupBy(testcases, (t) => t.suite))
        .map(([title, tests]) => ({
            title,
            tests,
            type: 'suite'
        }))
        .forEach((suite) => TestGenerator.renderTestcase(suite, (spec) => {
            let expected;

            try {
                expected = JSON.parse(fs.readFileSync(spec.output));
            } catch (err) {
                throw new Error(`Unable to read and parse "${spec.output}":\n${err}`);
            }

            const fields = {
                disableAnalytics: 'true',
                jsonLogs: 'true',
                verbose: 'true'
            };

            if (expected.conversionType === 'DO') {
                lodashAssign(fields, { declarativeOnboarding: true });
            } else {
                lodashAssign(fields, { next: true });
            }

            const fileType = spec.files[0].name.split('.').slice(-1)[0];

            return async () => {
                const converterResponse = await chai.request.execute(server)
                    .post('/converter')
                    .field(fields)
                    .attach(fileType, spec.files[0].fullPath, spec.name);

                // Sanitizing and cleaning dynamic content from responses
                misc.removeTimestampsFromLogs(expected.expectedData);
                misc.removeTimestampsFromLogs(converterResponse.body);

                // Unset output "id" which is dynamically generated
                removePropertyFromOutput(expected, 'expectedData.output.id');
                removePropertyFromOutput(converterResponse, 'body.output.id');

                // Remove as3 properties logs
                removePropertyFromOutput(expected, 'expectedData.logs');
                removePropertyFromOutput(converterResponse, 'body.logs');

                assert.deepStrictEqual(converterResponse.body, expected.expectedData);
            };
        }));
});
