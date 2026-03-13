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
const nunjucks = require('nunjucks');

const CertsManager = require('./templateCertsMgr');
const misc = require('../misc');

/**
 * Workflow:
 * Step 1. Search for spec.metadata.json files in provided path (recursively)
 * Step 2. When file found then load it using:
 *  - nunjucks renderer
 *  - tests renderer
 * Step 3. For every test render input and output files
 */

const AUTO_TEST_FULE_SUFFIX = '.autotest.json';

/**
 * Find files with AUTO_TEST_FULE_SUFFIX extension
 *
 * @param {string} aPath - path to search
 *
 * @returns {Array<FileInfo>} list of files
 */
function findAutoTests(aPath) {
    const files = listFiles(aPath, { recursive: true });
    return files.filter(
        (fileInfo) => !hiddenFile(fileInfo.name) && fileInfo.name.includes(AUTO_TEST_FULE_SUFFIX)
    );
}

/**
 * Check if file is hidden file
 *
 * @param {string} aFilename - a file name
 *
 * @returns {boolean} true if file is hidden
 */
function hiddenFile(aFilename) {
    return aFilename.startsWith('.');
}

/**
 * List files for `aPath` recursively
 *
 * @param {string} aPath - path to directory
 * @param {object} [options] - options
 * @param {boolean} [options.recursive] - reads recursively
 *
 * @returns {Array<FileInfo>} list of files
 */
function listFiles(aPath, options) {
    const results = [];
    fs.readdirSync(aPath, { withFileTypes: true })
        .forEach((fileInfo) => {
            const dirPath = fileInfo.parentPath || fileInfo.path;
            if (fileInfo.isDirectory() && !!options?.recursive) {
                results.push(...listFiles(path.join(dirPath, fileInfo.name), options));
            } else {
                results.push({
                    name: fileInfo.name,
                    path: dirPath,
                    fullPath: path.join(dirPath, fileInfo.name)
                });
            }
        });
    return results;
}

/**
 * Make testcase from spec file
 *
 * @param {FileInfo} autoTestInfo - file info for spec file
 * @param {string} rootDir - root directory
 *
 * @returns {Object} testcase
 */
function makeTestcase(autoTestInfo, rootDir) {
    const testcase = {
        output: autoTestInfo.fullPath,
        title: autoTestInfo.name.replace(AUTO_TEST_FULE_SUFFIX, ''),
        suite: path.relative(rootDir, autoTestInfo.path),
        type: 'testcase'
    };

    const options = {};
    if (testcase.title.includes('.skip')) {
        options.skip = true;
        testcase.title = testcase.title.replace('.skip', '');
    } else if (testcase.title.includes('.only')) {
        options.only = true;
        testcase.title = testcase.title.replace('.only', '');
    } else if (testcase.title.includes('.pending')) {
        options.pending = true;
        testcase.title = testcase.title.replace('.pending', '');
    }
    if (Object.keys(options).length > 0) {
        testcase.options = options;
    }

    const suiteOptions = {};
    const suite = misc.pathSplit(testcase.suite);
    if (suite.some((str) => str.includes('.skip')) || fs.existsSync(path.join(autoTestInfo.path, 'skip'))) {
        suiteOptions.skip = true;
    } else if (suite.some((str) => str.includes('.only')) || fs.existsSync(path.join(autoTestInfo.path, 'only'))) {
        suiteOptions.only = true;
    }
    if (suiteOptions.skip) {
        testcase.options = { skip: true };
    } else if (suiteOptions.only && !testcase.options?.skip) {
        testcase.options = { only: true };
    }

    // all `service` information should be stripped from the name by this line
    // time to gather related files
    const files = listFiles(autoTestInfo.path)
        .filter((fileInfo) => !hiddenFile(fileInfo.name)
            && fileInfo.fullPath !== testcase.output
            && fileInfo.name.startsWith(`${testcase.title}.`));
    if (files.length > 0) {
        testcase.files = files;
    }
    return testcase;
}

/**
 * Create unit tests using mocha's `describe` and `it`
 *
 * @param {object} specData - spec data
 * @param {function} cb - callback to call to create a unit test body
 */
function renderTestcase(specData, cb) {
    function getDescribe(options) {
        if (options?.only) {
            return describe.only;
        }
        if (options?.skip) {
            return describe.skip;
        }
        return describe;
    }
    function getIt(options) {
        if (options?.only) {
            return it.only;
        }
        if (options?.skip) {
            return it.skip;
        }
        if (options?.pending) {
            return it.pending;
        }
        return it;
    }
    if (specData.type === 'suite') {
        getDescribe(specData.options)(specData.title, () => {
            specData?.tests.forEach((testData) => renderTestcase(testData, cb));
        });
    }
    if (specData.type === 'testcase') {
        // callback may change `specData`, e.g. title and options
        const testFunc = cb(specData);
        getIt(specData.options)(specData.title, testFunc);
    }
}

/**
 * Build env for temaplte engine
 *
 * @returns {nunjucks.Environment}
 */
function templateEnv() {
    return nunjucks.configure({
        autoescape: false,
        noCache: false,
        tags: {
            blockStart: '<%%',
            blockEnd: '%%>',
            variableStart: '<$$',
            variableEnd: '$$>',
            commentStart: '<##',
            commentEnd: '##>'
        },
        throwOnUndefined: true
    });
}

module.exports = {
    CertsManager,
    createRenderer: templateEnv,
    findAutoTests,
    makeTestcase,
    renderTestcase
};

/**
 * @typedef FileInfo
 * @type {Object}
 * @param {string} fullPath - full path to file or directory
 * @param {string} name - file name
 * @param {string} path - file path
 */
