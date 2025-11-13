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
const { unlink } = require('fs').promises;
const assert = require('../testUtils/assert');
const { main, mainAPI } = require('../../src/main');
const miscUtils = require('../testUtils/misc');

describe('Test main function (main.js)', () => {
    afterEach(() => {
        unlink('output.json').catch();
    });

    it('should fail if bad or encrypted ucs provided', async () => {
        const config = {
            ucs: './test/main/encrypted.ucs',
            output: 'output.json',
            disableAnalytics: true
        };
        return assert.isRejected(main(null, config));
    });

    it('should fail if corrupted ucs provided', async () => {
        const config = {
            ucs: './test/basic_install_corrupted.ucs',
            output: 'output.json',
            disableAnalytics: true
        };
        return assert.isRejected(main(null, config));
    });

    it('should be callable from 3rd party script as function, metadata test', async () => {
        const data = fs.readFileSync('./test/main/main.conf', 'utf-8');

        const exMetadata = {
            as3Recognized: {
                'ltm pool /AS3_Tenant/AS3_Application/web_pool': {
                    'min-active-members': '1'
                },
                'ltm virtual /AS3_Tenant/AS3_Application/serviceMain': {
                    description: 'AS3_Application',
                    destination: '/AS3_Tenant/10.0.1.10:80',
                    'ip-protocol': 'tcp',
                    mask: '255.255.255.255',
                    persist: {
                        '/Common/cookie': {
                            default: 'yes'
                        }
                    },
                    pool: '/AS3_Tenant/AS3_Application/web_pool',
                    profiles: {
                        '/Common/f5-tcp-progressive': {}, '/Common/http': {}
                    },
                    source: '0.0.0.0/0',
                    'source-address-translation': {
                        type: 'automap'
                    },
                    'translate-address': 'enabled',
                    'translate-port': 'enabled'
                },
                'ltm virtual-address /AS3_Tenant/10.0.1.10': {
                    address: '10.0.1.10',
                    arp: 'enabled',
                    'inherited-traffic-group': 'true',
                    mask: '255.255.255.255',
                    'traffic-group': '/Common/traffic-group-1'
                },
                'security dos profile /AS3_Tenant/AS3_Application/dos_test': {
                    'app-service': 'none',
                    application: {
                        'dos-hidden': {
                            'tps-based': {
                                mode: 'off'
                            }
                        }
                    }
                }
            },
            declarationInfo: {
                classes: { Pool: 1, Service_HTTP: 1, DOS_Profile: 1 },
                maps: {
                    applications: ['/AS3_Tenant/AS3_Application'],
                    objects: ['/AS3_Tenant/AS3_Application/web_pool',
                        '/AS3_Tenant/AS3_Application/serviceMain',
                        '/AS3_Tenant/AS3_Application/dos_test'],
                    tenants: ['/AS3_Tenant']
                },
                total: 3
            },
            jsonCount: 4,
            jsonLogs: [],
            as3Converted: {
                'ltm pool /AS3_Tenant/AS3_Application/web_pool': {
                    'min-active-members': '1'
                },
                'ltm virtual /AS3_Tenant/AS3_Application/serviceMain': {
                    description: 'AS3_Application',
                    destination: '/AS3_Tenant/10.0.1.10:80',
                    'ip-protocol': 'tcp',
                    mask: '255.255.255.255',
                    persist: {
                        '/Common/cookie': {
                            default: 'yes'
                        }
                    },
                    pool: '/AS3_Tenant/AS3_Application/web_pool',
                    profiles: {
                        '/Common/f5-tcp-progressive': {}, '/Common/http': {}
                    },
                    source: '0.0.0.0/0',
                    'source-address-translation': {
                        type: 'automap'
                    },
                    'translate-address': 'enabled',
                    'translate-port': 'enabled'
                },
                'ltm virtual-address /AS3_Tenant/10.0.1.10': {
                    address: '10.0.1.10',
                    arp: 'enabled',
                    'inherited-traffic-group': 'true',
                    mask: '255.255.255.255',
                    'traffic-group': '/Common/traffic-group-1'
                },
                'security dos profile /AS3_Tenant/AS3_Application/dos_test': {
                    'app-service': 'none',
                    application: {
                        'dos-hidden': {
                            'tps-based': {
                                mode: 'off'
                            }
                        }
                    }
                }
            },
            keyNextConverted: [
                'ltm pool /AS3_Tenant/AS3_Application/web_pool',
                'ltm virtual /AS3_Tenant/AS3_Application/serviceMain',
                'ltm virtual-address /AS3_Tenant/10.0.1.10',
                'security dos profile /AS3_Tenant/AS3_Application/dos_test'
            ],
            as3NextNotConverted: {},
            as3NotRecognized: {},
            as3NextUndefinedNotConverted: [],
            as3NotConverted: {},
            unsupportedStats: {}
        };
        const json = await mainAPI(data);
        const convertedMetadata = json.metadata;
        assert.deepStrictEqual(convertedMetadata, exMetadata);
    });

    it('should be callable from 3rd party script as function, next metadata test', async () => {
        const data = fs.readFileSync('./test/main/main.conf', 'utf-8');

        const exMetadata = {
            as3Recognized: {
                'ltm pool /AS3_Tenant/AS3_Application/web_pool': {
                    'min-active-members': '1'
                },
                'ltm virtual /AS3_Tenant/AS3_Application/serviceMain': {
                    description: 'AS3_Application',
                    destination: '/AS3_Tenant/10.0.1.10:80',
                    'ip-protocol': 'tcp',
                    mask: '255.255.255.255',
                    persist: {
                        '/Common/cookie': {
                            default: 'yes'
                        }
                    },
                    pool: '/AS3_Tenant/AS3_Application/web_pool',
                    profiles: {
                        '/Common/f5-tcp-progressive': {}, '/Common/http': {}
                    },
                    source: '0.0.0.0/0',
                    'source-address-translation': {
                        type: 'automap'
                    },
                    'translate-address': 'enabled',
                    'translate-port': 'enabled'
                },
                'ltm virtual-address /AS3_Tenant/10.0.1.10': {
                    address: '10.0.1.10',
                    arp: 'enabled',
                    'inherited-traffic-group': 'true',
                    mask: '255.255.255.255',
                    'traffic-group': '/Common/traffic-group-1'
                },
                'security dos profile /AS3_Tenant/AS3_Application/dos_test': {
                    'app-service': 'none',
                    application: {
                        'dos-hidden': {
                            'tps-based': {
                                mode: 'off'
                            }
                        }
                    }
                }
            },
            declarationInfo: {
                classes: { Pool: 1, Service_HTTP: 1 },
                maps: {
                    applications: ['/AS3_Tenant/AS3_Application'],
                    objects: ['/AS3_Tenant/AS3_Application/web_pool',
                        '/AS3_Tenant/AS3_Application/serviceMain'],
                    tenants: ['/AS3_Tenant']
                },
                total: 2
            },
            jsonCount: 4,
            jsonLogs: [],
            as3Converted: {
                'ltm pool /AS3_Tenant/AS3_Application/web_pool': {
                    'min-active-members': '1'
                },
                'ltm virtual /AS3_Tenant/AS3_Application/serviceMain': {
                    description: 'AS3_Application',
                    destination: '/AS3_Tenant/10.0.1.10:80',
                    'ip-protocol': 'tcp',
                    mask: '255.255.255.255',
                    persist: {
                        '/Common/cookie': {
                            default: 'yes'
                        }
                    },
                    pool: '/AS3_Tenant/AS3_Application/web_pool',
                    profiles: {
                        '/Common/f5-tcp-progressive': {}, '/Common/http': {}
                    },
                    source: '0.0.0.0/0',
                    'source-address-translation': {
                        type: 'automap'
                    },
                    'translate-address': 'enabled',
                    'translate-port': 'enabled'
                },
                'ltm virtual-address /AS3_Tenant/10.0.1.10': {
                    address: '10.0.1.10',
                    arp: 'enabled',
                    'inherited-traffic-group': 'true',
                    mask: '255.255.255.255',
                    'traffic-group': '/Common/traffic-group-1'
                },
                'security dos profile /AS3_Tenant/AS3_Application/dos_test': {
                    'app-service': 'none',
                    application: {
                        'dos-hidden': {
                            'tps-based': {
                                mode: 'off'
                            }
                        }
                    }
                }
            },
            keyNextConverted: [
                'ltm pool /AS3_Tenant/AS3_Application/web_pool',
                'ltm virtual /AS3_Tenant/AS3_Application/serviceMain',
                'ltm virtual-address /AS3_Tenant/10.0.1.10'
            ],
            as3NextNotConverted: {
                'security dos profile /AS3_Tenant/AS3_Application/dos_test': {
                    'app-service': 'none',
                    application: {
                        'dos-hidden': {
                            'tps-based': {
                                mode: 'off'
                            }
                        }
                    }
                }
            },
            as3NextUndefinedNotConverted: [],
            as3NotConverted: {},
            as3NotRecognized: {},
            unsupportedStats: {}
        };
        const config = { nextNotConverted: true };
        const json = await mainAPI(data, config);
        const convertedMetadata = json.metadata;
        assert.deepStrictEqual(convertedMetadata, exMetadata);
    });

    it('should be callable from 3rd party script as function, declaration test', async () => {
        const data = fs.readFileSync('./test/main/main.conf', 'utf-8');
        const json = await mainAPI(data);

        assert.declDeepStrictEqual(
            json,
            await miscUtils.loadJSON(`${__dirname}/main-classic.json`),
            { ignore: ['id', 'schemaVersion'] }
        );
    });

    it('should be callable from 3rd party script as function, next test', async () => {
        const data = fs.readFileSync('./test/main/main.conf', 'utf-8');
        const config = { nextNotConverted: true };
        const json = await mainAPI(data, config);

        assert.declDeepStrictEqual(
            json,
            await miscUtils.loadJSON(`${__dirname}/main-next.json`),
            { ignore: ['id', 'schemaVersion'] }
        );
    });

    it('should be able to read AS3 Core declaration from file and provide output without NEXT converter involved', async () => {
        const json = await main(null, {
            conf: `${__dirname}/as3-core-declaration-input.json`
        });
        assert.deepStrictEqual(
            json.declaration,
            await miscUtils.loadJSON(`${__dirname}/as3-core-declaration-output.json`)
        );
    });

    it('should be able to read AS3 Core declaration from file and provide output with NEXT converter involved', async () => {
        const json = await main(null, {
            conf: `${__dirname}/as3-core-declaration-input-next.json`,
            next: true
        });
        assert.deepStrictEqual(
            json.declaration,
            await miscUtils.loadJSON(`${__dirname}/as3-core-declaration-output-next.json`)
        );
    });
});
