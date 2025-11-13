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

const path = require('path');
const deepmerge = require('deepmerge');

const as3ClassicCleanUp = require('./as3ClassicCleanUp');
const as3NextCleanUp = require('./as3NextCleanUp');
const CIPHER_SUFFIX = require('../constants').CIPHER_SUFFIX;
const customDict = require('../lib/AS3/customDict');
const declarationBase = require('../util/convert/declarationBase');
const dedupeArray = require('../util/convert/dedupeArray');
const filterConf = require('../preConverter/filterConf');
const findLocation = require('../util/convert/findLocation');
const getKey = require('../util/getKey');
const GlobalObject = require('../util/globalRenameAndSkippedObject');
const handleObjectRef = require('../util/convert/handleObjectRef');
const ipUtils = require('../util/convert/ipUtils');
const log = require('../util/log');
const objectUtil = require('../util/object');
const createConvertEngine = require('../lib/AS3/convertEngine');
const defaults = require('../lib/bigipDefaults.json');

let retryFlag = false;
/**
 * This is an auxiliary function that determines if the names of the two configuration objects are matching
 * in order to select candidates for renaming to avoid name collision in the AS3 declaration.
 * Usually, it is enough to compare the names in the normal way.
 * However, ".crt" suffix in the name of the certificate file is considered meaningless and optional.
 * To address that, the suffix in the name of the certificate file is ignored during the comparison
 * (the certificate key does not participate directly in the creation of the certificate object name of the declaration
 * and can be ignored).
 * The expectation is that a certificate file can appear only as the "secondObject"
 * because it is not in the "supported" array of the caller.
 * We can get away without renaming the certificate file name
 * because it is enough that we rename "ltm profile client-ssl".
 * In addition to that renaming "sys file ssl-cert" is likely to have implication later in the custom handling of
 * certificates when trying to match it to name of "sys file ssl-key" object and bundles.
 *
 * @param {String} candidateForRenaming - top line of a configuration object that might be renamed later,
 *      e.g., "ltm profile client-ssl /Custom/cert_01"
 * @param {String} secondObject  - top line of another configuration object that might have matching name,
 *      e.g., "sys file ssl-cert /Custom/cert_01.crt"
 * @returns {Boolean} "true" if the names match, "false" otherwise
 */
function doNamesMatch(candidateForRenaming, secondObject) {
    const candidateName = candidateForRenaming.split(' ').pop();

    let secondName = secondObject.split(' ').pop();
    if (secondObject.startsWith('sys file ssl-cert')) {
        secondName = secondName.replace(/\.crt$/g, '');
    }

    return candidateName === secondName;
}
/**
 * Function check for id value in conf and give route-domain name
 *
 * @param {Object} obj - source json object
 * @param {Object} targetId - id Value
 *
 * @returns {Object} - keyValues of matching route-domain names
 */
function filterById(obj, targetId) {
    const keyValue = Object.entries(obj)
        .filter(([key, value]) => key.includes('net route-domain') && Number(value.id) === targetId)
        .map(([key]) => key);
    return keyValue;
}

function modifyContentTypeIncludeValues(val) {
    // Regular expression to capture the entire application/(...) part
    const regex = /application\/\(([^)]+)\)/;

    // If the value doesn't include 'text/' or 'application/', return it as is
    if (!val.includes('text/') && !val.includes('application/')) {
        return val;
    }

    if (regex.test(val)) {
        // Extract the part inside the parentheses
        const match = val.match(regex);
        if (match) {
            // Split the captured group by the '|' character to get each option
            const options = match[1].split('|');
            // Map each option to the format `application/option`, and join them with `; `
            const modifiedVal = options.map((opt) => `application/${opt}`).join('; ');
            // Replace the original application/(...) part with the newly formatted string
            return val.replace(regex, modifiedVal);
        }
    }
    return val; // Return the original value if no modifications were made
}

/**
 * Function check initial json object and in case of equal names for supported properties
 * ['ltm pool', 'ltm profile', 'ltm virtual', 'ltm rule', 'ltm policy', 'ltm monitor']
 * will rename them with template <type>_<oldName>_<dup(optional)>
 *
 * Irrespective of deduplication, rename certificate names that start with a digit
 * (which is currently prohibited by the schemas) by adding prefix 'file_'.
 *
 * And also returns dict of renamed keys for use in 'next'
 *
 * Note:
 * - mutates 'obj'
 *
 * @param {Object} json - source json object
 * @param {Object} processingLogs - logger tool
 *
 * @returns {Object} jsonDeduped - updated json object
 * @returns {Object} renamedDict - dict of renamed keys
 * @returns {Object} originalTmshPathDict - dict of renamed keys with original Tmsh headers
 */
