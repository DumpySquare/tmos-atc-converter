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

const buildProtectedObj = require('../../../util/convert/buildProtectedObj');
const convertToNumberArray = require('../../../util/convert/convertToNumberArray');
const handleObjectRef = require('../../../util/convert/handleObjectRef');
const loadCertsAndKeys = require('../../../util/convert/loadCertsAndKeys');
const returnEmptyObjIfNone = require('../../../util/convert/returnEmptyObjIfNone');
const unquote = require('../../../util/convert/unquote');
const GlobalObject = require('../../../util/globalRenameAndSkippedObject');

const mapAdaptiveDivergence = (rootObj, loc) => {
    const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
    if (rootObj.adaptive) {
        if (rootObj.adaptiveDivergenceType === undefined) {
            rootObj.adaptiveDivergenceType = 'relative';
            GlobalObject.addProperty(globalPath, 'adaptiveDivergenceType', loc.original, { adaptiveDivergenceType: null });
            rootObj.adaptiveDivergenceMilliseconds = rootObj.adaptiveDivergenceMilliseconds || 100;
            GlobalObject.addProperty(globalPath, 'adaptiveDivergenceMilliseconds', loc.original, { adaptiveDivergenceMilliseconds: null });
        }
        if (rootObj.adaptiveDivergenceType === 'absolute') {
            rootObj.adaptiveDivergenceMilliseconds = rootObj.adaptiveDivergencePercentage;
            delete rootObj.adaptiveDivergencePercentage;
            GlobalObject.moveProperty(globalPath, 'adaptiveDivergencePercentage', globalPath, 'adaptiveDivergenceMilliseconds');
        }
    }
    return rootObj;
};

const mapTargetAddressPort = (rootObj, loc) => {
    const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
    if (rootObj.destination) {
        let split = rootObj.destination.split(':');
        const ipv6 = split.length > 2;
        if (ipv6) split = rootObj.destination.split('.');
        rootObj.targetAddress = split[0] === '*' ? '' : split[0];
        const destinationTmshInfo = GlobalObject.getTmshInfo(globalPath, 'destination');
        GlobalObject.moveProperty(globalPath, 'destination', globalPath, 'targetAddress');
        rootObj.targetPort = split[0] === '*' ? 0 : parseInt(split[1], 10) || split[1];
        GlobalObject.addProperty(globalPath, 'targetPort', destinationTmshInfo.tmshHeader, destinationTmshInfo.tmshPath);
        delete rootObj.destination;
    }
    return rootObj;
};

