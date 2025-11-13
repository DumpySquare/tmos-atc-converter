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

const assert = require('../testUtils/assert');
const objectUtil = require('../../src/util/object');

describe('Object Utils (src/utils/object.js', () => {
    describe('.cloneDeep', () => {
        it('should recursively clone value', () => {
            const origin = { a: { b: 10 } };
            const copy = objectUtil.cloneDeep(origin);
            origin.a.d = 20;

            assert.deepStrictEqual(
                origin,
                {
                    a: {
                        b: 10,
                        d: 20
                    }
                }
            );
            assert.deepStrictEqual(
                copy,
                {
                    a: {
                        b: 10
                    }
                },
                'should recursively clone value'
            );
        });
    });

    describe('.get()', () => {
        it('should get the value at path of object', () => {
            const testSets = [
                {
                    data: {
                        a: 10,
                        b: [10, { d: 10 }],
                        3.14: 3.14,
                        3.15: { n: 10 }
                    },
                    validPaths: [
                        ['a', 10],
                        [['a'], 10],
                        ['b', [10, { d: 10 }]],
                        ['b.0', 10],
                        ['b.1.d', 10],
                        [3.14, 3.14],
                        ['3.14', 3.14],
                        [[3.15, 'n'], 10]
                    ],
                    invalidPaths: [
                        'c',
                        ['c'],
                        ['b.0'],
                        '3.15.n',
                        'b.2.d'
                    ]
                },
                {
                    data: [10],
                    validPaths: [
                        ['0', 10],
                        [['0'], 10],
                        [0, 10],
                        [[0], 10]
                    ],
                    invalidPaths: [
                        '1',
                        ['1'],
                        1,
                        [1]
                    ]
                }
            ];
            testSets.forEach((testSet) => {
                (testSet.validPaths || []).forEach((valid) => assert.deepStrictEqual(
                    objectUtil.get(testSet.data, valid[0]),
                    valid[1],
                    `should return the resolved value '${valid[1]}' for valid path '${valid[0]}'`
                ));
                (testSet.invalidPaths || []).forEach((invalid) => assert.deepStrictEqual(
                    objectUtil.get(testSet.data, invalid),
                    undefined,
                    `should return undefined for invalid path '${invalid}'`
                ));
            });
        });

        it('should allow to set separator', () => {
            const data = { a: { b: [{ c: 10 }] } };
            assert.deepStrictEqual(
                objectUtil.get(data, 'a:b:0:c', { separator: ':' }),
                10,
                'should return the resolved value'
            );
            assert.deepStrictEqual(
                objectUtil.get(data, ':a:b:0:c', { separator: ':' }),
                10,
                'should return the resolved value and strip leading separator'
            );
            assert.deepStrictEqual(
                objectUtil.get(data, ':a:b:0:c:', { separator: ':' }),
                10,
                'should return the resolved value and strip trailing separator'
            );
        });

        it('should allow to set path depth', () => {
            const data = { a: { b: [{ c: 10 }] } };
            assert.deepStrictEqual(
                objectUtil.get(data, 'a:b:0:c', { depth: 3, separator: ':' }),
                { c: 10 },
                'should return the resolved value'
            );
            // depth 0 -> empty path
            assert.deepStrictEqual(
                objectUtil.get(data, 'a:b:0:c', { depth: 0, separator: ':' }),
                undefined,
                'should return undefined for path with depth === 0'
            );
            assert.deepStrictEqual(
                objectUtil.get(data, 'a:b:0:c', { depth: 100, separator: ':' }),
                10,
                'should return the resolved value'
            );
            assert.deepStrictEqual(
                objectUtil.get(data, 'a.b.0.c', { depth: 3 }),
                10,
                'should return the resolved value and ignore depth when no separator specified and path is string'
            );
            assert.deepStrictEqual(
                objectUtil.get(data, ['a', 'b', '0', 'c'], { depth: 3 }),
                { c: 10 },
                'should return the resolved value and respect depth when no separator specified and path is array'
            );
        });

        it('should use TMOS separator', () => {
            const data = { a: { b: [{ c: 10 }] } };
            assert.deepStrictEqual(
                objectUtil.get(data, '/a/b/0/c', { tmosPath: true }),
                10,
                'should return the resolved value'
            );
            assert.deepStrictEqual(
                objectUtil.get(data, '/a/b/0/c/', { tmosPath: true }),
                10,
                'should return the resolved value (with trailing separator)'
            );
            assert.deepStrictEqual(
                objectUtil.get(data, 'a/b/0/c', { tmosPath: true }),
                10,
                'should return the resolved value (without leading separator)'
            );
            assert.deepStrictEqual(
                objectUtil.get(data, ':a:b:0:c', { tmosPath: true }),
                undefined,
                'should return undefinde when unable to resolve the path'
            );
            assert.deepStrictEqual(
                objectUtil.get(data, '/a/b/0/c', { tmosPath: true, separator: ':', depth: 3 }),
                { c: 10 },
                'should return the resolved value, respect depth value and ignore customer separator when tmosPath === true'
            );
        });

        it('should get default value if the path does not exist', () => {
            const data = { a: 10 };
            assert.deepStrictEqual(
                objectUtil.get(data, 'b', { default: 30 }),
                30,
                'should return default value when the path does not exist'
            );
            assert.isUndefined(
                objectUtil.get(data, 'b'),
                'should return undefined value when the path does not exist'
            );
        });

        it('should get default value if the path does not exist (as func arg)', () => {
            const data = { a: 10 };
            assert.deepStrictEqual(
                objectUtil.get(data, 'b', null),
                null,
                'should return default value when the path does not exist'
            );
            assert.deepStrictEqual(
                objectUtil.get(data, 'b', []),
                [],
                'should return default value when the path does not exist'
            );
            assert.deepStrictEqual(
                objectUtil.get(data, 'b', 30),
                30,
                'should return default value when the path does not exist'
            );
            assert.isUndefined(
                objectUtil.get(data, 'b'),
                'should return undefined value when the path does not exist'
            );
        });
    });

    describe('.has()', () => {
        it('should check the path of object', () => {
            const testSets = [
                {
                    data: {
                        a: 10,
                        b: [10, { d: 10 }],
                        3.14: 3.14,
                        3.15: { n: 10 }
                    },
                    validPaths: [
                        'a',
                        ['a'],
                        'b',
                        'b.0',
                        'b.1.d',
                        3.14,
                        '3.14',
                        [3.15, 'n']
                    ],
                    invalidPaths: [
                        'c',
                        ['c'],
                        ['b.0'],
                        '3.15.n',
                        'b.2.d'
                    ]
                },
                {
                    data: [10],
                    validPaths: [
                        '0',
                        ['0'],
                        0,
                        [0]
                    ],
                    invalidPaths: [
                        '1',
                        ['1'],
                        1,
                        [1]
                    ]
                }
            ];
            testSets.forEach((testSet) => {
                (testSet.validPaths || []).forEach((valid) => assert.isTrue(
                    objectUtil.has(testSet.data, valid),
                    `should return true for valid path '${valid}'`
                ));
                (testSet.invalidPaths || []).forEach((invalid) => assert.isFalse(
                    objectUtil.has(testSet.data, invalid),
                    `should return false for invalid path '${invalid}'`
                ));
            });
        });

        it('should allow to set separator', () => {
            const data = { a: { b: [{ c: 10 }] } };
            assert.isTrue(
                objectUtil.has(data, 'a:b:0:c', { separator: ':' }),
                'should return true when path resolved'
            );
            assert.isTrue(
                objectUtil.has(data, ':a:b:0:c', { separator: ':' }),
                'should return true when path resolved, strip leading separator'
            );
            assert.isTrue(
                objectUtil.has(data, ':a:b:0:c:', { separator: ':' }),
                'should return true when path resolved, strip leading and trailing separator'
            );
        });

        it('should allow to set path depth', () => {
            const data = { a: { b: [{ c: 10 }] } };
            assert.isTrue(
                objectUtil.has(data, 'a:b:0:c', { depth: 3, separator: ':' }),
                'should return true when path resolved'
            );
            // depth 0 -> empty path
            assert.isFalse(
                objectUtil.has(data, 'a:b:0:c', { depth: 0, separator: ':' }),
                'should return false for path with depth === 0'
            );
            assert.isTrue(
                objectUtil.has(data, 'a:b:0:c', { depth: 100, separator: ':' }),
                'should return true when path resolved'
            );
            assert.isTrue(
                objectUtil.has(data, 'a.b.0.c', { depth: 3 }),
                'should return true when path resolved, ignore depth when no separator specified and path is string'
            );
            assert.isTrue(
                objectUtil.has(data, ['a', 'b', '0', 'c'], { depth: 3 }),
                'should return true when path resolved, respect depth when no separator specified and path is array'
            );
        });

        it('should use TMOS separator', () => {
            const data = { a: { b: [{ c: 10 }] } };
            assert.isTrue(
                objectUtil.has(data, '/a/b/0/c', { tmosPath: true }),
                'should return true when path resolved'
            );
            assert.isTrue(
                objectUtil.has(data, '/a/b/0/c/', { tmosPath: true }),
                'should return true when path resolved (with trailing separator)'
            );
            assert.isTrue(
                objectUtil.has(data, 'a/b/0/c', { tmosPath: true }),
                'should return true when path resolved (without leading separator)'
            );
            assert.isFalse(
                objectUtil.has(data, ':a:b:0:c', { tmosPath: true }),
                'should return false when unable to resolve the path'
            );
            assert.isTrue(
                objectUtil.has(data, '/a/b/0/c', { tmosPath: true, separator: ':', depth: 3 }),
                'should return true when path resolved, respect depth value and ignore customer separator when tmosPath === true'
            );
        });
    });

    describe('.uniqueProperty()', () => {
        it('should generate unique property name', () => {
            const obj = {
                test: 0,
                test_1: 1,
                test_2: 2,
                test_3: 3
            };
            assert.deepStrictEqual(
                objectUtil.uniqueProperty('test_10', obj),
                'test_10',
                'should return unique key'
            );
            assert.deepStrictEqual(
                objectUtil.uniqueProperty('some_key', obj),
                'some_key',
                'should return unique key'
            );
            assert.deepStrictEqual(
                objectUtil.uniqueProperty('test', obj),
                'test_4',
                'should return unique key'
            );
        });
    });

    describe('.set()', () => {
        it('should set the value at the path of object', () => {
            const testSets = [
                {
                    data: {
                        a: 10,
                        b: [10, { d: 10 }],
                        3.14: 3.14,
                        3.15: { n: 10 }
                    },
                    validPaths: [
                        'a',
                        ['a'],
                        'b',
                        'b.1.d',
                        3.14,
                        '3.14',
                        [3.15, 'n']
                    ],
                    newPaths: [
                        'd',
                        ['d'],
                        ['3.15', 'm'],
                        ['3.15', 'm', 'mm']
                    ],
                    newValues: [
                        undefined,
                        55,
                        'fifty-five',
                        {},
                        { x: 55 },
                        { x: { y: 555 } },
                        { x: { z: [555, 5555] } },
                        [],
                        ['fifty', 'five'],
                        ['fifty', { z: [555, 5555] }]
                    ]
                }
            ];

            // the path already exists
            testSets.forEach((testSetValidPath) => {
                (testSetValidPath.validPaths || []).forEach((validPath) => {
                    (testSetValidPath.newValues || []).forEach((newValue) => {
                        const data1 = objectUtil.cloneDeep(testSetValidPath.data);
                        assert.isTrue(
                            objectUtil.has(data1, validPath),
                            `should have a value for the valid path '${validPath}'`
                        );

                        // check that the object has the modified part
                        const newData = objectUtil.set(data1, validPath, newValue);
                        assert.deepStrictEqual(
                            newValue,
                            objectUtil.get(data1, validPath),
                            'should return the value that was just set'
                        );

                        // check that the rest of the object has not changed
                        const data2 = objectUtil.cloneDeep(testSetValidPath.data);
                        objectUtil.unset(data2, validPath);
                        objectUtil.unset(newData, validPath);
                        assert.deepStrictEqual(
                            newData,
                            data2,
                            'only newly "set" part of the data can be different'
                        );
                    });
                });

                // the path does not exist
                testSets.forEach((testSetInvalidPath) => {
                    (testSetInvalidPath.newPaths || []).forEach((newPath) => {
                        (testSetInvalidPath.newValues || []).forEach((newValue) => {
                            const data1 = objectUtil.cloneDeep(testSetInvalidPath.data);
                            assert.isFalse(
                                objectUtil.has(data1, newPath),
                                `should not have value for the new path '${newPath}'`
                            );

                            // check that the object has the modified part
                            const newData = objectUtil.set(data1, newPath, newValue);
                            assert.deepStrictEqual(
                                newValue,
                                objectUtil.get(newData, newPath),
                                'should return the value that was just set'
                            );

                            // check that the rest of the object has not changed
                            const data2 = objectUtil.cloneDeep(testSetInvalidPath.data);
                            objectUtil.unset(newData, newPath);
                            // special case, delete not only the leaf but also the new intermediary
                            if (Array.isArray(newPath) && newPath.length === 3
                                && newPath[0] === '3.15' && newPath[1] === 'm' && newPath[2] === 'mm') {
                                objectUtil.unset(newData, ['3.15', 'm']);
                            }
                            assert.deepStrictEqual(
                                newData,
                                data2,
                                'only newly "set" part of data can be different'
                            );
                        });
                    });
                });
            });
        });
    });

    describe('.unset()', () => {
        it('should get the value at path of object', () => {
            const testSets = [
                {
                    data: {
                        a: 10,
                        b: [10, { d: 10 }],
                        3.14: 3.14,
                        3.15: { n: 10 }
                    },
                    arrayPaths: [
                        'b.0',
                        ['b', 0]
                    ],
                    invalidPath: [
                        'd',
                        ['d'],
                        'b.2.c',
                        ['b', '2', 'c'],
                        'b.1.c',
                        ['b', '1', 'c']
                    ],
                    validPaths: [
                        'a',
                        ['a'],
                        'b',
                        'b.1.d',
                        3.14,
                        '3.14',
                        [3.15, 'n']
                    ]
                }
            ];
            testSets.forEach((testSet) => {
                (testSet.validPaths || []).forEach((valid) => {
                    const data = objectUtil.cloneDeep(testSet.data);
                    assert.isTrue(
                        objectUtil.has(data, valid),
                        `should have value for valid path '${valid}'`
                    );
                    assert.isTrue(
                        objectUtil.unset(data, valid),
                        `should unset value for valid path '${valid}'`
                    );
                    assert.isFalse(
                        objectUtil.has(data, valid),
                        `should unset value for valid path '${valid}'`
                    );
                });
                // should not be able to unset data for arrays
                (testSet.arrayPaths || []).forEach((valid) => {
                    const data = objectUtil.cloneDeep(testSet.data);
                    assert.isTrue(
                        objectUtil.has(data, valid),
                        `should have value for item in Array path '${valid}'`
                    );
                    objectUtil.unset(data, valid);
                    assert.isTrue(
                        objectUtil.has(data, valid),
                        `should have value for item in Array path '${valid}'`
                    );
                });
                (testSet.invalidPath || []).forEach((valid) => {
                    const data = objectUtil.cloneDeep(testSet.data);
                    assert.isFalse(
                        objectUtil.has(data, valid),
                        `should not have value for invalid path '${valid}'`
                    );
                    objectUtil.unset(data, valid);
                    assert.isFalse(
                        objectUtil.has(data, valid),
                        `should not unset value for invalid path '${valid}'`
                    );
                });
            });
        });

        it('should allow to set separator', () => {
            const testSets = [
                {
                    data: {
                        a: 10,
                        b: [10, { d: 10 }],
                        3.14: 3.14,
                        3.15: { n: 10 }
                    },
                    arrayPaths: [
                        'b:0',
                        ':b:0:'
                    ],
                    invalidPath: [
                        'd',
                        ':d:',
                        'b:2:c',
                        ':b:2:c:',
                        'b:1:c',
                        ':b:1:c:'
                    ],
                    validPaths: [
                        'a',
                        'a:',
                        ':b',
                        ':b:1:d',
                        3.14,
                        ':3.14:',
                        ':3.15:n'
                    ]
                }
            ];
            testSets.forEach((testSet) => {
                (testSet.validPaths || []).forEach((valid) => {
                    const data = objectUtil.cloneDeep(testSet.data);
                    assert.isTrue(
                        objectUtil.has(data, valid, { separator: ':' }),
                        `should have value for valid path '${valid}'`
                    );
                    assert.isTrue(
                        objectUtil.unset(data, valid, { separator: ':' }),
                        `should unset value for valid path '${valid}'`
                    );
                    assert.isFalse(
                        objectUtil.has(data, valid, { separator: ':' }),
                        `should unset value for valid path '${valid}'`
                    );
                });
                // should not be able to unset data for arrays
                (testSet.arrayPaths || []).forEach((valid) => {
                    const data = objectUtil.cloneDeep(testSet.data);
                    assert.isTrue(
                        objectUtil.has(data, valid, { separator: ':' }),
                        `should have value for item in Array path '${valid}'`
                    );
                    objectUtil.unset(data, valid, { separator: ':' });
                    assert.isTrue(
                        objectUtil.has(data, valid, { separator: ':' }),
                        `should have value for item in Array path '${valid}'`
                    );
                });
                (testSet.invalidPath || []).forEach((valid) => {
                    const data = objectUtil.cloneDeep(testSet.data);
                    assert.isFalse(
                        objectUtil.has(data, valid, { separator: ':' }),
                        `should not have value for invalid path '${valid}'`
                    );
                    objectUtil.unset(data, valid, { separator: ':' });
                    assert.isFalse(
                        objectUtil.has(data, valid, { separator: ':' }),
                        `should not unset value for invalid path '${valid}'`
                    );
                });
            });
        });

        it('should use TMOS separator', () => {
            const testSets = [
                {
                    data: {
                        a: 10,
                        b: [10, { d: 10 }],
                        3.14: 3.14,
                        3.15: { n: 10 }
                    },
                    arrayPaths: [
                        'b/0',
                        '/b/0/'
                    ],
                    invalidPath: [
                        'd',
                        '/d/',
                        'b/2/c',
                        '/b/2/c/',
                        'b/1/c',
                        '/b/1/c/'
                    ],
                    validPaths: [
                        'a',
                        'a/',
                        '/b',
                        '/b/1/d',
                        3.14,
                        '/3.14/',
                        '/3.15/n'
                    ]
                }
            ];
            testSets.forEach((testSet) => {
                (testSet.validPaths || []).forEach((valid) => {
                    const data = objectUtil.cloneDeep(testSet.data);
                    assert.isTrue(
                        objectUtil.has(data, valid, { tmosPath: true }),
                        `should have value for valid path '${valid}'`
                    );
                    assert.isTrue(
                        objectUtil.unset(data, valid, { tmosPath: true }),
                        `should unset value for valid path '${valid}'`
                    );
                    assert.isFalse(
                        objectUtil.has(data, valid, { tmosPath: true }),
                        `should unset value for valid path '${valid}'`
                    );
                });
                // should not be able to unset data for arrays
                (testSet.arrayPaths || []).forEach((valid) => {
                    const data = objectUtil.cloneDeep(testSet.data);
                    assert.isTrue(
                        objectUtil.has(data, valid, { tmosPath: true }),
                        `should have value for item in Array path '${valid}'`
                    );
                    objectUtil.unset(data, valid, { tmosPath: true });
                    assert.isTrue(
                        objectUtil.has(data, valid, { tmosPath: true }),
                        `should have value for item in Array path '${valid}'`
                    );
                });
                (testSet.invalidPath || []).forEach((valid) => {
                    const data = objectUtil.cloneDeep(testSet.data);
                    assert.isFalse(
                        objectUtil.has(data, valid, { tmosPath: true }),
                        `should not have value for invalid path '${valid}'`
                    );
                    objectUtil.unset(data, valid, { tmosPath: true });
                    assert.isFalse(
                        objectUtil.has(data, valid, { tmosPath: true }),
                        `should not unset value for invalid path '${valid}'`
                    );
                });
            });
        });

        it('should allow to set path depth', () => {
            const data = {
                a: {
                    b: [{
                        c: 10,
                        d: 20,
                        e: 30,
                        f: 40,
                        g: 50
                    }]
                }
            };

            assert.isTrue(
                objectUtil.has(data, 'a:b:0:c', { separator: ':' }),
                'should have value'
            );
            objectUtil.unset(data, 'a:b:0:c', { depth: 4, separator: ':' });
            assert.isFalse(
                objectUtil.has(data, 'a:b:0:c', { separator: ':' }),
                'should unset value'
            );

            // depth 0 -> empty path
            assert.isTrue(
                objectUtil.has(data, 'a:b:0:d', { separator: ':' }),
                'should have value'
            );
            objectUtil.unset(data, 'a:b:0:d', { depth: 0, separator: ':' });
            assert.isTrue(
                objectUtil.has(data, 'a:b:0:d', { separator: ':' }),
                'should not unset value when depth is 0'
            );

            assert.isTrue(
                objectUtil.has(data, 'a:b:0:e', { separator: ':' }),
                'should have value'
            );
            objectUtil.unset(data, 'a:b:0:e', { depth: 100, separator: ':' });
            assert.isFalse(
                objectUtil.has(data, 'a:b:0:e', { separator: ':' }),
                'should unset value'
            );

            assert.isTrue(
                objectUtil.has(data, 'a.b.0.f'),
                'should have value'
            );
            objectUtil.unset(data, 'a.b.0.f', { depth: 100 });
            assert.isFalse(
                objectUtil.has(data, 'a.b.0.f'),
                'should unset value  and ignore depth when no separator specified and path is string'
            );

            assert.isTrue(
                objectUtil.has(data, ['a', 'b', 0, 'g']),
                'should have value'
            );
            objectUtil.unset(data, ['a', 'b', 0, 'g'], { depth: 100 });
            assert.isFalse(
                objectUtil.has(data, ['a', 'b', 0, 'g']),
                'should unset value and respect depth when no separator specified and path is array'
            );
        });
    });
});