const deDupeObjectNames = (json, processingLogs) => {
    const supported = ['ltm pool', 'ltm profile', 'ltm virtual', 'ltm rule', 'ltm policy', 'ltm monitor'];
    const ipNameSupported = ['ltm virtual', 'ltm pool', 'ltm monitor'];
    const dupeArray = [];
    const ipNameArray = [];
    const digitFirstCertArray = [];
    const jsonKeys = Object.keys(json);

    // Check original json for duplicates. Check objects names
    jsonKeys.forEach((jsonKey) => {
        const confKey = getKey(jsonKey);
        const confKeyName = jsonKey.split(' ').pop();

        /* Collect certificate names that start with a digit.
            The certificate object name in the schema originates from the name of 'sys file ssl-cert' */
        if (confKey === 'sys file ssl-cert') {
            const objName = jsonKey.split('/').pop();
            if (objName.match(/^\d/)) {
                digitFirstCertArray.push(jsonKey);
            }
        }

        // Check if current key is supported for dupe.
        if (supported.filter((item) => jsonKey.startsWith(`${item} `) && !confKey.includes('ocsp-stapling-params')).length) {
            // As a result we will have an array. Check length.
            if (jsonKeys.filter((item) => doNamesMatch(jsonKey, item)
            && item !== jsonKey && !item.includes('virtual-address')).length) {
                dupeArray.push(jsonKey);
            }
        }

        // Check if current key is supported for have ip name.
        if (ipNameSupported.filter((item) => jsonKey.startsWith(`${item} `)).length) {
            const objName = path.basename(confKeyName);

            // It should start from number and not be dupe of any object
            if (objName.match(/^\d/) && !dupeArray.includes(jsonKey)) ipNameArray.push(jsonKey);
        }
    });

    // Join objects for update
    const tempArray = dupeArray.concat(ipNameArray).concat(digitFirstCertArray);
    const renamedDict = {};
    let jsonDeduped = {};
    const originalTmshPathDict = {};

    // If no duplicates or ip names found, return json as it is.
    if (!tempArray.length) {
        jsonDeduped = json;
        return { jsonDeduped, renamedDict, originalTmshPathDict };
    }

    tempArray.forEach((objectToUpdate) => {
        jsonKeys.forEach((jsonKey) => {
            if (objectToUpdate === jsonKey) {
                const objType = getKey(objectToUpdate).split(' ')[1];
                const objFullName = objectToUpdate.split(' ').pop();
                const objName = path.basename(objFullName);
                const objPath = path.dirname(objFullName);

                // Specific name for dupes
                const objNewName = (dupeArray.includes(objectToUpdate)) ? `${objType}_${objName}_dup` : `${objType}_${objName}`;

                const objFullNewName = path.join(objPath, objNewName);

                // renamedDict will be used in 'next' as additional info
                if (objPath.split('/').length === 2) {
                    renamedDict[path.join(objPath, 'Shared', objNewName)] = objectToUpdate;
                } else {
                    renamedDict[objFullNewName] = objectToUpdate;
                }

                // Prior changing name, we need to find references in original json and update them.
                Object.keys(json).forEach((jKey) => {
                    const jValue = json[jKey];

                    // We've to transform rule and profile to rules and profiles to change in object.
                    let tempobjType;
                    if (objType === 'rule' || objType === 'profile') {
                        tempobjType = `${objType}s`;
                    } else tempobjType = objType;

                    // Rules and profiles cases:
                    // Rules and profiles inside are objects.
                    if (jValue[tempobjType] && objectUtil.has(jValue[tempobjType], [objFullName])) {
                        const innerPropertyValue = jValue[tempobjType][objFullName];
                        jValue[tempobjType][objFullNewName] = innerPropertyValue;
                        delete jValue[tempobjType][objFullName];
                        if (processingLogs) {
                            processingLogs.logRenameProperty({
                                reason: 'Update objects references inside rules/profiles',
                                property: objFullNewName,
                                tmshHeader: jKey,
                                tmshPath: {
                                    [tempobjType]: {
                                        [objFullName]: null
                                    }
                                }
                            });
                        }
                    } else if ((jValue[tempobjType]
                        && typeof jValue[tempobjType] === 'string')
                        && jValue[tempobjType] === objFullName) {
                        // Virtual servers cases:
                        // pool /Common/<poolname>
                        jValue[tempobjType] = objFullNewName;
                        if (processingLogs) {
                            processingLogs.logRenameProperty({
                                reason: 'Update objects references inside rules/profiles',
                                property: objFullNewName,
                                tmshHeader: jKey,
                                tmshPath: {
                                    [tempobjType]: {
                                        [objFullName]: null
                                    }
                                }
                            });
                        }
                    } else if (objectUtil.has(jValue, 'cert-key-chain')) {
                        /* Rename certifcate references that starts with a digit
                            there might be multiple certificates in a profile */
                        const certKeySet = jValue['cert-key-chain'];
                        if (typeof certKeySet === 'object') {
                            Object.values(certKeySet).forEach((certKey) => {
                                if (typeof certKey === 'object') {
                                    /* Although we can rename certificate object names,
                                        we cannot rename file paths.
                                        Preserve certificate file path in an internal property.
                                        It will be used later in the customized handling of profiles.
                                    */
                                    if (objectUtil.has(certKey, 'cert') && certKey.cert === objFullName) {
                                        certKey.cert = objFullNewName;
                                        certKey.accOrigCert = objFullName;
                                        if (processingLogs) {
                                            processingLogs.logRenameProperty({
                                                reason: 'Update objects references inside cert-key-chain',
                                                property: 'cert',
                                                tmshHeader: jKey,
                                                tmshPath: {
                                                    'cert-key-chain': {
                                                        [certKey]: {
                                                            cert: null
                                                        }
                                                    }
                                                }
                                            });
                                            processingLogs.logRenameProperty({
                                                reason: 'Update objects references inside cert-key-chain',
                                                property: 'accOrigCert',
                                                tmshHeader: jKey,
                                                tmshPath: {
                                                    'cert-key-chain': {
                                                        [certKey]: {
                                                            accOrigCert: null
                                                        }
                                                    }
                                                }
                                            });
                                        }
                                    }
                                }
                            });
                        }
                    }
                });

                // Rename object here.
                const newPath = `${getKey(objectToUpdate)} ${objFullNewName}`;
                originalTmshPathDict[newPath] = objectToUpdate;
                jsonDeduped[newPath] = json[jsonKey];
                if (processingLogs) {
                    processingLogs.logRenamedProperty({
                        reason: 'Object renaming to avoid duplicates',
                        origin: jsonKey,
                        path: newPath
                    });
                }
            } else if (jsonKey && !tempArray.includes(jsonKey)) {
                // Not duplicates goes here without changes.
                jsonDeduped[jsonKey] = json[jsonKey];
            }
        });
    });

    return { jsonDeduped, renamedDict, originalTmshPathDict };
};

