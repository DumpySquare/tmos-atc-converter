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

// input: 'ltm node /Web/10.1.1.1'
// output: 'ltm node'

/**
 * Extract the key (type) from a TMOS object path
 *
 * @param val - TMOS object path string
 * @returns the key/type portion without the object name
 */
function getKey(val: string): string {
    if (val.includes('"')) {
        return (val.split('"')[0] ?? '').trim();
    }

    const split = val.split(' ');
    split.pop();
    return split.join(' ');
}

export default getKey;
module.exports = getKey;
