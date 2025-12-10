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

const as3ConvHelper = require('../../../testUtils/as3ConverterHelpers');

describe('AS3 Classic Converter: SSH_Proxy_Profile: security ssh profile', () => {
    it('firewall_rule_list', async () => {
        const json = await as3ConvHelper.convertConfigFiles(`${__dirname}/firewall_rule_list_autogen.conf`);
        return as3ConvHelper.validate(json);
    });
});
