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

/* eslint-disable no-unused-vars */

const express = require('express');
const multer = require('multer');
const { exit } = require('node:process');

const classicValidator = require('./lib/validators/as3Classic');
const inputReader = require('./preConverter/inputReader');
const log = require('./util/log');
const main = require('./main').main;
const nextValidator = require('./lib/validators/as3Next');
const globalObjectRename = require('./util/globalRenameAndSkippedObject');

const app = express();
const port = process.env.PORT || 8080;

const limits = { fileSize: '1GB' };
const storage = multer.memoryStorage();
const upload = multer({ limits, storage });
const constants = require('./constants');

const JSON_MIME_TYPE = 'application/json';

app.use(express.static('src/static'));

app.get('/info', (req, res) => {
    const info = {};
    info.version = constants.PACKAGE.VERSION.ACC;
    info.schema = {};
    info.schema.core = {};
    info.schema.core.current = constants.PACKAGE.VERSION.AS3_SCHEMA;
    info.schema.next = {};
    info.schema.next.current = constants.PACKAGE.VERSION.SHARED_SCHEMA;
    info.schema.next.minimum = constants.PACKAGE.VERSION.SHARED_SCHEMA_MIN;
    return res.status(201).json(info);
});

app.post('/converter', upload.any(), (req, res, next) => {
    const checkBool = (str) => str === 'true';
    const fields = req.body;

    // fix config inputs
    const config = {
        applicationTarget: fields.applicationTarget,
        as3NotRecognized: checkBool(fields.as3NotRecognized),
        container: checkBool(process.env.DOCKER_CONTAINER),
        controls: checkBool(fields.controls),
        declarativeOnboarding: checkBool(fields.declarativeOnboarding),
        disableAnalytics: checkBool(fields.disableAnalytics),
        jsonLogs: checkBool(fields.jsonLogs),
        logFile: fields.log,
        next: checkBool(fields.next),
        nextNotConverted: checkBool(fields.nextNotConverted),
        output: fields.output,
        safeMode: checkBool(fields.safeMode),
        server: true,
        showExtended: checkBool(fields.showExtended),
        tenantTarget: fields.tenantTarget,
        vsName: fields.vsName
    };
    return Promise.resolve()
        .then(() => inputReader.read(req.files.map((file) => ({
            buffer: file.buffer,
            name: file.originalname,
            type: file.fieldname === 'ucs' ? inputReader.TYPES.UCS : inputReader.TYPES.CONF
        }))))

        // Process (parse and convert) input files
        .then((files) => main(files, config))

        // Build response object
        .then((results) => {
            if (checkBool(fields.verbose)) {
                res.status(201).json({
                    as3Converted: results.metadata.as3Converted,
                    as3NextNotConverted: results.metadata.as3NextNotConverted,
                    as3NotConverted: results.metadata.as3NotConverted,
                    as3NotRecognized: results.metadata.as3NotRecognized,
                    as3Recognized: results.metadata.as3Recognized,
                    config,
                    jsonLogs: results.metadata.jsonLogs || [],
                    keyNextConverted: results.metadata.keyNextConverted,
                    logs: results.metadata.logs,
                    output: results.declaration
                });
                res.on('finish', () => {
                    if (config.jsonLogs) {
                        results.metadata.jsonLogs = null;
                        results.metadata.logs = null;
                        config.requestContext.reset();
                        globalObjectRename.reset();
                    }
                    nextValidator.reset();
                    classicValidator.reset();
                });
                results.metadata.jsonLogs = null;
                results.metadata.logs = null;
                nextValidator.reset();
                classicValidator.reset();
            } else {
                res.status(201).json(results.declaration);
            }
        })
        .catch((err) => next(err));
});

app.post('/shutdown', (req, res) => {
    log.info('Shutting down');
    exit(0);
});

app.use((err, req, res, next) => {
    log.error(err);
    let responseData = {};

    if (err?.responseBody) {
        responseData = err.responseBody;
    } else {
        responseData.message = err?.message || JSON.stringify(err, null, 4);
        responseData.stacktrace = err?.stack ? err.stack.split('\n') : [];
    }

    return res
        .status(err?.statusCode ?? 400)
        .json(responseData);
});

module.exports = async () => {
    log.info('Pre-compile schema validator for AS3 Classic');
    await classicValidator.compile();

    log.info('Pre-compile schema validator for AS3 Next');
    await nextValidator.compile();

    return app.listen(port, () => {
        log.info(`Server listening on http://localhost:${port}`);
    });
};
