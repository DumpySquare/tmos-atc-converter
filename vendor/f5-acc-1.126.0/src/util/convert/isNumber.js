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

const FLOAT_REGEXP_STRICT = /^([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?)$/;

/**
 * Tests if `value` is a number or string representation of it
 *
 * @param {string} value - value to check
 *
 * @returns {boolean} true if value can be parsed using `parseInt` or `parseFloat`
 */
module.exports = (value) => {
    if (typeof value === 'number') {
        return Number.isFinite(value);
    }
    return typeof value === 'string' && FLOAT_REGEXP_STRICT.test(value);
};
