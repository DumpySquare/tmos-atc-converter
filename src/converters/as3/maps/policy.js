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
const handleObjectRef = require('../../../utils/handleObjectRef');
const hyphensToCamel = require('../../../utils/hyphensToCamel');
const unquote = require('../../../utils/unquote');
const { GLOBAL_OBJECT_PATH_SEP } = require('../../../constants');

const toCamelCase = (str) => str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

module.exports = {

    // Endpoint_Policy
    'ltm policy': {
        class: 'Endpoint_Policy',

        keyValueRemaps: {
            strategy: (key, val) => ({ strategy: val.replace('/Common/', '') })
        },

        customHandling: (rootObj, loc) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj = {};

            // rules
            if (rootObj.rules) {
                const tempRules = 'tempRules';
                GlobalObject.addProperty(globalPath, tempRules, loc.original, { rules: null }, []);

                rootObj.rules = Object.keys(rootObj.rules).map((x, ruleIndex) => {
                    const newRule = { name: unquote(x) };
                    const origRule = rootObj.rules[x];

                    const singleRulePath = globalPath.concat(GLOBAL_OBJECT_PATH_SEP, tempRules, `[${ruleIndex}]`);
                    GlobalObject.addProperty(singleRulePath, '', loc.original, { rules: { [x]: null } });

                    // description -> remark
                    if (origRule.description) {
                        newRule.remark = unquote(origRule.description);
                        GlobalObject.addProperty(singleRulePath, 'remark', loc.original, { rules: { [x]: { description: null } } });
                    }

                    // rule conditions
                    if (origRule.conditions) {
                        GlobalObject.addProperty(singleRulePath, 'conditions', loc.original, { rules: { [x]: { conditions: null } } }, []);
                        newRule.conditions = Object.keys(origRule.conditions).map((y, conditionIndex) => {
                            const oldCondition = origRule.conditions[y];
                            const oldKeys = Object.keys(oldCondition);
                            const newCondition = {};

                            const singleConditionPath = singleRulePath.concat(GLOBAL_OBJECT_PATH_SEP, 'conditions', `[${conditionIndex}]`);
                            GlobalObject.addProperty(singleConditionPath, '', loc.original, { rules: { [x]: { conditions: { [y]: null } } } });

                            let eventPath = null;
                            // event
                            if (oldKeys.includes('ssl-server-hello')) {
                                newCondition.event = 'ssl-server-hello';
                                eventPath = { rules: { [x]: { conditions: { [y]: { 'ssl-server-hello': null } } } } };
                            } else if (oldKeys.includes('ssl-client-hello')) {
                                newCondition.event = 'ssl-client-hello';
                                eventPath = { rules: { [x]: { conditions: { [y]: { 'ssl-client-hello': null } } } } };
                            } else newCondition.event = 'request';
                            GlobalObject.addProperty(singleConditionPath, 'event', loc.original, eventPath);

                            // index
                            if (oldCondition.index) {
                                newCondition.index = parseInt(oldCondition.index, 10);
                                GlobalObject.addProperty(singleConditionPath, 'index', loc.original, { rules: { [x]: { conditions: { [y]: { index: null } } } } });
                            }

                            // type
                            const types = ['http-uri', 'http-cookie', 'http-header', 'ssl-extension'];
                            for (let i = 0; i < types.length; i += 1) {
                                const type = types[i];
                                if (oldKeys.includes(type)) {
                                    newCondition.type = toCamelCase(type);
                                    GlobalObject.addProperty(singleConditionPath, 'type', loc.original, { rules: { [x]: { conditions: { [y]: { [type]: null } } } } });
                                }
                            }

                            // normalized
                            if (oldKeys.includes('normalized')) {
                                newCondition.normalized = true;
                                GlobalObject.addProperty(singleConditionPath, 'normalized', loc.original, { rules: { [x]: { conditions: { [y]: { normalized: null } } } } });
                            }

                            // name
                            if (oldCondition.name) {
                                newCondition.name = oldCondition.name;
                                GlobalObject.addProperty(singleConditionPath, 'name', loc.original, { rules: { [x]: { conditions: { [y]: { name: null } } } } });
                            }

                            const operands = ['ends-with', 'starts-with', 'contains', 'equals'];

                            let operand = operands.filter((z) => oldKeys.includes(z))[0] || 'equals';

                            if (oldKeys.includes('not')) {
                                // remove s to convert 'ends-with' to does-not-end-with
                                // and 'contains' to does-not-contain
                                operand = operand.replace(/s-/, '-').replace(/s$/, '');
                                operand = `does-not-${operand}`;
                            }

                            const titles = ['scheme', 'host', 'port', 'path', 'extension', 'query-string', 'server-name',
                                'query-parameter', 'unnamed-query-parameter', 'path-segment', 'npn', 'alpn'];

                            let titleFound = 0;
                            for (let i = 0; i < titles.length; i += 1) {
                                const title = titles[i];
                                if (oldKeys.includes(title)) {
                                    titleFound = 1;
                                    const camelTitle = toCamelCase(title);
                                    newCondition[camelTitle] = {};
                                    if (oldCondition.values) {
                                        if (Array.isArray(oldCondition.values)) {
                                            newCondition[camelTitle].values = oldCondition.values;
                                        } else {
                                            newCondition[camelTitle].values = Object.keys(oldCondition.values);
                                        }
                                    }
                                    if (camelTitle === 'port') {
                                        newCondition[camelTitle].values = oldCondition.values
                                            .map((z) => parseInt(z, 10));
                                    }
                                    newCondition[camelTitle].operand = operand;
                                    GlobalObject.addProperty(
                                        singleConditionPath,
                                        camelTitle,
                                        loc.original,
                                        { rules: { [x]: { conditions: { [y]: { values: null } } } } }
                                    );
                                    const titlePath = singleConditionPath.concat(GLOBAL_OBJECT_PATH_SEP, camelTitle);
                                    if (newCondition[camelTitle].values) {
                                        GlobalObject.addProperty(
                                            titlePath,
                                            'values',
                                            loc.original,
                                            { rules: { [x]: { conditions: { [y]: { values: null } } } } }
                                        );
                                    }
                                    GlobalObject.addProperty(
                                        titlePath,
                                        'operand',
                                        loc.original,
                                        { rules: { [x]: { conditions: { [y]: { [operand]: null } } } } }
                                    );
                                }
                            }
                            if (!titleFound) {
                                newCondition.all = {};
                                GlobalObject.addProperty(
                                    singleConditionPath,
                                    'all',
                                    loc.original,
                                    { rules: { [x]: { conditions: { [y]: { values: null } } } } }
                                );
                                const valuesPath = singleConditionPath.concat(GLOBAL_OBJECT_PATH_SEP, 'all');
                                if (oldCondition.values) {
                                    newCondition.all.values = oldCondition.values;
                                    GlobalObject.addProperty(
                                        valuesPath,
                                        'values',
                                        loc.original,
                                        { rules: { [x]: { conditions: { [y]: { values: null } } } } }
                                    );
                                }
                                newCondition.all.operand = operand;
                                GlobalObject.addProperty(
                                    valuesPath,
                                    'operand',
                                    loc.original,
                                    { rules: { [x]: { conditions: { [y]: { [operand]: null } } } } }
                                );
                            }

                            return newCondition;
                        });
                    }

                    // rule actions
                    if (origRule.actions) {
                        GlobalObject.addProperty(singleRulePath, 'actions', loc.original, { rules: { [x]: { actions: null } } }, []);
                        newRule.actions = Object.keys(origRule.actions).map((y, actionIndex) => {
                            const oldAction = origRule.actions[y];
                            const oldKeys = Object.keys(oldAction);
                            const newAction = {};

                            const singleActionPath = singleRulePath.concat(GLOBAL_OBJECT_PATH_SEP, 'actions', `[${actionIndex}]`);
                            GlobalObject.addProperty(singleActionPath, '', loc.original, { rules: { [x]: { actions: { [y]: null } } } });

                            newAction.event = 'request';
                            GlobalObject.addProperty(singleActionPath, 'event', loc.original, null);

                            // type
                            const typesMap = {
                                'http-uri': toCamelCase('http-uri'),
                                'http-cookie': toCamelCase('http-cookie'),
                                'http-header': toCamelCase('http-header'),
                                http: 'http',
                                forward: 'forward',
                                'server-ssl': 'clientSsl',
                                redirect: 'httpRedirect',
                                shutdown: 'drop',
                                asm: 'waf'
                            };
                            Object.keys(typesMap).forEach((type) => {
                                if (oldKeys.includes(type)) {
                                    newAction.type = typesMap[type];
                                    GlobalObject.addProperty(singleActionPath, 'type', loc.original, { rules: { [x]: { actions: { [y]: { type: null } } } } });
                                }
                            });

                            // enabled
                            if (oldKeys.includes('disable')) newAction.enabled = false;
                            if (oldKeys.includes('enable')) newAction.enabled = true;
                            if (newAction.enabled !== undefined) {
                                GlobalObject.addProperty(singleActionPath, 'enabled', loc.original, { rules: { [x]: { actions: { [y]: { [`${newAction.enabled ? 'enable' : 'disable'}`]: null } } } } });
                            }

                            // location
                            if (oldKeys.includes('location')) {
                                newAction.location = oldAction.location;
                                GlobalObject.addProperty(singleActionPath, 'location', loc.original, { rules: { [x]: { actions: { [y]: { location: null } } } } });
                            }

                            // find and build the title action
                            if (oldKeys.includes('select')) {
                                newAction.select = {};
                                newAction.select.pool = handleObjectRef(oldAction.pool);
                                GlobalObject.addProperty(singleActionPath, 'select', loc.original, { rules: { [x]: { actions: { [y]: { select: null } } } } });
                                GlobalObject.addProperty(singleActionPath.concat(GLOBAL_OBJECT_PATH_SEP, 'select'), 'pool', loc.original, { rules: { [x]: { actions: { [y]: { pool: null } } } } });
                            } else {
                                const titles = ['insert', 'replace', 'remove'];
                                for (let i = 0; i < titles.length; i += 1) {
                                    const title = titles[i];
                                    if (oldKeys.includes(title)) {
                                        newAction[title] = {};
                                        GlobalObject.addProperty(
                                            singleActionPath,
                                            title,
                                            loc.original,
                                            { rules: { [x]: { actions: { [y]: { [title]: null } } } } }
                                        );
                                        const titlePath = singleActionPath.concat(GLOBAL_OBJECT_PATH_SEP, title);
                                        if (oldAction.name) {
                                            newAction[title].name = oldAction.name;
                                            GlobalObject.addProperty(
                                                titlePath,
                                                'name',
                                                loc.original,
                                                { rules: { [x]: { actions: { [y]: { name: null } } } } }
                                            );
                                        }
                                        if (oldAction.value) {
                                            newAction[title].value = oldAction.value;
                                            GlobalObject.addProperty(
                                                titlePath,
                                                'value',
                                                loc.original,
                                                { rules: { [x]: { actions: { [y]: { value: null } } } } }
                                            );
                                        }
                                        if (oldAction['query-string']) {
                                            newAction[title].queryString = oldAction['query-string'];
                                            GlobalObject.addProperty(
                                                titlePath,
                                                'queryString',
                                                loc.original,
                                                { rules: { [x]: { actions: { [y]: { 'query-string': null } } } } }
                                            );
                                        }
                                        if (oldAction.path) {
                                            newAction[title].path = unquote(oldAction.path).replace(/\\/g, '');
                                            GlobalObject.addProperty(
                                                titlePath,
                                                'path',
                                                loc.original,
                                                { rules: { [x]: { actions: { [y]: { path: null } } } } }
                                            );
                                        }
                                    }
                                }
                            }
                            return newAction;
                        });
                    }
                    return newRule;
                });
                GlobalObject.moveAll(globalPath, tempRules, globalPath, 'rules');
            }

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Endpoint_Strategy
    'ltm policy-strategy': {
        class: 'Endpoint_Strategy',

        customHandling: (rootObj, loc) => {
            const newObj = {};

            // operands
            if (rootObj.operands) {
                /**
                 * Operands may look like:
                 * {
                 *    0: {
                 *       operand1: {},
                 *       operand2: {}
                 *    },
                 *    1: {
                 *       operand1: {},
                 *       operand2: {}
                 *    }
                 * }
                 */
                rootObj.operands = Object.values(rootObj.operands)
                    .map(
                        (value) => Object.keys(value)
                            .map(hyphensToCamel)
                            .join(' ')
                    );
            }

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Idle_Timeout_Policy
    'net timer-policy': {
        class: 'Idle_Timeout_Policy',

        customHandling: (rootObj, loc) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj = {};
            const rules = [];

            const tempRules = 'tempRules';
            GlobalObject.addProperty(globalPath, tempRules, loc.original, { rules: null }, []);

            const ruleNames = Object.keys(rootObj.rules);
            for (let i = 0; i < ruleNames.length; i += 1) {
                const rule = ruleNames[i];
                const ruleConf = rootObj.rules[rule];

                const singleRulePath = globalPath.concat(GLOBAL_OBJECT_PATH_SEP, tempRules, `[${i}]`);
                GlobalObject.addProperty(singleRulePath, '', loc.original, { rules: { [rule]: null } });

                const obj = { name: rule };

                if (ruleConf.description) {
                    obj.remark = unquote(ruleConf.description);
                    GlobalObject.addProperty(singleRulePath, 'remark', loc.original, { rules: { [rule]: { description: null } } });
                }

                obj.protocol = ruleConf['ip-protocol'];
                GlobalObject.addProperty(singleRulePath, 'protocol', loc.original, { rules: { [rule]: { 'ip-protocol': null } } });
                obj.idleTimeout = +ruleConf.timers['flow-idle-timeout'].value ? +ruleConf.timers['flow-idle-timeout'].value : 'unspecified';
                GlobalObject.addProperty(singleRulePath, 'idleTimeout', loc.original, { rules: { [rule]: { timers: { 'flow-idle-timeout': null } } } });

                if (ruleConf['destination-ports']) {
                    const ports = Object.keys(ruleConf['destination-ports']);
                    obj.destinationPorts = ports.map((x) => (+x ? +x : 'all-other'));
                    GlobalObject.addProperty(singleRulePath, 'destinationPorts', loc.original, { rules: { [rule]: { 'destination-ports': null } } });
                }

                rules.push(obj);
            }

            GlobalObject.moveAll(globalPath, tempRules, globalPath, 'rules');
            rootObj.rules = rules;
            newObj[loc.profile] = rootObj;
            return newObj;
        }
    }
};