const defaultsFromInheritance = (json) => {
    const supported = ['ltm monitor', 'ltm profile'];
    const jsonKeys = Object.keys(json);

    jsonKeys.forEach((jsonKey) => {
        const confKey = getKey(jsonKey);

        // supported objects
        if (supported.filter((item) => jsonKey.startsWith(item)).length !== 0) {
            const parent = json[jsonKey]['defaults-from'];

            // if object is default to BIG-IP, do not update
            if (parent && !defaults.includes(parent)) {
                // create heritage list
                // T3 -> defaults-from T2 -> defaults-from T1 -> defaults-from default
                // [T3, T2, T1]
                let parentList = [];
                const objName = jsonKey.split(confKey)[1].trim();
                let tempObjName = objName;

                do {
                    parentList.push(tempObjName);
                    tempObjName = json[confKey.concat(' ', tempObjName)]['defaults-from'];
                } while (confKey.concat(' ', tempObjName) in json);
                parentList = parentList.map((x) => confKey.concat(' ', x));

                // merge object's params
                let updatedObj = {};
                parentList.forEach((item) => {
                    updatedObj = { ...json[item], ...updatedObj };
                });

                json[jsonKey] = updatedObj;
                delete json[jsonKey]['defaults-from'];
            }
        }
    });

    return json;
};

/**
 * If a 'snatpool' member is a 'snat-translation' promote the address from the 'snat-translation'
 * directly to the 'snatpool', since 'snat-translation' objects are not converted anyway.
 *
 * Note: it might modify jsonDefaultsUpdated.
 *
 * @param {object} jsonDefaultsUpdated - BIG-IP configuration storred as a json
 * @param {string} confKey - the type of the current object of the configuration
 * @param {object} confObj - the current object of the configuration
 */
function promoteSnatTranslationAddress(jsonDefaultsUpdated, fileKey, processingLogs) {
    const confKey = getKey(fileKey);
    if (confKey === 'ltm snatpool') {
        const confObj = jsonDefaultsUpdated[fileKey];
        const poolMembers = confObj.members;
        Object.keys(poolMembers).forEach((snatPoolMember) => {
            const snatTranslation = 'ltm snat-translation '.concat(snatPoolMember);
            if (jsonDefaultsUpdated[snatTranslation] && jsonDefaultsUpdated[snatTranslation].address) {
                // typical replacement: {/Common/snat-translation-list-a: ''} to {10.10.10.10: ''}
                const address = jsonDefaultsUpdated[snatTranslation].address;
                poolMembers[address] = poolMembers[snatPoolMember];
                delete poolMembers[snatPoolMember];
                if (processingLogs) {
                    processingLogs.logRenameProperty({
                        reason: 'Promote snat translation address',
                        property: address,
                        tmshHeader: fileKey,
                        tmshPath: {
                            members: {
                                [snatPoolMember]: null
                            }
                        }
                    });
                }
            }
        });
    }
}

