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

const fs = require('fs');
const path = require('path');

const lodashClone = require('lodash/clone');
const lodashGet = require('lodash/get');
const lodashSet = require('lodash/set');
const lodashUnset = require('lodash/unset');
const lodashPullAt = require('lodash/pullAt');

module.exports = {
    /**
     * Load file with JSON data
     *
     * @param {string} aPath - path to file
     * @param {object} [options] - options
     * @param {boolean} [options.sync] - if true then 'sync' operation
     *
     * @returns {Promise<any> | any} resolved parsed data if 'sync' is not set
     */
    loadJSON(aPath, options) {
        if (options?.sync) {
            return JSON.parse(fs.readFileSync(aPath));
        }
        return fs.promises.readFile(aPath)
            .then(JSON.parse);
    },

    /**
     * Split FS path into parts
     *
     * @param {string} aPath - path
     *
     * @returns {Array<string>} array of path's parts
     */
    pathSplit(aPath) {
        const items = [];
        do {
            const parsed = path.parse(aPath);
            if (parsed.base) {
                items.push(parsed.base);
            }
            aPath = parsed.dir;
        } while (aPath && aPath !== '/');
        items.reverse();
        return items;
    },
    /**
     *
     * @param {array} serverResponse - the full response coming from server including logs
     */
    removeTimestampsFromLogs(serverResponse) {
        const modifiedLogs = serverResponse.logs.map((log) => {
            const reg = /[a-z]/gi;
            if (reg.test(log)) {
                return log.substring(reg.lastIndex - 1);
            }
            return log;
        });
        serverResponse.logs = modifiedLogs;
    },
    /**
     *
     * @param {object} output - full converter response
     * @param {string} propertyPath - the path of the property to be removed (or truncated)
     * @param {string|array} matchers - a single matcher or array of matcher strings to remove conditionally
     */
    removePropertyFromOutput(output, propertyPath, matchers = ['']) {
        // converting to array in case string is passed
        if (!Array.isArray(matchers)) matchers = [matchers];

        matchers.forEach((matcher) => {
            const propertyVal = lodashGet(output, propertyPath, undefined);
            const reg = new RegExp(matcher, 'i');
            if (typeof propertyVal === 'string' && reg.test(propertyVal)) {
                lodashUnset(output, propertyPath);
            } else if (Array.isArray(propertyVal)) {
                const tempArray = lodashClone(propertyVal);
                const indexesToBeRemoved = [];
                tempArray.forEach((val, index) => {
                    if (reg.test(val)) {
                        indexesToBeRemoved.push(index);
                    }
                });
                lodashPullAt(tempArray, indexesToBeRemoved);
                lodashSet(output, propertyPath, tempArray);
            }
        });
    }
};
