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

const assert = require('../testUtils/assert');
const stringUtil = require('../../src/utils/string');

describe('String Utilities (util/string)', () => {
    describe('removeMiddleChars', () => {
        it('should not remove middle chars if string is not exceeded max length', () => {
            assert.deepStrictEqual(
                stringUtil.removeMiddleChars('0123456789', { length: 10, separator: '-' }),
                '0123456789',
                'should not remove chars when string is not exceeded than max length'
            );
            assert.deepStrictEqual(
                stringUtil.removeMiddleChars('', { length: 10, separator: '-' }),
                '',
                'should not remove chars when string is not exceeded than max length'
            );
            assert.deepStrictEqual(
                stringUtil.removeMiddleChars('0', { length: 1, separator: '-' }),
                '0',
                'should not remove chars when string is not exceeded than max length'
            );
        });

        it('should remove middle chars when string exceeded max length', () => {
            assert.deepStrictEqual(
                stringUtil.removeMiddleChars('0123456789', { length: 9 }),
                '012346789',
                'should remove chars when string is exceeded than max length'
            );
            assert.deepStrictEqual(
                stringUtil.removeMiddleChars('01234567890', { length: 9 }),
                '012367890',
                'should remove chars when string is exceeded than max length'
            );
            assert.deepStrictEqual(
                stringUtil.removeMiddleChars('01', { length: 1 }),
                '0',
                'should remove chars when string is exceeded than max length'
            );
            assert.deepStrictEqual(
                stringUtil.removeMiddleChars('0', { length: 0 }),
                '',
                'should remove chars when string is exceeded than max length'
            );
            assert.deepStrictEqual(
                stringUtil.removeMiddleChars('my-very-long-virtual-server-name', { length: 20 }),
                'my-very-loerver-name',
                'should remove chars when string is exceeded than max length'
            );
        });

        it('should use separator', () => {
            assert.deepStrictEqual(
                stringUtil.removeMiddleChars('0123456789', { length: 9, separator: '-' }),
                '0123-6789',
                'should remove chars when string is exceeded than max length and use separator'
            );
            assert.deepStrictEqual(
                stringUtil.removeMiddleChars('01234567890', { length: 9, separator: '-' }),
                '0123-7890',
                'should remove chars when string is exceeded than max length and use separator'
            );
            assert.deepStrictEqual(
                stringUtil.removeMiddleChars('01', { length: 1, separator: '-' }),
                '-',
                'should remove chars when string is exceeded than max length and use separator'
            );
            assert.deepStrictEqual(
                stringUtil.removeMiddleChars('0', { length: 0, separator: '-' }),
                '',
                'should remove chars when string is exceeded than max length and use separator'
            );
            assert.deepStrictEqual(
                stringUtil.removeMiddleChars('my-very-long-virtual-server-name', {
                    length: 20,
                    separator: '=-='
                }),
                'my-very-l=-=ver-name',
                'should remove chars when string is exceeded than max length and use separator'
            );
        });
    });
});
