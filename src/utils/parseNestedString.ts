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

export interface NestedObject {
    [key: string]: NestedObject | null;
}

/**
 * Parse a path string into a nested object structure
 *
 * @param str - path string separated by '/'
 * @returns nested object structure
 */
function parseNestedString(str: string): NestedObject {
    const segments = str.split('/');
    const result: NestedObject = {};
    let current: NestedObject = result;

    for (let i = 0; i < segments.length; i += 1) {
        const segment = segments[i];
        if (segment === undefined) continue;

        if (i === segments.length - 1) {
            // If it's the last segment, assign it as null
            current[segment] = null;
        } else {
            // Otherwise, create a new nested object
            current[segment] = {};
            current = current[segment] as NestedObject;
        }
    }
    return result;
}

export default parseNestedString;
module.exports = parseNestedString;
