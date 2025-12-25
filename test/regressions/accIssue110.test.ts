/**
 * Test for ACC Issue #110
 * https://github.com/f5devcentral/f5-automation-config-converter/issues/110
 *
 * Bug: "Cannot read properties of undefined (reading 'trim')"
 *
 * Root cause in upstream: The parser fails when encountering APM profile syntax
 * with "undefined" as a literal keyword: "apm profile access undefined /Common/portal"
 *
 * This test verifies our parser handles:
 * 1. APM profile with "undefined" keyword in the object name
 * 2. Empty description fields (description with no value)
 * 3. Complex iRules with multiple event handlers
 * 4. Security log profiles with quoted names containing spaces
 */

import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import parse from '../../src/parser';

describe('ACC Issue #110 - APM profile with "undefined" keyword', () => {
    const configPath = path.join(__dirname, '../engines/parser/accIssue110.conf');
    const expectedPath = path.join(__dirname, '../engines/parser/accIssue110.autotest.json');

    let config: string;
    let expected: Record<string, unknown>;

    before(() => {
        config = fs.readFileSync(configPath, 'utf8');
        expected = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));
    });

    it('should parse the full configuration without throwing', () => {
        expect(() => parse({ 'accIssue110.conf': config })).to.not.throw();
    });

    it('should correctly parse the APM profile with "undefined" in the name', () => {
        const result = parse({ 'accIssue110.conf': config });
        expect(result).to.have.property('apm profile access undefined /Common/portal');

        const apmProfile = result['apm profile access undefined /Common/portal'];
        expect(apmProfile).to.have.property('access-policy', '/Common/ecoportal');
        expect(apmProfile).to.have.property('inactivity-timeout', '3600');
        expect(apmProfile).to.have.property('type', 'all');
    });

    it('should handle empty description field', () => {
        const result = parse({ 'accIssue110.conf': config });
        const vs = result['ltm virtual /Common/Environmentalportal_vs'];
        expect(vs).to.have.property('description', '');
    });

    it('should parse security-log-profiles with quoted names', () => {
        const result = parse({ 'accIssue110.conf': config });
        const vs = result['ltm virtual /Common/Environmentalportal_vs'];
        expect(vs['security-log-profiles']).to.have.property('"/Common/Log illegal requests"');
    });

    it('should parse all iRules as multiline strings', () => {
        const result = parse({ 'accIssue110.conf': config });

        expect(result).to.have.property('ltm rule /Common/EA_IP_Blacklist');
        expect(result).to.have.property('ltm rule /Common/HTTP_Headers');
        expect(result).to.have.property('ltm rule /Common/Portal_Rewrite');
        expect(result).to.have.property('ltm rule /Common/Portal');

        // The Portal iRule should contain the complex MS Office Forms-Based Auth logic
        const portalRule = result['ltm rule /Common/Portal'] as string;
        expect(portalRule).to.include('RULE_INIT');
        expect(portalRule).to.include('HTTP_REQUEST');
        expect(portalRule).to.include('HTTP_RESPONSE');
        expect(portalRule).to.include('ACCESS_SESSION_STARTED');
        expect(portalRule).to.include('ACCESS_POLICY_COMPLETED');
        expect(portalRule).to.include('ACCESS_ACL_ALLOWED');
    });

    it('should match the expected output exactly', () => {
        const result = parse({ 'accIssue110.conf': config });
        expect(result).to.deep.equal(expected);
    });
});
