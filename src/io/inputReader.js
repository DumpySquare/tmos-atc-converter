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
const stream = require('stream');
const tar = require('tar');

const log = require('../utils/log');

const TYPES = Object.freeze({
    CONF: 'conf',
    UCS: 'ucs'
});
const UCS_EXT = '.ucs';

/**
 * Check if FS path belongs to UCS file
 *
 * @private
 *
 * @param {string} maybePath
 *
 * @returns {boolean}
 */
const maybeUCSPath = (maybePath) => typeof maybePath === 'string' && maybePath.endsWith(UCS_EXT);

/**
 * UCS content filter
 *
 * @private
 *
 * @param {string} path - entry's path
 * @param {tar.Entry} entry - entry
 *
 * @returns {boolean} true to keep entry or false to ignore it
 */
const ucsContentFilter = (path, entry) => {
    if (entry.type !== 'File') {
        return false;
    }
    const split = path.split('/');

    // ignore files like '._bigip.conf'
    if (split.some((p) => p.startsWith('._'))) {
        return false;
    }

    // keep config/*.conf
    if (split[0] === 'config' && split[1].endsWith('.conf')) {
        return true;
    }

    // keep config/bigip.license
    if (split[0] === 'config' && split[1].endsWith('.license')) {
        return true;
    }

    // keep config/partitions/**/*.conf
    if (path.startsWith('config/partitions') && path.endsWith('.conf')) {
        return true;
    }

    // skip var/tmp/filestore_temp/files_d/Common_d/epsec_package_d -- KB25633150
    if (path.includes('epsec_package_d')) {
        return false;
    }

    // keep var/tmp/filestore_temp/files_d/* and var/tmp/cert_tmp/conf
    if ((path.startsWith('var/tmp/filestore_temp/files_d/Common_d')
            || path.startsWith('var/tmp/cert_temp/conf'))
        && (path.endsWith('.crt') || path.endsWith('.key'))) {
        return true;
    }
    return false;
};

/**
 * Extract UCS file to memory
 *
 * @private
 *
 * @param {Buffer | string} - data buffer or FS path to a file with UCS content
 *
 * @returns {{[string]: string }} UCS file content
 */
const ucsExtract = async (pathOrBuffer, filter) => {
    let sourceStream;

    if (typeof pathOrBuffer === 'string') {
        sourceStream = fs.createReadStream(pathOrBuffer);
    } else if (Buffer.isBuffer(pathOrBuffer)) {
        sourceStream = stream.Readable.from(pathOrBuffer);
    } else {
        throw new Error(`Unknown parameter passed to "extract" function. Should be string or Buffer, got ${typeof pathOrBuffer}`);
    }

    const tarParser = new tar.Parser({
        filter
    });
    const promises = [];

    tarParser
        .on('entry', (entry) => {
            // .concat() subscribes to `data` event that automatically
            // calls .resume()
            promises.push(entry.concat()
                .then((content) => ({
                    content,
                    path: entry.path
                }))
                .catch((entryError) => ({
                    error: entryError,
                    path: entry.path
                })));
        })
        .on('warn', (code, message, data) => {
            data.code = (message instanceof Error && message.code) || code;
            data.tarCode = code;
            tarParser.abort(Object.assign(
                message instanceof Error ? message : new Error(`${code}: ${message}`),
                data
            ));
        });

    await stream.promises.pipeline(sourceStream, tarParser);

    let content;
    if (promises.length) {
        const results = await Promise.all(promises);
        const errors = results.filter((r) => Object.hasOwn(r, 'error'));
        if (errors.length) {
            throw new Error(`Unable to read data from files: ${errors.map((ee) => [ee.path, `${ee.error}`])}`);
        }
        content = Object.fromEntries(
            results
                .filter((r) => Object.hasOwn(r, 'content'))
                .map((r) => [r.path, r.content.toString()])
        );
    }
    return content ?? {};
};

/**
 * Input Data Reader class
 */
class InputReader {
    /** @type {{ [string]: string }} last read data */
    #data = {};

    async #readConf(conf) {
        const fname = conf?.path ?? conf;
        return {
            [fname]: (conf?.buffer ?? await fs.promises.readFile(fname)).toString()
        };
    }

    #readUCS(ucs) {
        return ucsExtract(ucs?.buffer ?? ucs?.path ?? ucs, ucsContentFilter);
    }

    async #read(files) {
        files = Array.isArray(files) ? files : [files];
        Object.assign(this.#data, ...await Promise.all(
            files.map((file) => ((Object.hasOwn(file, 'type') ? file.type === TYPES.UCS : maybeUCSPath(file))
                ? this.#readUCS(file)
                : this.#readConf(file)
            ))
        ));
        return this.data;
    }

    /** Cleanup previously read data */
    cleanup() {
        this.#data = {};
    }

    /**
     * @returns {{ [string]: string }} read data
     */
    get data() {
        return this.#data;
    }

    /**
     * Reda input data
     *
     * @param {string | InputData | Array<string | InputData>} files - files to read
     *
     * @returns {{ [string]: string }} read data
     */
    async read(files) {
        this.cleanup();
        try {
            return await this.#read(files);
        } catch (err) {
            log.error(err.toString());
            throw new Error('Unable to extract data. More details in logs...');
        }
    }
}

// singleton at least for now (avoid breaking internal API)
module.exports = new InputReader();
module.exports.TYPES = TYPES;

/**
 * @typedef InputDataType
 * @type {'conf' | 'ucs'}
 */
/**
 * @typedef _InputData
 * @type {object}
 * @property {string} name - file name
 * @property {InputDataType} type - input file type
 */
/**
 * @typedef InputBuffer
 * @type {_InputData}
 * @property {Buffer} buffer - buffer data to process if file read already
 */
/**
 * @typedef InputFile
 * @type {_InputData}
 * @property {string} path - path to file or file name
 */
/**
 * @typedef InputData
 * @type {InputBuffer | InputFile}
 */
