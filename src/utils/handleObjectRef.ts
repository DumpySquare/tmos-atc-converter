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

import formatStr from './formatStr';

/* eslint-disable @typescript-eslint/no-require-imports */
const defaults = require('../data/defaults.json') as string[];

export interface ObjectRef {
    bigip?: string;
    use?: string;
}

/**
 * Handle object reference - return bigip ref for defaults, use ref for custom objects
 *
 * @param str - object path string
 * @returns object reference
 */
function handleObjectRef(str: string): ObjectRef {
    const formattedStr = formatStr(str);
    if (!formattedStr) return { use: str };

    if (defaults.includes(formattedStr)) return { bigip: formattedStr };

    const pathSplit = formattedStr.split('/');
    let result = formattedStr;
    if (pathSplit.length === 3) {
        result = formattedStr.replace(`/${pathSplit[1]}/`, `/${pathSplit[1]}/Shared/`);
    }
    return { use: result };
}

export default handleObjectRef;
module.exports = handleObjectRef;
