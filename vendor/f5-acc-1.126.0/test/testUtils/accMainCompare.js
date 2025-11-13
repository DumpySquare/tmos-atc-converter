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
const assert = require('./assert');
const { main } = require('../../src/main');

/**
 * Compare logs of the expected and actual ACC output.
 * Time stamps will be different and should be ignored.
 *
 * @param {Object} actual - metadata of the actual ACC output including 'logs'
 * @param {Object} expected  - metadata of the expected ACC output including 'logs'
 */
function accMainCompareLogs(actual, expected) {
    assert.strictEqual(actual.logs.length, expected.logs.length);
    for (let index = 0; index < expected.logs.length; index += 1) {
        const actLine = actual.logs[index];
        const expLine = expected.logs[index];
        assert.isString(actLine);
        assert.isString(expLine);

        // ignore lines with versions, they change often
        const excludedLines = ['ACC version', 'AS3 core schema version', 'Shared schema version',
            'Shared schema package version'];
        const versionLine = excludedLines.some((v) => expLine.includes(v));
        if (!versionLine) {
            // continue comparison for non-version lines
            assert.strictEqual(actLine.trim().length,
                expLine.trim().length,
                `lengths of ${actLine} and ${expLine} are not equal`);
        }
    }
}

/**
 * run ACC via main function of src (it is more similar to running ACC via endpoint than via CLI)
 * and compare the results
 *
 * @param {String} confFile - path to a (snippet of) BIG-IP configuration file
 * @param {String} expectedOutput - path to the expected ACC output (including AS3 declaration)
 * @returns {Object} - actual AS3 declaration produced by ACC
 */
async function runAccViaMainAndCompare(confFile, expectedOutput) {
    let data = fs.readFileSync(confFile, 'utf-8');
    data = { anyPropName: data };
    const expected = JSON.parse(fs.readFileSync(expectedOutput, 'utf-8'));

    const config = {
        disableAnalytics: true,
        next: false,
        jsonLogs: false,
        nextNotConverted: true
    };
    const converted = await main(data, config);

    accMainCompareLogs(converted.metadata, expected.metadata);

    // declaration id changes at every run, ignore it
    assert.declDeepStrictEqual(converted, expected, { ignore: ['/declaration/id', '/metadata/logs'] });
    return converted.declaration;
}

module.exports = {
    runAccViaMainAndCompare
};
