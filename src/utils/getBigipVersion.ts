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
 * Find BIG-IP Version from parsed config data
 *
 * @param data - parsed configuration data
 * @returns BIG-IP version string or empty string if not found
 */
function getBigipVersion(data: unknown): string {
    const dataStr = JSON.stringify(data);
    if (dataStr.includes('TMSH-VERSION')) {
        return dataStr.split('TMSH-VERSION: ')[1]?.split('\\n')[0] ?? '';
    }
    return '';
}

export default getBigipVersion;
module.exports = getBigipVersion;
