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

const sinon = require('sinon');

const assert = require('../testUtils/assert');
const traverseJSON = require('../../src/utils/traverseJSON');

describe('.traverseJSON', () => {
    afterEach(() => {
        sinon.restore();
    });

    const rootObject = {
        array: [
            10,
            20,
            {
                array: [
                    {
                        string: 'string',
                        number: 10
                    },
                    [10],
                    {
                        boolean: true
                    }
                ]
            }
        ],
        object: {
            string: 'string',
            nested: {
                float: 10.10
            }
        }
    };
    const rootArray = [
        [
            10,
            20,
            {
                array: [
                    {
                        string: 'string',
                        number: 10
                    },
                    [10],
                    {
                        boolean: true
                    }
                ]
            }
        ],
        {
            string: 'string',
            nested: {
                float: 10.10
            }
        }
    ];

    it('number of arguments', () => {
        const testObj = { level1: { level2: 10 } };
        traverseJSON(testObj, function cb() {
            assert.lengthOf(arguments, 2, 'should pass 2 arguments when no callback params specified');
        });
        // eslint-disable-next-line no-unused-vars
        traverseJSON(testObj, function cb(parent) {
            assert.lengthOf(arguments, 2, 'should pass 2 arguments when 1 param specified');
        });
        // eslint-disable-next-line no-unused-vars
        traverseJSON(testObj, function cb(parent, key) {
            assert.lengthOf(arguments, 2, 'should pass 2 arguments when 2 param specified');
        });
        // eslint-disable-next-line no-unused-vars
        traverseJSON(testObj, function cb(parent, key, depth) {
            assert.lengthOf(arguments, 3, 'should pass 3 arguments when 3 param specified');
        });
        // eslint-disable-next-line no-unused-vars
        traverseJSON(testObj, function cb(parent, key, depth, stop) {
            assert.lengthOf(arguments, 4, 'should pass 4 arguments when 4 param specified');
        });
        // eslint-disable-next-line no-unused-vars
        traverseJSON(testObj, function cb(parent, key, depth, stop, path) {
            assert.lengthOf(arguments, 5, 'should pass 5 arguments when 5 param specified');
        });
        // eslint-disable-next-line no-unused-vars
        traverseJSON(testObj, function cb(parent, key, depth, stop, path, unknownArg) {
            assert.lengthOf(arguments, 5, 'should pass 5 arguments when 6 param specified');
        });
    });

    it('should be able to process 10_000 nested objects', () => {
        const maxDepth = 10000;
        const root = {};
        let current = root;
        for (let i = 0; i < maxDepth; i += 1) {
            current.level = i;
            current.next = {};
            current = current.next;
        }

        const actualLevels = [];
        traverseJSON(root, (parent, key) => {
            if (key === 'level') {
                actualLevels.push(parent.level);
            }
        });
        assert.lengthOf(actualLevels, maxDepth, 'should traverse all nested objects');
        for (let i = 0; i < maxDepth; i += 1) {
            assert.deepStrictEqual(actualLevels[i], i, 'should traverse object in expected order');
        }
    });

    it('should be able to process 10_000 nested arrays', () => {
        const maxDepth = 10000;
        const root = [];
        let current = root;
        for (let i = 0; i < maxDepth; i += 1) {
            current.push(i);
            current.push([]);
            current = current[current.length - 1];
        }

        const actualLevels = [];
        traverseJSON(root, (parent, key) => {
            if (key === 0) {
                actualLevels.push(parent[key]);
            }
        });
        assert.lengthOf(actualLevels, maxDepth, 'should traverse all nested arrays');
        for (let i = 0; i < maxDepth; i += 1) {
            assert.deepStrictEqual(actualLevels[i], i, 'should traverse object in expected order');
        }
    });

    it('should traverse mixed data (root - object)', () => {
        const root = JSON.parse(JSON.stringify(rootObject));
        const actualHistory = [];
        traverseJSON(root, (parent, key, depth, stop, path) => {
            actualHistory.push([path, key, parent[key], depth]);
        });

        const expectedHistory = [
            // path, key, value, depth
            [[], 'array', root.array, 1],
            [['array'], 0, 10, 2],
            [['array'], 1, 20, 2],
            [['array'], 2, root.array[2], 2],
            [['array', 2], 'array', root.array[2].array, 3],
            [['array', 2, 'array'], 0, root.array[2].array[0], 4],
            [['array', 2, 'array', 0], 'string', 'string', 5],
            [['array', 2, 'array', 0], 'number', 10, 5],
            [['array', 2, 'array'], 1, [10], 4],
            [['array', 2, 'array', 1], 0, 10, 5],
            [['array', 2, 'array'], 2, root.array[2].array[2], 4],
            [['array', 2, 'array', 2], 'boolean', true, 5],
            [[], 'object', root.object, 1],
            [['object'], 'string', 'string', 2],
            [['object'], 'nested', root.object.nested, 2],
            [['object', 'nested'], 'float', 10.10, 3]
        ];
        assert.sameDeepMembers(actualHistory, expectedHistory, 'should traverse all objects');
        assert.deepStrictEqual(root, rootObject, 'should not modify original object');
    });

    it('should traverse mixed data (root - array)', () => {
        const root = JSON.parse(JSON.stringify(rootArray));
        const actualHistory = [];
        traverseJSON(root, (parent, key, depth, stop, path) => {
            actualHistory.push([path, key, parent[key], depth]);
        });

        const expectedHistory = [
            // path, key, value, depth
            [[], 0, root[0], 1],
            [[0], 0, 10, 2],
            [[0], 1, 20, 2],
            [[0], 2, root[0][2], 2],
            [[0, 2], 'array', root[0][2].array, 3],
            [[0, 2, 'array'], 0, root[0][2].array[0], 4],
            [[0, 2, 'array', 0], 'string', 'string', 5],
            [[0, 2, 'array', 0], 'number', 10, 5],
            [[0, 2, 'array'], 1, [10], 4],
            [[0, 2, 'array', 1], 0, 10, 5],
            [[0, 2, 'array'], 2, root[0][2].array[2], 4],
            [[0, 2, 'array', 2], 'boolean', true, 5],
            [[], 1, root[1], 1],
            [[1], 'string', 'string', 2],
            [[1], 'nested', root[1].nested, 2],
            [[1, 'nested'], 'float', 10.10, 3]
        ];
        assert.sameDeepMembers(actualHistory, expectedHistory, 'should traverse all objects');
        assert.deepStrictEqual(root, rootArray, 'should not modify original object');
    });

    it('should sort object keys while travesing data', () => {
        const root = JSON.parse(JSON.stringify(rootObject));
        const actualHistory = [];
        traverseJSON(root, (parent, key, depth, stop, path) => {
            actualHistory.push([path, key, parent[key], depth]);
        }, {
            sortObjKeys: true
        });

        const expectedHistory = [
            // path, key, value, depth
            [[], 'array', root.array, 1],
            [[], 'object', root.object, 1],
            [['object'], 'nested', root.object.nested, 2],
            [['object'], 'string', 'string', 2],
            [['object', 'nested'], 'float', 10.10, 3],
            [['array'], 0, 10, 2],
            [['array'], 1, 20, 2],
            [['array'], 2, root.array[2], 2],
            [['array', 2], 'array', root.array[2].array, 3],
            [['array', 2, 'array'], 0, root.array[2].array[0], 4],
            [['array', 2, 'array', 0], 'number', 10, 5],
            [['array', 2, 'array', 0], 'string', 'string', 5],
            [['array', 2, 'array'], 1, [10], 4],
            [['array', 2, 'array', 1], 0, 10, 5],
            [['array', 2, 'array'], 2, root.array[2].array[2], 4],
            [['array', 2, 'array', 2], 'boolean', true, 5]
        ];
        assert.deepStrictEqual(actualHistory, expectedHistory, 'should traverse all objects');
        assert.deepStrictEqual(root, rootObject, 'should not modify original object');
    });

    it('should stop execution when requested', () => {
        const root = {
            level1: {
                level2: {
                    level3: true
                }
            }
        };
        const actualHistory = [];
        traverseJSON(root, (parent, key, depth, stop, path) => {
            actualHistory.push([path, key]);
            if (key === 'level2') {
                stop();
            }
        });

        const expectedHistory = [
            // path, key
            [[], 'level1'],
            [['level1'], 'level2']
        ];
        assert.sameDeepMembers(actualHistory, expectedHistory, 'should traverse expected objects only');
    });

    it('should not inspect nested data when requested', () => {
        const root = {
            level1_a: {
                level2_a_stop: {
                    level3_a: {
                        level4: true
                    }
                },
                level2_b: {
                    level3: false
                }
            },
            level1_b: {
                level2_a: {
                    level3: true
                },
                level2_b: {
                    level3: false
                }
            }
        };
        const actualHistory = [];
        // eslint-disable-next-line consistent-return
        traverseJSON(root, (parent, key, depth, stop, path) => {
            actualHistory.push([path, key]);
            if (key === 'level2_a_stop') {
                return false;
            }
        });

        const expectedHistory = [
            // path, key
            [[], 'level1_a'],
            [['level1_a'], 'level2_a_stop'],
            [['level1_a'], 'level2_b'],
            [['level1_a', 'level2_b'], 'level3'],
            [[], 'level1_b'],
            [['level1_b'], 'level2_a'],
            [['level1_b', 'level2_a'], 'level3'],
            [['level1_b'], 'level2_b'],
            [['level1_b', 'level2_b'], 'level3']
        ];
        assert.sameDeepMembers(actualHistory, expectedHistory, 'should traverse expected objects only');
    });

    it('should handle circular references', () => {
        const root = JSON.parse(JSON.stringify(rootObject));
        root.object.nested.circular = root;
        const actualHistory = [];

        traverseJSON(root, (parent, key, depth, stop, path) => {
            actualHistory.push([path, key, parent[key], depth]);
        });

        const expectedHistory = [
            // path, key, value, depth
            [[], 'array', root.array, 1],
            [['array'], 0, 10, 2],
            [['array'], 1, 20, 2],
            [['array'], 2, root.array[2], 2],
            [['array', 2], 'array', root.array[2].array, 3],
            [['array', 2, 'array'], 0, root.array[2].array[0], 4],
            [['array', 2, 'array', 0], 'string', 'string', 5],
            [['array', 2, 'array', 0], 'number', 10, 5],
            [['array', 2, 'array'], 1, [10], 4],
            [['array', 2, 'array', 1], 0, 10, 5],
            [['array', 2, 'array'], 2, root.array[2].array[2], 4],
            [['array', 2, 'array', 2], 'boolean', true, 5],
            [[], 'object', root.object, 1],
            [['object'], 'string', 'string', 2],
            [['object'], 'nested', root.object.nested, 2],
            [['object', 'nested'], 'float', 10.10, 3],
            [['object', 'nested'], 'circular', root, 3] // assert should be able to handle circular refs
        ];
        assert.sameDeepMembers(actualHistory, expectedHistory, 'should traverse all objects');
    });

    it('should break circular references (in objects, boolean value)', () => {
        const root = {
            level1: {}
        };
        root.level1.circularRef = root;

        const actualHistory = [];
        traverseJSON(root, { breakCircularRef: true }, (parent, key, depth, stop, path) => {
            actualHistory.push([path, key]);
        });

        const expectedHistory = [
            // path, key
            [[], 'level1'],
            [['level1'], 'circularRef']
        ];
        assert.sameDeepMembers(actualHistory, expectedHistory, 'should traverse expected objects only');
        assert.deepStrictEqual(root, {
            level1: {
                circularRef: true
            }
        }, 'should break circular ref');
    });

    it('should break circular references (in objects, complex value)', () => {
        const root = {
            level1: {}
        };
        root.level1.circularRef = root;

        const actualHistory = [];
        traverseJSON(root, { breakCircularRef: { refBreak: true } }, (parent, key, depth, stop, path) => {
            actualHistory.push([path, key]);
        });

        const expectedHistory = [
            // path, key
            [[], 'level1'],
            [['level1'], 'circularRef']
        ];
        assert.sameDeepMembers(actualHistory, expectedHistory, 'should traverse expected objects only');
        assert.deepStrictEqual(root, {
            level1: {
                circularRef: { refBreak: true }
            }
        }, 'should break circular ref');
    });

    it('should break circular references (no callback)', () => {
        const root = {
            level1: {}
        };
        root.level1.circularRef = root;
        traverseJSON(root, { breakCircularRef: true });
        assert.deepStrictEqual(root, {
            level1: {
                circularRef: true
            }
        }, 'should break circular ref');
    });

    it('should respect maxDepth', () => {
        const root = JSON.parse(JSON.stringify(rootObject));
        root.object.nested.circular = root;

        const actualHistory = [];
        traverseJSON(root, { maxDepth: 2 }, (parent, key, depth, stop, path) => {
            actualHistory.push([path, key, parent[key], depth]);
        });

        const expectedHistory = [
            // path, key, value, depth
            [[], 'array', root.array, 1],
            [['array'], 0, 10, 2],
            [['array'], 1, 20, 2],
            [['array'], 2, root.array[2], 2],
            [[], 'object', root.object, 1],
            [['object'], 'string', 'string', 2],
            [['object'], 'nested', root.object.nested, 2]
        ];
        assert.sameDeepMembers(actualHistory, expectedHistory, 'should traverse expected objects only');
    });

    it('should respect maxDepth (arrays)', () => {
        const root = [[[[[[[[]]]]]]]];

        const actualHistory = [];
        traverseJSON(root, { maxDepth: 2 }, (parent, key, depth, stop, path) => {
            actualHistory.push([path, key, parent[key], depth]);
        });

        const expectedHistory = [
            // path, key, value, depth
            [[], 0, root[0], 1],
            [[0], 0, root[0][0], 2]
        ];
        assert.sameDeepMembers(actualHistory, expectedHistory, 'should traverse expected objects only');
    });

    it('should allow to swap options and callback', () => {
        const root = [[[[[[[[]]]]]]]];

        const actualHistory = [];
        traverseJSON(root, (parent, key, depth, stop, path) => {
            actualHistory.push([path, key, parent[key], depth]);
        }, { maxDepth: 2 });

        const expectedHistory = [
            // path, key, value, depth
            [[], 0, root[0], 1],
            [[0], 0, root[0][0], 2]
        ];
        assert.sameDeepMembers(actualHistory, expectedHistory, 'should traverse expected objects only');
    });

    it('should do nothing when root object is empty array', () => {
        const spy = sinon.spy();
        traverseJSON([], spy);
        assert.isFalse(spy.called, 'should not call callback');
    });

    it('should do nothing when root object is primitive', () => {
        const primitives = [
            0,
            'string',
            true,
            undefined,
            null
        ];
        const spy = sinon.spy();
        primitives.forEach((primitive) => traverseJSON(primitive, spy));
        assert.isFalse(spy.called, 'should not call callback');
    });

    it('should support key renaming', () => {
        const root = {
            level1: {
                level2: {
                    level3: true
                }
            }
        };
        const actualHistory = [];
        traverseJSON(root, (parent, key, depth, stop, path) => {
            actualHistory.push([path, key]);
            if (key === 'level2') {
                const val = parent[key];
                delete parent[key];
                parent.newLevel2 = val;
                return 'newLevel2';
            }
            return null;
        });

        const expectedHistory = [
            // path, key
            [[], 'level1'],
            [['level1'], 'level2'],
            [['level1', 'newLevel2'], 'level3']
        ];
        assert.sameDeepMembers(actualHistory, expectedHistory, 'should traverse renamed objects too');
    });
});
