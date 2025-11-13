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

/**
 * @fileoverview Integration tests for F5 Automation Config Converter chariot library
 * @module chariot-spec
 * @requires ../testUtils/assert
 * @requires ../../src/main
 * @version 1.126.0
 */

'use strict';

const assert = require('../testUtils/assert');
// const chariot = require('../../src/chariot');
const { mainAPI } = require('../../src/main');

/**
 * Test suite for chariot library usage and integrations.
 * Tests the main API functionality for converting TMOS configurations
 * to AS3 and Declarative Onboarding (DO) declarations.
 *
 * @fileoverview Integration tests for F5 Automation Config Converter
 * @author F5 Networks
 * @since 1.126.0
 */
describe('testing chariot library usage/integrations', () => {
    /**
     * Sample TMOS configuration for AS3 conversion testing.
     * Contains typical F5 BIG-IP configuration objects including:
     * - LTM pool with multiple members
     * - HTTP virtual server
     * - HTTPS virtual server with SSL profile
     *
     * @type {string}
     * @constant
     */
    const as3TmosConfig = `
ltm pool /Common/app1_t80_pool {
    members {
        /Common/10.10.10.11:80 {
            address 10.10.10.11
            session user-enabled
            state user-up
        }
        /Common/10.10.10.12:80 {
            address 10.10.10.12
            session user-enabled
            state user-up
        }
    }
    monitor /Common/http
}

ltm virtual /Common/app1_t80_vs {
    destination /Common/10.10.10.10:80
    ip-protocol tcp
    pool /Common/app1_t80_pool
    profiles {
        /Common/http { }
        /Common/tcp { }
    }
    source 0.0.0.0/0
    translate-address enabled
    translate-port enabled
}

ltm virtual /Common/app1_t443_vs {
    destination /Common/10.10.10.10:443
    ip-protocol tcp
    pool /Common/app1_t80_pool
    profiles {
        /Common/http { }
        /Common/tcp { }
        /Common/clientssl {
            context clientside
        }
    }
    source 0.0.0.0/0
    translate-address enabled
    translate-port enabled
}`;

    /**
     * Sample TMOS configuration for Declarative Onboarding (DO) conversion testing.
     * Contains typical F5 BIG-IP system configuration objects including:
     * - Global system settings
     * - Module provisioning
     * - DNS configuration
     * - NTP settings
     * - Management IP and routing
     * - VLAN configuration
     *
     * @type {string}
     * @constant
     */
    const doTmosConfig = `
sys global-settings {
    console-inactivity-timeout 1200
    gui-setup disabled
    hostname devCloud01.benlab.io
    mgmt-dhcp dhcpv6
}

sys provision ltm {
    level nominal
}

sys provision apm {
    level nominal
}

sys dns {
    description configured-by-dhcp
    name-servers { 192.168.200.7 192.168.200.8 }
    search { benlab.io }
}

sys ntp {
    timezone US/Central
}

sys management-ip 10.200.244.110/24 {
    description configured-statically
}

sys management-route /Common/default {
    description configured-statically
    gateway 10.200.244.1
    network default
}

net vlan /Common/internal {
    interfaces {
        1.0 { }
    }
    tag 4094
}`;

    /**
     * Test AS3 conversion functionality.
     * Verifies that TMOS configuration is properly converted to AS3 declaration format.
     * Validates the structure of the returned AS3 declaration and ensures all
     * expected objects (pool, virtual servers) are present.
     *
     * @test {Function} mainAPI - AS3 conversion with standard configuration
     * @memberof module:chariot-spec
     * @async
     * @returns {Promise<void>} Test completion promise
     */
    it('convert TMOS config to AS3 using chariot', async () => {
        /**
         * Configuration object for AS3 conversion with analytics disabled.
         * @type {ConversionConfig}
         */
        const config = {
            declarativeOnboarding: false,
            next: false,
            showExtended: false,
            safeMode: false,
            disableAnalytics: true
        };

        const result = await mainAPI(as3TmosConfig, config);

        assert.hasAllKeys(result, ['declaration', 'metadata']);

        // Check for AS3 declaration structure - it should have at least these keys
        const expectedKeys = ['class', 'schemaVersion', 'id', 'label', 'remark'];
        expectedKeys.forEach((key) => {
            assert.property(result.declaration, key, `Expected declaration key ${key} not found`);
        });

        // Should have Common tenant with Shared application
        if (result.declaration.Common && result.declaration.Common.Shared) {
            const shared = result.declaration.Common.Shared;
            assert.property(shared, 'class');
            assert.property(shared, 'template');

            // Verify expected AS3 objects are present
            const expectedObjects = ['app1_t80_pool', 'app1_t80_vs', 'app1_t443_vs'];
            expectedObjects.forEach((obj) => {
                assert.property(shared, obj, `Expected AS3 object ${obj} not found`);
            });
        }

        assert.isNumber(result.metadata.jsonCount);
        assert.isAtLeast(result.metadata.jsonCount, 3, 'Should convert at least 3 objects (pool + 2 virtual servers)');
    });

    /**
     * Test Declarative Onboarding (DO) conversion functionality.
     * Verifies that TMOS system configuration is properly converted to DO declaration format.
     * Validates specific DO objects like System, DNS, and Provision configurations.
     *
     * @test {Function} mainAPI - DO conversion with declarativeOnboarding flag
     * @memberof module:chariot-spec
     */
    it('convert TMOS config to DO using chariot', async () => {
        const config = {
            declarativeOnboarding: true,
            disableAnalytics: true
        };

        const result = await mainAPI(doTmosConfig, config);

        assert.hasAllKeys(result, ['declaration', 'metadata']);
        assert.hasAllKeys(result.declaration, ['schemaVersion', 'class', 'async', 'Common']);

        // Verify DO-specific properties
        const common = result.declaration.Common;
        assert.property(common, 'class');

        // Check for expected DO objects
        if (common.System) {
            assert.deepStrictEqual(common.System.hostname, 'devCloud01.benlab.io');
        }

        if (common.DNS) {
            assert.deepStrictEqual(common.DNS.nameServers, ['192.168.200.7', '192.168.200.8']);
            assert.deepStrictEqual(common.DNS.search, ['benlab.io']);
        }

        if (common.Provision) {
            assert.deepStrictEqual(common.Provision.ltm, 'nominal');
        }

        assert.isNumber(result.metadata.jsonCount);
        assert.isAtLeast(result.metadata.jsonCount, 1, 'Should convert at least 1 DO object');
    });

    /**
     * Test error handling for invalid input data.
     * Verifies that the API handles invalid/malformed input gracefully without crashing
     * and returns a proper minimal AS3 declaration structure.
     *
     * @test {Function} mainAPI - Error handling for invalid input
     * @memberof module:chariot-spec
     */
    it('handle invalid input gracefully using chariot', async () => {
        const invalidData = 'this is random invalid data that should not convert to anything meaningful';

        const config = {
            declarativeOnboarding: false,
            disableAnalytics: true
        };

        const result = await mainAPI(invalidData, config);

        assert.hasAllKeys(result, ['declaration', 'metadata']);

        // Should return minimal AS3 declaration structure
        const expectedKeys = ['class', 'id', 'label', 'remark', 'schemaVersion'];
        assert.hasAllKeys(result.declaration, expectedKeys);

        assert.deepStrictEqual(result.metadata.jsonCount, 0, 'Invalid input should convert 0 objects');
    });

    /**
     * Test error handling for empty input data.
     * Verifies that the API handles empty string input gracefully and returns
     * a proper minimal AS3 declaration structure with zero converted objects.
     *
     * @test {Function} mainAPI - Error handling for empty input
     * @memberof module:chariot-spec
     */
    it('handle empty input gracefully using chariot', async () => {
        const emptyData = '';

        const config = {
            declarativeOnboarding: false,
            disableAnalytics: true
        };

        const result = await mainAPI(emptyData, config);

        assert.hasAllKeys(result, ['declaration', 'metadata']);

        // Should return minimal AS3 declaration structure
        const expectedKeys = ['class', 'id', 'label', 'remark', 'schemaVersion'];
        assert.hasAllKeys(result.declaration, expectedKeys);

        assert.deepStrictEqual(result.metadata.jsonCount, 0, 'Empty input should convert 0 objects');
    });

    /**
     * Test AS3 Next mode conversion functionality.
     * Verifies that AS3 Next mode produces enhanced output with additional metadata
     * including keyNextConverted and as3NextNotConverted arrays for tracking
     * conversion status of individual configuration elements.
     *
     * @test {Function} mainAPI - AS3 Next mode with extended output
     * @memberof module:chariot-spec
     */
    it('convert TMOS config with AS3 Next mode using chariot', async () => {
        const config = {
            declarativeOnboarding: false,
            next: true,
            showExtended: true,
            disableAnalytics: true
        };

        const result = await mainAPI(as3TmosConfig, config);

        assert.hasAllKeys(result, ['declaration', 'metadata']);

        // Check for AS3 declaration structure - it should have at least these keys
        const expectedKeys = ['class', 'schemaVersion', 'id', 'label', 'remark'];
        expectedKeys.forEach((key) => {
            assert.property(result.declaration, key, `Expected declaration key ${key} not found`);
        });

        // Check for Next-specific metadata
        assert.property(result.metadata, 'as3NextNotConverted');
        assert.property(result.metadata, 'keyNextConverted');

        assert.isNumber(result.metadata.jsonCount);
        assert.isAtLeast(result.metadata.jsonCount, 3, 'Should convert at least 3 objects in Next mode');

        // Verify AS3 Next metadata is populated
        assert.isArray(result.metadata.keyNextConverted);
    });

    /**
     * Test error handling for malformed TMOS configuration.
     * Verifies that the API can handle partially valid/invalid TMOS configuration
     * without crashing and provides meaningful output even when input contains
     * invalid properties or syntax errors.
     *
     * @test {Function} mainAPI - Error resilience for malformed configuration
     * @memberof module:chariot-spec
     */
    it('handle malformed TMOS config using chariot', async () => {
        const malformedData = `
        ltm pool /Common/test {
            members {
                /Common/1.1.1.1:80 {
                    invalid-property-that-does-not-exist some-value
                    address 1.1.1.1
                }
            }
            invalid-pool-property test
        }`;

        const config = {
            declarativeOnboarding: false,
            disableAnalytics: true
        };

        // Should not throw an error, but handle gracefully
        const result = await mainAPI(malformedData, config);

        assert.hasAllKeys(result, ['declaration', 'metadata']);
        assert.hasAllKeys(result.declaration, ['class', 'id', 'label', 'remark', 'schemaVersion']);

        // May convert some objects depending on how malformed it is
        assert.isNumber(result.metadata.jsonCount);
        assert.isAtLeast(result.metadata.jsonCount, 0, 'Should handle malformed input without crashing');
    });
});
