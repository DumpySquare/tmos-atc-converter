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

import { Writable } from 'stream';
import winston from 'winston';

const colorizer = winston.format.colorize();
let level = process.env['LOG_LEVEL'] ?? 'info';
if (process.env['NODE_ENV'] === 'test') level = 'warn';

// var for stream log stdout into it
let output = '';
const stream = new Writable();
stream._write = (chunk: Buffer, _encoding: BufferEncoding, next: () => void): void => {
    output += chunk.toString();
    next();
};

export interface ExtendedLogger extends winston.Logger {
    configureFile: (filename?: string) => void;
    memory: () => string[];
}

const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf((msg) => `${msg['timestamp'] as string} ${msg.level.toUpperCase()} ${msg['message'] as string}`)
    ),
    level,
    transports: [
        new winston.transports.Console({
            format: winston.format.printf(
                (msg) => `${msg['timestamp'] as string} ${colorizer.colorize(
                    msg.level,
                    msg.level.toUpperCase()
                )} ${msg['message'] as string}`
            )
        }),
        new winston.transports.Stream({ stream })
    ]
}) as ExtendedLogger;

// Note: Original JS code used 'configure' but winston.Logger already has that method.
// We keep compatibility by also assigning to 'configure' at runtime.
logger.configureFile = (filename?: string): void => {
    if (filename) {
        logger.add(new winston.transports.File({
            filename,
            maxsize: 10000000
        }));
    }
};

// Maintain backward compatibility with JS code that calls logger.configure()
(logger as unknown as Record<string, unknown>)['configure'] = logger.configureFile;

logger.memory = (): string[] => {
    const arr = output.trim().split('\n');
    output = '';
    return arr;
};

export default logger;
module.exports = logger;
