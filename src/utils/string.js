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

/**
 * String Utilities
 */

/**
 * Remove middle chars from the data if data exceeded maxLen
 *
 * @public
 *
 * @param {string} data - data
 * @param {object} options - optiosn
 * @param {integer} options.length - max length
 * @param {string} [options.separator = ''] - separator
 *
 * @returns {string} updated data
 */
function removeMiddleChars(data, options) {
    if (data.length <= options.length) {
        return data;
    }
    if (options.length === 0) {
        return '';
    }
    const sep = options.separator || '';
    // number of chars to remove for each part
    const rLen = (sep.length + data.length - options.length) / 2;
    // mid char position - X or X.5
    // ceil it up (see String.prototype.slice method signature docs)
    const mid = Math.ceil((data.length - 1) / 2);
    // in case if mid is X.5 (before ceil it up) then the left part is shorter than the right

    return `${data.slice(0, mid - Math.floor(rLen))}${sep}${data.slice(mid + Math.ceil(rLen), data.length)}`;
}

module.exports = {
    removeMiddleChars
};
