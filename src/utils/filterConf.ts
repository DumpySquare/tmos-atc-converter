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

import getKey from './getKey';

export interface FilterConfOptions {
    excluded?: boolean;
}

/**
 * Filter object using TMOS keys
 *
 * @param json - parsed TMOS config
 * @param dict - supported TMOS keys
 * @param options - options
 * @param options.excluded - keep excluded data only (default: false)
 * @returns filtered config
 */
function filterConf(
    json: Record<string, unknown>,
    dict: Record<string, unknown>,
    options?: FilterConfOptions
): Record<string, unknown> {
    const op = options?.excluded
        ? (val: boolean): boolean => !val
        : (val: boolean): boolean => val;

    return Object.fromEntries(
        Object.entries(json)
            .filter(([key]) => op(
                Object.hasOwn(dict, getKey(key))
            ))
    );
}

export default filterConf;
module.exports = filterConf;