async function as3Convert(json, config) {
    // start with basic json structure
    const declObj = declarationBase.AS3(config);
    const unconvertedArr = [];
    const convertEngine = createConvertEngine();
    const loggerCtx = config.requestContext;

    // use for cleanup redirect services
    const redirectVS = [];

    /* Not every TMOS configuration class might have 1:1 representation in the Shared Schema.
        Sometimes data from a "low" level object is propagated to another "subsuming" object
        e.g., addresses from 'net address-list' are promoted to a 'Service_*' object.
        promotedObjects is a mapping from TMOS path like '/tenant1/app1/object1' of a "low" level object
        to an object formed by 'src/util/convert/findLocation.js' for the "subsuming" object.
    */
    const promotedObjects = {};

    // cleanup Duplicates
    const { jsonDeduped, renamedDict, originalTmshPathDict } = deDupeObjectNames(json, loggerCtx);

    // defaults-from inheritance
    const jsonDefaultsUpdated = defaultsFromInheritance(jsonDeduped);
    const fileKeys = Object.keys(jsonDeduped);

    // filter http iapp keys
    const regexHttpiApp = /ltm\svirtual\s(\/\w+\/\w+\.app)/;
    const httpiApps = fileKeys.filter((item) => item.match(regexHttpiApp));
    const iappPath = httpiApps.map((item) => item.match(regexHttpiApp)[1]);
    const iappSupported = fileKeys.filter((item) => iappPath.some((el) => item.includes(el)));

    /**
     * @param {string} fileKey
     * @returns {boolean} true if key converted/processed or false if key should be processed later
     */
    const convertFileKey = async (fileKey, finalAttempt) => {
        const confKey = getKey(fileKey);
        const confObj = jsonDefaultsUpdated[fileKey];
        // promote address from 'snat-translation' to 'snatpool'
        promoteSnatTranslationAddress(jsonDefaultsUpdated, fileKey, loggerCtx);

        if (!customDict[confKey]) {
            // Log object as 'unsupported' by ACC
            unconvertedArr.push(fileKey);
            return true;
        }
        if (customDict[confKey].noDirectMap) {
            return true;
        }

        // analytics profile capture filter can have any name, rename to a constant value, should only be 1
        if (confKey === 'ltm profile analytics') {
            const tcString = 'traffic-capture';
            const tcObj = confObj[tcString];
            if (tcObj && typeof tcObj === 'object' && Object.keys(tcObj).length === 1) {
                const keyZeroName = Object.getOwnPropertyNames(confObj[tcString])[0];
                const keyZeroValue = tcObj[Object.keys(tcObj)[0]];
                const defaultName = 'capture-for-f5-appsvcs';
                if (keyZeroName !== defaultName) {
                    confObj[tcString][defaultName] = keyZeroValue;
                    delete confObj[tcString][keyZeroName];
                    if (loggerCtx) {
                        loggerCtx.logRenameProperty({
                            reason: 'Analytics profile traffic-capture renamed to default',
                            property: defaultName,
                            tmshHeader: fileKey,
                            tmshPath: {
                                [tcString]: {
                                    [keyZeroName]: null
                                }
                            }
                        });
                    }
                }
            }
        }

        const originalTmshHeader = objectUtil.has(originalTmshPathDict, fileKey)
            ? originalTmshPathDict[fileKey]
            : fileKey;

        // For irule we are adding the key to the rule content and modifying it object from string
        let obj;
        if (confKey === 'ltm rule' && confObj && (typeof confObj === 'string')) {
            // api-anonymous is the key used for ltm rule from properties.json
            const keyValue = 'api-anonymous';
            // prefer-const
            const modifiedConfObj = {};
            modifiedConfObj[keyValue] = confObj;
            // modifying the ltm rule to be object so that it will be parsed properly and also remove unwanted logging
            obj = await convertEngine.convert(
                confKey,
                modifiedConfObj,
                { accConfig: config, tmshHeader: fileKey, originalTmshHeader },
                null,
                retryFlag
            );
        } else {
            obj = await convertEngine.convert(
                confKey,
                confObj,
                { accConfig: config, tmshHeader: fileKey, originalTmshHeader },
                null,
                retryFlag
            );
        }
        let filePath = fileKey.split(confKey)
            .map((x) => x.trim())
            .filter((x) => x)[0];

        let modifiedFileKey = fileKey;

        // fix for un-prefixed profiles on /Common 16.1
        if (!filePath.startsWith('/')) {
            modifiedFileKey = fileKey.replace(filePath, `/Common/${filePath}`);
            filePath = `/Common/${filePath}`;
        }

        // if object is default to BIG-IP, do not convert
        if (defaults.includes(filePath)) {
            return true;
        }

        const loc = findLocation(modifiedFileKey);
        log.debug(`Converting ${filePath} "${customDict[confKey].class}"`);

        const getAS3Path = (root = false) => (root ? `/${loc.tenant}/${loc.app}` : `/${loc.tenant}/${loc.app}/${loc.profile}`);

        // partial support for iApps
        if (loc.iapp && !fileKey.startsWith('sys application service')
            && !iappSupported.includes(fileKey)) {
            unconvertedArr.push(fileKey);
            GlobalObject.deleteProperty(getAS3Path(true), loc.profile, 'Unsupported iApp type');
            return true;
        }
        // Non default objects in /Common/ should be in /Common/Shared
        // ex: /Common/somewhere/test -> /Common/Shared/test
        //     /Common/test2 -> /Common/Shared/test2
        // We add oldPath, so it can be later used when updating GlobalObject
        let oldPath;
        if (loc.tenant === 'Common' && loc.app !== 'Shared' && loc.profile) {
            oldPath = `/${loc.tenant}/${loc.app}`;
            loc.app = 'Shared';
            const newPath = `/${loc.tenant}/${loc.app}`;
            GlobalObject.moveAll(oldPath, loc.profile, newPath, loc.profile);
        } else {
            oldPath = `/${loc.tenant}`;
        }

        // relocate /Common to /Common/Shared or
        // in case of virtual-address /AS3_Tenant/10.2.3.4 to /AS3_Tenant/Shared/10.2.3.4
        if (!loc.profile) {
            loc.profile = loc.app;
            loc.app = 'Shared';
            const newPath = `/${loc.tenant}/${loc.app}`;
            GlobalObject.moveAll(oldPath, loc.profile, newPath, loc.profile);
        }

        obj.class = customDict[confKey].class;
        GlobalObject.addProperty(getAS3Path(), 'class', originalTmshHeader, { class: null });

        // create tenants
        if (!declObj[loc.tenant]) declObj[loc.tenant] = { class: 'Tenant' };

        // Connect multiple objects together
        // special edge case for Service_Address (locate to <tenant>/Shared)
        if (confKey === 'ltm virtual-address') {
            // if loc.app is IPv4 or IPv6, then it belongs indirectly to a Service
            if (ipUtils.isIPv4(loc.profile) || ipUtils.isIPv6(loc.profile)) {
                const newPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
                // If it's Next conversion, report unsupported properties of virtual-address
                if (config.next) {
                    Object.keys(obj).forEach((key) => {
                        if (key !== 'class' && key !== 'virtualAddress' && key !== 'netmask') {
                            GlobalObject.deleteProperty(
                                newPath,
                                key,
                                `${key} property of virtual-address is not supported in Next`,
                                true
                            );
                        }
                    });
                }
                GlobalObject.deleteProperty(getAS3Path(true), loc.profile, 'RenamedProperty');
                return true;
            }
            // else it is a Service_Address
            if (!declObj[loc.tenant].Shared) {
                declObj[loc.tenant].Shared = { class: 'Application', template: 'shared' };
            }
            const custom = customDict[confKey].customHandling(obj, loc, jsonDefaultsUpdated);
            if (loc.app === 'Shared') {
                Object.assign(declObj[loc.tenant].Shared, custom);
            } else {
                if (!declObj[loc.tenant][loc.app]) {
                    declObj[loc.tenant][loc.app] = { class: 'Application', template: 'shared' };
                }
                Object.assign(declObj[loc.tenant][loc.app], custom);
            }
            return true;
        }
        // if there's a custom override:
        let customObj = {};
        if (customDict[confKey].customHandling) {
            customObj = customDict[confKey].customHandling(
                obj,
                loc,
                jsonDefaultsUpdated,
                promotedObjects
            );
        }
        // Removing route domain from members address for next has it is yet to be supported.
        if (confKey === 'ltm pool' && config && config.next) {
            if ('members' in customObj[loc.profile]) {
                const keys = Object.keys(customObj[loc.profile].members);
                for (let i = 0; i < keys.length; i += 1) {
                    const poolMemberPath = keys[i];
                    const poolMember = customObj[loc.profile].members[poolMemberPath];
                    let serverIds;
                    if ('servers' in poolMember) {
                        serverIds = Object.keys(poolMember.servers);
                    } else if ('serverAddresses' in poolMember) {
                        serverIds = Object.keys(poolMember.serverAddresses);
                    } else {
                        break;
                    }
                    for (let eachServerIndex = 0; eachServerIndex < serverIds.length; eachServerIndex += 1) {
                        const serverKey = serverIds[eachServerIndex];
                        let serverObj;

                        if (poolMember.servers && serverKey in poolMember.servers) {
                            serverObj = poolMember.servers[serverKey];
                        } else {
                            serverObj = poolMember.serverAddresses[serverKey];
                        }
                        // regex to see if the address consists of route domain
                        const regex = /^([\d.]+)%(\d+)$/;
                        let match;
                        if (poolMember.servers && serverKey in poolMember.servers) {
                            match = serverObj.address.match(regex);
                        } else {
                            match = serverObj.match(regex);
                        }
                        if (match) {
                            const ip = match[1];
                            if (poolMember.servers && serverKey in poolMember.servers) {
                                serverObj.address = ip;
                            } else {
                                serverObj = ip;
                            }
                        }
                    }
                }
            }
        }
        // Service_HTTPS specific override. Collect all http virtuals and check Redirect cases
        if (confKey === 'ltm virtual'
            && customObj[loc.profile].iRules
            && customObj[loc.profile].iRules[0].bigip === '/Common/_sys_https_redirect'
            && customObj[loc.profile].class === 'Service_HTTP') {
            redirectVS.push({ add: customObj[loc.profile].virtualAddresses, loc });
        }
        if (confKey === 'ltm virtual' && config && config.next) {
            const keyValue = Object.entries(jsonDefaultsUpdated)
                .filter(([key]) => key.includes('net route-domain'))
                .map(([key]) => key);
            if (keyValue.length !== 0) {
                const orig = jsonDefaultsUpdated[loc.original];
                const match = orig.destination.match(/%(\d+)/);
                if (match[1]) {
                    const result = filterById(jsonDefaultsUpdated, Number(match[1]));
                    customObj[loc.profile].allowNetworks = Object.keys({ key: '' }).map(() => ({ bigip: `Add your VRF name here for id:${result}` }));
                }
            }
        }
        // Remove 'source' information from virtual addresses in Next.
        // It is not supported by the schema yet.
        if (confKey === 'ltm virtual' && config && config.next
            && customObj[loc.profile].virtualAddresses
            && Array.isArray(customObj[loc.profile].virtualAddresses)) {
            // replace ['destination', 'source'] array with 'destination'
            const dropSourceAddress = (element) => {
                if (Array.isArray(element) && element.length === 2) {
                    // the first element of the array is 'destination'
                    // and the second is 'source'
                    log.warn(`Removing 'source' for 'destination' ${element[0]} of ${fileKey} virtual service`);
                    element = element[0];
                }
                return element;
            };

            customObj[loc.profile].virtualAddresses = customObj[loc.profile].virtualAddresses.map(
                dropSourceAddress
            );
        }

        if (confKey === 'ltm cipher rule') {
            // add specific suffix for cipher rules
            const oldName = loc.profile;
            loc.profile = `${loc.profile}${CIPHER_SUFFIX}`;
            const parentPath = `/${loc.tenant}/${loc.app}`;
            GlobalObject.moveAll(parentPath, oldName, parentPath, loc.profile);
        }
        if (confKey === 'ltm profile http-compression' && config && config.next) {
            if (customObj[loc.profile].contentTypeIncludes
                && Array.isArray(customObj[loc.profile].contentTypeIncludes)) {
                customObj[loc.profile].contentTypeIncludes.forEach((contentType, index) => {
                    const modifiedContentType = modifyContentTypeIncludeValues(contentType);
                    customObj[loc.profile].contentTypeIncludes[index] = modifiedContentType;
                });
            }
            if (customObj[loc.profile].contentTypeExcludes
                && Array.isArray(customObj[loc.profile].contentTypeExcludes)) {
                customObj[loc.profile].contentTypeExcludes.forEach((contentType, index) => {
                    const modifiedContentType = modifyContentTypeIncludeValues(contentType);
                    customObj[loc.profile].contentTypeExcludes[index] = modifiedContentType;
                });
            }
        }
        // for tcp profile abc and ecn to be renamed for next.
        if (confKey === 'ltm profile tcp' && config && config.next) {
            if ('abc' in customObj[loc.profile]) {
                customObj[loc.profile].appropriateByteCounting = customObj[loc.profile].abc;
                GlobalObject.addProperty(getAS3Path(), 'appropriateByteCounting', originalTmshHeader, { abc: null });
                delete customObj[loc.profile].abc;
            }
            if ('ecn' in customObj[loc.profile]) {
                customObj[loc.profile].explicitCongestionNotification = customObj[loc.profile].ecn;
                GlobalObject.addProperty(getAS3Path(), 'explicitCongestionNotification', originalTmshHeader, { ecn: null });
                delete customObj[loc.profile].ecn;
            }
        }
        // Adding changes to migitate autneticationMode till next supports it.
        if (confKey === 'ltm profile client-ssl' && config && config.next) {
            if (!('authenticationTrustCA' in customObj[loc.profile])) {
                if ('authenticationDepth' in customObj[loc.profile]) {
                    delete customObj[loc.profile].authenticationDepth;
                    GlobalObject.deleteProperty(`/${loc.tenant}/${loc.app}/${loc.profile}`,
                        'authenticationDepth',
                        'The property is removed because an associated ca-file is set to none.');
                }
                if ('authenticationFrequency' in customObj[loc.profile]) {
                    delete customObj[loc.profile].authenticationFrequency;
                    GlobalObject.deleteProperty(`/${loc.tenant}/${loc.app}/${loc.profile}`,
                        'authenticationFrequency',
                        'The property is removed because an associated ca-file is set to none.');
                }
            }
        }
        // Multiple virtualPort specific override
        if (confKey === 'ltm virtual') {
            // if (config && config.next) {
            const orig = jsonDefaultsUpdated[loc.original];
            const tmc = orig['traffic-matching-criteria'];
            if (tmc) {
                /* Here we are dealing with virtual ports of tmc only,
                    because they might require access to the port list object.
                    Virtual addresses of tmc are dealt with in service.js. */
                const ref = `ltm traffic-matching-criteria ${tmc}`;
                let portListPath = jsonDefaultsUpdated[ref]['destination-port-list'];
                if (portListPath) {
                    if (config && config.next) {
                        portListPath = handleObjectRef(portListPath).use;
                        if (objectUtil.has(declObj, portListPath, { tmosPath: true })) {
                            customObj[loc.profile].virtualPort = objectUtil.get(
                                declObj, portListPath, { tmosPath: true }
                            ).ports;
                        } else if (!finalAttempt) {
                            return false;
                        }
                    } else {
                        customObj[loc.profile].virtualPort = handleObjectRef(portListPath);
                    }

                    // single port can be presented as a number (instead of an array)
                    if (Array.isArray(customObj[loc.profile].virtualPort)
                        && customObj[loc.profile].virtualPort.length === 1
                        && Number.isInteger(customObj[loc.profile].virtualPort[0])) {
                        customObj[loc.profile].virtualPort = customObj[loc.profile].virtualPort[0];
                    }
                } else if (jsonDefaultsUpdated[ref]['destination-port-inline']) {
                    customObj[loc.profile].virtualPort = parseInt(jsonDefaultsUpdated[ref]['destination-port-inline'], 10);
                }
                GlobalObject.addProperty(getAS3Path(), 'virtualPort', originalTmshHeader, { virtualPort: null });
            }
        }

        // 'duplicate' profile
        // in some cases duplicates named object-1-, in some object-1
        const profileSlice = loc.profile.match(/[_.-]\d+-{0,1}$/ig);

        if (profileSlice) {
            const reReplace = new RegExp(profileSlice[0], 'g');
            const origProfile = loc.profile.replace(reReplace, '');
            const dupeInt = parseInt(profileSlice[0].slice(1), 10);
            const declReady = declObj[loc.tenant][loc.app] && declObj[loc.tenant][loc.app][origProfile];

            if (!declReady && !finalAttempt) {
                return false;
            }

            if (loc.profile && !Number.isNaN(dupeInt) && declReady
                && Object.hasOwn(declReady, 'class') && declReady.class !== 'Monitor'
                && declReady.class === obj.class) {
                const origObj = declObj[loc.tenant][loc.app][origProfile];

                // Don't merge if have different ports
                if (origObj.virtualPort === obj.virtualPort) {
                    // merge 'duplicate' items together
                    // assumes any diffs will be within arrays
                    // remove any dupes from arrays in merged object
                    const merged = deepmerge(origObj, obj);
                    Object.keys(merged).forEach((mergeKey) => {
                        if (Array.isArray(merged[mergeKey])) {
                            merged[mergeKey] = dedupeArray(merged[mergeKey]);
                        }
                    });
                    declObj[loc.tenant][loc.app][origProfile] = merged;

                    // Add the difference to GlobalObject original object
                    Object.keys(obj).forEach((objKey) => {
                        if (!objectUtil.has(origObj, objKey)) {
                            GlobalObject.moveAll(`${getAS3Path(true)}/${obj}`, objKey, `${getAS3Path(true)}/${origObj}`, objKey);
                        }
                    });

                    // Check customObj has more object than just 1 profile
                    // Certs can be additional, reassign them
                    if (Object.keys(customObj).length > 1) {
                        const customKeys = Object.keys(customObj);
                        customKeys.forEach((customKey) => {
                            if (!customKey.startsWith(origProfile)) {
                                declObj[loc.tenant][loc.app][customKey] = customObj[customKey];
                                delete customObj[customKey];
                            }
                        });
                    }

                    return true;
                }
            }
        }

        // only /Common/Shared is valid for /Common tenant
        if (loc.tenant === 'Common' && loc.app === 'ServiceDiscovery') {
            GlobalObject.deleteProperty(getAS3Path(true), loc.profile, '"ServiceDiscovery" is not valid app for "/Common" tenant');
            return true;
        }

        // typical handling
        declObj[loc.tenant][loc.app] = { class: 'Application', template: 'generic', ...declObj[loc.tenant][loc.app] };

        // if custom handling, do not auto-attach
        if (!customDict[confKey].customHandling) {
            declObj[loc.tenant][loc.app][loc.profile || loc.app] = obj;
        }

        // duplicate as3-object detection (naming collision)
        let collision = false;
        Object.keys(customObj).forEach((custKey) => {
            if (declObj[loc.tenant][loc.app][custKey] && custKey !== 'template' && custKey !== 'certificate_default') {
                collision = true;
                log.warn(`Duplicate object name detected: ${custKey} exists as both`
                    + ` ${declObj[loc.tenant][loc.app][custKey].class} in ${loc.tenant}.${loc.app}.${custKey}`
                    + ` and ${customObj[custKey].class} in '${fileKey}'`);
            }
        });

        // try to solve by deleting empty properties
        if (collision) {
            Object.keys(customObj).forEach((subObj) => {
                const tmpObj = customObj[subObj];
                Object.keys(tmpObj).forEach((k) => {
                    if (tmpObj[k] === undefined) {
                        delete tmpObj[k];
                        GlobalObject.deleteProperty(`${getAS3Path(true)}/${subObj}`, k, 'Empty property is removed');
                    }
                });
            });

            // merge custom object into declaration
            declObj[loc.tenant][loc.app] = deepmerge(declObj[loc.tenant][loc.app], customObj);
        } else {
            // attach custom object to declaration
            declObj[loc.tenant][loc.app] = Object.assign(declObj[loc.tenant][loc.app], customObj);
        }

        // make sure that 'Shared' app is always has a template 'shared'
        if (loc.app === 'Shared') {
            declObj[loc.tenant][loc.app].template = 'shared';
        }
        return true;
    };

    let fileKeysArray = fileKeys.slice();
    let stopLoop = false;
    let lastKnownLength = 0;

    /**
     * Idea is to allow some data (keys) processing to be postponded to later times
     * if there is not enough information at some point.
     */
    while (fileKeysArray.length > 0 && !stopLoop) {
        stopLoop = lastKnownLength === fileKeysArray.length;
        lastKnownLength = fileKeysArray.length;
        const notProcessedKeys = [];

        // iterate through config objects
        // eslint-disable-next-line no-restricted-syntax
        for (const fileKey of fileKeysArray) {
            let isProcessed = false;
            try {
                // eslint-disable-next-line no-await-in-loop
                isProcessed = await convertFileKey(fileKey, stopLoop);
            } catch (e) {
                log.error(`Error converting: ${fileKey}`);
            }
            if (!isProcessed) {
                notProcessedKeys.push(fileKey);
            }
        }
        if (notProcessedKeys.length !== 0) {
            retryFlag = true;
        } else {
            retryFlag = false;
        }
        fileKeysArray = notProcessedKeys;
    }
    // add not processed keys (e.g. due uncaught error and etc.)
    fileKeysArray.forEach((k) => unconvertedArr.push(k));

    // remove Common if no stanzas
    if (declObj.Common && Object.keys(declObj.Common).length === 1) {
        delete declObj.Common;
        GlobalObject.deleteProperty('', 'Common');
    }

    // cleanup 'redirect' http virtual servers
    redirectVS.forEach((red) => {
        let redirect80 = false;

        // look at all objects and check virtual servers only
        fileKeys.forEach((fileKey) => {
            const confKey = getKey(fileKey);
            if (confKey === 'ltm virtual') {
                const loc = findLocation(fileKey);
                const partObj = declObj[loc.tenant][loc.app];
                const objVS = (loc.profile && partObj) ? partObj[loc.profile] : partObj;

                // skip empty objects
                if (objVS !== undefined) {
                    // check that virtual server has the same address and has https type
                    const destAddr = Array.isArray(objVS.virtualAddresses[0])
                        ? objVS.virtualAddresses[0][0]
                        : objVS.virtualAddresses[0];

                    // check if we found HTTPS with the same address and mark that
                    if (destAddr.includes(red.add[0]) && objVS.class === 'Service_HTTPS') {
                        declObj[loc.tenant][loc.app][loc.profile].redirect80 = true;
                        GlobalObject.addProperty(`/${loc.tenant}/${loc.app}/${loc.profile}`, 'redirect80', originalTmshPathDict[fileKey] || fileKey, { redirect80: null });
                        redirect80 = true;
                    }
                }
            }
        });

        // remove explicit redirect Service_HTTP in favor of Service_HTTPS.redirect80 if found
        if (redirect80) {
            delete declObj[red.loc.tenant][red.loc.app][red.loc.profile];
            const globalPath = `${red.loc.tenant}/${red.loc.app}`;
            GlobalObject.deleteProperty(globalPath, red.loc.profile, 'Explicit redirect virtual is removed');
        }
    });

    const ignoredObjects = Object.assign({}, ...unconvertedArr.map((x) => ({ [x]: json[x] })));
    const as3NotConverted = filterConf(ignoredObjects, customDict);
    const as3NotRecognized = filterConf(ignoredObjects, customDict, { excluded: true });
    return {
        as3NotConverted,
        as3NotRecognized,
        declaration: declObj,
        iappSupported,
        ignoredObjects,
        promotedObjects,
        renamedDict
    };
}

