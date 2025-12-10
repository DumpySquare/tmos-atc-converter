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

const GlobalObject = require('../../../utils/globalRenameAndSkippedObject');

module.exports = {

    // iRule
    'ltm rule': {
        class: 'iRule',

        customHandling: (rootObj, loc, file) => {
            const newObj = {};
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            let irule = file[loc.original];
            // That RegEx replaces all occurrences of /Common/ - either partition name either something else,
            // so it may break iRule or may introduce unexpected behaviors if any other thing will have such name.
            irule = irule.replace(/\/Common\//g, '/Common/Shared/');
            rootObj.iRule = { base64: Buffer.from(irule).toString('base64') };
            GlobalObject.addProperty(globalPath, 'iRule', loc.original, { iRule: null });
            newObj[loc.profile] = rootObj;
            return newObj;
        }
    }
};
