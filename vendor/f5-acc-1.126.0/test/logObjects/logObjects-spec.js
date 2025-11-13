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

const sinon = require('sinon');

const assert = require('../testUtils/assert');
const customDict = require('../../src/lib/AS3/customDict');
const JsonValidator = require('./jsonLogsValidator');
const log = require('../../src/util/log');
const { main } = require('../../src/main');

describe('Test aggregate-logging function (logObjects.js)', () => {
    let logSpy;

    beforeEach(() => {
        logSpy = sinon.spy(log, 'info');
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should log project\'s versions', async () => {
        const conf = {
            conf: './test/logObjects/logObjects.conf'
        };
        await main(null, conf);

        const firstMsg = logSpy.getCall(0).firstArg;
        const secondMsg = logSpy.getCall(1).firstArg;
        const thirdMsg = logSpy.getCall(2).firstArg;
        const forthMsg = logSpy.getCall(3).firstArg;
        const fifthMsg = logSpy.getCall(4).firstArg;
        const sixthMsg = logSpy.getCall(5).firstArg;

        assert.include(firstMsg, '------');
        assert.include(secondMsg, 'ACC version');
        assert.include(thirdMsg, 'AS3 core schema version');
        assert.include(forthMsg, 'Shared schema version');
        assert.include(fifthMsg, 'Shared schema package version');
        assert.include(sixthMsg, '------');
    });

    it('should log AS3-recognized objects when requested', async () => {
        const conf = {
            as3Recognized: true,
            conf: './test/logObjects/logObjects.conf'
        };
        await main(null, conf);

        const firstMsg = logSpy.getCall(6).firstArg;
        const secondMsg = logSpy.getCall(7).firstArg;

        assert.include(firstMsg, 'AS3-Recognized');
        assert.include(secondMsg, 'ltm pool');
    });

    it('should log AS3-converted objects when requested', async () => {
        const conf = {
            as3Converted: true,
            conf: './test/logObjects/logObjects.conf'
        };
        await main(null, conf);

        const firstMsg = logSpy.getCall(6).firstArg;
        const secondMsg = logSpy.getCall(7).firstArg;

        assert.include(firstMsg, 'AS3-Converted');
        assert.include(secondMsg, 'ltm pool');
    });

    it('should log AS3-not-converted objects when requested', async () => {
        sinon.stub(customDict['ltm pool'], 'customHandling').throws(new Error('expected'));
        const conf = {
            as3NotConverted: true,
            conf: './test/logObjects/logObjects.conf'
        };
        await main(null, conf);

        const firstMsg = logSpy.getCall(6).firstArg;
        const secondMsg = logSpy.getCall(7).firstArg;

        assert.include(firstMsg, 'AS3-Not-Converted');
        assert.include(secondMsg, 'ltm pool');
    });

    it('should log AS3-not-recognized objects when requested', async () => {
        const conf = {
            as3NotRecognized: true,
            conf: './test/logObjects/logObjects.conf'
        };
        await main(null, conf);

        const firstMsg = logSpy.getCall(6).firstArg;
        const secondMsg = logSpy.getCall(7).firstArg;

        assert.include(firstMsg, 'AS3-Not-Recognized');
        assert.include(secondMsg, 'sys ntp');
    });

    it('should convert to Declarative Onboarding when requested', async () => {
        const conf = {
            declarativeOnboarding: true,
            conf: './test/logObjects/logObjects.conf'
        };
        await main(null, conf);

        const firstMsg = logSpy.getCall(6).firstArg;
        const secondMsg = logSpy.getCall(7).firstArg;

        assert.include(firstMsg, '4 BIG-IP objects detected total');
        assert.include(secondMsg, '1 DO stanzas generated');
    });

    it('should convert to Next when requested', async () => {
        const conf = {
            next: true,
            conf: './test/logObjects/logObjects.conf'
        };
        await main(null, conf);

        const firstMsg = logSpy.getCall(6).firstArg;
        const secondMsg = logSpy.getCall(12).firstArg;

        assert.include(firstMsg, 'AS3 Next conversion enabled');
        assert.include(secondMsg, '2 AS3 Next stanzas generated');
    });

    it('should right recognize --next-not-converted objects', async () => {
        const conf = {
            nextNotConverted: true,
            conf: './test/logObjects/logObjects2.conf'
        };
        await main(null, conf);

        const loggedMsgs = logSpy.getCalls().map((c) => c.firstArg);
        const expectedMsgs = [
            'AS3 Next conversion enabled',
            'AS3-Next-Not-Converted objects',
            'ltm profile ipother',
            'security dos profile',
            'end of AS3-Next-Not-Converted objects',
            '9 BIG-IP objects supported by ACC for AS3 Next',
            '5 AS3 Next stanzas generated'
        ];

        // test relies on msg order
        let i = 0;
        for (let j = 0; j < loggedMsgs.length && i < expectedMsgs.length; j += 1) {
            if (loggedMsgs[j].includes(expectedMsgs[i])) {
                i += 1;
            }
        }

        assert.lengthOf(expectedMsgs, i, 'should log all expected messages');
    });

    it.skip('should include detailed json logs when requested', async () => {
        const conf = {
            next: true,
            jsonLogs: true,
            conf: './test/logObjects/logObjects.conf'
        };
        await main(null, conf);

        const firstMsg = logSpy.getCall(6).firstArg;
        const secondMsg = logSpy.getCall(7).firstArg;
        const thirdMsg = logSpy.getCall(13).firstArg;

        assert.include(firstMsg, 'AS3 Next conversion enabled');
        const result = await JsonValidator(JSON.parse(secondMsg));
        assert.isTrue(result.isValid);
        assert.include(secondMsg, 'path');
        assert.include(secondMsg, 'reason');
        assert.include(secondMsg, 'action');
        assert.include(thirdMsg, '2 AS3 Next stanzas generated');
    });

    it.skip('should include all possible detailed json logs when requested', async () => {
        const conf = {
            next: true,
            jsonLogs: true,
            conf: './test/logObjects/logObjects3.conf'
        };
        await main(null, conf);

        const firstMsg = logSpy.getCall(6).firstArg;
        const secondMsg = logSpy.getCall(7).firstArg;
        const thirdMsg = logSpy.getCall(13).firstArg;

        assert.include(firstMsg, 'AS3 Next conversion enabled');
        const result = await JsonValidator(JSON.parse(secondMsg));
        const parsedJson = JSON.parse(secondMsg);
        const stringFromJson = JSON.stringify(parsedJson);
        if (!stringFromJson.includes('is not an AS3 Core recognized Object')) {
            assert.isTrue(result.isValid);
        }
        assert.include(secondMsg, 'path');
        assert.include(secondMsg, 'reason');
        assert.include(secondMsg, 'action');
        assert.include(secondMsg, 'Path Renaming');
        assert.include(secondMsg, 'RENAME');
        assert.include(secondMsg, 'Matches renamed property path');
        assert.include(secondMsg, 'VALUE_SUBSTRING');
        assert.include(secondMsg, 'VALUE');
        assert.include(secondMsg, 'REMOVE');
        assert.include(thirdMsg, '20 AS3 Next stanzas generated');
    });

    it('should work with difficult config when json logs disabled', async () => {
        const conf = {
            next: true,
            jsonLogs: false,
            conf: './test/logObjects/logObjects3.conf'
        };
        await main(null, conf);

        const firstMsg = logSpy.getCall(6).firstArg;
        const secondMsg = logSpy.getCall(12).firstArg;

        assert.include(firstMsg, 'AS3 Next conversion enabled');
        assert.include(secondMsg, '20 AS3 Next stanzas generated');
    });

    it.skip('should include json logs when requested for classic conversion', async () => {
        const conf = {
            jsonLogs: true,
            next: false,
            conf: './test/logObjects/logObjects4.conf'
        };
        await main(null, conf);

        const firstMsg = logSpy.getCall(4).firstArg;
        const secondMsg = logSpy.getCall(6).firstArg;
        const thirdMsg = logSpy.getCall(10).firstArg;

        assert.include(firstMsg, 'Shared schema package version');
        const result = await JsonValidator(JSON.parse(secondMsg));
        assert.isTrue(result.isValid);
        assert.include(secondMsg, 'path');
        assert.include(secondMsg, 'reason');
        assert.include(secondMsg, 'action');
        assert.include(secondMsg, 'REMOVE');
        assert.include(secondMsg, 'trafficMatchingCriteria');
        assert.include(thirdMsg, '5 AS3 stanzas generated');
    });

    // skip till json logs for removed properties are added to src/util/globalRenameAndSkippedObject.js
    it.skip('should include json logs for removed properties', async () => {
        const conf = {
            jsonLogs: true,
            next: true,
            conf: './test/logObjects/logObjects5.conf'
        };
        await main(null, conf);

        const firstMsg = logSpy.getCall(6).firstArg;
        const secondMsg = logSpy.getCall(7).firstArg;
        const thirdMsg = logSpy.getCall(13).firstArg;

        assert.include(firstMsg, 'AS3 Next conversion enabled');
        const result = await JsonValidator(JSON.parse(secondMsg));
        assert.isTrue(result.isValid);
        assert.include(secondMsg, 'path');
        assert.include(secondMsg, 'reason');
        assert.include(secondMsg, 'action');
        assert.include(secondMsg, 'Regex Filter');
        assert.include(secondMsg, 'REMOVE');
        assert.include(thirdMsg, '2 AS3 Next stanzas generated');
    });

    it.skip('should include json log for "SKIP-TMSH-PROPERTY" action', async () => {
        const conf = {
            jsonLogs: true,
            next: true,
            conf: './test/logObjects/logObjects6.conf'
        };
        await main(null, conf);

        const firstMsg = logSpy.getCall(6).firstArg;
        const secondMsg = logSpy.getCall(7).firstArg;
        const thirdMsg = logSpy.getCall(13).firstArg;

        const expectedSkipRecord = {
            reason: '\'serverssl-use-sni\' of \'ltm virtual\' is not an AS3 Core recognized property',
            tmshHeader: 'ltm virtual /partition1/app1/vs_sys_irule',
            tmshPath: {
                'serverssl-use-sni': null
            },
            action: 'SKIP-TMSH-PROPERTY',
            fix_text: 'Contact F5 Support'
        };
        assert.include(firstMsg, 'AS3 Next conversion enabled');
        const result = await JsonValidator(JSON.parse(secondMsg));
        assert.isTrue(result.isValid);
        assert.deepInclude(JSON.parse(secondMsg), expectedSkipRecord, 'json logs contain SKIP-TMSH-PROPERTY record');
        assert.include(thirdMsg, '2 AS3 Next stanzas generated');
    });
});
