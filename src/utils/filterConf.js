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

const getKey = require('./getKey');

/**
 * Filter object using TMOS keys
 *
 * @param {object} json - parsed TMOS config
 * @param {object} dict - supported TMOS keys
 * @param {object} [options] - options
 * @param {boolean} [options.excluded = false] - keep excluded data only
 *
 * @returns {object} filtered config
 */
module.exports = (json, dict, options) => {
    const op = options?.excluded
        ? (val) => !val
        : (val) => val;

    return Object.fromEntries(
        Object.entries(json)
            .filter(([key]) => op(
                Object.hasOwn(dict, getKey(key))
            ))
    );
};
