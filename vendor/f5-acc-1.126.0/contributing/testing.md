# Testing

### Running the Tests
To run all the unit tests:
```
npm run test
```
To run the unit tests of a single file:
```
npx mocha test/<path to the test file> --timeout 60000
```

### Keys/Certificates/CA Bundle
To avoid having keys, certificates, and CA bundles in the repo (as well as confusion around whether they are secret leaks or not), these test artifacts are created dynamically in the test_certs directory using the script scripts/misc/gen-test-certs.sh. Because these artifacts are dynamic, they must be injected into the expected conversion results.


### Converter Tests

The converter features are tested in two different ways:

- `autotest` - the test engine takes input files, do parsing, conversion, comparision and validation. No `*spec.js` files, only files with input data and expected output.
- `*.spec.js`- unit tests that doesn't fit approach above and requires special handling or additional actions to be done.

#### autotest

Take look on `./test/engines`. There are directories with unit tests related to different conversion engines. If you open any of this folder and its sub-folders you will see following files:

- top-level `*.spec.js` - handles automated unit testing - load data, run a test and etc.
- `*.conf` or `*.ucs` - input data for convertion engine.
- `*.autotest.json` - expected output.

IDEA/Goal: reduce amount of copy-paste `spec.js` files, that make update of JS code easier.

##### How it works (simplified):

1. Once `npm run test` command executed the test engine `mocha` processes `*.spec.js` files
2. Test-loader from `*.spec.js` file scans sub-directories on the same level for `*.autotest.json` files
3. When file found, let's say `test.autotest.json` then the loader tries to find test-related files like `test.conf`, `test.ucs` and etc. using base name `test`. NOTE: be careful if you have files like `test.1.conf` that belongs to another testcase then it should be renamed to `test_1.conf` instead.
4. Once files gathered the loader builds structures for testcases and suites and runs them.

Unit tests from `./test/engines/as3Converter` supports `nunjucks` templates. It was added to support runtime injection for keys, certs and etc. As example take look on [test/engines/as3Converter/service_https/service_https9.autotest.json](test/engines/as3Converter/service_https/service_https9.autotest.json).

##### Control unit tests execution

`mocha` allows to specify what tests and suites to run by specifying `.only`, `.skip` modifiers in JS files. For `autotest` there are no JS files expected the one with the loader.

Example 1 - run/skip a single test only: 

Let's say you want to run only single unit test `test.autotest.json` then you can rename it to `test.only.autotest.json` - simply add `.only` anywhere in the file name after `test` (basename).
Similar for `.skip` - `test.skip.autotest.json`. Then run tests using npm: `npm run test`.

NOTE: `.skip` has higher priority than `.only`

Example 2 - run/skip a group of tests:

Let's say you want to run unit tests from `./test/engines/as3Converter/adapt_profile` only then you have 2 options:

- rename directory to `./test/engines/as3Converter/adapt_profile.only`
- add a new file with name `only` to `./test/engines/as3Converter/adapt_profile` directory

Then run tests using npm: `npm run test`.

NOTE: `.skip` has higher priority than `.only`

#### *.spec.js

For unit tests that does not fit `autotest` approach and requires special handling or additional actions to be done.

Tips:
- use utilities from `./test/testUtils` when writing unit tests to avoid copy-paste and etc.
- use `./test/testUtils/assert` as default assertion library.
- use `assert.declDeepStrictEqual` from `./test/testUtils/assert` to compare produced and expected declarations.
