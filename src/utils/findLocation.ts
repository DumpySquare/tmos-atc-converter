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

// input: '/Tenant1/App1/Profile1'
// output: {app: 'App1', tenant: 'Tenant1', profile: 'Profile1'}

export interface LocationInfo {
    app: string | undefined;
    iapp: boolean;
    original: string;
    profile: string | undefined;
    tenant: string | undefined;
}

/**
 * Parse a TMOS path into its location components
 *
 * @param str - TMOS path string
 * @returns location info object
 */
function findLocation(str: string): LocationInfo {
    const strFormatted = formatStr(str);
    const split = strFormatted?.split('/') ?? [];
    const tenant = split[1];
    const app = split[2];
    const profile = split[3];

    return {
        app,
        iapp: app?.endsWith('.app') ?? false,
        original: str,
        profile,
        tenant
    };
}

export default findLocation;
module.exports = findLocation;
