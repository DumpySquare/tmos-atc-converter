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
 * Return empty object if value is 'none', otherwise return the config object
 *
 * @param val - value to check
 * @param confObj - config object to return if val is not 'none'
 * @returns empty object or confObj
 */
function returnEmptyObjIfNone<T>(val: string, confObj: T): T | Record<string, never> {
    if (val === 'none') return {};
    return confObj;
}

export default returnEmptyObjIfNone;
module.exports = returnEmptyObjIfNone;
