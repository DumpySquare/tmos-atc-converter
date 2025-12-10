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

const { noop } = require('lodash');
const assert = require('../testUtils/assert');
const globalObjectUtil = require('../../src/utils/globalRenameAndSkippedObject');

const parentPath = '/tenant-name/application';
const obj = {
    'tenant-name': {
        tmshHeader: 'tenantObj',
        tmshPath: 'tenantPath',
        application: {
            tmshHeader: 'appObj',
            tmshPath: 'appPath',
            object: {
                tmshHeader: 'obj',
                tmshPath: 'objPath'
            }
        }
    }
};

const objWithArray = {
    'tenant-name': {
        tmshHeader: 'tenantObj',
        tmshPath: 'tenantPath',
        application: {
            tmshHeader: 'appObj',
            tmshPath: 'appPath',
            Common_VS3_chain: {
                tmshHeader: 'obj',
                tmshPath: 'objPath',
                profiles: {
                    internalArray: [
                        {
                            tmshHeader: 'ltm virtual /tenant/application/Common_VS3_chain',
                            tmshPath: 'profiles/http_default_v16'
                        },
                        {
                            tmshHeader: 'ltm virtual /tenant/application/Common_VS3_chain',
                            tmshPath: 'profiles/ssl_chain'
                        }
                    ],
                    tmshHeader: 'ltm virtual /tenant/application/Common_VS3_chain',
                    tmshPath: 'profiles'
                }
            }
        }
    }
};

const objWithinternalArray = {
    'tenant-name': {
        tmshHeader: 'tenantObj',
        tmshPath: 'tenantPath',
        application: {
            tmshHeader: 'appObj',
            tmshPath: 'appPath',
            Common_VS3_chain: {
                tmshHeader: 'obj',
                tmshPath: 'objPath',
                profiles: {
                    internalArray: [
                        {
                            tmshHeader: 'ltm virtual /tenant/application/Common_VS3_chain',
                            tmshPath: 'profiles/http_default_v16'
                        },
                        {
                            tmshHeader: 'ltm virtual /tenant/application/Common_VS3_chain',
                            tmshPath: 'profiles/ssl_chain'
                        },
                        {
                            tmshHeader: 'ltm virtual /tenant/application/Common_VS3_chain',
                            tmshPath: 'profiles/ssl_key'
                        }
                    ],
                    tmshHeader: 'ltm virtual /tenant/application/Common_VS3_chain',
                    tmshPath: 'profiles'
                }
            }
        }
    }
};

