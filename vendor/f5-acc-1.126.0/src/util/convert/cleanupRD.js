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

'use strict';

/* eslint-disable max-len */
const regexIPv4 = '((25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)[.]){3}(25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)';
const regexIPv6 = '(::(([0-9a-f]{1,4}:){0,5}((([0-9a-f]{1,4}:)?[0-9a-f]{1,4})|(((25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)[.]){3}(25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d))))?)|([0-9a-f]{1,4}::(([0-9a-f]{1,4}:){0,4}((([0-9a-f]{1,4}:)?[0-9a-f]{1,4})|(((25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)[.]){3}(25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d))))?)|([0-9a-f]{1,4}:[0-9a-f]{1,4}::(([0-9a-f]{1,4}:){0,3}((([0-9a-f]{1,4}:)?[0-9a-f]{1,4})|(((25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)[.]){3}(25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d))))?)|([0-9a-f]{1,4}(:[0-9a-f]{1,4}){2}::(([0-9a-f]{1,4}:){0,2}((([0-9a-f]{1,4}:)?[0-9a-f]{1,4})|(((25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)[.]){3}(25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d))))?)|([0-9a-f]{1,4}(:[0-9a-f]{1,4}){3}::(([0-9a-f]{1,4}:)?((([0-9a-f]{1,4}:)?[0-9a-f]{1,4})|(((25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)[.]){3}(25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d))))?)|([0-9a-f]{1,4}(:[0-9a-f]{1,4}){4}::((([0-9a-f]{1,4}:)?[0-9a-f]{1,4})|(((25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)[.]){3}(25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)))?)|([0-9a-f]{1,4}(:[0-9a-f]{1,4}){5}::([0-9a-f]{1,4})?)|([0-9a-f]{1,4}(:[0-9a-f]{1,4}){0,6}::)|(([0-9a-f]{1,4}:){7}[0-9a-f]{1,4})';
/* eslint-enable max-len */

/**
 * Function removes route domain suffixes from IPv4 and IPv6 addresses
 * Note:
 * - mutates 'obj'
 *
 * @param {any} obj - source json object
 *
 * @returns {any} updated json object
 */
module.exports = (obj) => {
    const ipv4 = new RegExp(`(${regexIPv4})%\\d+`, 'g');
    const ipv6 = new RegExp(`(${regexIPv6})%\\d+`, 'g');

    let strObj = JSON.stringify(obj);
    strObj = strObj.replace(ipv4, '$1');
    strObj = strObj.replace(ipv6, '$1');

    return JSON.parse(strObj);
};
