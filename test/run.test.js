/*
@license https://github.com/t2ym/schematic-class/blob/master/LICENSE.md
Copyright (c) 2025, Tetsuya Mori <t2y3141592@gmail.com>. All rights reserved.
*/
const chai = require('chai');

const scopes = [ // implemented in test/{scope}.test.js
  'demo', 'edge',
];

async function loadTarget(mode) {
  let moduleObject;
  switch (mode) {
  case 'esm':
    moduleObject = await import('./coverage-instrumented/esm/jsonclass.mjs');
    break;
  case 'cjs':
  default:
    moduleObject = require('./coverage-instrumented/jsonclass.js');
    break;
  }
  return moduleObject;
}

async function run(mode) {
  const Suite = require('scenarist');
  const { JSONClass, JSONClassError, JSONClassFactory } = await loadTarget(mode);
  const common = new Suite('common', `Unit Test Common Scope for ${mode}`);
  class CommonSuite extends Suite {
    async setup() {
      await super.setup();
    }
    async teardown() {
      await super.teardown();
    }
  }
  common.test = CommonSuite;
  for (let scope of scopes) {
    const test = require(`./${scope}.test.js`);
    await test({ JSONClass, JSONClassError, JSONClassFactory, Suite, CommonSuite, chai, mode });
  }
}

async function runAll() {
  await run('cjs');
  await run('esm');
}

runAll();
