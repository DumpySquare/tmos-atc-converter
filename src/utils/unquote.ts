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

const QUOTES = ['"', "'", '`'];

/**
 * Remove leading and trailing quotes
 *
 * Note:
 * - removes only matching quotes. If only leading or trailing quote found
 *   then string returned as is.
 *
 * @param val - quoted string
 * @returns unquoted string
 */
function unquote<T>(val: T): T | string {
    if (
        typeof val === 'string'
        && val.at(0) === val.at(-1)
        && QUOTES.includes(val.at(0) as string)
    ) {
        return val.slice(1, -1);
    }
    return val;
}

export default unquote;
module.exports = unquote;
