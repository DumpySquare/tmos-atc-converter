/**
 * Basic functionality tests for extracted tmos-converter
 */

import { expect } from 'chai';
import * as tmos from '../src/index';

describe('TMOS Converter - Basic Extraction Test', () => {
    describe('API exports', () => {
        it('should export parse function', () => {
            expect(tmos.parse).to.be.a('function');
        });

        it('should export toAS3 function', () => {
            expect(tmos.toAS3).to.be.a('function');
        });

        it('should export toDO function', () => {
            expect(tmos.toDO).to.be.a('function');
        });

        it('should export convertToAS3 function', () => {
            expect(tmos.convertToAS3).to.be.a('function');
        });

        it('should export convertToDO function', () => {
            expect(tmos.convertToDO).to.be.a('function');
        });

        it('should export validateAS3 function', () => {
            expect(tmos.validateAS3).to.be.a('function');
        });

        it('should export validateDO function', () => {
            expect(tmos.validateDO).to.be.a('function');
        });

        it('should export getAS3SchemaVersion function', () => {
            expect(tmos.getAS3SchemaVersion).to.be.a('function');
        });
    });

    describe('Parser', () => {
        it('should parse simple TMOS pool config', () => {
            const config = `ltm pool /Common/test_pool {
    members {
        /Common/192.168.1.10:80 {
            address 192.168.1.10
        }
    }
}`;
            const result = tmos.parse(config);
            expect(result).to.be.an('object');
            expect(result).to.have.property('ltm pool /Common/test_pool');
            expect(result['ltm pool /Common/test_pool']).to.have.property('members');
        });

        it('should parse simple virtual server config', () => {
            const config = `ltm virtual /Common/test_vs {
    destination /Common/192.168.1.100:443
    pool /Common/test_pool
}`;
            const result = tmos.parse(config);
            expect(result).to.be.an('object');
            expect(result).to.have.property('ltm virtual /Common/test_vs');
        });
    });

    describe('AS3 Conversion', () => {
        it('should convert parsed pool to AS3', async () => {
            const json = {
                'ltm pool /Common/test_pool': {
                    members: {
                        '/Common/192.168.1.10:80': {
                            address: '192.168.1.10'
                        }
                    }
                }
            };

            const result = await tmos.toAS3(json, {});
            expect(result).to.be.an('object');
            expect(result).to.have.property('declaration');
            expect(result.declaration).to.have.property('class', 'ADC');
        });

        it('should convert TMOS config to AS3 in one step', async () => {
            const config = `ltm pool /Common/test_pool {
    members {
        /Common/192.168.1.10:80 {
            address 192.168.1.10
        }
    }
}`;
            const result = await tmos.convertToAS3(config, {});
            expect(result).to.be.an('object');
            expect(result).to.have.property('declaration');
            expect(result.declaration).to.have.property('class', 'ADC');
            expect(result.declaration.Common).to.exist;
        });

        it('should strip route domains when stripRouteDomains option is enabled', async () => {
            // Pool members with route domain suffixes (%1)
            const config = `ltm pool /Common/rd_pool {
    members {
        /Common/192.168.1.10%1:80 {
            address 192.168.1.10%1
        }
        /Common/192.168.1.11%1:80 {
            address 192.168.1.11%1
        }
    }
}`;
            const result = await tmos.convertToAS3(config, { stripRouteDomains: true });
            const declarationStr = JSON.stringify(result.declaration);

            // Route domain suffixes should be removed
            expect(declarationStr).to.not.include('%1');

            // But the IPs should still be present
            expect(declarationStr).to.include('192.168.1.10');
            expect(declarationStr).to.include('192.168.1.11');
        });

        it('should preserve route domains when stripRouteDomains option is not set', async () => {
            const config = `ltm pool /Common/rd_pool {
    members {
        /Common/192.168.1.10%1:80 {
            address 192.168.1.10%1
        }
    }
}`;
            const result = await tmos.convertToAS3(config, {});
            const declarationStr = JSON.stringify(result.declaration);

            // Route domain suffix should be preserved (default behavior)
            expect(declarationStr).to.include('%1');
        });
    });

    describe('AS3 Validation', () => {
        it('should validate a valid AS3 declaration', async () => {
            const declaration = {
                class: 'ADC',
                schemaVersion: '3.50.0',
                id: 'test-declaration',
                label: 'Test',
                remark: 'Test declaration',
                Common: {
                    class: 'Tenant',
                    Shared: {
                        class: 'Application',
                        template: 'shared',
                        test_pool: {
                            class: 'Pool',
                            members: [
                                {
                                    servicePort: 80,
                                    serverAddresses: ['192.168.1.10']
                                }
                            ]
                        }
                    }
                }
            };

            const result = await tmos.validateAS3(declaration);
            expect(result).to.have.property('isValid', true);
            expect(result).to.have.property('data');
            expect(result).to.have.property('errors');
        });

        it('should detect invalid AS3 declaration (lazy mode removes invalid props)', async () => {
            const declaration = {
                class: 'ADC',
                schemaVersion: '3.50.0',
                Common: {
                    class: 'Tenant',
                    app: {
                        class: 'Application',
                        pool: {
                            class: 'Pool',
                            invalidProperty: 'this should be removed'
                        }
                    }
                }
            };

            const result = await tmos.validateAS3(declaration);
            // In lazy mode, invalid properties are removed and result is valid
            expect(result).to.have.property('isValid');
            expect(result).to.have.property('data');
            // The invalid property should be in ignoredAttributes
            expect(result.ignoredAttributes).to.be.an('array');
        });

        it('should fail in strict mode for invalid AS3 declaration', async () => {
            const declaration = {
                class: 'ADC',
                schemaVersion: '3.50.0',
                Common: {
                    class: 'Tenant',
                    app: {
                        class: 'Application',
                        pool: {
                            class: 'Pool',
                            invalidProperty: 'this should fail'
                        }
                    }
                }
            };

            const result = await tmos.validateAS3(declaration, { mode: 'strict' });
            expect(result).to.have.property('isValid', false);
            expect(result.errors).to.be.an('array').with.length.greaterThan(0);
        });

        it('should return schema version info', () => {
            const versions = tmos.getAS3SchemaVersion();
            expect(versions).to.have.property('latest');
            expect(versions).to.have.property('earliest');
            expect(versions.latest).to.match(/^\d+\.\d+\.\d+$/);
        });
    });

    describe('DO Validation', () => {
        it('should validate a valid DO declaration', async () => {
            const declaration = {
                schemaVersion: '1.0.0',
                class: 'Device',
                async: true,
                Common: {
                    class: 'Tenant',
                    myNtp: {
                        class: 'NTP',
                        servers: ['0.pool.ntp.org'],
                        timezone: 'UTC'
                    }
                }
            };

            const result = await tmos.validateDO(declaration);
            expect(result).to.have.property('isValid', true);
        });

        it('should detect invalid DO declaration', async () => {
            const declaration = {
                schemaVersion: '1.0.0',
                class: 'Device',
                async: true,
                Common: {
                    class: 'Tenant',
                    myNtp: {
                        class: 'NTP',
                        servers: 'not-an-array', // Should be array
                        timezone: 'UTC'
                    }
                }
            };

            const result = await tmos.validateDO(declaration);
            expect(result).to.have.property('isValid', false);
            expect(result.errors).to.be.an('array');
        });
    });
});
