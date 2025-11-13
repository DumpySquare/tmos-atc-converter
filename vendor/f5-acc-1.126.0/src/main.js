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

const ProcessingLogs = require('./processingLog/index');
const analytics = require('./lib/analytics');
const as3Converter = require('./engines/as3Converter');
const classicValidator = require('./lib/validators/as3Classic');
const constants = require('./constants');
const countObjects = require('./util/countObjects');
const declarationStats = require('./lib/declarationStats');
const doConverter = require('./engines/doConverter');
const filterByApplication = require('./postConverter/filterByApplication');
const filterConf = require('./preConverter/filterConf');
const getMergedAS3Properties = require('./lib/AS3/as3Properties');
const log = require('./util/log');
const logObjects = require('./lib/logObjects');
const parser = require('./engines/parser');
const inputReader = require('./preConverter/inputReader');
const removeDefaultValuesAS3 = require('./postConverter/removeDefaultValuesAS3');
const removeDefaultValuesDO = require('./postConverter/removeDefaultValuesDO');
const supported = require('./lib/AS3/customDict');
const globalObjectUtil = require('./util/globalRenameAndSkippedObject');

/**
 * Filter objects by array
 *
 * Note:
 * - mutates 'obj'
 *
 * @param {Object} obj - json
 * @param {Array} filter - array of objects by filter
 * @param {Object} renamedDict - dict of renamed kyes
 *
 * @returns {Object} dict of unsupported Next objects
 * @returns {Array} list of Next undefined unsupported keys
 * @returns {Array} list of Next supported keys
 */
const nextFilteredObjects = (obj, filter, renamedDict) => {
    const as3NextNotConverted = {};
    const as3NextUndefinedNotConverted = [];
    const keyNextConverted = [];

    const filterArray = filter.slice(0);

    Object.keys(obj).forEach((key) => {
        const i = filterArray.indexOf(key.split(' ').splice(-1)[0]);
        if (i !== -1) {
            as3NextNotConverted[key] = obj[key];
            filterArray.splice(i, 1);
        } else {
            keyNextConverted.push(key);
        }
    });

    // -- try to recognize undefined objects
    // objects can have name /<>/<>/test or /Common/test
    // in second case for /Common/test it will be replaced to /Common/Shared/test for AS3
    // when we try to identify type of objects we remove 'Shared' and use full name
    // if we had initial name like /Common/test/test, such object will not be identified
    // and we should make additional checks
    filterArray.forEach((item) => {
        const tmpStr = item.split('/').at(-1);
        let foundKey = '';

        // If Keys were renamed during 'deDupeObjectNames';
        if (renamedDict[item] !== undefined) {
            as3NextNotConverted[renamedDict[item]] = obj[renamedDict[item]];
        } else {
            for (let i = 0; i < keyNextConverted.length; i += 1) {
                if (keyNextConverted[i].endsWith(tmpStr)
                // file ssl-cert corner case
                || (keyNextConverted[i].endsWith(`${tmpStr}.crt`) && keyNextConverted[i].startsWith('sys file ssl-cert'))) {
                    foundKey = keyNextConverted[i];
                    as3NextNotConverted[foundKey] = obj[foundKey];
                    keyNextConverted.splice(i, 1);
                    break;
                }
            }

            if (foundKey === '') {
                as3NextUndefinedNotConverted.push(`<--undefined type--> ${item}`);
            }
        }
    });

    return { as3NextNotConverted, as3NextUndefinedNotConverted, keyNextConverted };
};

/**
 * Function added context to config object
 *
 * Note:
 * - mutates 'obj'
 *
 * @param {Object} config - configuratiob object
 *
 * @returns {void}
 */
function enrichConfig(config) {
    // Run ProcessingLogs
    if (config.jsonLogs) {
        config.requestContext = new ProcessingLogs();
    }
}

