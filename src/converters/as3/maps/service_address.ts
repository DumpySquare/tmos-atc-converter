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

import enabledToEnable from '../../../utils/enabledToEnable';
import ipUtils from '../../../utils/ipUtils';
import GlobalObject from '../../../utils/globalRenameAndSkippedObject';

const serviceAddressMap = {

    // Service_Address
    'ltm virtual-address': {
        class: 'Service_Address',

        keyValueRemaps: {
            icmpEcho: (key: string, val: any) => ({ icmpEcho: enabledToEnable(val) }),

            routeAdvertisement: (key: string, val: any) => ({ routeAdvertisement: enabledToEnable(val) })
        },

        customHandling: (rootObj: any, loc: any) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj: Record<string, any> = {};
            // netmask
            if (rootObj.netmask && rootObj.netmask !== '255.255.255.255') {
                const cidr = ipUtils.getCidrFromNetmask(rootObj.netmask);
                rootObj.virtualAddress = `${rootObj.virtualAddress}${cidr}`;
            }
            GlobalObject.deleteProperty(globalPath, 'netmask', 'RenamedProperty');
            delete rootObj.netmask;

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    }
};

export default serviceAddressMap;
module.exports = serviceAddressMap;
