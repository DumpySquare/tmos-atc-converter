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

/**
 * Convert array of lines to multiline string object
 *
 * @param arr - array of lines representing a multiline string
 * @returns object with key-value where value is joined multiline string
 */
function arrToMultilineStr(arr: string[]): Record<string, string> {
    const split = arr[0]?.trim().split(' ') ?? [];
    const key = split.shift() ?? '';
    arr[0] = split.join(' ');
    return { [key]: arr.join('\n') };
}

export default arrToMultilineStr;
module.exports = arrToMultilineStr;
