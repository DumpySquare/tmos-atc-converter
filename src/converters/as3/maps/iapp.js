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

const GlobalObject = require('../../../util/globalRenameAndSkippedObject');

module.exports = {

    // Service Discovery iApps
    'sys application service': {

        // class: 'Service_Discovery_Azure',
        class: 'Pool',

        customHandling: (rootObj, loc) => {
            // Support only service discovery iapp
            if (rootObj.template !== '/Common/f5.service_discovery') return {};
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj = {};
            const members = [];
            const member = {};
            const tags = rootObj.variables;
            const sourceInfo = GlobalObject.getTmshInfoWrapper(globalPath, 'variables');
            const sourcePath = `${globalPath}/variables`;

            // Adding temporary prop for member to group member object props under it
            const tempPropName = 'tempMember';
            GlobalObject.addProperty(globalPath, tempPropName, sourceInfo.tmshHeader, sourceInfo.tmshPath);
            const tempMemberSource = `${globalPath}/${tempPropName}`;

            // tagKey
            if (tags.pool__tag_key) {
                member.tagKey = tags.pool__tag_key.value;
                const propInfo = GlobalObject.getTmshInfoWrapper(`${sourcePath}/pool__tag_key`, 'value');
                GlobalObject.addProperty(tempMemberSource, 'tagKey', propInfo.tmshHeader, propInfo.tmshPath);
            }

            // tagValue
            if (tags.pool__tag_value) {
                member.tagValue = tags.pool__tag_value.value;
                const propInfo = GlobalObject.getTmshInfoWrapper(`${sourcePath}/pool__tag_value`, 'value');
                GlobalObject.addProperty(tempMemberSource, 'tagKey', propInfo.tmshHeader, propInfo.tmshPath);
            }

            // updateInterval
            if (tags.pool__interval) {
                member.updateInterval = parseInt(tags.pool__interval.value, 10);
                const propInfo = GlobalObject.getTmshInfoWrapper(`${sourcePath}/pool__interval`, 'value');
                GlobalObject.addProperty(tempMemberSource, 'updateInterval', propInfo.tmshHeader, propInfo.tmshPath);
            }

            // addressRealm
            if (tags.pool__public_private) {
                member.addressRealm = tags.pool__public_private.value;
                const propInfo = GlobalObject.getTmshInfoWrapper(`${sourcePath}/pool__public_private`, 'value');
                GlobalObject.addProperty(tempMemberSource, 'addressRealm', propInfo.tmshHeader, propInfo.tmshPath);
            }

            // servicePort is required
            if (tags.pool__member_port) {
                member.servicePort = parseInt(tags.pool__member_port.value, 10);
                const propInfo = GlobalObject.getTmshInfoWrapper(`${sourcePath}/pool__member_port`, 'value');
                GlobalObject.addProperty(tempMemberSource, 'servicePort', propInfo.tmshHeader, propInfo.tmshPath);
            } else {
                member.servicePort = 80;
            }

            // addressDiscovery
            if (tags.cloud__cloud_provider) {
                member.addressDiscovery = tags.cloud__cloud_provider.value;
                let propInfo = GlobalObject.getTmshInfoWrapper(`${sourcePath}/cloud__cloud_provider`, 'value');
                GlobalObject.addProperty(tempMemberSource, 'addressDiscovery', propInfo.tmshHeader, propInfo.tmshPath);

                // credentialUpdate
                member.credentialUpdate = false;

                // Azure case
                if (tags.cloud__cloud_provider.value === 'azure') {
                    // resourceGroup is required
                    if (tags.cloud__azure_resource_group) {
                        member.resourceGroup = tags.cloud__azure_resource_group.value;
                        propInfo = GlobalObject.getTmshInfoWrapper(`${sourcePath}/cloud__azure_resource_group`, 'value');
                        GlobalObject.addProperty(tempMemberSource, 'resourceGroup', propInfo.tmshHeader, propInfo.tmshPath);
                    } else {
                        member.resourceGroup = '-';
                    }

                    //  cloud__azure_subscription_id is required
                    if (tags.cloud__azure_subscription_id) {
                        member.subscriptionId = tags.cloud__azure_subscription_id.value;
                        propInfo = GlobalObject.getTmshInfoWrapper(`${sourcePath}/cloud__azure_subscription_id`, 'value');
                        GlobalObject.addProperty(tempMemberSource, 'subscriptionId', propInfo.tmshHeader, propInfo.tmshPath);
                    } else {
                        member.subscriptionId = '-';
                    }

                    // that property is required for directoryId, applicationId and apiAccessKey
                    member.useManagedIdentity = false;

                    // directoryId is required
                    if (tags.cloud__azure_tenant_id) {
                        member.directoryId = tags.cloud__azure_tenant_id.value;
                        propInfo = GlobalObject.getTmshInfoWrapper(`${sourcePath}/cloud__azure_tenant_id`, 'value');
                        GlobalObject.addProperty(tempMemberSource, 'directoryId', propInfo.tmshHeader, propInfo.tmshPath);
                    } else {
                        member.directoryId = '-';
                    }

                    // cloud__azure_client_id is required
                    if (tags.cloud__azure_client_id) {
                        member.applicationId = tags.cloud__azure_client_id.value;
                        propInfo = GlobalObject.getTmshInfoWrapper(`${sourcePath}/cloud__azure_client_id`, 'value');
                        GlobalObject.addProperty(tempMemberSource, 'applicationId', propInfo.tmshHeader, propInfo.tmshPath);
                    } else {
                        member.applicationId = '-';
                    }

                    // apiAccessKey is required
                    if (tags.cloud__azure_sp_secret) {
                        member.apiAccessKey = Buffer.from(tags.cloud__azure_sp_secret.value).toString('base64');
                        propInfo = GlobalObject.getTmshInfoWrapper(`${sourcePath}/cloud__azure_sp_secret`, 'value');
                        GlobalObject.addProperty(tempMemberSource, 'apiAccessKey', propInfo.tmshHeader, propInfo.tmshPath);
                    } else {
                        member.apiAccessKey = '-';
                    }

                // AWS case
                } else if (tags.cloud__cloud_provider.value === 'aws') {
                    // region
                    if (tags.cloud__aws_region) {
                        member.region = tags.cloud__aws_region.value;
                        propInfo = GlobalObject.getTmshInfoWrapper(`${sourcePath}/cloud__aws_region`, 'value');
                        GlobalObject.addProperty(tempMemberSource, 'region', propInfo.tmshHeader, propInfo.tmshPath);
                    }

                    // accessKeyId is required together with secretAccessKey
                    if (tags.cloud__aws_access_key_id && tags.cloud__aws_secret_access_key) {
                        member.accessKeyId = tags.cloud__aws_access_key_id.value;
                        propInfo = GlobalObject.getTmshInfoWrapper(`${sourcePath}/cloud__aws_access_key_id`, 'value');
                        GlobalObject.addProperty(tempMemberSource, 'accessKeyId', propInfo.tmshHeader, propInfo.tmshPath);
                        member.secretAccessKey = Buffer.from(tags.cloud__aws_secret_access_key.value).toString('base64');
                        propInfo = GlobalObject.getTmshInfoWrapper(`${sourcePath}/cloud__aws_secret_access_key`, 'value');
                        GlobalObject.addProperty(tempMemberSource, 'secretAccessKey', propInfo.tmshHeader, propInfo.tmshPath);
                    }

                    // roleARN is required together with externalId
                    if (tags.cloud__aws_role_arn && tags.cloud__aws_external_id) {
                        member.roleARN = tags.cloud__aws_role_arn.value;
                        propInfo = GlobalObject.getTmshInfoWrapper(`${sourcePath}/cloud__aws_role_arn`, 'value');
                        GlobalObject.addProperty(tempMemberSource, 'roleARN', propInfo.tmshHeader, propInfo.tmshPath);
                        member.externalId = tags.cloud__aws_external_id.value;
                        propInfo = GlobalObject.getTmshInfoWrapper(`${sourcePath}/cloud__aws_external_id`, 'value');
                        GlobalObject.addProperty(tempMemberSource, 'externalId', propInfo.tmshHeader, propInfo.tmshPath);
                    }

                // GCE case
                } else if (tags.cloud__cloud_provider.value === 'gce') {
                    // encodedCredentials
                    if (tags.cloud__gce_credentials_json_base64) {
                        member.encodedCredentials = Buffer.from(tags.cloud__gce_credentials_json_base64.value).toString('base64');
                        propInfo = GlobalObject.getTmshInfoWrapper(`${sourcePath}/cloud__gce_credentials_json_base64`, 'value');
                        GlobalObject.addProperty(tempMemberSource, 'encodedCredentials', propInfo.tmshHeader, propInfo.tmshPath);
                    }

                    // region
                    if (tags.cloud__gce_region) {
                        member.region = tags.cloud__gce_region.value;
                        propInfo = GlobalObject.getTmshInfoWrapper(`${sourcePath}/cloud__gce_region`, 'value');
                        GlobalObject.addProperty(tempMemberSource, 'region', propInfo.tmshHeader, propInfo.tmshPath);
                    }
                }
            }

            members.push(member);
            rootObj.members = members;
            GlobalObject.checkAndMoveAllToArray(globalPath, tempPropName, globalPath, 'members', true);

            delete rootObj.variables;
            delete rootObj.template;
            GlobalObject.deleteProperty(globalPath, 'variables', 'RenamedProperty');
            GlobalObject.deleteProperty(globalPath, 'template');
            newObj[loc.profile] = rootObj;
            return newObj;
        }
    }
};