module.exports = async (json, config) => {
    try {
        let ret;
        if (!config.skipTMOSConvertProcess) {
            ret = await as3Convert(json, config);
        }

        let declaration = ret?.declaration ?? json;
        const keyClassicNotSupported = [];
        const keyNextNotSupported = [];

        // AS3 Next conversion
        if (config && config.next) {
            const resultsNext = await as3NextCleanUp(declaration, ret?.promotedObjects ?? {}, config, json);
            declaration = resultsNext.declarationNext;
            keyNextNotSupported.push(...resultsNext.keyNextNotSupported);
        } else {
            // AS3 Classic cleanUp
            const resultsAS3 = await as3ClassicCleanUp(declaration, config);
            declaration = resultsAS3.declaration;
            keyClassicNotSupported.push(...resultsAS3.keyClassicNotSupported);
        }

        // count occurrences of unsupported tmsh keys
        const unsupportedStats = {};
        Object.keys(ret?.ignoredObjects ?? {}).map((x) => getKey(x))
            .forEach((type) => {
                if (!unsupportedStats[type]) {
                    unsupportedStats[type] = 0;
                }
                unsupportedStats[type] += 1;
            });
        return {
            declaration,
            iappSupported: ret?.iappSupported ?? [],
            as3NotConverted: ret?.as3NotConverted ?? {},
            as3NotRecognized: ret?.as3NotRecognized ?? {},
            keyClassicNotSupported,
            keyNextNotSupported,
            renamedDict: ret?.renamedDict ?? {},
            unsupportedStats
        };
    } catch (e) {
        e.message = `Error converting input file. Please open an issue at https://github.com/f5devcentral/f5-automation-config-converter/issues and include the following error:\n${e.message}`;
        throw e;
    }
};
