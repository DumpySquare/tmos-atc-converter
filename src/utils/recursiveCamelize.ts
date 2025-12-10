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

// {'test-key': {'test-sub-key': true}} => { testKey: { testSubKey: true } }

const camelize = (s: string): string => s.replace(/-./g, (x) => x.toUpperCase()[1] ?? '');

type RecursiveRecord = Record<string, unknown>;

/**
 * Recursively convert object keys to camelCase
 *
 * @param obj - object to transform
 * @returns transformed object with camelCase keys
 */
function recursiveCamelize(obj: RecursiveRecord): RecursiveRecord {
    const newObj: RecursiveRecord = {};
    Object.keys(obj).forEach((key) => {
        const value = obj[key];
        newObj[camelize(key)] = typeof value === 'object' && value !== null
            ? recursiveCamelize(value as RecursiveRecord)
            : value;
    });
    return newObj;
}

export default recursiveCamelize;
module.exports = recursiveCamelize;
