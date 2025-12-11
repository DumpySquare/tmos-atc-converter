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

'use strict';

import buildProtectedObj from '../../../utils/buildProtectedObj';
import handleObjectRef from '../../../utils/handleObjectRef';
import returnEmptyObjIfNone from '../../../utils/returnEmptyObjIfNone';
import GlobalObject from '../../../utils/globalRenameAndSkippedObject';

const enforcementMap: Record<string, any> = {

    // Enforcement_Interception_Endpoint
    'pem interception-endpoint': {
        class: 'Enforcement_Interception_Endpoint',

        keyValueRemaps: {
            pool: (key: string, val: any) => ({ pool: handleObjectRef(val) })
        }
    },

    // Enforcement_iRule; the same as iRule
    'pem irule': {
        class: 'Enforcement_iRule',

        customHandling: (rootObj: any, loc: any, file: any) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj: Record<string, any> = {};
            let irule = file[loc.original];
            irule = irule.replace(/\/Common/g, '/Common/Shared');
            rootObj.iRule = { base64: Buffer.from(irule).toString('base64') };
            GlobalObject.addProperty(globalPath, 'iRule', loc.original, { [loc.profile]: null });
            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Enforcement_Diameter_Endpoint_Profile
    'pem profile diameter-endpoint': {
        class: 'Enforcement_Diameter_Endpoint_Profile',

        keyValueRemaps: {
            parentProfile: (key: string, val: any) => ({ parentProfile: handleObjectRef(val) })
        },

        customHandling: (rootObj: any, loc: any) => {
            const newObj: Record<string, any> = {};
            // fatalGraceTime
            if (rootObj.time) {
                rootObj.fatalGraceTime = rootObj.time;
                delete rootObj.time;
            }

            // irrelevant prop
            delete rootObj.enabled;

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Enforcement_Forwarding_Endpoint
    'pem forwarding-endpoint': {
        class: 'Enforcement_Forwarding_Endpoint',

        keyValueRemaps: {
            pool: (key: string, val: any) => ({ pool: handleObjectRef(val) }),

            SNATPool: (key: string, val: any) => ({ SNATPool: handleObjectRef(val) })
        },

        customHandling: (rootObj: any, loc: any) => {
            const newObj: Record<string, any> = {};
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const persistHash = 'persistenceHashSettings';
            const persistVariable = 'persistence';
            // persistenceHashSettings
            if (rootObj.length && rootObj.offset && rootObj.tclScript && rootObj.source === 'tcl-snippet') {
                rootObj.persistenceHashSettings = {
                    length: rootObj.length,
                    offset: rootObj.offset,
                    tclScript: rootObj.tclScript
                };
                GlobalObject.deleteProperty(globalPath, persistHash, 'nestedObjectsReassingment');
                GlobalObject.addProperty(globalPath, persistHash, loc.original, { [persistVariable]: { 'hash-settings': null } });

                delete rootObj.length;
                delete rootObj.offset;
                delete rootObj.tclScript;
                delete rootObj.source;
            }

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Enforcement_Subscriber_Management_Profile
    'pem profile subscriber-mgmt': {
        class: 'Enforcement_Subscriber_Management_Profile',

        keyValueRemaps: {
            parentProfile: (key: string, val: any) => ({ parentProfile: handleObjectRef(val) })
        },

        customHandling: (rootObj: any, loc: any) => {
            const newObj: Record<string, any> = {};

            delete rootObj.enabled;

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Enforcement_Format_Script
    'pem reporting format-script': {
        class: 'Enforcement_Format_Script',

        keyValueRemaps: {
            definition: (key: string, val: any) => ({ definition: `set ${val.set}` })
        }
    },

    // Enforcement_Service_Chain_Endpoint
    'pem service-chain-endpoint': {
        class: 'Enforcement_Service_Chain_Endpoint'
    },

    // Enforcement_Radius_AAA_Profile
    'pem profile radius-aaa': {
        class: 'Enforcement_Radius_AAA_Profile',

        keyValueRemaps: {
            parentProfile: (key: string, val: any) => ({ parentProfile: handleObjectRef(val) }),

            password: (key: string, val: any) => ({ password: buildProtectedObj(val) }),

            sharedSecret: (key: string, val: any) => ({ sharedSecret: buildProtectedObj(val) })
        }
    },

    // Enforcement_Profile
    'pem profile spm': {
        class: 'Enforcement_Profile',

        keyValueRemaps: {
            connectionOptimizationService: (key: string, val: any) => returnEmptyObjIfNone(val, {
                connectionOptimizationService: handleObjectRef(val)
            }),

            parentProfile: (key: string, val: any) => ({ parentProfile: handleObjectRef(val) }),

            policiesGlobalHighPrecedence: (key: string, val: any) => ({
                policiesGlobalHighPrecedence: Object.keys(val).map((x) => handleObjectRef(x))
            }),

            policiesGlobalLowPrecedence: (key: string, val: any) => ({
                policiesGlobalLowPrecedence: Object.keys(val).map((x) => handleObjectRef(x))
            }),

            policiesUnknownSubscribers: (key: string, val: any) => ({
                policiesUnknownSubscribers: Object.keys(val).map((x) => handleObjectRef(x))
            })
        }
    },

    // Enforcement_Policy
    'pem policy': {
        class: 'Enforcement_Policy',

        customHandling: (rootObj: any, loc: any) => {
            const newObj: Record<string, any> = {};
            const rules = rootObj.rules;
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const rulesProperty = 'rules';
            if (rules) {
                rootObj.rules = Object.keys(rootObj.rules).map((x, index) => {
                    const origRule = rootObj.rules[x];
                    const ruleObj: Record<string, any> = { name: x };
                    const rulesPath = `${globalPath}/${rulesProperty}/${index}`;

                    if (origRule['gate-status']) {
                        ruleObj.gateStatusEnabled = origRule['gate-status'] === 'enabled';
                        GlobalObject.addProperty(rulesPath, 'gateStatusEnabled', loc.original, { [rulesProperty]: { [x]: { 'gate-status': null } } });
                    }
                    if (origRule.precedence) {
                        ruleObj.precedence = parseInt(origRule.precedence, 10);
                        GlobalObject.addProperty(rulesPath, 'precedence', loc.original, { [rulesProperty]: { [x]: { precedence: null } } });
                    }
                    if (origRule['dscp-marking-downlink']) {
                        ruleObj.dscpMarkingDownlink = parseInt(origRule['dscp-marking-downlink'], 10);
                        GlobalObject.addProperty(rulesPath, 'dscpMarkingDownlink', loc.original, { [rulesProperty]: { [x]: { 'dscp-marking-downlink': null } } });
                    }
                    if (origRule['dscp-marking-uplink']) {
                        ruleObj.dscpMarkingUplink = parseInt(origRule['dscp-marking-uplink'], 10);
                        GlobalObject.addProperty(rulesPath, 'dscpMarkingUplink', loc.original, { [rulesProperty]: { [x]: { 'dscp-marking-uplink': null } } });
                    }
                    if (origRule['l2-marking-downlink']) {
                        ruleObj.l2MarkingDownlink = parseInt(origRule['l2-marking-downlink'], 10);
                        GlobalObject.addProperty(rulesPath, 'l2MarkingDownlink', loc.original, { [rulesProperty]: { [x]: { 'l2-marking-downlink': null } } });
                    }
                    if (origRule['l2-marking-uplink']) {
                        ruleObj.l2MarkingUplink = parseInt(origRule['l2-marking-uplink'], 10);
                        GlobalObject.addProperty(rulesPath, 'l2MarkingUplink', loc.original, { [rulesProperty]: { [x]: { 'l2-marking-uplink': null } } });
                    }
                    if (origRule['tcp-analytics-enable']) {
                        ruleObj.tcpAnalyticsEnabled = origRule['tcp-analytics-enable'] === 'enabled';
                        GlobalObject.addProperty(rulesPath, 'tcpAnalyticsEnabled', loc.original, { [rulesProperty]: { [x]: { 'tcp-analytics-enable': null } } });
                    }

                    if (origRule['service-chain']) {
                        ruleObj.serviceChain = handleObjectRef(origRule['service-chain']);
                        GlobalObject.addProperty(rulesPath, 'serviceChain', loc.original, { [rulesProperty]: { [x]: { 'service-chain': null } } });
                    }
                    if (origRule.intercept) {
                        ruleObj.interceptionEndpoint = handleObjectRef(origRule.intercept);
                        GlobalObject.addProperty(rulesPath, 'interceptionEndpoint', loc.original, { [rulesProperty]: { [x]: { intercept: null } } });
                    }
                    if (origRule['tcp-optimization-downlink']) {
                        ruleObj.tcpOptimizationDownlink = handleObjectRef(origRule['tcp-optimization-downlink']);
                        GlobalObject.addProperty(rulesPath, 'tcpOptimizationDownlink', loc.original, { [rulesProperty]: { [x]: { 'tcp-optimization-downlink': null } } });
                    }
                    if (origRule['tcp-optimization-uplink']) {
                        ruleObj.tcpOptimizationUplink = handleObjectRef(origRule['tcp-optimization-uplink']);
                        GlobalObject.addProperty(rulesPath, 'tcpOptimizationUplink', loc.original, { [rulesProperty]: { [x]: { 'tcp-optimization-uplink': null } } });
                    }
                    const classFilter = origRule['classification-filters'];
                    if (classFilter) {
                        ruleObj.classificationFilters = Object.keys(classFilter).map((y) => ({
                            name: y,
                            application: handleObjectRef(classFilter[y].application),
                            invertMatch: classFilter[y].operation === 'nomatch'
                        }));
                        Object.keys(origRule['classification-filters']).forEach((y, classFilterIndex) => {
                            GlobalObject.addProperty(`${rulesPath}/classificationFilter/${classFilterIndex}`, 'name', loc.original, { [rulesProperty]: { [x]: { 'classification-filters': { [y]: { name: null } } } } });
                            GlobalObject.addProperty(`${rulesPath}/classificationFilter/${classFilterIndex}`, 'application', loc.original, { [rulesProperty]: { [x]: { 'classification-filters': { [y]: { application: null } } } } });
                            GlobalObject.addProperty(`${rulesPath}/classificationFilter/${classFilterIndex}`, 'invertMatch', loc.original, { [rulesProperty]: { [x]: { 'classification-filters': { [y]: { operation: null } } } } });
                        });
                    }

                    if (origRule['flow-info-filters']) {
                        ruleObj.flowInfoFilters = Object.keys(origRule['flow-info-filters']).map((y, flowFilterIndex) => {
                            const flowObj: Record<string, any> = { name: y };
                            GlobalObject.addProperty(`${rulesPath}/flowInfoFilters/${flowFilterIndex}`, 'name', loc.original, { [rulesProperty]: { [x]: { 'flow-info-filters': { [y]: { name: null } } } } });
                            const flow = origRule['flow-info-filters'][y];
                            if (flow.operation === 'nomatch') {
                                flowObj.invertMatch = true;
                                GlobalObject.addProperty(`${rulesPath}/flowInfoFilters/${flowFilterIndex}`, 'invertMatch', loc.original, { [rulesProperty]: { [x]: { 'flow-info-filters': { [y]: { operation: null } } } } });
                            }
                            if (flow['dscp-code']) {
                                flowObj.dscpMarking = parseInt(flow['dscp-code'], 10);
                                GlobalObject.addProperty(`${rulesPath}/flowInfoFilters/${flowFilterIndex}`, 'dscpMarking', loc.original, { [rulesProperty]: { [x]: { 'flow-info-filters': { [y]: { 'dscp-code': null } } } } });
                            }
                            if (flow['dst-ip-addr']) {
                                flowObj.destinationAddress = flow['dst-ip-addr'].split('/')[0];
                                GlobalObject.addProperty(`${rulesPath}/flowInfoFilters/${flowFilterIndex}`, 'destinationAddress', loc.original, { [rulesProperty]: { [x]: { 'flow-info-filters': { [y]: { 'dst-ip-addr': null } } } } });
                            }
                            if (flow['dst-port']) {
                                flowObj.destinationPort = parseInt(flow['dst-port'], 10);
                                GlobalObject.addProperty(`${rulesPath}/flowInfoFilters/${flowFilterIndex}`, 'destinationPort', loc.original, { [rulesProperty]: { [x]: { 'flow-info-filters': { [y]: { 'dst-port': null } } } } });
                            }
                            if (flow['ip-addr-type']) {
                                flowObj.ipAddressType = flow['ip-addr-type'].toLowerCase();
                                GlobalObject.addProperty(`${rulesPath}/flowInfoFilters/${flowFilterIndex}`, 'ipAddressType', loc.original, { [rulesProperty]: { [x]: { 'flow-info-filters': { [y]: { 'ip-addr-type': null } } } } });
                            }
                            if (flow.proto) {
                                flowObj.protocol = flow.proto;
                                GlobalObject.addProperty(`${rulesPath}/flowInfoFilters/${flowFilterIndex}`, 'protocol', loc.original, { [rulesProperty]: { [x]: { 'flow-info-filters': { [y]: { proto: null } } } } });
                            }
                            if (flow['src-ip-addr']) {
                                flowObj.sourceAddress = flow['src-ip-addr'].split('/')[0];
                                GlobalObject.addProperty(`${rulesPath}/flowInfoFilters/${flowFilterIndex}`, 'sourceAddress', loc.original, { [rulesProperty]: { [x]: { 'flow-info-filters': { [y]: { 'src-ip-addr': null } } } } });
                            }
                            if (flow['src-port']) {
                                flowObj.sourcePort = parseInt(flow['src-port'], 10);
                                GlobalObject.addProperty(`${rulesPath}/flowInfoFilters/${flowFilterIndex}`, 'sourcePort', loc.original, { [rulesProperty]: { [x]: { 'flow-info-filters': { [y]: { 'src-port': null } } } } });
                            }
                            return flowObj;
                        });
                    }

                    const forwarding = origRule.forwarding;
                    if (forwarding) {
                        const forward: Record<string, any> = {};
                        if (forwarding['fallback-action']) {
                            forward.fallbackAction = forwarding['fallback-action'];
                            GlobalObject.addProperty(`${rulesPath}/forwarding`, 'fallbackAction', loc.original, { [rulesProperty]: { [x]: { forwarding: { 'fallback-action': null } } } });
                        }
                        if (forwarding.type) {
                            forward.type = forwarding.type;
                            GlobalObject.addProperty(`${rulesPath}/forwarding`, 'type', loc.original, { [rulesProperty]: { [x]: { forwarding: { type: null } } } });
                        }
                        ruleObj.forwarding = forward;
                    }

                    const insertCont = origRule['insert-content'];
                    if (insertCont) {
                        const insert: Record<string, any> = {};
                        if (insertCont.duration) {
                            insert.duration = parseInt(insertCont.duration, 10);
                            GlobalObject.addProperty(`${rulesPath}/insertContent`, 'duration', loc.original, { [rulesProperty]: { [x]: { 'insert-content': { duration: null } } } });
                        }
                        if (insertCont.frequency) {
                            insert.frequency = insertCont.frequency;
                            GlobalObject.addProperty(`${rulesPath}/insertContent`, 'frequency', loc.original, { [rulesProperty]: { [x]: { 'insert-content': { frequency: null } } } });
                        }
                        if (insertCont['tag-name']) {
                            insert.tagName = insertCont['tag-name'];
                            GlobalObject.addProperty(`${rulesPath}/insertContent`, 'tagName', loc.original, { [rulesProperty]: { [x]: { 'insert-content': { 'tag-name': null } } } });
                        }
                        if (insertCont.position) {
                            insert.position = insertCont.position;
                            GlobalObject.addProperty(`${rulesPath}/insertContent`, 'position', loc.original, { [rulesProperty]: { [x]: { 'insert-content': { position: null } } } });
                        }
                        if (insertCont['value-content']) {
                            insert.valueContent = insertCont['value-content'];
                            GlobalObject.addProperty(`${rulesPath}/insertContent`, 'valueContent', loc.original, { [rulesProperty]: { [x]: { 'insert-content': { 'value-content': null } } } });
                        }
                        if (insertCont['value-type']) {
                            insert.valueType = insertCont['value-type'];
                            GlobalObject.addProperty(`${rulesPath}/insertContent`, 'valueType', loc.original, { [rulesProperty]: { [x]: { 'insert-content': { 'value-type': null } } } });
                        }
                        if (Object.keys(insert).length > 1) ruleObj.insertContent = insert;
                    }

                    // modifyHttpHeader
                    const modify = origRule['modify-http-hdr'];
                    if (modify) {
                        const mod: Record<string, any> = {};
                        if (modify.name) {
                            mod.headerName = modify.name;
                            GlobalObject.addProperty(`${rulesPath}/modifyHttpHeader`, 'headerName', loc.original, { [rulesProperty]: { [x]: { 'modify-http-hdr': { name: null } } } });
                        }
                        if (modify.operation) {
                            mod.operation = modify.operation;
                            GlobalObject.addProperty(`${rulesPath}/modifyHttpHeader`, 'operation', loc.original, { [rulesProperty]: { [x]: { 'modify-http-hdr': { operation: null } } } });
                        }
                        if (modify['value-content']) {
                            mod.valueContent = modify['value-content'];
                            GlobalObject.addProperty(`${rulesPath}/modifyHttpHeader`, 'valueContent', loc.original, { [rulesProperty]: { [x]: { 'modify-http-hdr': { 'value-content': null } } } });
                        }
                        if (modify['value-type']) {
                            mod.valueType = modify['value-type'];
                            GlobalObject.addProperty(`${rulesPath}/modifyHttpHeader`, 'valueType', loc.original, { [rulesProperty]: { [x]: { 'modify-http-hdr': { 'value-type': null } } } });
                        }
                        ruleObj.modifyHttpHeader = mod;
                    }

                    // qoeReporting
                    const qoe = origRule['qoe-reporting'];
                    if (qoe) {
                        const hsl = qoe.dest.hsl;
                        const qoeReprt: Record<string, any> = {};
                        if (hsl['format-script']) {
                            qoeReprt.formatScript = handleObjectRef(hsl['format-script']);
                            GlobalObject.addProperty(`${rulesPath}/qoeReporting`, 'formatScript', loc.original, { [rulesProperty]: { [x]: { 'qoe-reporting': { dest: { hsl: { 'format-script': null } } } } } });
                        }
                        if (hsl.publisher) {
                            qoeReprt.highSpeedLogPublisher = handleObjectRef(hsl.publisher);
                            GlobalObject.addProperty(`${rulesPath}/qoeReporting`, 'highSpeedLogPublisher', loc.original, { [rulesProperty]: { [x]: { 'qoe-reporting': { dest: { hsl: { publisher: null } } } } } });
                        }
                        ruleObj.qoeReporting = qoeReprt;
                    }

                    // quota
                    if (origRule.quota) {
                        ruleObj.quota = { reportingLevel: origRule.quota['reporting-level'] };
                        GlobalObject.addProperty(`${rulesPath}/quota`, 'reportingLevel', loc.original, { [rulesProperty]: { [x]: { quota: { 'reporting-level': null } } } });
                    }

                    // qosBandwidthControllerDownlink
                    if (origRule['qos-rate-pir-downlink']) {
                        const qosSplit = origRule['qos-rate-pir-downlink'].split('->');
                        ruleObj.qosBandwidthControllerDownlink = {
                            category: qosSplit[1],
                            policy: handleObjectRef(qosSplit[0])
                        };
                        GlobalObject.addProperty(rulesPath, 'qosBandwidthControllerDownlink', loc.original, { [rulesProperty]: { [x]: { 'qos-rate-pir-downlink': null } } });
                    }

                    if (origRule['qos-rate-pir-uplink']) {
                        const qosSplit = origRule['qos-rate-pir-uplink'].split('->');
                        ruleObj.qosBandwidthControllerUplink = {
                            category: qosSplit[1],
                            policy: handleObjectRef(qosSplit[0])
                        };
                        GlobalObject.addProperty(rulesPath, 'qosBandwidthControllerUplink', loc.original, { [rulesProperty]: { [x]: { 'qos-rate-pir-uplink': null } } });
                    }

                    // ranCongestion
                    const ranCongest = origRule['ran-congestion'];
                    if (ranCongest) {
                        const ran: Record<string, any> = {};
                        if (ranCongest['lowerthreshold-bw']) {
                            ran.threshold = parseInt(ranCongest['lowerthreshold-bw'], 10);
                            GlobalObject.addProperty(`${rulesPath}/ranCongestion`, 'threshold', loc.original, { [rulesProperty]: { [x]: { 'ran-congestion': { 'lowerthreshold-bw': null } } } });
                        }

                        if (ranCongest.report && ranCongest.report.dest && ranCongest.report.dest.hsl) {
                            const dest: Record<string, any> = {};
                            if (ranCongest.report.dest.hsl['format-script']) {
                                dest.formatScript = handleObjectRef(ranCongest.report.dest.hsl['format-script']);
                            }
                            if (ranCongest.report.dest.hsl.publisher) {
                                dest.highSpeedLogPublisher = handleObjectRef(ranCongest.report.dest.hsl.publisher);
                            }
                            ran.reportDestinationHsl = dest;
                            GlobalObject.addProperty(`${rulesPath}/ranCongestion`, 'reportDestinationHsl', loc.original, { [rulesProperty]: { [x]: { 'ran-congestion': { report: null } } } });
                        }
                        ruleObj.ranCongestion = ran;
                    }

                    // usageReporting
                    const usage = origRule.reporting;
                    if (usage) {
                        let obj: Record<string, any> = {};

                        if (usage.dest) {
                            const destKeys = Object.keys(usage.dest).map((y) => {
                                const dest = usage.dest[y];
                                const destObj: Record<string, any> = { destination: y };
                                GlobalObject.addProperty(`${rulesPath}/usageReporting`, 'destination', loc.original, { [rulesProperty]: { [x]: { reporting: { dest: null } } } });
                                if (dest['application-reporting']) {
                                    destObj.applicationReportingEnabled = dest['application-reporting'] === 'enabled';
                                    GlobalObject.addProperty(`${rulesPath}/usageReporting`, 'applicationReportingEnabled', loc.original, { [rulesProperty]: { [x]: { reporting: { dest: { gx: { 'application-reporting': null } } } } } });
                                }
                                if (dest['monitoring-key']) {
                                    destObj.monitoringKey = dest['monitoring-key'];
                                    GlobalObject.addProperty(`${rulesPath}/usageReporting`, 'monitoringKey', loc.original, { [rulesProperty]: { [x]: { reporting: { dest: { gx: { 'monitoring-key': null } } } } } });
                                }
                                return destObj;
                            });
                            obj = Object.assign(destKeys[0], obj);
                        }

                        if (usage.volume) {
                            const vol: Record<string, any> = {};
                            if (usage.volume.downlink) {
                                vol.downlink = parseInt(usage.volume.downlink, 10);
                                GlobalObject.addProperty(`${rulesPath}/usageReporting/volume`, 'downlink', loc.original, { [rulesProperty]: { [x]: { reporting: { volume: { downlink: null } } } } });
                            }
                            if (usage.volume.total) {
                                vol.total = parseInt(usage.volume.total, 10);
                                GlobalObject.addProperty(`${rulesPath}/usageReporting/volume`, 'total', loc.original, { [rulesProperty]: { [x]: { reporting: { volume: { total: null } } } } });
                            }
                            if (usage.volume.uplink) {
                                vol.uplink = parseInt(usage.volume.uplink, 10);
                                GlobalObject.addProperty(`${rulesPath}/usageReporting/volume`, 'uplink', loc.original, { [rulesProperty]: { [x]: { reporting: { volume: { uplink: null } } } } });
                            }
                            obj.volume = vol;
                        }

                        ruleObj.usageReporting = obj;
                    }

                    // urlCategorizationFilters
                    const urlFilter = origRule['url-categorization-filters'];
                    if (urlFilter) {
                        ruleObj.urlCategorizationFilters = Object.keys(urlFilter).map((y, urlFilterIndex) => {
                            const obj = urlFilter[y];
                            GlobalObject.addProperty(`${rulesPath}/urlCategorizationFilters/${urlFilterIndex}`, 'name', loc.original, { [rulesProperty]: { [x]: { 'url-categorization-filters': { [y]: { name: null } } } } });
                            GlobalObject.addProperty(`${rulesPath}/urlCategorizationFilters/${urlFilterIndex}`, 'category', loc.original, { [rulesProperty]: { [x]: { 'url-categorization-filters': { [y]: { category: null } } } } });
                            GlobalObject.addProperty(`${rulesPath}/urlCategorizationFilters/${urlFilterIndex}`, 'invertMatch', loc.original, { [rulesProperty]: { [x]: { 'url-categorization-filters': { [y]: { operation: null } } } } });
                            return {
                                name: y,
                                category: handleObjectRef(obj['url-category']),
                                invertMatch: obj.operation === 'nomatch'
                            };
                        });
                    }

                    // DTOSTethering
                    const tether = origRule['dtos-tethering'];
                    if (tether) {
                        const obj: Record<string, any> = {};
                        if (tether['dtos-detect']) {
                            obj.detectDtos = tether['dtos-detect'] === 'enabled';
                            GlobalObject.addProperty(`${rulesPath}/DTOSTethering`, 'detectDtos', loc.original, { [rulesProperty]: { [x]: { 'dtos-tethering': { 'dtos-detect': null } } } });
                        }
                        if (tether['tethering-detect']) {
                            obj.detectTethering = tether['tethering-detect'] === 'enabled';
                            GlobalObject.addProperty(`${rulesPath}/DTOSTethering`, 'detectTethering', loc.original, { [rulesProperty]: { [x]: { 'dtos-tethering': { 'tethering-detect': null } } } });
                        }

                        if (tether.report && tether.report.dest && tether.report.dest.hsl) {
                            const dest: Record<string, any> = {};
                            if (tether.report.dest.hsl['format-script']) {
                                dest.formatScript = handleObjectRef(tether.report.dest.hsl['format-script']);
                            }
                            if (tether.report.dest.hsl.publisher) {
                                dest.highSpeedLogPublisher = handleObjectRef(tether.report.dest.hsl.publisher);
                            }
                            obj.reportDestinationHsl = dest;
                            GlobalObject.addProperty(`${rulesPath}/DTOSTethering`, 'reportDestinationHsl', loc.original, { [rulesProperty]: { [x]: { 'dtos-tethering': { report: null } } } });
                        }
                        ruleObj.DTOSTethering = obj;
                    }

                    return ruleObj;
                });
            }

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Enforcement_Listener
    'pem listener': {
        class: 'Enforcement_Listener',

        keyValueRemaps: {
            enforcementProfile: (key: string, val: any) => ({ enforcementProfile: handleObjectRef(val) }),

            services: (key: string, val: any) => ({ services: Object.keys(val).map((x) => handleObjectRef(x)) })
        }
    }
};

export default enforcementMap;
module.exports = enforcementMap;