async function mainRunner(data, config) {
    enrichConfig(config);

    // Always provide versions info
    log.info('-'.repeat(37));
    log.info(`ACC version:\t\t\t${constants.PACKAGE.VERSION.ACC}`);
    log.info(`AS3 core schema version:\t${constants.PACKAGE.VERSION.AS3_SCHEMA}`);
    log.info(`Shared schema version:\t\t${constants.PACKAGE.VERSION.SHARED_SCHEMA}`);
    log.info(`Shared schema package version:\t${constants.PACKAGE.VERSION.SHARED_SCHEMA_PACKAGE}`);
    log.info('-'.repeat(37));

    // Check if 'next' requested with next-not-converted
    if (config.nextNotConverted) {
        config.next = true;
    }

    if (Object.keys(data).length === 1) {
        let jsonData;
        // check if payload is JSON - AS3 Core declaration
        try {
            jsonData = JSON.parse(data[Object.keys(data)[0]]);
        } catch {
            // do nothing, proceed with default processing for UCS or conf files
        }
        if (typeof jsonData === 'object'
            && Object.hasOwn(jsonData, 'class')
            && Object.hasOwn(jsonData, 'schemaVersion')
        ) {
            data = jsonData;
            config.skipTMOSConvertProcess = true;
            log.info('Found and parsed AS3 Core declaration from the input');
        } else if (typeof jsonData === 'object') {
            // TODO: should be moved to another place or should be substituted with error subclassing and etc.
            const reqErr = new Error('Invalid JSON payload received. Expected an AS3 Core declaration.');
            reqErr.statusCode = 400;
            throw reqErr;
        }
    }
    if (config.skipTMOSConvertProcess) {
        const validationResult = await classicValidator.validate(data, { mode: 'strict' });
        if (!validationResult.isValid) {
            // TODO: should be moved to another place or should be substituted with error subclassing and etc.
            const reqErr = new Error('Received invalid AS3 Core declaration.');
            reqErr.statusCode = 422;
            reqErr.responseBody = validationResult;
            throw reqErr;
        }
    }

    log.debug(`Config ${JSON.stringify(config, null, 4)}`);

    globalObjectUtil.setConfig(config);

    let json = data;
    let as3Converted = {};
    let as3Recognized = {};

    if (!config.skipTMOSConvertProcess) {
        json = parser(data);

        // DO branch
        if (config.declarativeOnboarding) {
            if (config.next) log.warn('DO Next is not supported. Doing DO conversion');

            let doDecl = doConverter(json, config);

            // post-converters
            if (config.safeMode) {
                log.info('Running in safe mode, skipping postConverter transformations');
            } else if (!config.showExtended) {
                // Remove default values using DO schema
                log.debug('Removing default DO values from declaration');
                doDecl = removeDefaultValuesDO(doDecl);
            }

            return {
                declaration: doDecl,
                metadata: {
                    declarationInfo: declarationStats(doDecl, config),
                    jsonCount: countObjects(json)
                }
            };
        }

        // apply allowlist for AS3 and ACC support
        as3Recognized = filterConf(json, getMergedAS3Properties());
        as3Converted = filterConf(json, supported);
    }

    // Convert json to AS3
    const converted = await as3Converter(json, config);
    let declaration = converted.declaration;

    // Additional metrics for next
    const { as3NextNotConverted, as3NextUndefinedNotConverted, keyNextConverted } = nextFilteredObjects(
        as3Converted,
        converted.keyNextNotSupported,
        converted.renamedDict
    );

    // post-converters
    if (config.safeMode) {
        log.info('Running in safe mode, skipping postConverter transformations');
    } else {
        // Filter by virtual server name
        if (config.vsName) {
            log.debug('Filtering by Application');
            declaration = filterByApplication(declaration, config);
        }

        // Remove default values using AS3 schema
        if (!config.showExtended) {
            log.debug('Removing default AS3 values from declaration');
            declaration = removeDefaultValuesAS3(declaration, config.next);
        }
    }

    // Get Proccessing Logs
    let jsonLogs = [];
    if (config.jsonLogs) {
        jsonLogs = config.requestContext.getLog();
    }

    return {
        declaration,
        metadata: {
            as3Converted,
            as3NextNotConverted,
            as3NextUndefinedNotConverted,
            as3NotConverted: converted.as3NotConverted,
            as3NotRecognized: converted.as3NotRecognized,
            as3Recognized,
            declarationInfo: declarationStats(declaration),
            jsonCount: countObjects(json),
            jsonLogs,
            keyNextConverted,
            unsupportedStats: converted.unsupportedStats
        }
    };
}

module.exports = {
    main: async (data, config) => {
        // Init logger
        log.configure(config.logFile);

        // Read from file if data is not directly supplied
        if (!data) {
            const input = [config.conf, config.ucs].filter((x) => x);
            data = await inputReader.read(input);
        }

        if (config.ucs && config.server && Object.keys(data).length === 0) {
            throw new Error('Invalid UCS file provided. 0 objects found!');
        }

        let result;
        try {
            result = await mainRunner(data, config);
        } catch (err) {
            // cleanup all sensitive data
            inputReader.cleanup();
            throw err;
        }

        // Send analytics
        analytics(data, result, config);

        logObjects(result, config);
        result.metadata.logs = log.memory();

        return result;
    },

    // Function designed for integration with f5-chariot project, no external support.
    mainAPI: async (data, config = {}) => {
        config.chariot = true;
        config.showExtended = true;

        data = { 'config.conf': data };
        const result = await mainRunner(data, config);

        // Send analytics
        analytics(data, result, config);

        return result;
    }
};
