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

/* eslint-disable no-continue */

const as3Validator = require('../lib/validators/as3Classic');
const deleteProperties = require('../util/convert/deleteProperties');
const log = require('../util/log');
const objectUtil = require('../util/object');
const globalObjectUtil = require('../util/globalRenameAndSkippedObject');

/**
 * split path in object into two parts: the parent path and the property name itself
 *
 * @param {string} path - path to split
 *
 * @returns {parentPath: string, property: string} split strings
 */
function splitPathInTwo(path) {
    if (typeof path !== 'string') return { parentPath: '', property: '' };
    const pathArray = path.split('/');
    const property = pathArray.at(-1);
    pathArray.pop();
    const parentPath = pathArray.join('/');
    return { parentPath, property };
}

/**
 * Function for determine unsupported properties in AS3 Classic declaration and delete them
 *
 * @param {Object} declaration   - AS3 declaration ready to clean up
 *
 * @returns {Object} declaration - when clean up completed
 */
const as3ClassicCleanUp = async (declaration) => {
    // - should contain paths to objects with 'class' property only
    // - add another variable for removed properties if need to report it too
    let keyClassicNotSupported = [];

    // need it later to figure out what was deleted from original declaration
    const originDeclaration = objectUtil.cloneDeep(declaration);

    // schema validator inserts extra properties into checked declaration,
    // whe need temporary clone object before checking
    const declarationForValidate = objectUtil.cloneDeep(declaration);

    const cleanUpList = (await as3Validator.validate(declarationForValidate))
        .ignoredAttributes
        .filter((p) => p !== '/schemaVersion');

    if (cleanUpList.length > 0) {
        log.debug('AS3 CLASSIC CLEANUP LIST:');
        log.debug(cleanUpList);
    }

    const deleteResults = deleteProperties(declaration, cleanUpList);
    deleteResults.ignored.forEach((p) => {
        const splitPath = splitPathInTwo(p);
        globalObjectUtil.deleteProperty(
            splitPath.parentPath,
            splitPath.property,
            `Invalid path received from ignoredAttributes: ${p} (reason - JSON Classic Schema validator)`
        );
    });
    deleteResults.deleted.forEach((p) => {
        const splitPath = splitPathInTwo(p);
        globalObjectUtil.deleteProperty(
            splitPath.parentPath,
            splitPath.property,
            `Deleted path from declaration: ${p} (reason - JSON Classic Schema validator)`
        );
    });

    // interested in 'classes' only
    keyClassicNotSupported = deleteResults.deleted
        .filter((p) => objectUtil.has(objectUtil.get(originDeclaration, p, { tmosPath: true }), 'class'))
        .map((item) => item.replace(/^\/Common\/Shared\//, '/Common/'));

    // Be aware: validation applies 'default' value too. If something was removed after previous call
    // then it may be substitued by 'default' value after this call.
    const result = await as3Validator.validate(objectUtil.cloneDeep(declaration));
    if (!result.isValid) {
        // reduce amount of output
        result.errors.forEach((err) => {
            delete err.data;
            delete err.parentSchema;
        });
        log.warn(`Received AS3 declaration is not valid according to AS3 schema:\n${JSON.stringify(result.errors, null, 4)}`);
    }
    if (result.ignoredAttributes.length > 0) {
        log.warn('Received AS3 Declaration is not fully cleaned.');
    }

    return {
        declaration,
        keyClassicNotSupported
    };
};

module.exports = as3ClassicCleanUp;