module.exports = {

    // Monitor (DNS)
    'ltm monitor dns': {
        class: 'Monitor',

        customHandling: (rootObj, loc) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj = {};
            rootObj.monitorType = 'dns';
            GlobalObject.addProperty(globalPath, 'monitorType', loc.original, { monitorType: null });
            rootObj = mapTargetAddressPort(rootObj, loc);
            rootObj.upInterval = rootObj.upInterval || 0;
            if (GlobalObject.getTmshInfo(globalPath, 'upInterval') === undefined) {
                GlobalObject.addProperty(globalPath, 'upInterval', loc.original, { upInterval: null });
            }
            rootObj.transparent = rootObj.transparent || false;
            if (GlobalObject.getTmshInfo(globalPath, 'transparent') === undefined) {
                GlobalObject.addProperty(globalPath, 'transparent', loc.original, { transparent: null });
            }
            rootObj.reverse = rootObj.reverse || false;
            if (GlobalObject.getTmshInfo(globalPath, 'reverse') === undefined) {
                GlobalObject.addProperty(globalPath, 'reverse', loc.original, { reverse: null });
            }

            rootObj = mapAdaptiveDivergence(rootObj, loc);

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Monitor (External)
    'ltm monitor external': {
        class: 'Monitor',

        customHandling: (rootObj, loc) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj = {};
            rootObj.monitorType = 'external';
            GlobalObject.addProperty(globalPath, 'monitorType', loc.original, { monitorType: null });

            if (rootObj.pathname === undefined) {
                rootObj.pathname = 'none';
                GlobalObject.addProperty(globalPath, 'pathname', loc.original, { pathname: null });
            }

            delete rootObj.destination;
            GlobalObject.deleteProperty(globalPath, 'destination');

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Monitor (FTP)
    'ltm monitor ftp': {
        class: 'Monitor',

        keyValueRemaps: {
            passphrase: (key, val) => ({ passphrase: buildProtectedObj(val) }),

            protocol: (key, val) => ({ mode: val })
        },

        customHandling: (rootObj, loc) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj = {};
            rootObj.monitorType = 'ftp';
            GlobalObject.addProperty(globalPath, 'monitorType', loc.original, { monitorType: null });
            // destination
            rootObj = mapTargetAddressPort(rootObj, loc);

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Monitor (HTTP)
    'ltm monitor http': {
        class: 'Monitor',

        keyValueRemaps: {
            passphrase: (key, val) => ({ passphrase: buildProtectedObj(val) }),

            receive: (key, val) => ({ receive: (val === 'none') ? '' : unquote(val) }),

            receiveDown: (key, val) => returnEmptyObjIfNone(val, { receiveDown: unquote(val) }),

            send: (key, val) => ({ send: val === 'none' ? '' : unquote(val) })
        },

        customHandling: (rootObj, loc) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj = {};
            rootObj.monitorType = 'http';
            GlobalObject.addProperty(globalPath, 'monitorType', loc.original, { monitorType: null });
            rootObj = mapAdaptiveDivergence(rootObj, loc);
            rootObj = mapTargetAddressPort(rootObj, loc);
            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Monitor (HTTP2)
    'ltm monitor http2': {
        class: 'Monitor',

        keyValueRemaps: {
            clientTLS: (key, val) => returnEmptyObjIfNone(val, { clientTLS: handleObjectRef(val) }),

            passphrase: (key, val) => ({ passphrase: buildProtectedObj(val) }),

            receive: (key, val) => ({ receive: (val === 'none') ? '' : unquote(val) }),

            receiveDown: (key, val) => returnEmptyObjIfNone(val, { receiveDown: unquote(val) }),

            send: (key, val) => ({ send: val === 'none' ? '' : unquote(val) })
        },

        customHandling: (rootObj, loc) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj = {};
            rootObj.monitorType = 'http2';
            GlobalObject.addProperty(globalPath, 'monitorType', loc.original, { monitorType: null });

            // destination
            rootObj = mapTargetAddressPort(rootObj, loc);

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Monitor (HTTPS)
    'ltm monitor https': {
        class: 'Monitor',

        keyValueRemaps: {
            clientTLS: (key, val) => returnEmptyObjIfNone(val, { clientTLS: handleObjectRef(val) }),

            passphrase: (key, val) => ({ passphrase: buildProtectedObj(val) }),

            receive: (key, val) => ({ receive: (val === 'none') ? '' : unquote(val) }),

            receiveDown: (key, val) => returnEmptyObjIfNone(val, { receiveDown: unquote(val) }),

            send: (key, val) => ({ send: val === 'none' ? '' : unquote(val) })
        },

        customHandling: (rootObj, loc, file) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj = {};
            rootObj.monitorType = 'https';
            GlobalObject.addProperty(globalPath, 'monitorType', loc.original, { monitorType: null });

            if (rootObj.clientCertificate) {
                const cert = loadCertsAndKeys(rootObj.clientCertificate, loc, file);
                rootObj.clientCertificate = cert.name;
                delete rootObj.key;
                GlobalObject.deleteProperty(globalPath, 'key', 'RenamedProperty');
            }

            rootObj = mapTargetAddressPort(rootObj, loc);
            rootObj.upInterval = rootObj.upInterval || 0;
            if (GlobalObject.getTmshInfo(globalPath, 'upInterval') === undefined) {
                GlobalObject.addProperty(globalPath, 'upInterval', loc.original, { upInterval: null });
            }
            rootObj.transparent = rootObj.transparent || false;
            if (GlobalObject.getTmshInfo(globalPath, 'transparent') === undefined) {
                GlobalObject.addProperty(globalPath, 'transparent', loc.original, { transparent: null });
            }

            rootObj.reverse = rootObj.reverse || false;
            if (GlobalObject.getTmshInfo(globalPath, 'reverse') === undefined) {
                GlobalObject.addProperty(globalPath, 'reverse', loc.original, { reverse: null });
            }

            rootObj = mapAdaptiveDivergence(rootObj, loc);

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Monitor (ICMP)
    'ltm monitor gateway-icmp': {
        class: 'Monitor',

        customHandling: (rootObj, loc) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj = {};
            rootObj.monitorType = 'icmp';
            GlobalObject.addProperty(globalPath, 'monitorType', loc.original, { monitorType: null });

            rootObj = mapTargetAddressPort(rootObj, loc);
            delete rootObj.targetPort;
            GlobalObject.deleteProperty(globalPath, 'targetPort', 'RenamedProperty');

            // default values (not explicit in conf)
            rootObj.upInterval = rootObj.upInterval || 0;
            if (GlobalObject.getTmshInfo(globalPath, 'upInterval') === undefined) {
                GlobalObject.addProperty(globalPath, 'upInterval', loc.original, { upInterval: null });
            }
            rootObj.transparent = rootObj.transparent || false;
            if (GlobalObject.getTmshInfo(globalPath, 'transparent') === undefined) {
                GlobalObject.addProperty(globalPath, 'transparent', loc.original, { transparent: null });
            }

            rootObj = mapAdaptiveDivergence(rootObj, loc);

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Monitor (LDAP)
    'ltm monitor ldap': {
        class: 'Monitor',

        keyValueRemaps: {
            codesUp: (key, val, options, path) => {
                GlobalObject.moveProperty(path, key, path, 'filter');
                return { filter: val };
            },

            passphrase: (key, val) => ({ passphrase: buildProtectedObj(val) })
        },

        customHandling: (rootObj, loc) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj = {};
            rootObj.monitorType = 'ldap';
            GlobalObject.addProperty(globalPath, 'monitorType', loc.original, { monitorType: null });
            // destination
            rootObj = mapTargetAddressPort(rootObj, loc);

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Monitor (MYSQL)
    'ltm monitor mysql': {
        class: 'Monitor',

        keyValueRemaps: {
            passphrase: (key, val) => ({ passphrase: buildProtectedObj(val) }),

            receive: (key, val) => returnEmptyObjIfNone(val, { receive: unquote(val) }),

            send: (key, val) => ({ send: val === 'none' ? '' : unquote(val) })
        },

        customHandling: (rootObj, loc) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj = {};
            rootObj.monitorType = 'mysql';
            GlobalObject.addProperty(globalPath, 'monitorType', loc.original, { monitorType: null });
            // destination
            rootObj = mapTargetAddressPort(rootObj, loc);

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Monitor (PostgreSQL)
    'ltm monitor postgresql': {
        class: 'Monitor',

        keyValueRemaps: {
            passphrase: (key, val) => ({ passphrase: buildProtectedObj(val) })
        },

        customHandling: (rootObj, loc) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj = {};
            rootObj.monitorType = 'postgresql';
            GlobalObject.addProperty(globalPath, 'monitorType', loc.original, { monitorType: null });

            rootObj = mapTargetAddressPort(rootObj, loc);

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Monitor (RADIUS)
    'ltm monitor radius': {
        class: 'Monitor',

        keyValueRemaps: {
            passphrase: (key, val) => ({ passphrase: buildProtectedObj(val) }),

            secret: (key, val) => ({ secret: buildProtectedObj(val) })
        },

        customHandling: (rootObj, loc) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj = {};
            rootObj.monitorType = 'radius';
            GlobalObject.addProperty(globalPath, 'monitorType', loc.original, { monitorType: null });

            rootObj = mapTargetAddressPort(rootObj, loc);

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Monitor (SIP)
    'ltm monitor sip': {
        class: 'Monitor',

        customHandling: (rootObj, loc, file) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj = {};
            rootObj.monitorType = 'sip';
            GlobalObject.addProperty(globalPath, 'monitorType', loc.original, { monitorType: null });

            if (rootObj.clientCertificate) {
                const cert = loadCertsAndKeys(rootObj.clientCertificate, loc, file);
                rootObj.clientCertificate = cert.name;
                delete rootObj.key;
                GlobalObject.deleteProperty(globalPath, 'key', 'RenamedProperty');
            }

            rootObj = mapTargetAddressPort(rootObj, loc);
            newObj[loc.profile] = rootObj;
            return newObj;
        },

        keyValueRemaps: {
            codesUp: (key, val) => ({ codesUp: convertToNumberArray(unquote(val)) }),

            codesDown: (key, val) => ({ codesDown: convertToNumberArray(unquote(val)) }),

            headers: (key, val) => ({ headers: unquote(val).replace(/\\/g, '') })
        }
    },

    // Monitor (SMTP)
    'ltm monitor smtp': {
        class: 'Monitor',

        customHandling: (rootObj, loc) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj = {};
            rootObj.monitorType = 'smtp';
            GlobalObject.addProperty(globalPath, 'monitorType', loc.original, { monitorType: null });

            if (rootObj.domain === undefined) {
                rootObj.domain = 'none';
                GlobalObject.addProperty(globalPath, 'domain', loc.original, { domain: null });
            }

            delete rootObj.destination;
            GlobalObject.deleteProperty(globalPath, 'destination');

            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Monitor (TCP)
    'ltm monitor tcp': {
        class: 'Monitor',

        keyValueRemaps: {
            receive: (key, val) => ({ receive: val === 'none' ? '' : unquote(val) }),

            receiveDown: (key, val) => ({ receiveDown: val === 'none' ? '' : unquote(val) }),

            send: (key, val) => ({ send: val === 'none' ? '' : unquote(val) })
        },

        customHandling: (rootObj, loc) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj = {};
            rootObj.monitorType = 'tcp';
            GlobalObject.addProperty(globalPath, 'monitorType', loc.original, { monitorType: null });

            rootObj = mapTargetAddressPort(rootObj, loc);
            rootObj.upInterval = rootObj.upInterval || 0;
            if (GlobalObject.getTmshInfo(globalPath, 'upInterval') === undefined) {
                GlobalObject.addProperty(globalPath, 'upInterval', loc.original, { upInterval: null });
            }
            rootObj.transparent = rootObj.transparent || false;
            if (GlobalObject.getTmshInfo(globalPath, 'transparent') === undefined) {
                GlobalObject.addProperty(globalPath, 'transparent', loc.original, { transparent: null });
            }
            rootObj.reverse = rootObj.reverse || false;
            if (GlobalObject.getTmshInfo(globalPath, 'reverse') === undefined) {
                GlobalObject.addProperty(globalPath, 'reverse', loc.original, { reverse: null });
            }
            rootObj = mapAdaptiveDivergence(rootObj, loc);

            if (rootObj.send) {
                rootObj.send = rootObj.send.replace(/\\r/g, '\r').replace(/\\n/g, '\n');
            }
            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Monitor (TCP-Half-Open)
    'ltm monitor tcp-half-open': {
        class: 'Monitor',

        customHandling: (rootObj, loc) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj = {};
            rootObj.monitorType = 'tcp-half-open';
            GlobalObject.addProperty(globalPath, 'monitorType', loc.original, { monitorType: null });

            rootObj = mapTargetAddressPort(rootObj, loc);
            rootObj.upInterval = rootObj.upInterval || 0;
            if (GlobalObject.getTmshInfo(globalPath, 'upInterval') === undefined) {
                GlobalObject.addProperty(globalPath, 'upInterval', loc.original, { upInterval: null });
            }
            rootObj.transparent = rootObj.transparent || false;
            if (GlobalObject.getTmshInfo(globalPath, 'transparent') === undefined) {
                GlobalObject.addProperty(globalPath, 'transparent', loc.original, { transparent: null });
            }
            newObj[loc.profile] = rootObj;
            return newObj;
        }
    },

    // Monitor (UDP)
    'ltm monitor udp': {
        class: 'Monitor',

        keyValueRemaps: {
            receive: (key, val) => ({ receive: val === 'none' ? '' : unquote(val) }),

            receiveDown: (key, val) => ({ receiveDown: val === 'none' ? '' : unquote(val) }),

            send: (key, val) => ({ send: val === 'none' ? '' : unquote(val) })
        },

        customHandling: (rootObj, loc) => {
            const globalPath = `/${loc.tenant}/${loc.app}/${loc.profile}`;
            const newObj = {};
            rootObj.monitorType = 'udp';
            GlobalObject.addProperty(globalPath, 'monitorType', loc.original, { monitorType: null });

            rootObj = mapTargetAddressPort(rootObj, loc);

            rootObj.upInterval = rootObj.upInterval || 0;
            if (GlobalObject.getTmshInfo(globalPath, 'upInterval') === undefined) {
                GlobalObject.addProperty(globalPath, 'upInterval', loc.original, { upInterval: null });
            }
            rootObj.transparent = rootObj.transparent || false;
            if (GlobalObject.getTmshInfo(globalPath, 'transparent') === undefined) {
                GlobalObject.addProperty(globalPath, 'transparent', loc.original, { transparent: null });
            }
            rootObj.reverse = rootObj.reverse || false;
            if (GlobalObject.getTmshInfo(globalPath, 'reverse') === undefined) {
                GlobalObject.addProperty(globalPath, 'reverse', loc.original, { reverse: null });
            }
            rootObj = mapAdaptiveDivergence(rootObj, loc);

            if (rootObj.send) {
                rootObj.send = rootObj.send.replace(/\\r/g, '\r').replace(/\\n/g, '\n');
            }
            newObj[loc.profile] = rootObj;
            return newObj;
        }
    }
};
