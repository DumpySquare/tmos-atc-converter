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

export interface NameValueObject {
    name: string;
    value: string;
}

// '"foo: bar"' => {name: 'foo', value: 'bar'}
/**
 * Convert a colon-separated string to a name/value object
 *
 * @param str - string in format 'name: value' (with optional quotes)
 * @returns object with name and value properties
 */
function convertToNameValueObj(str: string): NameValueObject {
    const split = str.replace(/"/g, '').split(':');
    return {
        name: split[0] ?? '',
        value: split.slice(1).join(':').trim()
    };
}

export default convertToNameValueObj;
module.exports = convertToNameValueObj;
