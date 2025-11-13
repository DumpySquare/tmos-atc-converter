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

const chai = require('chai');

const constants = require('../../src/constants');
const objectUtil = require('../../src/util/object');
const traverseJSON = require('../../src/util/traverseJSON');

async function loadChaiASPromised() {
    const chaiAsPromised = await import('chai-as-promised');
    chai.use(chaiAsPromised.default);
}

loadChaiASPromised();

const assert = chai.assert;
const globalDisallowlist = [
    '/id',
    '/schemaVersion'
];

/**
 * Sanitize declaration
 *
 * Note:
 * - only primitives will be removed. E.g. if paths points to an object (or array) it will not be removed
 * - useful to remove dynamically generated propeties - e.g. uuids, dynamic remarks, descriptions and etc.
 *
 * @private
 *
 * @param {Object} decl - declaration
 * @param {Object} [options] - options
 * @param {Array<String>} [options.allow] - allowed properties
 * @param {Array<String>} [options.disallow] - disallowed properties
 *
 * @returns {Object} sanitized declaration
 */
function sanitizeDeclaration(decl, options) {
    let disallowed = options?.disallow || [];
    if (disallowed.length && (options?.allow || []).length) {
        disallowed = disallowed.filter((p) => !options.allow.includes(p));
    }

    // remove TMOS paths first from declaration
    disallowed.filter((p) => p.includes(constants.COMMON.TMOS.PATH_SEP))
        .forEach((p) => objectUtil.unset(decl, p, { tmosPath: true }));

    // remove TMOS paths from the list - don't need it anymore
    disallowed = disallowed.filter((p) => !p.includes(constants.COMMON.TMOS.PATH_SEP));

    // remove all disallowed properties from declaration
    traverseJSON(decl, (parent, key) => {
        if (disallowed.includes(key) && typeof parent[key] !== 'object') {
            objectUtil.unset(parent, key);
            return false;
        }
        return true;
    });

    return decl;
}

module.exports = assert;

/**
 * Compare declarations
 *
 * Note:
 * - property names may be like 'remark' - it will match all 'remark' occurences in a declaration
 *   or it can be '/remake' (or 'remark/' or /Common/remark) it will match particular remark only.
 *
 * See 'globalDisallowlist' for the list of ignored properties
 *
 * @public
 *
 * @param {Object} actual - actual declaration
 * @param {Object} expected - expected declaration
 * @param {Object} [options] - options
 * @param {Array<String>} [options.ignore] - properties to remove from a declaration
 * @param {Array<String>} [options.keep] - properties to keep in a declaration
 */
module.exports.declDeepStrictEqual = function declDeepStrictEqual(actual, expected, options) {
    const disallow = globalDisallowlist.concat(options?.ignore || []);
    const allow = options?.keep || [];

    // remove all disallowed properties first
    expected = sanitizeDeclaration(objectUtil.cloneDeep(expected), { disallow, allow });
    actual = sanitizeDeclaration(objectUtil.cloneDeep(actual), { disallow, allow });

    assert.deepStrictEqual(actual, expected, 'should match expected declaration!');
};
