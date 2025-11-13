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

const { unlink } = require('fs').promises;
const assert = require('../../testUtils/assert');
const accMainCompare = require('../../testUtils/accMainCompare');
const validator = require('../../testUtils/validators/as3NextAdapter');
const log = require('../../../src/util/log');

// server-mode tests should have log level 'info' to allow log comparison
let oldLogLevel;

describe('Test adrress list via main function (main.js)', () => {
    before(() => {
        oldLogLevel = log.level;
        log.level = 'info';
    });

    after(() => {
        log.level = oldLogLevel;
    });

    afterEach(() => {
        unlink('output.json').catch();
    });

    it('should not add address list to as3NotConverted if it was propagated via service', async () => {
        const convertedDeclaration = await accMainCompare.runAccViaMainAndCompare(
            './test/main/fullConversion/addressListPropagated.conf',
            './test/main/fullConversion/addressListPropagated.json'
        );

        return validator(convertedDeclaration)
            .then((data) => assert(data.isValid, JSON.stringify(data, null, 4)));
    });

    it('should add address list to as3NotConverted if it was not propagated via service', async () => {
        const convertedDeclaration = await accMainCompare.runAccViaMainAndCompare(
            './test/main/fullConversion/addressListNotPropagated.conf',
            './test/main/fullConversion/addressListNotPropagated.json'
        );

        return validator(convertedDeclaration)
            .then((data) => assert(data.isValid, JSON.stringify(data, null, 4)));
    });
});