describe('Global rename and skipped object utils (src/util/globalRenameAndSkippedObject.js', () => {
    beforeEach(() => {
        globalObjectUtil.reset();
    });
    describe('.addProperty()', () => {
        it('should add the tmshHeader and tmshPath at the parentPath', () => {
            globalObjectUtil.addProperty('', 'tenant-name', 'tenantObj', 'tenantPath');
            globalObjectUtil.addProperty('/tenant-name', 'application', 'appObj', 'appPath');
            globalObjectUtil.addProperty('/tenant-name/application', 'object', 'obj', 'objPath');
            assert.deepStrictEqual(globalObjectUtil.getGlobalObj(), obj);
        });

        it('should add the internal Array at the parentPath', () => {
            globalObjectUtil.addProperty('', 'tenant-name', 'tenantObj', 'tenantPath');
            globalObjectUtil.addProperty('/tenant-name', 'application', 'appObj', 'appPath');
            globalObjectUtil.addProperty('/tenant-name/application', 'Common_VS3_chain', 'obj', 'objPath');
            globalObjectUtil.addProperty('/tenant-name/application/Common_VS3_chain', 'profiles', 'ltm virtual /tenant/application/Common_VS3_chain', 'profiles', ['http_default_v16', 'ssl_chain']);
            assert.deepStrictEqual(globalObjectUtil.getGlobalObj(), objWithArray);
        });

        it('should update the internal Array', () => {
            globalObjectUtil.addProperty('', 'tenant-name', 'tenantObj', 'tenantPath');
            globalObjectUtil.addProperty('/tenant-name', 'application', 'appObj', 'appPath');
            globalObjectUtil.addProperty('/tenant-name/application', 'Common_VS3_chain', 'obj', 'objPath');
            globalObjectUtil.addProperty('/tenant-name/application/Common_VS3_chain', 'profiles', 'ltm virtual /tenant/application/Common_VS3_chain', 'profiles', ['http_default_v16', 'ssl_chain', 'ssl_key']);
            assert.deepStrictEqual(globalObjectUtil.getGlobalObj(), objWithinternalArray);
        });

        it('should not add property if parentPath is /', () => {
            globalObjectUtil.addProperty('/', 'tenant-name', 'renamedTenantObj', 'renamedTenantPath');
            assert.deepStrictEqual(globalObjectUtil.getGlobalObj(), {});
        });
    });

    describe('.getTmshInfo()', () => {
        it('should return the tmsh info at the given path', () => {
            globalObjectUtil.addProperty('', 'tenant-name', 'tenantObj', 'tenantPath');
            globalObjectUtil.addProperty('/tenant-name', 'application', 'appObj', 'appPath');
            globalObjectUtil.addProperty('/tenant-name/application', 'object', 'obj', 'objPath');
            assert.deepStrictEqual(globalObjectUtil.getTmshInfo(parentPath, 'object'), {
                tmshHeader: 'obj',
                tmshPath: 'objPath'
            });
        });

        it('should return the tmsh info at the array path', () => {
            const parentObjPath = '/tenant-name/application/object';
            globalObjectUtil.addProperty('', 'tenant-name', 'tenantObj', 'tenantPath');
            globalObjectUtil.addProperty('/tenant-name', 'application', 'appObj', 'appPath');
            globalObjectUtil.addProperty('/tenant-name/application', 'object', 'obj', 'objPath');
            globalObjectUtil.addProperty('/tenant-name/application/profiles[0]', 'obj', 'ltm virtual /tenant/application/Common_VS3_chain', 'profiles', ['http_default_v16', 'ssl_chain', 'ssl_key']);
            assert.deepStrictEqual(globalObjectUtil.getTmshInfo(parentObjPath, 'tmshHeader'), 'obj');
        });

        it('should return the tmsh info at the root path', () => {
            globalObjectUtil.addProperty('', 'tenant-name', 'tenantObj', 'tenantPath');
            assert.deepStrictEqual(globalObjectUtil.getTmshInfo('', 'tenant-name'), {
                tmshHeader: 'tenantObj',
                tmshPath: 'tenantPath'
            });
        });

        it('should return undefined if property name contains /', () => {
            assert.deepStrictEqual(globalObjectUtil.getTmshInfo('', '/'), undefined);
        });

        it('should return tmshInfo when path contains internalArray', () => {
            globalObjectUtil.addProperty('', 'tenant-name', 'tenantObj', 'tenantPath');
            globalObjectUtil.addProperty('/tenant-name', 'application', 'appObj', 'appPath');
            globalObjectUtil.addProperty('/tenant-name/application', 'Common_VS3_chain', 'obj', 'objPath');
            globalObjectUtil.addProperty('/tenant-name/application/Common_VS3_chain', 'profiles', 'ltm virtual /tenant/application/Common_VS3_chain', 'profiles', ['http_default_v16', 'ssl_chain', 'ssl_key']);
            const tmshInfo = globalObjectUtil.getTmshInfo('/tenant-name/application/Common_VS3_chain', 'profiles[0]');
            assert.deepStrictEqual(tmshInfo, {
                tmshHeader: 'ltm virtual /tenant/application/Common_VS3_chain',
                tmshPath: 'profiles/http_default_v16'
            });
        });
    });

    describe('.setTmshInfo()', () => {
        const renamedObj = {
            'tenant-name': {
                tmshHeader: 'tenantObj',
                tmshPath: 'tenantPath',
                application: {
                    tmshHeader: 'appObj',
                    tmshPath: 'appPath',
                    object: {
                        tmshHeader: 'renamedObj',
                        tmshPath: 'renamedPath'
                    }
                }
            }
        };
        const renamedArrayObj = {
            allowCipherRules: {
                internalArray: [
                    {
                        tmshHeader: 'cipherPath',
                        tmshPath: 'bigip/Common/f5-default'
                    },
                    {
                        tmshHeader: 'cipherPath',
                        tmshPath: 'bigip/Common/f5-secure'
                    }
                ],
                tmshHeader: {
                    internalArray: [
                        {
                            tmshHeader: 'renamed',
                            tmshPath: 'renamed'
                        }
                    ]
                },
                tmshPath: 'bigip'
            }
        };

        it('should set the tmsh info at the given path', () => {
            globalObjectUtil.addProperty('', 'tenant-name', 'tenantObj', 'tenantPath');
            globalObjectUtil.addProperty('/tenant-name', 'application', 'appObj', 'appPath');
            globalObjectUtil.addProperty('/tenant-name/application', 'object', 'obj', 'objPath');
            globalObjectUtil.setTmshInfo(parentPath, 'object', 'renamedObj', 'renamedPath');
            assert.deepStrictEqual(globalObjectUtil.getGlobalObj(), renamedObj);
        });

        it('should not make any changes if path contains /', () => {
            const parentPathSlash = '/';
            globalObjectUtil.addProperty('', 'tenant-name', 'tenantObj', 'tenantPath');
            globalObjectUtil.addProperty('/tenant-name', 'application', 'appObj', 'appPath');
            globalObjectUtil.addProperty('/tenant-name/application', 'object', 'obj', 'objPath');
            globalObjectUtil.setTmshInfo(parentPathSlash, 'tenant-name', 'newObj', 'newPath');
            assert.deepStrictEqual(globalObjectUtil.getGlobalObj(), obj);
        });

        it('should set the tmsh info at the given path with property as array', () => {
            globalObjectUtil.addProperty('', 'allowCipherRules', 'cipherPath', 'bigip', ['/Common/f5-default', '/Common/f5-secure']);
            globalObjectUtil.setTmshInfo('/allowCipherRules', 'tmshHeader[0]', 'renamed', 'renamed');
            assert.deepStrictEqual(globalObjectUtil.getGlobalObj(), renamedArrayObj);
        });
    });

    describe('.moveProperty()', () => {
        const beforeRenameObj = {
            'tenant-name': {
                tmshHeader: 'tenantObj',
                tmshPath: 'tenantPath',
                application: {
                    tmshHeader: 'appObj',
                    tmshPath: 'appPath',
                    Common_VS3_chain: {
                        tmshHeader: 'obj',
                        tmshPath: 'objPath',
                        profiles: {
                            tmshHeader: 'ltm virtual /tenant/application/Common_VS3_chain',
                            tmshPath: 'profiles',
                            internalArray: [
                                {
                                    tmshHeader: 'ltm virtual /tenant/application/Common_VS3_chain',
                                    tmshPath: 'profiles/http_default_v16'
                                },
                                {
                                    tmshHeader: 'ltm virtual /tenant/application/Common_VS3_chain',
                                    tmshPath: 'profiles/ssl_chain'
                                }
                            ]
                        }
                    }
                },
                application2: {
                    tmshHeader: 'app2Obj',
                    tmshPath: 'app2Path'
                }
            }
        };

        const renamedObj = {
            'tenant-name': {
                tmshHeader: 'tenantObj',
                tmshPath: 'tenantPath',
                application: {
                    tmshHeader: 'appObj',
                    tmshPath: 'appPath',
                    Common_VS3_chain: {
                        tmshHeader: 'obj',
                        tmshPath: 'objPath'

                    }
                },
                application2: {
                    tmshHeader: 'app2Obj',
                    tmshPath: 'app2Path',
                    renamedObject: {
                        tmshHeader: 'ltm virtual /tenant/application/Common_VS3_chain',
                        tmshPath: 'profiles',
                        internalArray: [
                            {
                                tmshHeader: 'ltm virtual /tenant/application/Common_VS3_chain',
                                tmshPath: 'profiles/http_default_v16'
                            },
                            {
                                tmshHeader: 'ltm virtual /tenant/application/Common_VS3_chain',
                                tmshPath: 'profiles/ssl_chain'
                            }
                        ]
                    }
                }
            }
        };
        it('should move the tmsh info from old path to new path', () => {
            globalObjectUtil.addProperty('', 'tenant-name', 'tenantObj', 'tenantPath');
            globalObjectUtil.addProperty('/tenant-name', 'application', 'appObj', 'appPath');
            globalObjectUtil.addProperty('/tenant-name/application', 'Common_VS3_chain', 'obj', 'objPath');
            globalObjectUtil.addProperty('/tenant-name/application/Common_VS3_chain', 'profiles', 'ltm virtual /tenant/application/Common_VS3_chain', 'profiles', ['http_default_v16', 'ssl_chain']);
            globalObjectUtil.addProperty('/tenant-name', 'application2', 'app2Obj', 'app2Path');
            globalObjectUtil.moveAll('/tenant-name/application/Common_VS3_chain', 'profiles', '/tenant-name/application2', 'renamedObject');
            assert.deepStrictEqual(globalObjectUtil.getGlobalObj(), renamedObj);
        });

        it('should not be able to move tmsh info when object at old path does not exist', () => {
            globalObjectUtil.addProperty('', 'tenant-name', 'tenantObj', 'tenantPath');
            globalObjectUtil.addProperty('/tenant-name', 'application', 'appObj', 'appPath');
            globalObjectUtil.addProperty('/tenant-name/application', 'Common_VS3_chain', 'obj', 'objPath');
            globalObjectUtil.addProperty('/tenant-name/application/Common_VS3_chain', 'profiles', 'ltm virtual /tenant/application/Common_VS3_chain', 'profiles', ['http_default_v16', 'ssl_chain']);
            globalObjectUtil.addProperty('/tenant-name', 'application2', 'app2Obj', 'app2Path');
            globalObjectUtil.moveProperty('/tenant-name/application5', 'Common_VS3_chain', '/tenant-name/application2', 'renamedObject');
            assert.deepStrictEqual(globalObjectUtil.getGlobalObj(), beforeRenameObj);
        });

        it('should move tmsh info from old path to new path for array property', () => {
            const movedObj = {
                allowCipherRules: {
                    internalArray: [
                        {
                            tmshHeader: 'cipherPath',
                            tmshPath: 'bigip/Common/f5-secure'
                        }
                    ],
                    tmshPath: 'bigip',
                    tmshHeader: 'cipherPath'
                },
                tenant: {
                    tmshHeader: 'tenantObj',
                    tmshPath: 'tenantPath',
                    new: {
                        tmshHeader: 'cipherPath',
                        tmshPath: 'bigip/Common/f5-default'
                    }
                }
            };
            globalObjectUtil.addProperty('', 'tenant', 'tenantObj', 'tenantPath');
            globalObjectUtil.addProperty('', 'allowCipherRules', 'cipherPath', 'bigip', ['/Common/f5-default', '/Common/f5-secure']);

            globalObjectUtil.moveProperty('/allowCipherRules', 'internalArray[0]', '/tenant', 'new');
            assert.deepStrictEqual(globalObjectUtil.getGlobalObj(), movedObj);
        });
    });

    describe('.delete()', () => {
        beforeEach(() => {
            globalObjectUtil.reset();
        });

        it('delete property when dup in header', () => {
            globalObjectUtil.addProperty('', 'tenant-name', 'ltm pool /Common/not_a_dup', 'tenantPath');
            globalObjectUtil.addProperty('/tenant-name', 'application', 'ltm pool /Common/not_a_dup', 'appPath');
            globalObjectUtil.addProperty('/tenant-name/application', 'Common_VS3_chain', 'ltm pool /Common/not_a_dup', 'objPath');
            globalObjectUtil.setConfig({
                jsonLogs: true,
                requestContext: {
                    logRemoveProperty: noop
                }
            });
            globalObjectUtil.deleteProperty('', 'tenant-name');
            assert.deepStrictEqual(globalObjectUtil.getGlobalObj(), {});
        });
    });
});
