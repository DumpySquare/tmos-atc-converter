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

const handleObjectRef = require('../../../util/convert/handleObjectRef');

const GlobalObject = require('../../../util/globalRenameAndSkippedObject');

module.exports = {

    // Log_Destination (remote-high-speed-log)
    'sys log-config destination remote-high-speed-log': {
        class: 'Log_Destination',

        keyValueRemaps: {
            pool: (key, val) => ({ pool: handleObjectRef(val) })
        },

        customHandling: (rootObj, loc) => {
            const newObj = {};
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            rootObj.type = 'remote-high-speed-log';

            GlobalObject.addProperty(globalPath, 'type', loc.original, { type: null });
            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Log_Destination (remote-syslog)
    'sys log-config destination remote-syslog': {
        class: 'Log_Destination',

        keyValueRemaps: {
            remoteHighSpeedLog: (key, val) => ({ remoteHighSpeedLog: handleObjectRef(val) })
        },

        customHandling: (rootObj, loc) => {
            const newObj = {};
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            rootObj.type = 'remote-syslog';
            GlobalObject.addProperty(globalPath, 'type', loc.original, { type: null });
            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Log_Publisher
    'sys log-config publisher': {
        class: 'Log_Publisher',

        customHandling: (rootObj, loc) => {
            const newObj = {};
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            rootObj.destinations = rootObj.destinations
                ? Object.keys(rootObj.destinations).map((x) => handleObjectRef(x))
                : [];

            GlobalObject.addProperty(globalPath, 'destinations', loc.original, { destinations: null });
            newObj[loc.profile] = rootObj;
            return newObj;
        }
    }
};
