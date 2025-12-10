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

const assert = require('assert');
const ipUtil = require('../../src/utils/convert/ipUtils');

describe('IpUtil', () => {
    describe('.isIPv4', () => {
        function assertCheck(string, result) {
            assert.strictEqual(ipUtil.isIPv4(string), result, string);
        }
        it('should fail on empty input', () => {
            assertCheck('', false);
            assertCheck(undefined, false);
            assertCheck(null, false);
        });

        it('should fail on non-string input', () => {
            assertCheck({ spam: 'eggs' }, false);
            assertCheck(42, false);
            assertCheck(true, false);
        });

        it('should fail on invalid addresses', () => {
            assertCheck('127.0.0.1:8080', false);
            assertCheck('127.0.0', false);
        });

        it('should fail on IPv6 addresses', () => {
            assertCheck('2001:0db8:85a3:0000:0000:8a2e:0370:7334', false);
        });

        it('should pass on IPv4 addresses', () => {
            assertCheck('127.0.0.1', true);
            assertCheck('192.168.0.1', true);
        });

        it('should pass with route domain', () => {
            assertCheck('127.0.0.1%2', true);
        });

        it('should pass with masklen', () => {
            assertCheck('192.168.0.1/32', true);
            assertCheck('192.168.0.1/8', true);
            assertCheck('192.168.0.1/0', true);
            assertCheck('10.10.0.0/16', true);
        });

        it('should pass with masklen and route domain', () => {
            assertCheck('192.168.0.1%2/32', true);
            assertCheck('192.168.0.1%1/0', true);
        });
    });

    describe('.isIPv6', () => {
        function assertCheck(string, result) {
            assert.strictEqual(ipUtil.isIPv6(string), result, string);
        }
        it('should fail on empty input', () => {
            assertCheck('', false);
            assertCheck(undefined, false);
            assertCheck(null, false);
        });

        it('should fail on non-string input', () => {
            assertCheck({ spam: 'eggs' }, false);
            assertCheck(42, false);
            assertCheck(true, false);
        });

        it('should fail on invalid addresses', () => {
            assertCheck('2001:0db8:85a3:0000:0000:8a2e:0370:7334.8080', false);
            assertCheck('2001:0db8', false);
            assertCheck('2001:d0g8:85a3::8a2e:0370:7334', false);
        });

        it('should fail on IPv4 addresses', () => {
            assertCheck('192.168.0.1', false);
        });

        it('should pass on IPv6 addresses', () => {
            assertCheck('2001:0db8:85a3:0000:0000:8a2e:0370:7334', true);
            assertCheck('2001:0db8:85a3::8a2e:0370:7334', true);
            assertCheck('::1', true);
        });

        it('should pass on IPv4-mapped IPv6 addresses', () => {
            assertCheck('::FFFF:129.144.52.38', true); // gitleaks:allow
        });

        it('should pass with route domain', () => {
            assertCheck('2001:0db8:85a3:0000:0000:8a2e:0370:7334%2', true);
        });

        it('should pass with masklen', () => {
            assertCheck('2001:0db8:85a3:0000:0000:8a2e:0370:7334/128', true);
            assertCheck('2001:0db8:85a3:0000:0000:8a2e:0370:7334/112', true);
            assertCheck('2001:0db8:85a3:0000:0000:8a2e:0370:7334/104', true);
            assertCheck('2001:0db8:85a3:0000:0000:8a2e:0370:7334/96', true);
            assertCheck('2001:0db8:85a3:0000:0000:8a2e:0370:7334/80', true);
            assertCheck('2001:0db8:85a3:0000:0000:8a2e:0370:7334/72', true);
            assertCheck('2001:0db8:85a3:0000:0000:8a2e:0370:7334/64', true);
            assertCheck('2001:0db8:85a3:0000:0000:8a2e:0370:7334/56', true);
            assertCheck('2001:0db8:85a3:0000:0000:8a2e:0370:7334/40', true);
            assertCheck('2001:0db8:85a3:0000:0000:8a2e:0370:7334/32', true);
            assertCheck('2001:0db8:85a3:0000:0000:8a2e:0370:7334/24', true);
            assertCheck('2001:0db8:85a3:0000:0000:8a2e:0370:7334/16', true);
            assertCheck('2001:0db8:85a3:0000:0000:8a2e:0370:7334/0', true);
        });

        it('should pass with masklen and route domain', () => {
            assertCheck('2001:0db8:85a3:0000:0000:8a2e:0370:7334%2/128', true);
            assertCheck('2001:0db8:85a3:0000:0000:8a2e:0370:7334%1/0', true);
        });
    });

    describe('.splitAddress', () => {
        // ['test name', 'input', 'expected output']
        const testCases = [
            ['IPv4', '127.0.0.1:80', { address: '127.0.0.1', port: '80' }],
            ['IPv6 ::', '::1.80', { address: '::1', port: '80' }],
            ['IPv6', '2001:0db8:85a3:0000::8a2e:0370:7334.80', { address: '2001:0db8:85a3:0000::8a2e:0370:7334', port: '80' }],
            ['any', 'any:80', { address: 'any', port: '80' }],
            ['any6', 'any6.80', { address: 'any6', port: '80' }],
            ['0.0.0.0', '0.0.0.0:80', { address: '0.0.0.0', port: '80' }],
            ['::', '::.80', { address: '::', port: '80' }],
            ['no port IPv4', '127.0.0.1', { address: '127.0.0.1', port: '' }],
            ['no port simple IPv6', '::1', { address: '::1', port: '' }],
            ['no port IPv6', '2001:0db8:85a3:0000:8a2e:0370:7334', { address: '2001:0db8:85a3:0000:8a2e:0370:7334', port: '' }],
            ['no port any', 'any', { address: 'any', port: '' }],
            ['no port any6', 'any6', { address: 'any6', port: '' }],
            ['no port 0.0.0.0', '0.0.0.0', { address: '0.0.0.0', port: '' }],
            ['no port ::', '::', { address: '::', port: '' }],
            ['route domain', '127.0.0.1%123:80', { address: '127.0.0.1%123', port: '80' }],
            ['route domain IPv6', '::1%123.80', { address: '::1%123', port: '80' }],
            ['route domain no port', '127.0.0.1%123', { address: '127.0.0.1%123', port: '' }],
            ['route domain IPv6 no port', '::1%123', { address: '::1%123', port: '' }],
            ['route domain any no port', 'any%123', { address: 'any%123', port: '' }],
            ['route domain any6 no port', 'any6%123', { address: 'any6%123', port: '' }]
        ];

        testCases.forEach((testCase) => {
            it(testCase[0], () => {
                assert.deepStrictEqual(ipUtil.splitAddress(testCase[1]), testCase[2], `${testCase[1]} failed`);
            });
        });
    });

    describe('.getCidrFromNetmask', () => {
        const testCases = [
            {
                mask: 'any',
                cidr: '/0'
            },
            {
                mask: '254.0.0.0', // gitleaks:allow
                cidr: '/7'
            },
            {
                mask: '255.224.0.0', // gitleaks:allow
                cidr: '/11'
            },
            {
                mask: '255.255.255.0', // gitleaks:allow
                cidr: '/24'
            },
            {
                mask: '255.255.255.248', // gitleaks:allow
                cidr: '/29'
            },
            {
                mask: '255.255.255.255',
                cidr: '/32'
            },
            {
                mask: '8000::',
                cidr: '/1'
            },
            {
                mask: 'c000::',
                cidr: '/2'
            },
            {
                mask: 'ff00::',
                cidr: '/8'
            },
            {
                mask: 'fff0::',
                cidr: '/12'
            },
            {
                mask: 'fff8:0000::',
                cidr: '/13'
            },
            {
                mask: 'ffff:0000::',
                cidr: '/16'
            },
            {
                mask: 'ffff:d000::',
                cidr: '/19'
            },
            {
                mask: 'ffff:ffff:ffff:ffff::',
                cidr: '/64'
            },
            {
                mask: 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:fff8',
                cidr: '/125'
            },
            {
                mask: 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:fffc',
                cidr: '/126'
            },
            {
                mask: 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:fffe',
                cidr: '/127'
            },
            {
                mask: 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
                cidr: '/128'
            }
        ];

        testCases.forEach((testCase) => {
            it(`should return correct cidr '${testCase.cidr}' when mask is ${testCase.mask}`, () => {
                assert.deepStrictEqual(ipUtil.getCidrFromNetmask(testCase.mask), testCase.cidr);
            });
        });
    });

    describe('.parseIpAddress', () => {
        const testCases = [
            {
                expected: {
                    ip: '',
                    routeDomain: '',
                    port: '',
                    ipWithRoute: ''
                }
            },
            {
                address: '',
                expected: {
                    ip: '',
                    routeDomain: '',
                    port: '',
                    ipWithRoute: ''
                }
            },
            {
                address: '0.0.0.0:0',
                expected: {
                    ip: '0.0.0.0',
                    routeDomain: '',
                    port: '0',
                    ipWithRoute: '0.0.0.0'
                }
            },
            {
                address: 'any',
                expected: {
                    ip: '0.0.0.0',
                    routeDomain: '',
                    port: '',
                    ipWithRoute: '0.0.0.0'
                }
            },
            {
                address: 'any6',
                expected: {
                    ip: '::',
                    routeDomain: '',
                    port: '',
                    ipWithRoute: '::'
                }
            },
            {
                address: '192.0.2.123%123',
                expected: {
                    ip: '192.0.2.123',
                    routeDomain: '%123',
                    port: '',
                    ipWithRoute: '192.0.2.123%123'
                }
            },
            {
                address: '192.0.2.123%2222:24',
                expected: {
                    ip: '192.0.2.123',
                    routeDomain: '%2222',
                    port: '24',
                    ipWithRoute: '192.0.2.123%2222'
                }
            },
            {
                address: '192.0.2.1%0',
                expected: {
                    ip: '192.0.2.1',
                    routeDomain: '%0',
                    port: '',
                    ipWithRoute: '192.0.2.1%0'
                }
            },
            {
                address: '::',
                expected: {
                    ip: '::',
                    routeDomain: '',
                    port: '',
                    ipWithRoute: '::'
                }
            },
            {
                address: '2001:0db8:85a3:0000:0000:8a2e:0370:7335.64',
                expected: {
                    ip: '2001:0db8:85a3:0000:0000:8a2e:0370:7335',
                    routeDomain: '',
                    port: '64',
                    ipWithRoute: '2001:0db8:85a3:0000:0000:8a2e:0370:7335'
                }
            },
            {
                address: '2001:0db8:85a3:0000:0000:8a2e:0370:7335%55.66',
                expected: {
                    ip: '2001:0db8:85a3:0000:0000:8a2e:0370:7335',
                    routeDomain: '%55',
                    port: '66',
                    ipWithRoute: '2001:0db8:85a3:0000:0000:8a2e:0370:7335%55'
                }
            },
            {
                address: '/test/test/10.10.20.20%10:tcp',
                expected: {
                    ip: '10.10.20.20',
                    routeDomain: '%10',
                    port: 'tcp',
                    ipWithRoute: '10.10.20.20%10'
                }
            },
            {
                address: '/test/test/10.10.20.20%10:8080',
                expected: {
                    ip: '10.10.20.20',
                    routeDomain: '%10',
                    port: '8080',
                    ipWithRoute: '10.10.20.20%10'
                }
            },
            {
                address: '/test/test/a::b.80',
                expected: {
                    ip: 'a::b',
                    routeDomain: '',
                    port: '80',
                    ipWithRoute: 'a::b'
                }
            }
        ];

        testCases.forEach((testCase) => {
            it(`should return an object with following address ${testCase.address} or an empty object`, () => {
                assert.deepStrictEqual(ipUtil.parseIpAddress(testCase.address), testCase.expected);
            });
        });
    });
});
