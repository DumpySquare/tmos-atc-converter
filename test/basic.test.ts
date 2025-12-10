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
    });
});
