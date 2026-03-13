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

const as3ClassicCleanUp = require('../../../src/converters/as3/cleanup');
const assert = require('../../testUtils/assert');
const validator = require('../../testUtils/validators/as3ClassicAdapter');

const ex1 = require('./as3ClassicCleanUp.json');
const ex2 = require('./as3ClassicCleanUp2.json');
const ex3 = require('./as3ClassicCleanUp3.json');
const ex4 = require('./as3ClassicCleanUp4.json');
const ex5 = require('./as3ClassicCleanUp5.json');
const ex5res = require('./as3ClassicCleanUp5res.json');

let config;

describe('Remove invalid refs (removeInvalidRefs.js)', () => {
    beforeEach(() => {
        config = {
            disableAnalytics: true,
            next: false,
            jsonLogs: false
        };
    });

    describe('wrapped bigip/use ref', () => {
        it('should not validate declarations with invalid refs', () => validator(ex1)
            .then((data) => assert(data.isValid)));

        it('should remove refs to non-existent classes', async () => {
            const results = await as3ClassicCleanUp(ex1, config);
            return validator(results.declaration)
                .then((data) => assert(data.isValid, JSON.stringify(data, null, 4)));
        });
    });

    describe('unwrapped (string) ref', () => {
        it('should not validate declarations with invalid refs', () => validator(ex2)
            .then((data) => assert(data.isValid)));

        it('should remove refs to non-existent classes', async () => {
            const results = await as3ClassicCleanUp(ex2, config);
            return validator(results.declaration)
                .then((data) => assert(data.isValid, JSON.stringify(data, null, 4)));
        });
    });

    describe('array of wrapped bigip/use refs', () => {
        it('should not validate declarations with invalid refs', () => validator(ex3)
            .then((data) => assert(data.isValid)));

        it('should remove refs to non-existent classes', async () => {
            const results = await as3ClassicCleanUp(ex3, config);
            return validator(results.declaration)
                .then((data) => assert(data.isValid, JSON.stringify(data, null, 4)));
        });
    });

    describe('remove multiple refs', () => {
        it('should not validate declarations with invalid refs', () => validator(ex4)
            .then((data) => assert(data.isValid)));

        it('should remove refs to non-existent classes', async () => {
            const results = await as3ClassicCleanUp(ex4, config);
            return validator(results.declaration)
                .then((data) => assert(data.isValid, JSON.stringify(data, null, 4)));
        });
    });

    describe('remove properties with empty array []', () => {
        it('should not delete empty array of "persistenceMethods" from Service', async () => {
            const expectedDec = ex5res.Common.Shared;
            const results = await as3ClassicCleanUp(ex5, config);
            const processedDec = results.declaration.Common.Shared;

            assert.declDeepStrictEqual(processedDec, expectedDec);
        });
    });
});
