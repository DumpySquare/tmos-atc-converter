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

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */
import fs from 'fs';
import stream from 'stream';

const tar = require('tar') as TarModule;
import log from '../utils/log';

interface TarModule {
    Parser: new (options: TarParserOptions) => TarParser;
}

interface TarParserOptions {
    filter?: (path: string, entry: TarEntry) => boolean;
}

interface TarParser extends NodeJS.WritableStream {
    on(event: 'entry', listener: (entry: TarEntry) => void): this;
    on(event: 'warn', listener: (code: string, message: string | Error, data: any) => void): this;
    abort(error: Error): void;
}

interface TarEntry {
    type: string;
    path: string;
    concat(): Promise<Buffer>;
}

interface EntryResult {
    content?: Buffer;
    error?: Error;
    path: string;
}

export type InputDataType = 'conf' | 'ucs';

export interface InputBuffer {
    name?: string;
    type?: InputDataType;
    buffer: Buffer;
    path?: string;
}

export interface InputFile {
    name?: string;
    type?: InputDataType;
    path: string;
    buffer?: Buffer;
}

export type InputData = InputBuffer | InputFile | string;

export const TYPES = Object.freeze({
    CONF: 'conf' as const,
    UCS: 'ucs' as const
});

const UCS_EXT = '.ucs';

/**
 * Check if FS path belongs to UCS file
 */
function maybeUCSPath(maybePath: unknown): boolean {
    return typeof maybePath === 'string' && maybePath.endsWith(UCS_EXT);
}

/**
 * UCS content filter
 */
function ucsContentFilter(path: string, entry: TarEntry): boolean {
    if (entry.type !== 'File') {
        return false;
    }
    const split = path.split('/');

    // ignore files like '._bigip.conf'
    if (split.some((p) => p.startsWith('._'))) {
        return false;
    }

    // keep config/*.conf
    if (split[0] === 'config' && split[1]?.endsWith('.conf')) {
        return true;
    }

    // keep config/bigip.license
    if (split[0] === 'config' && split[1]?.endsWith('.license')) {
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
}

/**
 * Extract UCS file to memory
 */
async function ucsExtract(
    pathOrBuffer: string | Buffer,
    filter: (path: string, entry: TarEntry) => boolean
): Promise<Record<string, string>> {
    let sourceStream: NodeJS.ReadableStream;

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
    const promises: Promise<EntryResult>[] = [];

    tarParser
        .on('entry', (entry: TarEntry) => {
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
        .on('warn', (code: string, message: string | Error, data: any) => {
            data.code = (message instanceof Error && (message as any).code) || code;
            data.tarCode = code;
            tarParser.abort(Object.assign(
                message instanceof Error ? message : new Error(`${code}: ${message}`),
                data
            ));
        });

    await stream.promises.pipeline(sourceStream, tarParser);

    let content: Record<string, string> | undefined;
    if (promises.length) {
        const results = await Promise.all(promises);
        const errors = results.filter((r) => Object.hasOwn(r, 'error'));
        if (errors.length) {
            throw new Error(`Unable to read data from files: ${errors.map((ee) => [ee.path, `${ee.error}`])}`);
        }
        content = Object.fromEntries(
            results
                .filter((r): r is EntryResult & { content: Buffer } => Object.hasOwn(r, 'content'))
                .map((r) => [r.path, r.content.toString()])
        );
    }
    return content ?? {};
}

/**
 * Input Data Reader class
 */
class InputReader {
    #data: Record<string, string> = {};

    async #readConf(conf: InputData): Promise<Record<string, string>> {
        const confObj = conf as InputBuffer | InputFile;
        const fname = confObj?.path ?? (conf as string);
        return {
            [fname]: (confObj?.buffer ?? await fs.promises.readFile(fname)).toString()
        };
    }

    #readUCS(ucs: InputData): Promise<Record<string, string>> {
        const ucsObj = ucs as InputBuffer | InputFile;
        return ucsExtract(ucsObj?.buffer ?? ucsObj?.path ?? (ucs as string), ucsContentFilter);
    }

    async #read(files: InputData | InputData[]): Promise<Record<string, string>> {
        const filesArr = Array.isArray(files) ? files : [files];
        Object.assign(this.#data, ...await Promise.all(
            filesArr.map((file) => {
                const fileObj = file as InputBuffer | InputFile;
                const isUCS = Object.hasOwn(fileObj, 'type')
                    ? fileObj.type === TYPES.UCS
                    : maybeUCSPath(file);
                return isUCS ? this.#readUCS(file) : this.#readConf(file);
            })
        ));
        return this.data;
    }

    /** Cleanup previously read data */
    cleanup(): void {
        this.#data = {};
    }

    /**
     * @returns read data
     */
    get data(): Record<string, string> {
        return this.#data;
    }

    /**
     * Read input data
     *
     * @param files - files to read
     * @returns read data
     */
    async read(files: InputData | InputData[]): Promise<Record<string, string>> {
        this.cleanup();
        try {
            return await this.#read(files);
        } catch (err) {
            log.error((err as Error).toString());
            throw new Error('Unable to extract data. More details in logs...');
        }
    }
}

// singleton at least for now (avoid breaking internal API)
const inputReaderInstance = new InputReader();

export default inputReaderInstance;
export { InputReader };

// CommonJS exports for backward compatibility
module.exports = inputReaderInstance;
module.exports.TYPES = TYPES;
module.exports.InputReader = InputReader;
