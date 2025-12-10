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

const miscUtils = require('../../../testUtils/misc');
const as3ConvHelper = require('../../../testUtils/as3ConverterHelpers');

describe('AS3 Classic Converter: SSH_Proxy_Profile: security ssh profile', () => {
    it('ssh_proxy_profile', async () => {
        const json = await as3ConvHelper.convertConfigFiles(`${__dirname}/ssh_proxy_profile.conf`);

        const convertedDec = json.AS3_Tenant.AS3_Application.testItem;
        convertedDec.sshProfileAuthInfo[0].proxyClientAuth.privateKey.ciphertext = Buffer.from('This is a CLIENT private key').toString('base64');
        convertedDec.sshProfileAuthInfo[0].proxyServerAuth.privateKey.ciphertext = Buffer.from('This is a SERVER private key').toString('base64');

        return as3ConvHelper.compareAndValidate(
            json,
            await miscUtils.loadJSON(`${__dirname}/ssh_proxy_profile.json`)
        );
    });
});
