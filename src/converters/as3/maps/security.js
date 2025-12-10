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

const buildProtectedObj = require('../../../utils/buildProtectedObj');
const handleObjectRef = require('../../../utils/handleObjectRef');
const hyphensToCamel = require('../../../utils/hyphensToCamel');
const ipUtils = require('../../../utils/ipUtils');
const returnEmptyObjIfNone = require('../../../utils/returnEmptyObjIfNone');
const unquote = require('../../../utils/unquote');
const GlobalObject = require('../../../utils/globalRenameAndSkippedObject');

const reparse = (str) => str.replace(/{/g, '').replace(/}/g, '')
    .split('"')
    .map((x) => x.trim())
    .filter((x) => x);

module.exports = {

    // DOS_Profile
    'security dos profile': {
        class: 'DOS_Profile',

        keyValueRemaps: {
            applicationAllowlist: (key, val) => {
                if (val === 'none') return {};
                return { applicationAllowlist: handleObjectRef(val) };
            },

            allowlist: (key, val) => returnEmptyObjIfNone(val, { allowlist: handleObjectRef(val) })
        },

        customHandling: (rootObj, loc) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj = {};

            // application
            if (rootObj.application) {
                const appKeys = Object.keys(rootObj.application);
                const app = rootObj.application[appKeys[0]];
                const newApp = {};

                if (app['single-page-application']) {
                    newApp.singlePageApplicationEnabled = app['single-page-application'] === 'enabled';
                    GlobalObject.addProperty(globalPath, 'singlePageApplicationEnabled', loc.original, { 'single-page-application': null });
                }
                if (app['rtbh-duration-sec'] && app['rtbh-enable'] === 'enabled') {
                    newApp.remoteTriggeredBlackHoleDuration = parseInt(app['rtbh-duration-sec'], 10);
                    GlobalObject.addProperty(globalPath, 'remoteTriggeredBlackHoleDuration', loc.original, { 'rtbh-duration-sec': null });
                }
                if (app['scrubbing-duration-sec'] && app['scrubbing-enable'] === 'enabled') {
                    newApp.scrubbingDuration = parseInt(app['scrubbing-duration-sec'], 10);
                    GlobalObject.addProperty(globalPath, 'scrubbingDuration', loc.original, { 'scrubbing-duration-sec': null });
                }

                if (app['fastl4-acceleration-profile']) {
                    newApp.profileAcceleration = handleObjectRef(app['fastl4-acceleration-profile']);
                    GlobalObject.addProperty(globalPath, 'profileAcceleration', loc.original, { 'fastl4-acceleration-profile': null });
                }

                if (app['trigger-irule']) {
                    newApp.triggerIRule = app['trigger-irule'] === 'enabled';
                    GlobalObject.addProperty(globalPath, 'triggerIRule', loc.original, { 'trigger-irule': null });
                }

                // geolocations
                if (app.geolocations) {
                    newApp.denylistedGeolocations = [];
                    newApp.allowlistedGeolocations = [];
                    const geoKeys = Object.keys(app.geolocations);
                    GlobalObject.addProperty(globalPath, 'allowlistedGeolocations', loc.original, { 'white-listed': null });
                    GlobalObject.addProperty(globalPath, 'denylistedGeolocations', loc.original, { 'black-listed': null });
                    for (let i = 0; i < geoKeys.length; i += 1) {
                        const key = geoKeys[i];
                        const subKeys = Object.keys(app.geolocations[key]);
                        if (subKeys.includes('white-listed')) {
                            newApp.allowlistedGeolocations.push(unquote(key));
                        } else {
                            newApp.denylistedGeolocations.push(unquote(key));
                        }
                    }
                }

                // botDefense
                const botDefense = app['bot-defense'];
                if (botDefense) {
                    const botDef = {};
                    GlobalObject.addProperty(globalPath, 'botDefense', loc.original, { 'bot-defense': null });
                    if (botDefense['cross-domain-requests']) {
                        botDef.crossDomainRequests = botDefense['cross-domain-requests'];
                        GlobalObject.addProperty(`${globalPath}/botDefense`, 'crossDomainRequests', loc.original, {
                            'bot-defense': {
                                'cross-domain-requests': null
                            }
                        });
                    }
                    if (botDefense['external-domains']) {
                        botDef.externalDomains = botDefense['external-domains'];
                        GlobalObject.addProperty(`${globalPath}/botDefense`, 'externalDomains', loc.original, {
                            'bot-defense': {
                                'external-domains': null
                            }
                        });
                    }
                    if (botDefense['grace-period']) {
                        botDef.gracePeriod = parseInt(botDefense['grace-period'], 10);
                        GlobalObject.addProperty(`${globalPath}/botDefense`, 'gracePeriod', loc.original, {
                            'bot-defense': {
                                'grace-period': null
                            }
                        });
                    }
                    if (botDefense.mode) botDef.mode = botDefense.mode;
                    if (botDefense['site-domains']) {
                        botDef.siteDomains = botDefense['site-domains'];
                        GlobalObject.addProperty(`${globalPath}/botDefense`, 'siteDomains', loc.original, {
                            'bot-defense': {
                                'site-domains': null
                            }
                        });
                    }
                    if (botDefense['url-whitelist']) {
                        botDef.urlAllowlist = botDefense['url-whitelist'];
                        GlobalObject.addProperty(`${globalPath}/botDefense`, 'urlAllowlist', loc.original, {
                            'bot-defense': {
                                'url-whitelist': null
                            }
                        });
                    }
                    if (botDefense['browser-legit-captcha']) {
                        botDef.issueCaptchaChallenge = botDefense['browser-legit-captcha'] === 'enabled';
                        GlobalObject.addProperty(`${globalPath}/botDefense`, 'issueCaptchaChallenge', loc.original, {
                            'bot-defense': {
                                'browser-legit-captcha': null
                            }
                        });
                    }
                    newApp.botDefense = botDef;
                }

                // botSignatures
                const botSignatures = app['bot-signatures'];
                if (botSignatures) {
                    const botSig = {};
                    GlobalObject.addProperty(globalPath, 'botSignatures', loc.original, { 'bot-signatures': null });
                    if (botSignatures.check) {
                        botSig.checkingEnabled = botSignatures.check === 'enabled';
                        GlobalObject.addProperty(`${globalPath}/botSignatures`, 'checkingEnabled', loc.original, {
                            'bot-signatures': {
                                check: null
                            }
                        });
                    }

                    if (botSignatures['disabled-signatures']) {
                        botSig.disabledSignatures = Object.keys(botSignatures['disabled-signatures'])
                            .map((x) => ({ bigip: unquote(x) }));
                        GlobalObject.addProperty(`${globalPath}/botSignatures`, 'disabledSignatures', loc.original, {
                            'bot-signatures': {
                                'disabled-signatures': null
                            }
                        });
                    }

                    // categories
                    if (botSignatures.categories) {
                        const catKeys = Object.keys(botSignatures.categories);
                        const blocked = [];
                        const reported = [];
                        GlobalObject.addProperty(`${globalPath}/botSignatures`, 'blockedCategories', loc.original, {
                            'bot-signatures': {
                                blockedCategories: null
                            }
                        });
                        GlobalObject.addProperty(`${globalPath}/botSignatures`, 'reportedCategories', loc.original, {
                            'bot-signatures': {
                                reportedCategories: null
                            }
                        });
                        for (let i = 0; i < catKeys.length; i += 1) {
                            if (botSignatures.categories[catKeys[i]].action === 'block') {
                                blocked.push({ bigip: unquote(catKeys[i]) });
                            }
                            if (botSignatures.categories[catKeys[i]].action === 'report') {
                                reported.push({ bigip: unquote(catKeys[i]) });
                            }
                        }
                        if (blocked.length) botSig.blockedCategories = blocked;
                        if (reported.length) botSig.reportedCategories = reported;
                    }

                    newApp.botSignatures = botSig;
                }

                // captcha-response
                const captchaRes = app['captcha-response'];
                if (captchaRes) {
                    GlobalObject.addProperty(globalPath, 'captchaResponse', loc.original, { 'captcha-response': null });
                    newApp.captchaResponse = {
                        failure: unquote(captchaRes.failure.body),
                        first: unquote(captchaRes.first.body)
                    };
                }

                // heavy-urls
                const heavy = app['heavy-urls'];
                if (heavy) {
                    const heavyURL = {};
                    GlobalObject.addProperty(globalPath, 'heavyURLProtection', loc.original, { 'heavy-urls': null });
                    if (heavy.exclude) {
                        heavyURL.excludeList = heavy.exclude;
                        GlobalObject.addProperty(`${globalPath}/heavyURLProtection`, 'excludeList', loc.original, {
                            'heavy-urls': {
                                exclude: null
                            }
                        });
                    }
                    if (heavy['latency-threshold']) {
                        heavyURL.detectionThreshold = parseInt(heavy['latency-threshold'], 10);
                        GlobalObject.addProperty(`${globalPath}/heavyURLProtection`, 'detectionThreshold', loc.original, {
                            'heavy-urls': {
                                'latency-threshold': null
                            }
                        });
                    }
                    if (heavy['include-list']) {
                        heavyURL.protectList = Object.keys(heavy['include-list'])
                            .map((x) => ({ url: heavy['include-list'][x].url, threshold: parseInt(x, 10) }));
                        GlobalObject.addProperty(`${globalPath}/heavyURLProtection`, 'protectList', loc.original, {
                            'heavy-urls': {
                                'include-list': null
                            }
                        });
                    }
                    if (heavy['automatic-detection']) {
                        heavyURL.automaticDetectionEnabled = heavy['automatic-detection'] === 'enabled';
                        GlobalObject.addProperty(`${globalPath}/heavyURLProtection`, 'automaticDetectionEnabled', loc.original, {
                            'heavy-urls': {
                                'automatic-detection': null
                            }
                        });
                    }
                    if (Object.keys(heavyURL).length) newApp.heavyURLProtection = heavyURL;
                }

                // mobile-detection
                const mobileDetect = app['mobile-detection'];
                if (mobileDetect) {
                    const mobileDef = {};
                    GlobalObject.addProperty(globalPath, 'mobileDefense', loc.original, { 'mobile-detection': null });
                    if (mobileDetect.enabled) {
                        mobileDef.enabled = mobileDetect.enabled === 'enabled';
                        GlobalObject.addProperty(`${globalPath}/mobileDefense`, 'enabled', loc.original, {
                            'mobile-detection': {
                                enabled: null
                            }
                        });
                    }
                    if (mobileDetect['allow-android-rooted-device']) {
                        mobileDef.allowAndroidRootedDevice = mobileDetect['allow-android-rooted-device'] === 'true';
                        GlobalObject.addProperty(`${globalPath}/mobileDefense`, 'allowAndroidRootedDevice', loc.original, {
                            'mobile-detection': {
                                'allow-android-rooted-device': null
                            }
                        });
                    }
                    if (mobileDetect['allow-emulators']) {
                        mobileDef.allowEmulators = mobileDetect['allow-emulators'] === 'true';
                        GlobalObject.addProperty(`${globalPath}/mobileDefense`, 'allowEmulators', loc.original, {
                            'mobile-detection': {
                                'allow-emulators': null
                            }
                        });
                    }
                    if (mobileDetect['allow-jailbroken-devices']) {
                        mobileDef.allowJailbrokenDevices = mobileDetect['allow-jailbroken-devices'] === 'true';
                        GlobalObject.addProperty(`${globalPath}/mobileDefense`, 'allowJailbrokenDevices', loc.original, {
                            'mobile-detection': {
                                'allow-jailbroken-devices': null
                            }
                        });
                    }
                    if (mobileDetect['ios-allowed-package-names']) {
                        mobileDef.allowIosPackageNames = mobileDetect['ios-allowed-package-names'];
                        GlobalObject.addProperty(`${globalPath}/mobileDefense`, 'allowIosPackageNames', loc.original, {
                            'mobile-detection': {
                                'ios-allowed-package-names': null
                            }
                        });
                    }
                    if (mobileDetect['client-side-challenge-mode'] === 'cshui') {
                        mobileDef.clientSideChallengeMode = 'challenge';
                        GlobalObject.addProperty(`${globalPath}/mobileDefense`, 'clientSideChallengeMode', loc.original, {
                            'mobile-detection': {
                                'client-side-challenge-mode': null
                            }
                        });
                    }
                    if (mobileDetect['android-publishers']) {
                        mobileDef.allowAndroidPublishers = Object.keys(mobileDetect['android-publishers'])
                            .map((x) => handleObjectRef(x));
                        GlobalObject.addProperty(`${globalPath}/mobileDefense`, 'allowAndroidPublishers', loc.original, {
                            'mobile-detection': {
                                'android-publishers': null
                            }
                        });
                    }

                    // only attach if keys present
                    if (Object.keys(mobileDef).length) newApp.mobileDefense = mobileDef;
                }

                // recordTraffic
                const recordTraffic = app['tcp-dump'];
                if (recordTraffic) {
                    const traf = {};
                    GlobalObject.addProperty(globalPath, 'recordTraffic', loc.original, { 'tcp-dump': null });
                    if (recordTraffic['maximum-duration']) {
                        traf.maximumDuration = parseInt(recordTraffic['maximum-duration'], 10);
                        GlobalObject.addProperty(`${globalPath}/recordTraffic`, 'maximumDuration', loc.original, {
                            'tcp-demp': {
                                'maximum-duration': null
                            }
                        });
                    }
                    if (recordTraffic['maximum-size']) {
                        traf.maximumSize = parseInt(recordTraffic['maximum-size'], 10);
                        GlobalObject.addProperty(`${globalPath}/recordTraffic`, 'maximumSize', loc.original, {
                            'tcp-demp': {
                                'maximum-size': null
                            }
                        });
                    }
                    if (recordTraffic['repetition-interval']) {
                        traf.repetitionInterval = parseInt(recordTraffic['repetition-interval'], 10);
                        GlobalObject.addProperty(`${globalPath}/recordTraffic`, 'repetitionInterval', loc.original, {
                            'tcp-demp': {
                                'repetition-interval': null
                            }
                        });
                    }
                    if (recordTraffic['record-traffic']) {
                        traf.recordTrafficEnabled = recordTraffic['record-traffic'] === 'enabled';
                        GlobalObject.addProperty(`${globalPath}/recordTraffic`, 'recordTrafficEnabled', loc.original, {
                            'tcp-demp': {
                                'record-traffic': null
                            }
                        });
                    }
                    if (Object.keys(traf).length) newApp.recordTraffic = traf;
                }

                const dosProf = (conf, prefix) => {
                    const obj = {};
                    if (conf[`${prefix}-captcha-challenge`]) {
                        obj.captchaChallengeEnabled = conf[`${prefix}-captcha-challenge`] === 'enabled';
                        GlobalObject.addProperty(`${globalPath}/rateBasedDetection`, 'captchaChallengeEnabled', loc.original, {
                            'tps-based': {
                                [`${prefix}-captcha-challenge`]: null
                            }
                        });
                    }
                    if (conf[`${prefix}-client-side-defense`]) {
                        obj.clientSideDefenseEnabled = conf[`${prefix}-client-side-defense`] === 'enabled';
                        GlobalObject.addProperty(`${globalPath}/rateBasedDetection`, 'clientSideDefenseEnabled', loc.original, {
                            'tps-based': {
                                [`${prefix}-client-side-defense`]: null
                            }
                        });
                    }
                    if (conf[`${prefix}-enable-heavy`]) {
                        obj.heavyURLProtectionEnabled = conf[`${prefix}-enabled-heavy`] === 'enabled';
                        GlobalObject.addProperty(`${globalPath}/rateBasedDetection`, 'heavyURLProtectionEnabled', loc.original, {
                            'tps-based': {
                                [`${prefix}-enabled-heavy`]: null
                            }
                        });
                    }

                    if (conf[`${prefix}-maximum-auto-tps`]) {
                        obj.maximumAutoTps = parseInt(conf[`${prefix}-maximum-auto-tps`], 10);
                        GlobalObject.addProperty(`${globalPath}/rateBasedDetection`, 'maximumAutoTps', loc.original, {
                            'tps-based': {
                                [`${prefix}-maximum-auto-tps`]: null
                            }
                        });
                    }
                    if (conf[`${prefix}-minimum-auto-tps`]) {
                        obj.minimumAutoTps = parseInt(conf[`${prefix}-minimum-auto-tps`], 10);
                        GlobalObject.addProperty(`${globalPath}/rateBasedDetection`, 'minimumAutoTps', loc.original, {
                            'tps-based': {
                                [`${prefix}-minimum-auto-tps`]: null
                            }
                        });
                    }
                    if (conf[`${prefix}-maximum-tps`]) {
                        obj.maximumTps = parseInt(conf[`${prefix}-maximum-tps`], 10);
                        GlobalObject.addProperty(`${globalPath}/rateBasedDetection`, 'maximumTps', loc.original, {
                            'tps-based': {
                                [`${prefix}-maximum-tps`]: null
                            }
                        });
                    }
                    if (conf[`${prefix}-minimum-tps`]) {
                        obj.minimumTps = parseInt(conf[`${prefix}-minimum-tps`], 10);
                        GlobalObject.addProperty(`${globalPath}/rateBasedDetection`, 'minimumTps', loc.original, {
                            'tps-based': {
                                [`${prefix}-minimum-tps`]: null
                            }
                        });
                    }
                    if (conf[`${prefix}-tps-increase-rate`]) {
                        obj.tpsIncreaseRate = parseInt(conf[`${prefix}-tps-increase-rate`], 10);
                        GlobalObject.addProperty(`${globalPath}/rateBasedDetection`, 'tpsIncreaseRate', loc.original, {
                            'tps-based': {
                                [`${prefix}-tps-increase-rate`]: null
                            }
                        });
                    }
                    if (conf[`${prefix}-minimum-share`]) {
                        obj.minimumShare = parseInt(conf[`${prefix}-minimum-share`], 10);
                        GlobalObject.addProperty(`${globalPath}/rateBasedDetection`, 'minimumShare', loc.original, {
                            'tps-based': {
                                [`${prefix}-minimum-share`]: null
                            }
                        });
                    }
                    if (conf[`${prefix}-share-increase-rate`]) {
                        obj.shareIncreaseRate = parseInt(conf[`${prefix}-share-increase-rate`], 10);
                        GlobalObject.addProperty(`${globalPath}/rateBasedDetection`, 'shareIncreaseRate', loc.original, {
                            'tps-based': {
                                [`${prefix}-share-increase-rate`]: null
                            }
                        });
                    }

                    if (conf[`${prefix}-rate-limiting`]) {
                        obj.rateLimitingEnabled = conf[`${prefix}-rate-limiting`] === 'enabled';
                        GlobalObject.addProperty(`${globalPath}/rateBasedDetection`, 'rateLimitedEnabled', loc.original, {
                            'tps-based': {
                                [`${prefix}-rate-limiting`]: null
                            }
                        });
                    }
                    if (conf[`${prefix}-request-blocking-mode`]) {
                        obj.rateLimitingMode = conf[`${prefix}-request-blocking-mode`];
                        GlobalObject.addProperty(`${globalPath}/rateBasedDetection`, 'rateLimitingMode', loc.original, {
                            'tps-based': {
                                [`${prefix}-request-blocking-mode`]: null
                            }
                        });
                    }

                    return obj;
                };

                // tps-based -> rateBasedDetection
                const tps = app['tps-based'];
                if (tps) {
                    const rate = {};
                    GlobalObject.addProperty(globalPath, 'rateBasedDetection', loc.original, { 'tps-based': null });
                    if (tps.mode) {
                        rate.operationMode = tps.mode;
                        GlobalObject.addProperty(`${globalPath}/rateBasedDetection`, 'operationMode', loc.original, {
                            'tps-based': {
                                mode: null
                            }
                        });
                    }
                    rate.thresholdsMode = tps['thresholds-mode'] || 'manual';
                    GlobalObject.addProperty(`${globalPath}/rateBasedDetection`, 'thresholdsMode', loc.original, {
                        'tps-based': {
                            'thresholds-mode': null
                        }
                    });
                    if (tps['escalation-period']) {
                        rate.escalationPeriod = parseInt(tps['escalation-period'], 10);
                        GlobalObject.addProperty(`${globalPath}/rateBasedDetection`, 'escalationPeriod', loc.original, {
                            'tps-based': {
                                'escalation-period': null
                            }
                        });
                    }
                    if (tps['de-escalation-period']) {
                        rate.deEscalationPeriod = parseInt(tps['de-escalation-period'], 10);
                        GlobalObject.addProperty(`${globalPath}/rateBasedDetection`, 'deEscalationPeriod', loc.original, {
                            'tps-based': {
                                'de-escalation-period': null
                            }
                        });
                    }

                    const src = dosProf(tps, 'ip');
                    const dev = dosProf(tps, 'device');
                    const geo = dosProf(tps, 'geo');
                    const site = dosProf(tps, 'site');
                    const url = dosProf(tps, 'url');
                    if (Object.keys(src).length) rate.sourceIP = src;
                    if (Object.keys(dev).length) rate.deviceID = dev;
                    if (Object.keys(geo).length) rate.geolocation = geo;
                    if (Object.keys(site).length) rate.site = site;
                    if (Object.keys(url).length) rate.url = url;

                    if (Object.keys(rate).length) newApp.rateBasedDetection = rate;
                }

                // stress-based -> stressBasedDetection
                const strs = app['stress-based'];
                if (strs) {
                    const stress = {};
                    GlobalObject.addProperty(globalPath, 'stressBasedDetection', loc.original, { 'stress-based': null });
                    stress.thresholdsMode = strs['thresholds-mode'] || 'manual';
                    if (strs.mode) stress.operationMode = strs.mode;
                    if (strs['escalation-period']) stress.escalationPeriod = parseInt(strs['escalation-period'], 10);
                    if (strs['de-escalation-period']) stress.deEscalationPeriod = parseInt(strs['de-escalation-period'], 10);

                    // badActor
                    const behave = strs.behavioral;
                    if (behave) {
                        const badActor = {};
                        GlobalObject.addProperty(`${globalPath}/stressBasedDetection`, 'badActor', loc.original, {
                            'stress-based': {
                                behavioral: null
                            }
                        });
                        if (behave['signatures-approved-only']) {
                            badActor.useApprovedSignaturesOnly = behave['signatures-approved-only'] === 'enabled';
                            GlobalObject.addProperty(`${globalPath}/stressBasedDetection/badActor`, 'useApprovedSignaturesOnly', loc.original, {
                                'stress-based': {
                                    behavioral: {
                                        'signatures-approved-only': null
                                    }
                                }
                            });
                        }
                        if (behave['dos-detection']) {
                            badActor.detectionEnabled = behave['dos-detection'] === 'enabled';
                            GlobalObject.addProperty(`${globalPath}/stressBasedDetection/badActor`, 'detectionEnabled', loc.original, {
                                'stress-based': {
                                    behavioral: {
                                        'dos-detection': null
                                    }
                                }
                            });
                        }
                        if (behave.signatures) {
                            badActor.signatureDetectionEnabled = behave.signatures === 'enabled';
                            GlobalObject.addProperty(`${globalPath}/stressBasedDetection/badActor`, 'signatureDetectionEnabled', loc.original, {
                                'stress-based': {
                                    behavioral: {
                                        signatures: null
                                    }
                                }
                            });
                        }
                        if (behave['mitigation-mode']) {
                            badActor.mitigationMode = behave['mitigation-mode'];
                            GlobalObject.addProperty(`${globalPath}/stressBasedDetection/badActor`, 'mitigationMode', loc.original, {
                                'stress-based': {
                                    behavioral: {
                                        'mitigation-mode': null
                                    }
                                }
                            });
                        }
                        if (Object.keys(badActor).length) stress.badActor = badActor;
                    }

                    const src = dosProf(strs, 'ip');
                    const dev = dosProf(strs, 'device');
                    const geo = dosProf(strs, 'geo');
                    const site = dosProf(strs, 'site');
                    const url = dosProf(strs, 'url');
                    if (Object.keys(src).length) stress.sourceIP = src;
                    if (Object.keys(dev).length) stress.deviceID = dev;
                    if (Object.keys(geo).length) stress.geolocation = geo;
                    if (Object.keys(site).length) stress.site = site;
                    if (Object.keys(url).length) stress.url = url;
                    if (Object.keys(stress).length) newApp.stressBasedDetection = stress;
                }

                rootObj.application = newApp;
            }

            // network
            const network = rootObj.network;
            if (rootObj.network) {
                const net = {};
                GlobalObject.addProperty(globalPath, 'network', loc.original, { network: null });
                const netKey = Object.keys(network)[0];
                const dynSig = rootObj.network[netKey]['dynamic-signatures'];
                if (dynSig) {
                    GlobalObject.addProperty(`${globalPath}/network`, 'dynamicSignatures', loc.original, {
                        network: {
                            'dynamic-signatures': null
                        }
                    });
                    net.dynamicSignatures = {
                        detectionMode: dynSig.detection,
                        mitigationMode: dynSig.mitigation,
                        scrubbingCategory: handleObjectRef(dynSig['scrubber-category']),
                        scrubbingDuration: parseInt(dynSig['scrubber-advertisement-period'], 10),
                        scrubbingEnabled: dynSig['scrubber-enable'] === 'yes'
                    };
                    GlobalObject.addProperty(`${globalPath}/network/dynamicSignatures`, 'detectionMode', loc.original, {
                        network: {
                            dynamicSignatures: {
                                detection: null
                            }
                        }
                    });
                    GlobalObject.addProperty(`${globalPath}/network/dynamicSignatures`, 'mitigationMode', loc.original, {
                        network: {
                            dynamicSignatures: {
                                mitigation: null
                            }
                        }
                    });
                    GlobalObject.addProperty(`${globalPath}/network/dynamicSignatures`, 'scrubbingCategory', loc.original, {
                        network: {
                            dynamicSignatures: {
                                'scrubber-category': null
                            }
                        }
                    });
                }

                const attVector = rootObj.network[netKey]['network-attack-vector'];
                if (attVector) {
                    GlobalObject.addProperty(`${globalPath}/network`, 'vectors', loc.original, {
                        network: {
                            'network-attack-vector': null
                        }
                    });
                    GlobalObject.addProperty(`${globalPath}/network/vectors`, 'autoDenylistSettings', loc.original, {
                        network: {
                            'network-attack-vector': {
                                autoDenylistSettings: null
                            }
                        }
                    });
                    GlobalObject.addProperty(`${globalPath}/network/vectors/autoDenylistSettings`, 'enabled', loc.original, {
                        network: {
                            'network-attack-vector': {
                                autoDenylistSettings: {
                                    'auto-blacklisting': null
                                }
                            }
                        }
                    });
                    GlobalObject.addProperty(`${globalPath}/network/vectors/autoDenylistSettings`, 'category', loc.original, {
                        network: {
                            'network-attack-vector': {
                                autoDenylistSettings: {
                                    'blacklist-category': null
                                }
                            }
                        }
                    });
                    GlobalObject.addProperty(`${globalPath}/network/vectors/autoDenylistSettings`, 'attackDetectionTime', loc.original, {
                        network: {
                            'network-attack-vector': {
                                autoDenylistSettings: {
                                    'blacklist-detection-seconds': null
                                }
                            }
                        }
                    });
                    GlobalObject.addProperty(`${globalPath}/network/vectors/autoDenylistSettings`, 'categoryDuration', loc.original, {
                        network: {
                            'network-attack-vector': {
                                autoDenylistSettings: {
                                    'blacklist-duration': null
                                }
                            }
                        }
                    });
                    GlobalObject.addProperty(`${globalPath}/network/vectors/autoDenylistSettings`, 'externalAdvertisementEnabled', loc.original, {
                        network: {
                            'network-attack-vector': {
                                autoDenylistSettings: {
                                    'allow-advertisement': null
                                }
                            }
                        }
                    });
                    GlobalObject.addProperty(`${globalPath}/network/vectors`, 'badActorSettings', loc.original, {
                        network: {
                            'network-attack-vector': {
                                badActorSettings: null
                            }
                        }
                    });
                    GlobalObject.addProperty(`${globalPath}/network/vectors/badActorSettings`, 'enabled', loc.original, {
                        network: {
                            'network-attack-vector': {
                                badActorSettings: {
                                    'bad-actor': null
                                }
                            }
                        }
                    });
                    GlobalObject.addProperty(`${globalPath}/network/vectors/badActorSettings`, 'sourceDetectionThreshold', loc.original, {
                        network: {
                            'network-attack-vector': {
                                badActorSettings: {
                                    'per-source-ip-detection-pps': null
                                }
                            }
                        }
                    });
                    GlobalObject.addProperty(`${globalPath}/network/vectors/badActorSettings`, 'sourceMitigationThreshold', loc.original, {
                        network: {
                            'network-attack-vector': {
                                badActorSettings: {
                                    'per-source-ip-limit-pps': null
                                }
                            }
                        }
                    });
                    GlobalObject.addProperty(`${globalPath}/network/vectors`, 'rateIncreaseThreshold', loc.original, {
                        network: {
                            'network-attack-vector': {
                                'rate-increase': null
                            }
                        }
                    });
                    GlobalObject.addProperty(`${globalPath}/network/vectors`, 'rateLimit', loc.original, {
                        network: {
                            'network-attack-vector': {
                                'rate-limit': null
                            }
                        }
                    });
                    GlobalObject.addProperty(`${globalPath}/network/vectors`, 'rateThreshold', loc.original, {
                        network: {
                            'network-attack-vector': {
                                'rate-threshold': null
                            }
                        }
                    });
                    GlobalObject.addProperty(`${globalPath}/network/vectors`, 'rateThreshold', loc.original, {
                        network: {
                            'network-attack-vector': {
                                'rate-threshold': null
                            }
                        }
                    });
                    GlobalObject.addProperty(`${globalPath}/network/vectors`, 'simulateAutoThresholdEnabled', loc.original, {
                        network: {
                            'network-attack-vector': {
                                'simulate-auto-threshold': null
                            }
                        }
                    });
                    GlobalObject.addProperty(`${globalPath}/network/vectors`, 'state', loc.original, {
                        network: {
                            'network-attack-vector': {
                                state: null
                            }
                        }
                    });
                    GlobalObject.addProperty(`${globalPath}/network/vectors`, 'type', loc.original, {
                        network: {
                            'network-attack-vector': {
                                type: null
                            }
                        }
                    });
                    net.vectors = Object.keys(attVector).map((x) => {
                        const vector = attVector[x];
                        return {
                            autoDenylistSettings: {
                                enabled: vector['auto-blacklisting'] === 'enabled',
                                category: handleObjectRef(vector['blacklist-category']),
                                attackDetectionTime: parseInt(vector['blacklist-detection-seconds'], 10),
                                categoryDuration: parseInt(vector['blacklist-duration'], 10),
                                externalAdvertisementEnabled: vector['allow-advertisement'] === 'enabled'
                            },
                            badActorSettings: {
                                enabled: vector['bad-actor'] === 'enabled',
                                sourceDetectionThreshold: parseInt(vector['per-source-ip-detection-pps'], 10),
                                sourceMitigationThreshold: parseInt(vector['per-source-ip-limit-pps'], 10)
                            },
                            rateIncreaseThreshold: parseInt(vector['rate-increase'], 10),
                            rateLimit: parseInt(vector['rate-limit'], 10),
                            rateThreshold: parseInt(vector['rate-threshold'], 10),
                            simulateAutoThresholdEnabled: vector['simulate-auto-threshold'] === 'enabled',
                            state: vector.state,
                            type: x
                        };
                    });
                }
                rootObj.network = net;
            }

            // protocolDNS
            const protoDNS = rootObj.protocolDNS;
            if (protoDNS) {
                GlobalObject.addProperty(globalPath, 'protocolDNS', loc.original, { 'protocol-dns': null });
                GlobalObject.addProperty(`${globalPath}/protocolDNS`, 'vectors', loc.original, {
                    'protocol-dns': {
                        'dns-query-vector': null
                    }
                });
                const vectArr = [];
                const dnsKeys = Object.keys(protoDNS);
                for (let i = 0; i < dnsKeys.length; i += 1) {
                    const dnsKey = dnsKeys[i];
                    const keyObj = protoDNS[dnsKey];
                    const vect = keyObj['dns-query-vector'];
                    if (vect) {
                        const vectObj = Object.keys(vect).map((x, index) => {
                            const obj = {
                                type: x,
                                state: vect[x].state || 'mitigate'
                            };
                            GlobalObject.addProperty(`${globalPath}/protocolDNS/vectors/${index}`, 'type', loc.original, {
                                'protocol-dns': {
                                    'dns-query-vector': {
                                        [index]: {
                                            name: null
                                        }
                                    }
                                }
                            });

                            GlobalObject.addProperty(`${globalPath}/protocolDNS/vectors/${index}`, 'state', loc.original, {
                                'protocol-dns': {
                                    'dns-query-vector': {
                                        [index]: {
                                            state: null
                                        }
                                    }
                                }
                            });

                            if (vect[x]['rate-increase']) {
                                obj.rateIncreaseThreshold = parseInt(vect[x]['rate-increase'], 10);
                                GlobalObject.addProperty(`${globalPath}/protocolDNS/vectors/${index}`, 'rateIncreaseThreshold', loc.original, {
                                    'protocol-dns': {
                                        'dns-query-vector': {
                                            [index]: {
                                                'rate-increase': null
                                            }
                                        }
                                    }
                                });
                            }

                            if (vect[x]['threshold-mode']) {
                                obj.thresholdMode = vect[x]['threshold-mode'];
                                GlobalObject.addProperty(`${globalPath}/protocolDNS/vectors/${index}`, 'thresholdMode', loc.original, {
                                    'protocol-dns': {
                                        'dns-query-vector': {
                                            [index]: {
                                                'threshold-mode': null
                                            }
                                        }
                                    }
                                });
                            }

                            // 'infinite' == 4294967295
                            if (vect[x].ceiling === 'infinite') {
                                obj.autoAttackCeiling = 4294967295;
                            } else {
                                obj.autoAttackCeiling = parseInt(vect[x].ceiling, 10);
                            }
                            GlobalObject.addProperty(`${globalPath}/protocolDNS/vectors/${index}`, 'autoAttackCeiling', loc.original, {
                                'protocol-dns': {
                                    'dns-query-vector': {
                                        [index]: {
                                            ceiling: null
                                        }
                                    }
                                }
                            });
                            if (vect[x].floor === 'infinite') {
                                obj.autoAttackFloor = 4294967295;
                            } else {
                                obj.autoAttackFloor = parseInt(vect[x].floor, 10);
                            }
                            GlobalObject.addProperty(`${globalPath}/protocolDNS/vectors/${index}`, 'autoAttackFloor', loc.original, {
                                'protocol-dns': {
                                    'dns-query-vector': {
                                        [index]: {
                                            floor: null
                                        }
                                    }
                                }
                            });
                            return obj;
                        });
                        vectArr.push(vectObj[0]);
                    }
                }
                rootObj.protocolDNS = { vectors: vectArr };
            }

            // protocolSIP
            const protoSIP = rootObj.protocolSIP;
            if (protoSIP) {
                GlobalObject.addProperty(globalPath, 'protocolSIP', loc.original, { 'protocol-sip': null });
                GlobalObject.addProperty(`${globalPath}/protocolSIP`, 'vectors', loc.original, {
                    'protocol-dns': {
                        'sip-attack-vector': null
                    }
                });
                const vectArr = [];
                Object.keys(protoSIP).forEach((sipKey) => {
                    const keyObj = protoSIP[sipKey];
                    const vect = keyObj['sip-attack-vector'];
                    if (vect) {
                        const vectObj = Object.keys(vect).map((x, index) => {
                            const obj = {
                                type: x,
                                state: vect[x].state || 'mitigate'
                            };
                            GlobalObject.addProperty(`${globalPath}/protocolSIP/vectors/${index}`, 'type', loc.original, {
                                'protocol-dns': {
                                    'sip-attack-vector': {
                                        [index]: {
                                            name: null
                                        }
                                    }
                                }
                            });

                            GlobalObject.addProperty(`${globalPath}/protocolSIP/vectors/${index}`, 'type', loc.original, {
                                'protocol-dns': {
                                    'sip-attack-vector': {
                                        [index]: {
                                            name: null
                                        }
                                    }
                                }
                            });

                            if (vect[x]['rate-increase']) {
                                obj.rateIncreaseThreshold = parseInt(vect[x]['rate-increase'], 10);
                                GlobalObject.addProperty(`${globalPath}/protocolSIP/vectors/${index}`, 'rateIncreaseThreshold', loc.original, {
                                    'protocol-dns': {
                                        'sip-attack-vector': {
                                            [index]: {
                                                'rate-increase': null
                                            }
                                        }
                                    }
                                });
                            }

                            if (vect[x]['threshold-mode']) {
                                obj.thresholdMode = vect[x]['threshold-mode'];
                                GlobalObject.addProperty(`${globalPath}/protocolSIP/vectors/${index}`, 'thresholdMode', loc.original, {
                                    'protocol-dns': {
                                        'sip-attack-vector': {
                                            [index]: {
                                                'threshold-mode': null
                                            }
                                        }
                                    }
                                });
                            }

                            GlobalObject.addProperty(`${globalPath}/protocolSIP/vectors/${index}`, 'autoAttackCeiling', loc.original, {
                                'protocol-dns': {
                                    'sip-attack-vector': {
                                        [index]: {
                                            ceiling: null
                                        }
                                    }
                                }
                            });
                            // 'infinite' == 4294967295
                            if (vect[x].ceiling === 'infinite') {
                                obj.autoAttackCeiling = 4294967295;
                            } else {
                                obj.autoAttackCeiling = parseInt(vect[x].ceiling, 10);
                            }

                            GlobalObject.addProperty(`${globalPath}/protocolSIP/vectors/${index}`, 'autoAttackFloor', loc.original, {
                                'protocol-dns': {
                                    'sip-attack-vector': {
                                        [index]: {
                                            floor: null
                                        }
                                    }
                                }
                            });
                            if (vect[x].floor === 'infinite') {
                                obj.autoAttackFloor = 4294967295;
                            } else {
                                obj.AutoAttackFloor = parseInt(vect[x].floor, 10);
                            }
                            return obj;
                        });
                        vectArr.push(vectObj[0]);
                    }
                });
                rootObj.protocolSIP = { vectors: vectArr };
            }

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // NAT_Policy
    'security nat policy': {
        class: 'NAT_Policy',

        customHandling: (rootObj, loc) => {
            const newObj = {};
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;

            // rules
            const rules = rootObj.rules;
            if (rules) {
                rootObj.rules = Object.keys(rules).map((x, index) => {
                    const rule = rootObj.rules[x];
                    const newRule = { name: x };
                    const rulesPath = `${globalPath}/${rule}/${index}`;

                    if (rule['ip-protocol']) {
                        newRule.protocol = rule['ip-protocol'];
                        GlobalObject.addProperty(rulesPath, 'protocol', loc.original, { [rule]: { [x]: { 'ip-protocol': null } } });
                    }

                    if (rule['log-profile']) {
                        newRule.securityLogProfile = handleObjectRef(rule['log-profile']);
                        GlobalObject.addProperty(rulesPath, 'securityLogProfile', loc.original, { [rule]: { [x]: { 'log-profile': null } } });
                    }

                    if (rule.destination) {
                        const dest = {};
                        if (rule.destination['address-lists']) {
                            dest.addressLists = Object.keys(rule.destination['address-lists'])
                                .map((y) => handleObjectRef(y));
                            GlobalObject.addProperty(rulesPath, 'addressLists', loc.original, { [rule]: { [x]: { 'address-lists': null } } });
                        }
                        if (rule.destination['port-lists']) {
                            dest.portLists = Object.keys(rule.destination['port-lists'])
                                .map((y) => handleObjectRef(y));
                            GlobalObject.addProperty(rulesPath, 'portLists', loc.original, { [rule]: { [x]: { 'port-lists': null } } });
                        }
                        newRule.destination = dest;
                    }

                    if (rule.source) {
                        const dest = {};
                        if (rule.source['address-lists']) {
                            dest.addressLists = Object.keys(rule.source['address-lists'])
                                .map((y) => handleObjectRef(y));
                        }
                        if (rule.source['port-lists']) {
                            dest.portLists = Object.keys(rule.source['port-lists'])
                                .map((y) => handleObjectRef(y));
                        }
                        newRule.source = dest;
                    }

                    if (rule.translation) newRule.sourceTranslation = handleObjectRef(rule.translation.source);

                    return newRule;
                });
            }

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // NAT_Source_Translation
    'security nat source-translation': {
        class: 'NAT_Source_Translation',

        keyValueRemaps: {
            addresses: (key, val) => ({ addresses: Object.keys(val) }),

            egressInterfaces: (key, val, options, path) => {
                GlobalObject.moveProperty(path, key, path, 'allowEgressInterfaces');
                return {
                    allowEgressInterfaces: Object.keys(val)
                        .map((x) => handleObjectRef(x))
                };
            },

            egressInterfacesDisabled: () => ({}),

            egressInterfacesEnabled: () => ({}),

            ports: (key, val) => ({ ports: Object.keys(val) })
        },

        customHandling: (rootObj, loc) => {
            const newObj = {};
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;

            // mapping
            if (rootObj.mode && rootObj.timeout) {
                GlobalObject.addProperty(globalPath, 'mapping', loc.original, { mapping: null });
                GlobalObject.addProperty(`${globalPath}/mapping`, 'mode', loc.original, {
                    mapping: {
                        mode: null
                    }
                });
                GlobalObject.addProperty(`${globalPath}/mapping`, 'timeout', loc.original, {
                    mapping: {
                        timeout: null
                    }
                });
                rootObj.mapping = {
                    mode: rootObj.mode,
                    timeout: rootObj.timeout
                };
            }
            GlobalObject.deleteProperty(globalPath, 'mode', 'RenamedProperty');
            GlobalObject.deleteProperty(globalPath, 'timeout', 'RenamedProperty');
            delete rootObj.mode;
            delete rootObj.timeout;

            // portBlockAllocation
            if (rootObj.patMode === 'pba') {
                const pba = {};
                GlobalObject.addProperty(globalPath, 'portBlockAllocation', loc.original, { portBlockAllocation: null });
                if (rootObj.blockIdleTimeout) {
                    pba.blockIdleTimeout = rootObj.blockIdleTimeout;
                    GlobalObject.addProperty(`${globalPath}/portBlockAllocation`, 'blockIdleTimeout', loc.original, {
                        portBlockAllocation: {
                            blockIdleTimeout: null
                        }
                    });
                }
                if (rootObj.blockLifetime) {
                    pba.blockLifetime = rootObj.blockLifetime;
                    GlobalObject.addProperty(`${globalPath}/portBlockAllocation`, 'blockLifetime', loc.original, {
                        portBlockAllocation: {
                            blockLifetime: null
                        }
                    });
                }
                if (rootObj.blockSize) {
                    pba.blockSize = rootObj.blockSize;
                    GlobalObject.addProperty(`${globalPath}/portBlockAllocation`, 'blockSize', loc.original, {
                        portBlockAllocation: {
                            blockSize: null
                        }
                    });
                }
                if (rootObj.clientBlockLimit) {
                    pba.clientBlockLimit = rootObj.clientBlockLimit;
                    GlobalObject.addProperty(`${globalPath}/portBlockAllocation`, 'clientBlockLimit', loc.original, {
                        portBlockAllocation: {
                            clientBlockLimit: null
                        }
                    });
                }
                if (rootObj.zombieTimeout) {
                    pba.zombieTimeout = rootObj.zombieTimeout;
                    GlobalObject.addProperty(`${globalPath}/portBlockAllocation`, 'zombieTimeout', loc.original, {
                        portBlockAllocation: {
                            zombieTimeout: null
                        }
                    });
                }

                if (Object.keys(pba).length) rootObj.portBlockAllocation = pba;
            }

            // excludeAddresses
            const excludeArr = [];
            if (rootObj.excludeAddresses) {
                Object.keys(rootObj.excludeAddresses).forEach((x) => excludeArr.push(x));
            }
            if (rootObj.excludeAddressLists) {
                Object.keys(rootObj.excludeAddressLists).forEach((x) => excludeArr.push(handleObjectRef(x)));
                delete rootObj.excludeAddressLists;
            }
            rootObj.excludeAddresses = excludeArr;
            GlobalObject.addProperty(globalPath, 'excludeAddresses', loc.original, { excludeAddresses: null });

            GlobalObject.deleteProperty(globalPath, 'blockIdleTimeout', 'RenamedProperty');
            GlobalObject.deleteProperty(globalPath, 'blockLifetime', 'RenamedProperty');
            GlobalObject.deleteProperty(globalPath, 'blockSize', 'RenamedProperty');
            GlobalObject.deleteProperty(globalPath, 'clientBlockLimit', 'RenamedProperty');
            GlobalObject.deleteProperty(globalPath, 'zombieTimeout', 'RenamedProperty');
            delete rootObj.blockIdleTimeout;
            delete rootObj.blockLifetime;
            delete rootObj.blockSize;
            delete rootObj.clientBlockLimit;
            delete rootObj.zombieTimeout;

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Protocol_Inspection_Profile
    'security protocol-inspection profile': {
        class: 'Protocol_Inspection_Profile',

        customHandling: (rootObj, loc) => {
            const newObj = {};
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;

            if (rootObj.services) {
                // services
                GlobalObject.addProperty(globalPath, 'services', loc.original, { services: null });
                rootObj.services = Object.keys(rootObj.services).map((x, index) => {
                    const origService = rootObj.services[x];
                    const newService = { type: x.split('/')[2] };

                    const parseLtmPolicyChecks = (obj) => {
                        if (obj) {
                            obj = Object.keys(obj).map((c) => {
                                const origObj = obj[c];
                                const retObj = { check: c.split('/')[2] };
                                if (origObj.action) {
                                    retObj.action = origObj.action;
                                }
                                if (origObj.log) {
                                    if (origObj.log === 'yes') retObj.log = true;
                                    if (origObj.log === 'no') retObj.log = false;
                                }
                                if (origObj.value) {
                                    retObj.value = unquote(origObj.value);
                                }
                                return retObj;
                            });
                            return obj;
                        }
                        return [];
                    };

                    // compliance
                    newService.compliance = parseLtmPolicyChecks(origService.compliance);
                    GlobalObject.addProperty(`${globalPath}/services/${index}`, 'compliance', loc.original, {
                        services: {
                            [index]: {
                                compliance: null
                            }
                        }
                    });

                    // signature
                    newService.signature = parseLtmPolicyChecks(origService.signature);
                    GlobalObject.addProperty(`${globalPath}/services/${index}`, 'signature', loc.original, {
                        services: {
                            [index]: {
                                signature: null
                            }
                        }
                    });

                    // ports
                    if (origService.ports) {
                        newService.ports = Object.keys(origService.ports).map((val) => parseInt(val, 10));
                        GlobalObject.addProperty(`${globalPath}/services/${index}`, 'ports', loc.original, {
                            services: {
                                [index]: {
                                    ports: null
                                }
                            }
                        });
                    }

                    return newService;
                });
            }

            GlobalObject.deleteProperty(globalPath, 'defaultFromProfile', 'RenamedProperty');
            delete rootObj.defaultFromProfile;
            newObj[loc.profile] = rootObj;
            return newObj;
        }

    },

    // Security_Log_Profile
    'security log profile': {
        class: 'Security_Log_Profile',

        keyValueRemaps: {

            dosApplication: (key, val) => {
                const obj = val[Object.keys(val)[0]];
                if (Object.keys(obj).length !== 0) {
                    const oldKey = Object.keys(obj)[0];
                    const newKey = hyphensToCamel(oldKey);
                    const ref = obj[oldKey].includes('Common') ? obj[oldKey] : '/Common/'.concat(obj[oldKey]);
                    const newObj = {};
                    newObj[newKey] = handleObjectRef(unquote(ref));
                    return { dosApplication: newObj };
                }
                return {};
            }
        },

        customHandling: (rootObj, loc) => {
            const newObj = {};
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            GlobalObject.addProperty(globalPath, 'application', loc.original, { application: null });
            // application
            if (rootObj.application) {
                const key = Object.keys(rootObj.application)[0];
                const obj = rootObj.application[key];
                const search = Object.keys(obj.filter).filter((x) => x.includes('search-'))[0];

                const app = {};
                if (obj['guarantee-logging']) {
                    app.guaranteeLoggingEnabled = obj['guarantee-logging'] === 'enabled';
                    GlobalObject.addProperty(`${globalPath}/application`, 'guaranteeLoggingEnabled', loc.original, {
                        application: {
                            'guarantee-logging': null
                        }
                    });
                }
                if (obj['guarantee-response-logging']) {
                    app.guaranteeResponseLoggingEnabled = obj['guarantee-response-logging'] === 'enabled';
                    GlobalObject.addProperty(`${globalPath}/application`, 'guaranteeResponseLoggingEnabled', loc.original, {
                        application: {
                            'guarantee-response-logging': null
                        }
                    });
                }
                if (obj['maximum-header-size']) {
                    app.maxHeaderSize = parseInt(obj['maximum-header-size'], 10);
                    GlobalObject.addProperty(`${globalPath}/application`, 'maxHeaderSize', loc.original, {
                        application: {
                            'maximum-header-size': null
                        }
                    });
                }
                if (obj['maximum-query-size']) {
                    app.maxQuerySize = parseInt(obj['maximum-query-size'], 10);
                    GlobalObject.addProperty(`${globalPath}/application`, 'maxQuerySize', loc.original, {
                        application: {
                            'maximum-query-size': null
                        }
                    });
                }
                if (obj['maximum-request-size']) {
                    app.maxRequestSize = parseInt(obj['maximum-request-size'], 10);
                    GlobalObject.addProperty(`${globalPath}/application`, 'maxRequestSize', loc.original, {
                        application: {
                            'maximum-request-size': null
                        }
                    });
                }
                if (obj['response-logging']) {
                    app.responseLogging = obj['response-logging'];
                    GlobalObject.addProperty(`${globalPath}/application`, 'responseLogging', loc.original, {
                        application: {
                            'response-logging': null
                        }
                    });
                }

                if (obj['maximum-entry-length']) {
                    app.maxEntryLength = obj['maximum-entry-length'];
                    GlobalObject.addProperty(`${globalPath}/application`, 'maxEntryLength', loc.original, {
                        application: {
                            'maximum-entry-length': null
                        }
                    });
                }
                if (obj.facility) {
                    app.facility = obj.facility;
                    GlobalObject.addProperty(`${globalPath}/application`, 'maxEntryLength', loc.original, {
                        application: {
                            'maximum-entry-length': null
                        }
                    });
                }
                if (obj['local-storage']) {
                    app.localStorage = obj['local-storage'] === 'enabled';
                    GlobalObject.addProperty(`${globalPath}/application`, 'localStorage', loc.original, {
                        application: {
                            'local-storage': null
                        }
                    });
                }
                if (obj.protocol) {
                    app.protocol = obj.protocol;
                    GlobalObject.addProperty(`${globalPath}/application`, 'protocol', loc.original, {
                        application: {
                            protocol: null
                        }
                    });
                }
                if (obj['remote-storage']) {
                    app.remoteStorage = obj['remote-storage'];
                    GlobalObject.addProperty(`${globalPath}/application`, 'remoteStorage', loc.original, {
                        application: {
                            protocol: null
                        }
                    });
                }
                if (obj['report-anomalies']) {
                    app.reportAnomaliesEnabled = obj['report-anomalies'] === 'enabled';
                    GlobalObject.addProperty(`${globalPath}/application`, 'reportAnomaliesEnabled', loc.original, {
                        application: {
                            'report-anomalies': null
                        }
                    });
                }

                if (obj.servers) {
                    app.servers = Object.keys(obj.servers).map((x) => ipUtils.splitAddress(x));
                    GlobalObject.addProperty(`${globalPath}/application`, 'servers', loc.original, {
                        application: {
                            servers: null
                        }
                    });
                }

                rootObj.application = app;

                // application.storageFilter
                if (obj.filter) {
                    const filter = obj.filter;
                    const storageFilter = {};
                    GlobalObject.addProperty(`${globalPath}/application`, 'storageFilter', loc.original, {
                        application: {
                            storageFilter: null
                        }
                    });
                    if (filter['http-method']) {
                        storageFilter.httpMethods = filter['http-method'].values;
                        GlobalObject.addProperty(`${globalPath}/application/storageFilter`, 'httpMethods', loc.original, {
                            application: {
                                storageFilter: {
                                    'http-method': null
                                }
                            }
                        });
                    }
                    if (obj['logic-operation']) {
                        storageFilter.logicalOperation = obj['logic-operation'];
                        GlobalObject.addProperty(`${globalPath}/application/storageFilter`, 'logicalOperation', loc.original, {
                            application: {
                                storageFilter: {
                                    'logic-operation': null
                                }
                            }
                        });
                    }
                    if (filter['login-result']) {
                        storageFilter.loginResults = filter['login-result'].values;
                        GlobalObject.addProperty(`${globalPath}/application/storageFilter`, 'loginResults', loc.original, {
                            application: {
                                storageFilter: {
                                    'logic-result': null
                                }
                            }
                        });
                    }
                    if (filter.protocol) {
                        storageFilter.protocols = filter.protocol.values;
                        GlobalObject.addProperty(`${globalPath}/application/storageFilter`, 'protocols', loc.original, {
                            application: {
                                storageFilter: {
                                    protocol: null
                                }
                            }
                        });
                    }
                    if (filter[search]) {
                        storageFilter.requestContains = { searchIn: search };
                        GlobalObject.addProperty(`${globalPath}/application/storageFilter`, 'requestContains', loc.original, {
                            application: {
                                storageFilter: {
                                    requestContains: null
                                }
                            }
                        });
                        if (filter[search].values) {
                            if (Array.isArray(filter[search].values)) {
                                storageFilter.requestContains.value = filter[search].values.join(' ');
                            } else {
                                storageFilter.requestContains.value = reparse(filter[search].values)[0];
                            }
                        }
                    }
                    if (filter['request-type']) {
                        storageFilter.requestType = filter['request-type'].values[0];
                        GlobalObject.addProperty(`${globalPath}/application/storageFilter`, 'requestType', loc.original, {
                            application: {
                                storageFilter: {
                                    'request-type': null
                                }
                            }
                        });
                    }
                    if (filter['response-code']) {
                        storageFilter.responseCodes = filter['response-code'].values;
                        GlobalObject.addProperty(`${globalPath}/application/storageFilter`, 'responseCodes', loc.original, {
                            application: {
                                storageFilter: {
                                    'response-code': null
                                }
                            }
                        });
                    }

                    rootObj.application.storageFilter = storageFilter;
                }

                // application.storageFormat
                if (obj.format) {
                    const format = obj.format;
                    const formObj = {};
                    GlobalObject.addProperty(`${globalPath}/application`, 'storageFormat', loc.original, {
                        application: {
                            format: null
                        }
                    });
                    if (format['field-delimiter']) {
                        formObj.delimiter = format['field-delimiter'];
                        GlobalObject.addProperty(`${globalPath}/application/storageFormat`, 'delimiter', loc.original, {
                            application: {
                                format: {
                                    'field-delimiter': null
                                }
                            }
                        });
                    }
                    if (format.fields) {
                        formObj.fields = format.fields;
                        GlobalObject.addProperty(`${globalPath}/application/storageFormat`, 'fields', loc.original, {
                            application: {
                                format: {
                                    fields: null
                                }
                            }
                        });
                    }
                    rootObj.application.storageFormat = formObj;
                }
            }

            // network
            if (rootObj.network) {
                const key = Object.keys(rootObj.network)[0];
                const obj = rootObj.network[key];
                const net = {};
                GlobalObject.addProperty(globalPath, 'network', loc.original, { network: null });

                if (obj.publisher) {
                    net.publisher = handleObjectRef(obj.publisher);
                    GlobalObject.addProperty(`${globalPath}/network`, 'publisher', loc.original, {
                        network: {
                            publisher: null
                        }
                    });
                }
                if (obj.format) {
                    GlobalObject.addProperty(`${globalPath}/network`, 'storageFormat', loc.original, {
                        network: {
                            format: null
                        }
                    });
                    if (obj.format['field-list']) {
                        net.storageFormat = { fields: obj.format['field-list'].map((x) => x.replace(/_/g, '-')) };
                    }
                    if (obj.format['user-defined']) {
                        net.storageFormat = unquote(obj.format['user-defined']);
                    }
                }

                if (obj.filter) {
                    if (obj.filter['log-acl-match-accept']) {
                        net.logRuleMatchAccepts = obj.filter['log-acl-match-accept'] === 'enabled';
                        GlobalObject.addProperty(`${globalPath}/network`, 'logRuleMatchAccepts', loc.original, {
                            network: {
                                'log-acl-match-accept': null
                            }
                        });
                    }
                    if (obj.filter['log-acl-match-reject']) {
                        net.logRuleMatchRejects = obj.filter['log-acl-match-reject'] === 'enabled';
                        GlobalObject.addProperty(`${globalPath}/network`, 'logRuleMatchRejects', loc.original, {
                            network: {
                                'log-acl-match-reject': null
                            }
                        });
                    }
                    if (obj.filter['log-acl-match-drop']) {
                        net.logRuleMatchDrops = obj.filter['log-acl-match-drop'] === 'enabled';
                        GlobalObject.addProperty(`${globalPath}/network`, 'logRuleMatchDrops', loc.original, {
                            network: {
                                'log-acl-match-drop': null
                            }
                        });
                    }
                    if (obj.filter['log-ip-errors']) {
                        net.logIpErrors = obj.filter['log-ip-errors'] === 'enabled';
                        GlobalObject.addProperty(`${globalPath}/network`, 'logIpErrors', loc.original, {
                            network: {
                                'log-ip-errors': null
                            }
                        });
                    }
                    if (obj.filter['log-tcp-errors']) {
                        net.logTcpErrors = obj.filter['log-tcp-errors'] === 'enabled';
                        GlobalObject.addProperty(`${globalPath}/network`, 'logTcpErrors', loc.original, {
                            network: {
                                'log-tcp-errors': null
                            }
                        });
                    }
                    if (obj.filter['log-tcp-events']) {
                        net.logTcpEvents = obj.filter['log-tcp-events'] === 'enabled';
                        GlobalObject.addProperty(`${globalPath}/network`, 'logTcpEvents', loc.original, {
                            network: {
                                'log-tcp-events': null
                            }
                        });
                    }
                    if (obj.filter['log-translation-fields']) {
                        net.logTranslationFields = obj.filter['log-translation-fields'] === 'enabled';
                        GlobalObject.addProperty(`${globalPath}/network`, 'logTranslationFields', loc.original, {
                            network: {
                                'log-translation-fields': null
                            }
                        });
                    }
                }

                rootObj.network = net;
            }

            // botDefense
            if (rootObj.botDefense) {
                const botDefense = rootObj.botDefense;
                const botDef = {};
                GlobalObject.addProperty(globalPath, 'botDefense', loc.original, { botDefense: null });

                const fields = botDefense[Object.keys(botDefense)[0]];

                Object.keys(fields.filter).forEach((filterKey) => {
                    botDef[hyphensToCamel(filterKey)] = fields.filter[filterKey] === 'enabled';
                });

                Object.keys(fields).forEach((objKey) => {
                    if (objKey !== 'filter') {
                        botDef[hyphensToCamel(objKey)] = handleObjectRef(fields[objKey]);
                    }
                });

                rootObj.botDefense = botDef;
            }

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // SSH_Proxy_Profile
    'security ssh profile': {
        class: 'SSH_Proxy_Profile',

        customHandling: (rootObj, loc) => {
            const newObj = {};
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            // sshProfileDefaultActions
            if (rootObj.sshProfileDefaultActions) {
                const tempObj = {};
                GlobalObject.addProperty(globalPath, 'sshProfileDefaultActions', loc.original, { sshProfileDefaultActions: null });
                const name = Object.keys(rootObj.sshProfileDefaultActions)[0];
                const keys = Object.keys(rootObj.sshProfileDefaultActions[name]);
                tempObj.name = name;
                for (let i = 0; i < keys.length; i += 1) {
                    const key = keys[i];
                    const newKey = hyphensToCamel(key);
                    tempObj[newKey] = rootObj.sshProfileDefaultActions[name][key];
                    tempObj[newKey].log = tempObj[newKey].log === 'yes';
                }
                rootObj.sshProfileDefaultActions = tempObj;
            }

            // sshProfileRuleSet
            if (rootObj.sshProfileRuleSet) {
                const keys = Object.keys(rootObj.sshProfileRuleSet);
                const tempArr = [];
                GlobalObject.addProperty(globalPath, 'sshProfileRuleSet', loc.original, { sshProfileRuleSet: null });
                for (let i = 0; i < keys.length; i += 1) {
                    const tempObj = {};
                    const name = keys[i];
                    const obj = rootObj.sshProfileRuleSet[name];

                    const custKeys = Object.keys(obj.actions);
                    for (let j = 0; j < custKeys.length; j += 1) {
                        const custKey = custKeys[j];
                        const actionKeys = Object.keys(obj.actions[custKey]);

                        const actions = {};
                        for (let k = 0; k < actionKeys.length; k += 1) {
                            const actionKey = actionKeys[k];
                            const newKey = hyphensToCamel(actionKey);

                            const action = obj.actions[custKey][actionKey];
                            if (action.control !== 'unspecified' && action.log !== 'no') {
                                actions[newKey] = action;
                                actions[newKey].log = actions[newKey].log === 'yes';
                            }
                            actions.name = custKey;
                        }
                        GlobalObject.addProperty(`${globalPath}/sshProfileRuleSet/${i}`, 'name', loc.original, {
                            sshProfileRuleSet: {
                                [i]: {
                                    name: null
                                }
                            }
                        });
                        GlobalObject.addProperty(`${globalPath}/sshProfileRuleSet/${i}`, 'sshProfileRuleActions', loc.original, {
                            sshProfileRuleSet: {
                                [i]: {
                                    actions: null
                                }
                            }
                        });
                        GlobalObject.addProperty(`${globalPath}/sshProfileRuleSet/${i}`, 'remark', loc.original, {
                            sshProfileRuleSet: {
                                [i]: {
                                    description: null
                                }
                            }
                        });
                        GlobalObject.addProperty(`${globalPath}/sshProfileRuleSet/${i}`, 'sshProfileIdGroups', loc.original, {
                            sshProfileRuleSet: {
                                [i]: {
                                    'identity-groups': null
                                }
                            }
                        });
                        GlobalObject.addProperty(`${globalPath}/sshProfileRuleSet/${i}`, 'sshProfileIdUsers', loc.original, {
                            sshProfileRuleSet: {
                                [i]: {
                                    'identity-users': null
                                }
                            }
                        });
                        tempObj.name = name;
                        tempObj.sshProfileRuleActions = actions;
                        tempObj.remark = unquote(obj.description);
                        tempObj.sshProfileIdGroups = reparse(obj['identity-groups']);
                        tempObj.sshProfileIdUsers = reparse(obj['identity-users']);

                        tempArr.push(tempObj);
                    }
                }
                rootObj.sshProfileRuleSet = tempArr;
            }

            // sshProfileAuthInfo
            if (rootObj.sshProfileAuthInfo) {
                const arr = [];
                const keys = Object.keys(rootObj.sshProfileAuthInfo);
                GlobalObject.addProperty(globalPath, 'sshProfileAuthInfo', loc.original, { 'auth-info': null });

                for (let i = 0; i < keys.length; i += 1) {
                    const tempObj = {};
                    const name = keys[i];
                    GlobalObject.addProperty(`${globalPath}/sshProfileAuthInfo/${i}`, 'name', loc.original, {
                        'auth-info': {
                            [i]: {
                                name: null
                            }
                        }
                    });
                    const obj = rootObj.sshProfileAuthInfo[name];
                    tempObj.name = name;

                    // proxyClientAuth
                    if (obj['proxy-client-auth']) {
                        tempObj.proxyClientAuth = {};
                        GlobalObject.addProperty(`${globalPath}/sshProfileAuthInfo/${i}`, 'proxyClientAuth', loc.original, {
                            'auth-info': {
                                [i]: {
                                    'proxy-client-auth': null
                                }
                            }
                        });
                        const privateKey = obj['proxy-client-auth']['private-key'];
                        if (privateKey) {
                            tempObj.proxyClientAuth.privateKey = buildProtectedObj(privateKey);
                            GlobalObject.addProperty(`${globalPath}/sshProfileAuthInfo/${i}/proxyClientAuth`, 'privateKey', loc.original, {
                                'auth-info': {
                                    [i]: {
                                        'proxy-client-auth': {
                                            'private-key': null
                                        }
                                    }
                                }
                            });
                        }
                        const publicKey = obj['proxy-client-auth']['public-key'];
                        if (publicKey) {
                            tempObj.proxyClientAuth.publicKey = unquote(publicKey);
                            GlobalObject.addProperty(`${globalPath}/sshProfileAuthInfo/${i}/proxyClientAuth`, 'privateKey', loc.original, {
                                'auth-info': {
                                    [i]: {
                                        'proxy-client-auth': {
                                            'private-key': null
                                        }
                                    }
                                }
                            });
                        }
                    }

                    // proxyServerAuth
                    if (obj['proxy-server-auth']) {
                        tempObj.proxyServerAuth = {};
                        GlobalObject.addProperty(`${globalPath}/sshProfileAuthInfo/${i}`, 'proxyServerAuth', loc.original, {
                            'auth-info': {
                                [i]: {
                                    'proxy-server-auth': null
                                }
                            }
                        });
                        const privateKey = obj['proxy-server-auth']['private-key'];
                        if (privateKey) {
                            tempObj.proxyServerAuth.privateKey = buildProtectedObj(privateKey);
                            GlobalObject.addProperty(`${globalPath}/sshProfileAuthInfo/${i}/proxyServerAuth`, 'privateKey', loc.original, {
                                'auth-info': {
                                    [i]: {
                                        'proxy-server-auth': {
                                            'private-key': null
                                        }
                                    }
                                }
                            });
                        }
                        const publicKey = obj['proxy-server-auth']['public-key'];
                        if (publicKey) {
                            tempObj.proxyServerAuth.publicKey = unquote(publicKey);
                            GlobalObject.addProperty(`${globalPath}/sshProfileAuthInfo/${i}/proxyServerAuth`, 'publicKey', loc.original, {
                                'auth-info': {
                                    [i]: {
                                        'proxy-server-auth': {
                                            'public-key': null
                                        }
                                    }
                                }
                            });
                        }
                    }

                    // realServerAuth
                    if (obj['real-server-auth']) {
                        tempObj.realServerAuth = {};
                        GlobalObject.addProperty(`${globalPath}/sshProfileAuthInfo/${i}`, 'realServerAuth', loc.original, {
                            'auth-info': {
                                [i]: {
                                    'real-server-auth': null
                                }
                            }
                        });
                        const privateKey = obj['real-server-auth']['private-key'];
                        if (privateKey) {
                            tempObj.realServerAuth.privateKey = {
                                ciphertext: Buffer.from(privateKey).toString('base64'),
                                ignoreChanges: true
                            };
                            GlobalObject.addProperty(`${globalPath}/sshProfileAuthInfo/${i}/realServerAuth`, 'privateKey', loc.original, {
                                'auth-info': {
                                    [i]: {
                                        'real-server-auth': {
                                            'private-key': null
                                        }
                                    }
                                }
                            });
                        }
                        const publicKey = obj['real-server-auth']['public-key'];
                        if (publicKey) {
                            tempObj.realServerAuth.publicKey = unquote(publicKey);
                            GlobalObject.addProperty(`${globalPath}/sshProfileAuthInfo/${i}/realServerAuth`, 'publicKey', loc.original, {
                                'auth-info': {
                                    [i]: {
                                        'real-server-auth': {
                                            'public-key': null
                                        }
                                    }
                                }
                            });
                        }
                    }

                    arr.push(tempObj);
                }
                rootObj.sshProfileAuthInfo = arr;
            }

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    }
};
