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

const cleanupRD = require('../util/convert/cleanupRD');
const constants = require('../constants');
const deleteProperties = require('../util/convert/deleteProperties');
const globalObjectUtil = require('../util/globalRenameAndSkippedObject');
const log = require('../util/log');
const nextValidator = require('../lib/validators/as3Next');
const objectUtil = require('../util/object');
const renameProperties = require('../util/convert/renameProperties');
const stringUtil = require('../util/string');
const traverseJSON = require('../util/traverseJSON');
const hyphensToCamel = require('../util/convert/hyphensToCamel');

// Regexp for Content Type as described in RFC 2045 section-5.1
// source: mBIP API schema
const regexContentType = /(application|audio|font|example|image|message|model|multipart|text|video|x-(?:[0-9A-Za-z!#$%&'*+.^_`|~-]+))\/([0-9A-Za-z!#$%&'*+.^_`|~-]+)((?:[ \t]*;[ \t]*[0-9A-Za-z!#$%&'*+.^_`|~-]+=(?:[0-9A-Za-z!#$%&'*+.^_`|~-]+|"(?:[^"\\\\]|\\.)*"))*)/;

// separator used in globalObjectUtil parsing
const globalObjectUtilPathSep = '/';

const renamedPath = {};
/**
 * Build TMOS path
 *
 * @param {Array<string>} p - path elements
 *
 * @returns {string} combined path
 */
const buildTmosPath = (...p) => {
    const sep = constants.COMMON.TMOS.PATH_SEP;
    if (!p.length) {
        return sep;
    }
    if (p[0] === sep) {
        p = p.slice(1);
    }
    return `${p.length && p[0][0] === sep ? '' : sep}${p.join(sep)}`;
};

/**
 * split path in object into two parts: the parent path and the property name itself
 *
 * @param {string} path - path to split
 *
 * @returns {parentPath: string, property: string} split strings
 */
function splitPathInTwo(path) {
    if (typeof path !== 'string') return { parentPath: '', property: '' };
    const pathArray = path.split(globalObjectUtilPathSep);
    const property = pathArray.at(-1);
    pathArray.pop();
    const parentPath = pathArray.join(globalObjectUtilPathSep);
    return { parentPath, property };
}

/**
 * Search for objects in declaration
 *
 * @param {object} declaration - AS3 NEXT declaration
 * @param {object} options - options
 * @param {string[]} options.byClass - search by 'class'
 *
 * @returns {{key: string, object: any, parent: any, path: string[]}[]} search results
 */
function declarationLookup(declaration, options) {
    const retval = [];
    let filter;

    if (options.byClass) {
        filter = (obj) => isObjectClass(obj, options.byClass);
    }

    if (filter) {
        traverseJSON(declaration, (parent, key, depth, stop, path) => {
            if (filter(parent[key])) {
                retval.push({
                    key,
                    object: parent[key],
                    parent,
                    path
                });
            }
        });
    }
    return retval;
}

/**
 * Rename objects and update references
 *
 * Note:
 * - mutates 'declaration'
 * - doesn't support '@/@' references and so on, only absolute or relative
 *   without specific pointers/symbols
 *
 * @param {object} declaration - declaration
 * @param {function(object, string, any)} checkCb - check if key is eligable for renaming
 * @param {function(object, string, any)} renameCb - rename the key
 * @param {object} processingLogs - object for collect json logs
 *
 * @returns {Object.<string, RenameResult>} results of renaming
 */
function renameObjects(declaration, checkCb, renameCb, processingLogs) {
    // eslint-disable-next-line consistent-return
    let renamed = renameProperties(
        declaration,
        (parent, key, value) => (checkCb(parent, key, value)
            ? renameCb(parent, key, value)
            : key)
    );

    const sep = constants.COMMON.TMOS.PATH_SEP;
    // the pattern found in AS3 Classic and Next schemas
    const tmosNameChars = '0-9A-Za-z_.:\\-';

    /**
     * Split TMOS path
     *
     * @param {string} p - path
     *
     * @returns {Array<string>} splitted path
     */
    const splitTmosPath = (p) => p.split(sep);

    // logging in order of traversion
    renamed.forEach((rec) => {
        const oldPath = buildTmosPath(...rec[0]);
        const oldPathSplit = splitPathInTwo(oldPath);
        const newPath = buildTmosPath(...rec[1]);
        const newPathSplit = splitPathInTwo(newPath);
        globalObjectUtil.moveProperty(
            oldPathSplit.parentPath, oldPathSplit.property, newPathSplit.parentPath, newPathSplit.property, true
        );
        if (processingLogs !== undefined) {
            renamedPath[newPath] = oldPath;
            processingLogs.logRenamedProperty({
                path: newPath,
                origin: oldPath,
                reason: 'Path Renaming'
            });
        }
        log.debug(`Path "${buildTmosPath(...rec[0])}" renamed to "${buildTmosPath(...rec[1])}"`);
    });

    /**
     * Long-named properties are shrinked now it is time to update
     * all old references. Starting with paths with higher depth and
     * going up to the root. Checking every string because if there is a match
     * it is not a random coincidence - if string has a match for one of long-named property
     * then it should be updated.
     */

    // sort by path length in descending order
    renamed.sort((a, b) => b[0].length - a[0].length);
    renamed = renamed.map((rec) => ({
        path: buildTmosPath(...rec[1]),
        oldPath: buildTmosPath(...rec[0]),
        references: [],
        /**
         * RegExp pattern covers followng:
         * - string contains the path only
         * - string starts with the path
         * - string ends with the path
         * - string contains the path with preceding non-path chars
         * - string contains the path with separator on the end
         * - string contains the path with trailing non-path chars
         */
        regex: new RegExp(`(^|[^${tmosNameChars}]+)${buildTmosPath(...rec[0])}($|${sep}|[^${tmosNameChars}]+)`, 'gm')
    }));

    /**
     * Get a new path for the old path if exist otherwise return the old path
     *
     * @param {string} oldPath
     *
     * @returns {string | null} new path or null if not found
     */
    const getNewPath = (oldPath) => {
        const found = renamed.find((rec) => rec.oldPath === oldPath);
        return found ? found.path : null;
    };

    /**
     * Get an old path for the new path if exist otherwise return the new path
     *
     * @param {string} newPath
     *
     * @returns {string} old path
     */
    const getOldPath = (newPath) => {
        if (newPath === sep) {
            return newPath;
        }
        const found = renamed.find((rec) => rec.path === newPath);
        return found ? found.oldPath : newPath;
    };

    const dataEncoding = {
        base64: {
            decode: (data) => Buffer.from(data, 'base64').toString(),
            encode: (data) => Buffer.from(data).toString('base64')
        }
    };

    /**
     * Workflow:
     * 1) if value starts with '/' then it may be absolute reference
     * 2) if not #1 then try to process it as relative reference only if inside /Tenant/Application
     * 3) if not #2 then try to process it as regular text and replace all
     *    matching occurences for absolute references
     *
     * Assumpption(s):
     * - All AS3 refs produced by ACC look like /Tenant/Application/Object
     */
    const keysToIgnore = [ // <-- keep in order, please
        'bigip', // ref to existing object on BIG-IP
        'ciphertext', // secret
        'class',
        'protected', // secert
        'url'
    ];

    traverseJSON(declaration, (parent, key, depth, stop, path) => {
        const originValue = parent[key];
        if (typeof originValue !== 'string' || keysToIgnore.includes(key)) {
            /**
             * - 'bigip' refers to an existing object on BIG-IP
             * - interested in string values only
             */
            return;
        }
        let encoding = null;
        let value = originValue;
        let newValue = null;

        // decode data if needed
        if (objectUtil.has(dataEncoding, [key])) {
            encoding = dataEncoding[key];
            try {
                value = encoding.decode(originValue);
            } catch (_) {
                log.debug(`Unable to decode "${buildTmosPath(...path, key)}"`);
                // skip the property, leave original data as is
                return;
            }
        }

        if (value.startsWith(sep)) {
            // try to process as absolute reference:
            // - check for strict match only
            // - if no match found then attempting to patch by regex later
            newValue = getNewPath(value);
        } else if (value.length <= constants.COMMON.TMOS.MAX_NAME_LEN) {
            // try to process as relative reference:
            // - assume reference is outdated and object was renamed already
            // - if object was renamed then record with 'new' and 'old' absolute paths exists
            // - get old absolute path and then try to get a new path if possible
            // - if no match found then attempting to patch by regex later
            const oldTenantAppPath = getOldPath(buildTmosPath(...path.slice(0, 2)));
            const oldPath = buildTmosPath(oldTenantAppPath, value);
            newValue = getNewPath(oldPath);
            if (newValue) {
                // convert it back to relative ref with new name
                newValue = splitTmosPath(newValue).at(-1);
            }
        }
        if (newValue !== null) {
            if (processingLogs !== undefined) {
                processingLogs.logChangedValue({
                    path: buildTmosPath(...path, key),
                    origin: value,
                    new: newValue,
                    reason: 'Matches renamed property path'
                });
            }
            // update found, log it
            log.debug(
                `Updated reference in "${buildTmosPath(...path, key)}" value: `
                + `"${value}" -> "${newValue}"`
            );
        } else {
            // no success with relative/absolute reference, trying to process as multiline
            // string and replace all matched absolute references in it.
            // Gave up on relative - it is hard to detect the original partition -
            // it may refer to different tenant or application or object.
            let valueChanged = false;
            renamed.forEach((rec) => {
                let hasMatches = false;
                value = value.replaceAll(rec.regex, (match, g1, g2, offset) => {
                    if (processingLogs !== undefined) {
                        processingLogs.logChangedSubstring({
                            path: buildTmosPath(...path, key),
                            origin: rec.oldPath,
                            new: rec.path,
                            reason: 'Matches renamed property path'
                        });
                    }
                    log.debug(
                        `Property "${buildTmosPath(...path, key)}" updated: `
                        + `"${rec.oldPath}" -> "${rec.path}" (offset: ${offset})`
                    );
                    hasMatches = true;
                    return `${g1 || ''}${rec.path}${g2 || ''}`;
                });
                if (hasMatches) {
                    valueChanged = true;
                    rec.references.push(buildTmosPath(...path, key));
                }
            });
            if (valueChanged) {
                newValue = value;
            }
        }
        if (newValue !== null) {
            if (encoding) {
                // should explicitly fail and terminate the process if unable to encode the data
                newValue = encoding.encode(newValue);
            }
            parent[key] = newValue;
        }
    });

    const ret = {};
    renamed.forEach((rec) => {
        ret[rec.path] = {
            origin: rec.oldPath,
            references: rec.references
        };
    });
    return ret;
}

/**
 * Fix invalid names in declaration:
 * - names longer then constants.NEXT.CLASS_NAME_MAX_LEN
 * - names that start with an underscore
 *
 * Note:
 * - mutates 'declaration'
 *
 * @param {object} declaration    - declaration
 * @param {object} processingLogs - object for collect json logs
 */
function fixInvalidNames(declaration, processingLogs) {
    // fix long names bug

    return renameObjects(
        declaration,
        (parent, key, value) => (typeof value === 'object'
            && !Array.isArray(value)
            && typeof value.class === 'string'
            && (key.length > constants.NEXT.CLASS_NAME_MAX_LEN
                || (typeof value.class === 'string' && key.startsWith('_')))),
        (parent, key) => {
            /* If key starts with '_', prepend it with 'U-'.
                If it becomes too long, it will be delt with right after that. */
            if (key.startsWith('_')) {
                key = 'U-'.concat(key);
            }
            /* shorten long keys
                reserve space for unique ID based on number of properties in parent */
            key = stringUtil.removeMiddleChars(key, {
                length: constants.NEXT.CLASS_NAME_MAX_LEN - `${Object.keys(parent).length}`.length,
                separator: '-'
            });
            if (objectUtil.has(parent, [key])) {
                key = objectUtil.uniqueProperty(key, parent);
            }
            return key;
        },
        processingLogs
    );
}

/**
 * Check if 'decl' is an object with an attribute 'class' that matches a value in the classNameList
 *
 * @param {object} decl - part of AS3 declaration
 * @param {Array<string | RegExp>} classNameList - list of expected class names (exact string or regexp)
 *
 * @returns {boolean} true if there is a match, false otherwise
 */
function isObjectClass(decl, classNameList) {
    return typeof decl === 'object'
        && objectUtil.has(decl, 'class')
        && classNameList.some((className) => (typeof className === 'string'
            ? decl.class === className
            : className.test(decl.class)));
}

/**
 * Set 'service' property to true for all pools
 * that are not referenced via 'pool' attribute of any virtual services.
 * Those pools are known as standalone pools.
 * Ignore anything written in iRules.
 * Note: ACC does not create Service_Pool objects, because using 'service' property is an easier option
 * and there is no need to worry about the object's name collision.
 *
 * @param {Object} declarationNext - AS3 declaration
 */
function addServicePools(declarationNext) {
    /* array of paths to all pools
        a path is represented by object with parameters: tenant, app, pool */
    const poolPaths = [];

    /* object of paths to pools referenced via 'pool' attribute of a virtual service
        we ignore here pools referenced in iRules
        the object looks like
        {
            tenant1: {
                app1: {
                    pool1: true
                },
                app2: {
                    pool2: true
                }
            },
            tenant2: {
                app3: {
                    pool3: true,
                    pool4: true
                }
            }
        } */
    const referncedPoolPaths = {};

    // find all standalone pools
    traverseJSON(declarationNext, (parent, key, depth, stop, path) => {
        const val = parent[key];
        if (isObjectClass(val, ['Pool'])) {
            // add the pool path
            poolPaths.push({ tenant: path[0], app: path[1], pool: key });
        } else if (isObjectClass(val, constants.SERVICES_WITH_POOL) && objectUtil.has(val, 'pool')) {
            // add the pool path to the pools that were referenced via 'pool' attribute
            // of a virtual service

            const pathSplit = val.pool.split('/');
            // check if pool referenced with absolute paths
            // references are normalized already: /Common/test/ translated to /Common/Shared/test
            if (pathSplit.length === 1) {
                objectUtil.set(referncedPoolPaths, [path[0], path[1], val.pool], true);
            } else {
                objectUtil.set(referncedPoolPaths, [pathSplit[1], pathSplit[2], pathSplit[3]], true);
            }
        }
    });

    // Set 'service' to true for all pools not referenced via 'pool' attribute of virtual services
    poolPaths.forEach((poolPath) => {
        if (!objectUtil.has(referncedPoolPaths, [poolPath.tenant, poolPath.app, poolPath.pool])) {
            const serviceProperty = 'service';
            declarationNext[poolPath.tenant][poolPath.app][poolPath.pool][serviceProperty] = true;

            /* update globalObjectUtilPathSep
                inherit tmshHeader from the pool, but serviceProperty is a made-up property that does not exist in TMSH
                so tmshPath is an empty path */
            const appAbsPath = globalObjectUtilPathSep.concat(
                poolPath.tenant,
                globalObjectUtilPathSep,
                poolPath.app
            );
            const poolInfo = globalObjectUtil.getTmshInfo(appAbsPath, poolPath.pool);
            if (poolInfo) {
                const poolAbsPath = appAbsPath.concat(
                    globalObjectUtilPathSep,
                    poolPath.pool
                );
                globalObjectUtil.addProperty(poolAbsPath, serviceProperty, poolInfo.tmshHeader, {});
            } else {
                log.warn(`globalObjectUtil.getTmshInfo returned undefined for ${poolPath.pool} at ${appAbsPath}`);
            }
        }
    });
}

/**
 * Get HTTP_Compress profiles and check that ContentType strigns match the regex pattern.
 * Filter not supported strings.
 *
 * @param {Object} declarationNext - AS3 declaration
 */
function fixContentType(declarationNext) {
    declarationLookup(declarationNext, { byClass: ['HTTP_Compress'] })
        .forEach((retval) => {
            // contentType properties
            const contentProperties = ['contentTypeIncludes', 'contentTypeExcludes'];
            const profile = retval.object;

            contentProperties.forEach((prop) => {
                if (objectUtil.has(profile, prop)) {
                    /* find every ContentType that will be dropped
                        and only then apply the opposite test to form the array of survivors
                        these two tests (!regexContentType.test and regexContentType.test) should be opposite */
                    const httpCompressPath = globalObjectUtilPathSep.concat(
                        retval.path.join(globalObjectUtilPathSep),
                        globalObjectUtilPathSep,
                        retval.key,
                        globalObjectUtilPathSep,
                        prop
                    );
                    // go in the descending order to make sure that the deletions do not mess up the locations
                    for (let i = profile[prop].length - 1; i >= 0; i -= 1) {
                        /* find all ContentTypes that will NOT pass regexContentType filter few lines below
                            and mark their indices as deleted for globalObjectUtil */
                        if (!regexContentType.test(profile[prop][i])) {
                            globalObjectUtil.deleteProperty(
                                httpCompressPath, i.toString(), 'Unsupported HTTP ContentType'
                            );
                        }
                    }
                    // filter content type according to regex pattern
                    profile[prop] = profile[prop].filter((x) => regexContentType.test(x));

                    // check and delete contentType properties if empty
                    if (profile[prop].length === 0) {
                        delete profile[prop];
                        const splitPath = splitPathInTwo(httpCompressPath);
                        if (splitPath.property === 'contentTypeIncludes') {
                            splitPath.property = 'contentTypeInclude';
                        } else if (splitPath.property === 'contentTypeExcludes') {
                            splitPath.property = 'contentTypeExclude';
                        }
                        globalObjectUtil.deleteProperty(
                            splitPath.parentPath, splitPath.property, 'Empty HTTP ContentType array'
                        );
                    }
                }
            });
        });
}

/**
 * Function process fqdn pool member (not supported by AS3 Next) and add them to clean up list.
 * -> Named properties will be deleted later durig deleteProperties clean up
 * Note:
 * - mutates 'obj'
 * - mutates 'array'
 *
 * @param {any} obj - source json object
 * @param {Array<string>} paths - paths to object to delete (e.g. /a/b/c)
 *
 * @returns {Array<string>} updated paths
 */
const fixPoolMembersForNext = (obj, paths) => {
    const fqdnMemberRe = /\/members\/\d+\/hostname/;
    const fqdnMembers = paths.filter((x) => fqdnMemberRe.test(x));
    fqdnMembers.forEach((p) => {
        // path examlpe: '/Common/Shared/test_pool/members/2/hostname'
        const tempObj = objectUtil.get(obj, p, { tmosPath: true, depth: 5 });

        if (tempObj.addressDiscovery && tempObj.addressDiscovery === 'fqdn') {
            paths.push(p.replace('/hostname', ''));
        }
    });

    return paths;
};
/**
 * Added Json Log For the virtualAddresses and serverAddressess having route domain
 * Note:
 * - mutates 'declaration'
 * - mutates 'paths'
 *
 * @param {object} declaration - AS3 Next json declaration
 * @param {Array<string>} paths - '/a/b/c' style paths rejected by the shared schema validator
 */
function logRemovedRouteDomainVirtualAddress(declaration, paths) {
    const addressRe = /\/virtualAddresses\/\d+$/;
    const serviceAddressRe = /\/serverAddresses\/\d+$/;
    const virtualAddressPaths = paths.filter((x) => addressRe.test(x));
    virtualAddressPaths.forEach((virtualAddressPath) => {
        // virtualAddressPaths looks like '/Common/Shared/vs_name/virtualAddresses/0'
        const virtualAddress = objectUtil.get(declaration, virtualAddressPath, { tmosPath: true });
        if ((typeof virtualAddress !== 'object') && virtualAddress.includes('%')) {
            // go two levels up
            const addressArrayPath = virtualAddressPath.slice(0, virtualAddressPath.lastIndexOf('/'));
            const virtualPath = addressArrayPath.slice(0, addressArrayPath.lastIndexOf('/'));
            if (!checkAllowNetworks(declaration)) {
                globalObjectUtil.deleteProperty(virtualPath, 'virtualAddresses', `routeDomain value is removed from virtualAddres:${virtualAddress}`, true);
            }
            // remove the virtual address in the virtual server path from 'paths'
            const pathIndex = paths.indexOf(virtualAddressPath);
            paths.splice(pathIndex, 1);
        }
    });
    const serviceAddressPaths = paths.filter((x) => serviceAddressRe.test(x));
    serviceAddressPaths.forEach((serviceAddressPath) => {
        // serviceAddressPath looks like '/Common/Shared/vs_name/virtualAddresses/0'
        const serviceAddress = objectUtil.get(declaration, serviceAddressPath, { tmosPath: true });
        if (serviceAddress.includes('%')) {
            // go two levels up
            const serviceMemberPath = serviceAddressPath.slice(0, serviceAddressPath.lastIndexOf('/', serviceAddressPath.lastIndexOf('/', serviceAddressPath.lastIndexOf('/', serviceAddressPath.lastIndexOf('/') - 1) - 1) - 1));
            const service = objectUtil.get(declaration, serviceMemberPath, { tmosPath: true });
            if (!constants.SERVICES_WITH_POOL.includes(service.class)) {
                globalObjectUtil.deleteProperty(serviceMemberPath, 'members', `routeDomain value is removed from:${serviceAddress}`, true);
                // remove the server addresses in the pool path from 'paths'
                const pathIndex = paths.indexOf(serviceAddressPath);
                paths.splice(pathIndex, 1);
            }
        }
    });
}
/**
 * Find 'use' references to virtual addresses in the virtual servers of the declaration
 * and replace them with the corresponding ip-addresses.
 * Paths to virtual addresses in the virtual servers will be removed from 'paths'.
 * Paths to the (referred) virtual address objects will not be removed from 'paths'.
 *
 * Note:
 * - mutates 'declaration'
 * - mutates 'paths'
 *
 * @param {object} declaration - AS3 Next json declaration
 * @param {Array<string>} paths - '/a/b/c' style paths rejected by the shared schema validator
 */
function fixCustomVirtualAddress(declaration, paths) {
    // look for all paths ending with '/virtualAddresses/\d+'
    const addressRe = /\/virtualAddresses\/\d+$/;
    const serviceAddressPaths = paths.filter((x) => addressRe.test(x));
    serviceAddressPaths.forEach((serviceAddressPath) => {
        // serviceAddressPath looks like '/Common/Shared/vs_name/virtualAddresses/0'
        const serviceAddress = objectUtil.get(declaration, serviceAddressPath, { tmosPath: true });
        // dereference 'use' references
        if (!serviceAddress || !serviceAddress.use) {
            return;
        }

        // go two levels up
        const addressArrayPath = serviceAddressPath.slice(0, serviceAddressPath.lastIndexOf('/'));
        const servicePath = addressArrayPath.slice(0, addressArrayPath.lastIndexOf('/'));

        /* verify that that object is indeed a virtual service
           It is impossible to write unit test that covers the next return line for the current shared schema.
           'fixCustomVirtualAddress' is called after 'f5AppSvcsSchema.validate',
           so only valid objects and properties survive at this stage.
           If there was an object which is not a service but has 'virtualAddresses' property,
           then we would not want to apply 'fixCustomVirtualAddress' to that object.
           In that case we would reach the return line. But there are no such objects in the current shared schema. */
        const service = objectUtil.get(declaration, servicePath, { tmosPath: true });
        if (!service || !service.class || !constants.SERVICES_WITH_POOL.includes(service.class)) {
            return;
        }

        // obtain the virtual address object (not a part of the virtual server)
        const addressObj = objectUtil.get(declaration, serviceAddress.use, { tmosPath: true });
        if (addressObj && addressObj.virtualAddress) {
            // replace 'use' reference
            const serviceIndex = serviceAddressPath.slice(serviceAddressPath.lastIndexOf('/') + 1);
            service.virtualAddresses[serviceIndex] = addressObj.virtualAddress;
            const splitPath = splitPathInTwo(serviceAddressPath);
            globalObjectUtil.moveProperty(serviceAddressPath, 'use', splitPath.parentPath, splitPath.property);
            // remove the virtual address in the virtual server path from 'paths'
            const pathIndex = paths.indexOf(serviceAddressPath);
            paths.splice(pathIndex, 1);
        } else {
            log.error(`Could not find a proper virtual address object in the declaration at ${serviceAddress.use}`);
        }
    });
}

/**
 * Delete tenants and applications that have only 'class' and 'template' properties because they are essentially empty.
 * They can be created due to the objects deleted by the shared schema validator.
 *
 * @param {Object} declOrTenant - AS3 declaration or a tenant
 * @param {string} parentPath - path to parent in AS3 declaration
 */
function removeEmptyTenantsAndApps(declOrTenant, parentPath) {
    if (parentPath === undefined) {
        parentPath = '';
    }
    Object.entries(declOrTenant)
        .forEach(([key, value]) => {
            if (objectUtil.has(value, 'class') && ['Tenant', 'Application'].includes(value.class)) {
                if (value.class === 'Tenant') {
                    // clean up tenants first
                    removeEmptyTenantsAndApps(value, parentPath.concat(globalObjectUtilPathSep, key));
                }

                /* 'value' is a 'Tenant' or an 'Application', if it has only 'class' and 'template' properties,
                    then it is essentially empty and can be removed */
                if (Object.keys(value).every((prop) => ['class', 'template'].includes(prop))) {
                    objectUtil.unset(declOrTenant, key);
                    globalObjectUtil.deleteProperty(parentPath, key, 'Empty tenant or application');
                }
            }
        });
}

/**
 * AS3 NEXT doesn't support multiple profiles for clientTLS and serverTLS for some Service_X classes:
 * - Service_HTTPS
 *
 * Solution is to assign the first one from the list
 *
 * @param {object} declarationNext - AS3 NEXT declaration
 */
function fixServiceMultipleTLSProfiles(declarationNext) {
    declarationLookup(declarationNext, { byClass: ['Service_HTTPS'] })
        .forEach((retval) => {
            const service = retval.object;
            ['clientTLS', 'serverTLS'].forEach((key) => {
                if (Array.isArray(service[key])) {
                    const profileRef = service[key][0].use || service[key][0].bigip;
                    // not checking length here, it verified by customMaps/service.js already
                    log.warn(
                        `${retval.object.class} "${buildTmosPath(...retval.path, retval.key)}" has multiple "${key}" profiles attached to it. `
                        + `Only "${profileRef}" (first one in the list) will be used. `
                        + 'Consider to review configuration.'
                    );
                    const absArrayPath = globalObjectUtilPathSep.concat(
                        retval.path.join(globalObjectUtilPathSep),
                        globalObjectUtilPathSep,
                        retval.key,
                        globalObjectUtilPathSep,
                        key
                    );
                    for (let i = 1; i < service[key].length; i += 1) {
                        globalObjectUtil.deleteProperty(
                            absArrayPath,
                            i.toString(),
                            `Only single TLS profile can be supported at ${absArrayPath}`
                        );
                    }
                    service[key] = profileRef;
                }
            });
        });
}

/**
 * Convert allowVlans in services into allowNetworks
 * Both allowVlans and allowNetworks are supported in NEXT, but only one can be used
 * allowVlans was retained for backward compatibility
 * NEXT Pools also support allowNetworks but Classic does not have that option
 * We might get asked to do something additional handling for pools
 * ProcessingLogs to be added later
 *
 * @param {Object} declaration - AS3 declaration
 */
// eslint-disable-next-line no-unused-vars
function fixAllowVlans(declaration) {
    declarationLookup(declaration, { byClass: [/^Service_/] })
        .forEach((retVal) => {
            const service = retVal.object;
            if (objectUtil.has(service, 'allowVlans')) {
                service.allowNetworks = service.allowVlans;
                delete service.allowVlans;
                const parentPath = globalObjectUtilPathSep.concat(
                    retVal.path.join(globalObjectUtilPathSep),
                    globalObjectUtilPathSep,
                    retVal.key
                );
                globalObjectUtil.moveProperty(parentPath, 'allowVlans', parentPath, 'allowNetworks');
            }
        });
}
function checkAllowNetworks(declaration) {
    let allowNetworks = false;
    declarationLookup(declaration, { byClass: [/^Service_/] })
        .forEach((retVal) => {
            const service = retVal.object;
            if (objectUtil.has(service, 'allowNetworks')) {
                allowNetworks = true;
            }
        });
    return allowNetworks;
}

function fixPvaAccelaration(declaration) {
    declarationLookup(declaration, { byClass: ['L4_Profile'] })
        .forEach((retVal) => {
            const l4ProfileService = retVal.object;
            if (objectUtil.has(l4ProfileService, 'pvaAcceleration')) {
                l4ProfileService.pvaAccelerationMode = l4ProfileService.pvaAcceleration;
                delete l4ProfileService.pvaAcceleration;
                const parentPath = globalObjectUtilPathSep.concat(
                    retVal.path.join(globalObjectUtilPathSep),
                    globalObjectUtilPathSep,
                    retVal.key
                );
                globalObjectUtil.moveProperty(parentPath, 'pvaAcceleration', parentPath, 'pvaAccelerationMode');
            }
        });
}
/**
 * Function for determine unsupported properties in AS3 Next declaration and delete them
 *
 * @param {Object} declarationNext - AS3 declaration ready to clean up for get Next
 * @param {Object} promotedObjects - mapping from "subsumed" objects to "subsuming" objects
 * @param {Object} config          - config
 *
 * @returns {Object} declarationNext - when clean up completed
 */
// eslint-disable-next-line no-unused-vars
const as3NextCleanUp = async (declarationNext, promotedObjects, config, jsonObj = null) => {
    // - should contain paths to objects with 'class' property only
    // - add another variable for removed properties if need to report it too
    let keyNextNotSupported = [];
    log.info('AS3 Next conversion enabled');

    fixInvalidNames(declarationNext, config.requestContext);

    // need it later to figure out what was deleted from original declaration
    const originNextDeclaration = objectUtil.cloneDeep(declarationNext);

    addServicePools(declarationNext);

    fixContentType(declarationNext);

    fixPvaAccelaration(declarationNext);
    // might need this code later if we want to convert allowVlans to allowNetworks
    // fixAllowVlans(declarationNext, config.requestContext);

    fixServiceMultipleTLSProfiles(declarationNext);

    // validate the declartion against the schema
    const validationResults = (await nextValidator.validate(declarationNext));

    // if a property is out of its range assign its value to the closest range limit
    if (objectUtil.has(validationResults, 'ignoredAttributesErrors')
        && Array.isArray(validationResults.ignoredAttributesErrors)
        && validationResults.ignoredAttributesErrors.length !== 0) {
        validationResults.ignoredAttributesErrors.filter(
            (error) => {
                const isStrictLimitCompare = objectUtil.has(error, 'keyword')
                    && objectUtil.has(error, 'params.comparison')
                    && ((error.keyword === 'maximum' && error.params.comparison === '<=')
                        || (error.keyword === 'minimum' && error.params.comparison === '>='));
                const isIntegerLimit = objectUtil.has(error, 'params.limit') && Number.isInteger(error.params.limit);
                return objectUtil.has(error, 'instancePath') && isStrictLimitCompare && isIntegerLimit;
            }
        ).forEach((error) => {
            // set the property to the range limit
            objectUtil.set(declarationNext, error.instancePath, error.params.limit, { tmosPath: true });

            // remove the property from ignoredAttributes
            validationResults.ignoredAttributes = validationResults.ignoredAttributes.filter(
                (attribute) => attribute !== error.instancePath
            );
        });
    }

    // get rid of the ignored attribute
    let cleanUpList = validationResults
        .ignoredAttributes
        .filter((p) => p !== '/schemaVersion');

    logRemovedRouteDomainVirtualAddress(declarationNext, cleanUpList);
    // Remove Route Domain suffixes from declarations (BIG-IP Next workaround):
    declarationNext = cleanupRD(declarationNext);
    // Process named and fqdn pool members (BIG-IP Next workaround):
    cleanUpList = fixPoolMembersForNext(declarationNext, cleanUpList);
    log.debug(`AS3 NEXT CLEANUP LIST:\n${cleanUpList.join('\n')}`);

    // move custom virtual addresses from the virtual address to the virtual server
    fixCustomVirtualAddress(declarationNext, cleanUpList);

    const deleteResults = deleteProperties(declarationNext, cleanUpList);
    deleteResults.ignored.forEach((p) => {
        log.debug(`Invalid path received from ignoredAttributes: ${p} (reason - JSON Next Schema validator)`);
        const splitPath = splitPathInTwo(p);
        globalObjectUtil.deleteProperty(
            splitPath.parentPath,
            splitPath.property,
            'This property is not supported',
            false,
            jsonObj,
            'Contact F5 Support',
            `Invalid path received from ignoredAttributes: ${p} (reason - JSON Next Schema validator)`
        );
    });
    deleteResults.deleted.forEach((p) => {
        log.debug(`Deleted path from declaration: ${p} (reason - JSON Next Schema validator)`);
        const splitPath = splitPathInTwo(p);
        let originalParentPath = splitPath.parentPath;
        if (splitPath.parentPath in renamedPath) {
            originalParentPath = renamedPath[splitPath.parentPath];
        }
        if (splitPath.property === 'layer4') {
            const ipProtocolValue = objectUtil.get(originNextDeclaration, p, {
                tmosPath: true
            });
            const virtualObject = objectUtil.get(
                declarationNext,
                splitPath.parentPath,
                {
                    tmosPath: true
                }
            );
            if (ipProtocolValue === 'tcp' && (virtualObject.class === 'Service_HTTPS'
                     || virtualObject.class === 'Service_HTTP'
                     || virtualObject.class === 'Service_L4'
                     || virtualObject.class === 'Service_TCP')
            ) {
                globalObjectUtil.deleteProperty(
                    originalParentPath,
                    splitPath.property,
                    'RenamedProperty',
                    false,
                    jsonObj
                );
            } else if (ipProtocolValue === 'udp'
                       && virtualObject.class === 'Service_UDP'
            ) {
                globalObjectUtil.deleteProperty(
                    originalParentPath,
                    splitPath.property,
                    'RenamedProperty',
                    false,
                    jsonObj
                );
            } else {
                globalObjectUtil.deleteProperty(
                    originalParentPath,
                    splitPath.property,
                    'This property is not supported',
                    false,
                    jsonObj,
                    'Contact F5 Support',
                    `Deleted path from declaration: ${p} (reason - JSON Next Schema validator)`
                );
            }
        } else {
            if (splitPath.property.includes('hsts')) {
                splitPath.property = splitPath.property.replace('hsts', '');
                splitPath.property = hyphensToCamel(splitPath.property);
            }
            if (splitPath.property === 'clientCertificate') {
                globalObjectUtil.deleteProperty(
                    originalParentPath,
                    'key',
                    'TLS_Client Key Is Not Supported On Next.',
                    false,
                    jsonObj
                );
            }
            globalObjectUtil.deleteProperty(
                originalParentPath,
                splitPath.property,
                'This property is not supported',
                false,
                jsonObj,
                'Contact F5 Support',
                `Deleted path from declaration: ${p} (reason - JSON Next Schema validator)`
            );
        }
    });
    // Delete empty tenants and applications
    removeEmptyTenantsAndApps(declarationNext);

    // interested in 'classes' only
    keyNextNotSupported = deleteResults.deleted
        .filter((p) => objectUtil.has(objectUtil.get(originNextDeclaration, p, { tmosPath: true }), 'class'))
        .map((item) => item.replace(/^\/Common\/Shared\//, '/Common/'));

    /* If an object rejected by the schema validator has its data subsumed by another object
        and that subsumming object is in the declaration,
        then the subsumed object should not be listed as not supported. */
    keyNextNotSupported = keyNextNotSupported.filter((notSupportedObject) => {
        const subsummingObject = promotedObjects[notSupportedObject];
        return subsummingObject === undefined
            || declarationNext[subsummingObject.tenant] === undefined
            || declarationNext[subsummingObject.tenant][subsummingObject.app] === undefined
            || declarationNext[subsummingObject.tenant][subsummingObject.app][subsummingObject.profile] === undefined;
    });

    // It was decided to hardcode schemaVersion for next to avoid issues with using in journeys
    // Old way will keep to be commented for possible using in future
    //
    // validator and AS3 Next use the same shared schema
    // const schema = f5AppSvcsSchema.getSchemaByRuntime('next');
    // declarationNext.schemaVersion = schema.definitions.ADC.properties.schemaVersion.enum[0];
    declarationNext.schemaVersion = '3.0.0';

    // Be aware: validation applies 'default' value too. If something was removed after previous call
    // then it may be substitued by 'default' value after this call.
    const ignoredAttributes = (await nextValidator.validate(declarationNext))
        .ignoredAttributes;
    if (ignoredAttributes.length > 0) {
        log.warn('Received AS3 Next Declaration is not fully cleaned.');
    }

    return {
        declarationNext,
        keyNextNotSupported
    };
};

module.exports = as3NextCleanUp;

/**
 * @typdef RenameResult
 * @type {Object}
 * @property {string} origin - origin path
 * @property {Array<string>} references - array of paths to updated object with reference(s) to 'origin'
 */
