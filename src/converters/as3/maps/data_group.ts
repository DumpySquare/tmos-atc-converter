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

/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck - Map files use dynamic property access patterns

import unquote from '../../../utils/unquote';
import GlobalObject from '../../../utils/globalRenameAndSkippedObject';

const dataGroupMap = {

    // Data_Group
    'ltm data-group internal': {
        class: 'Data_Group',

        customHandling: (rootObj: any, loc: any) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj: Record<string, any> = {};

            // don't generate AS3-request/declaration Data_Groups
            if (loc.profile.includes('appsvcs')) return {};

            if (rootObj.records && !rootObj.keyDataType) {
                rootObj.keyDataType = 'string';
                GlobalObject.addProperty(globalPath, 'keyDataType', loc.original, { keyDataType: null });
            }

            // remap data_group records
            if (rootObj.records) {
                rootObj.records = Object.keys(rootObj.records)
                    .map((x, index) => {
                        // eslint-disable-next-line no-useless-escape
                        const keyValue = rootObj.keyDataType === 'integer' ? parseInt(x, 10) : x.replace(/\"/g, '').replace(/\\\\/g, '\\');
                        GlobalObject.addProperty(`${globalPath}/records/${index}`, keyValue.toString(), loc.original, {
                            records: {
                                [index]: {
                                    [keyValue.toString()]: null
                                }
                            }
                        });
                        return {
                            key: keyValue === ' ' ? '\\ ' : keyValue,
                            value: unquote(rootObj.records[x].data || '')
                        };
                    });
            }

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    'ltm data-group external': {
        class: 'Data_Group',

        keyValueRemaps: {
            dataGroupFile: (key: string, val: any) => ({ dataGroupFile: { bigip: val } })

        },

        customHandling: (rootObj: any, loc: any, origObj: any) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj: Record<string, any> = {};
            rootObj.storageType = 'external';
            GlobalObject.addProperty(globalPath, 'storageType', loc.original, { storageType: null });

            // pull extra props from ref'd 'sys file data-group'
            if (rootObj.dataGroupFile) {
                const dgfPath = rootObj.dataGroupFile.bigip;
                const dgFile = origObj[`sys file data-group ${dgfPath}`];

                rootObj.separator = dgFile.separator || ':=';
                GlobalObject.addProperty(globalPath, 'separator', loc.original, { separator: null });

                if (dgFile['source-path']) {
                    rootObj.externalFilePath = dgFile['source-path'];
                    delete rootObj.dataGroupFile;
                    GlobalObject.moveProperty(globalPath, 'dataGroupFile', globalPath, 'externalFilePath');
                }
            }

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    }
};

export default dataGroupMap;
module.exports = dataGroupMap;
