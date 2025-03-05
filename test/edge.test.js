/*
@license https://github.com/t2ym/schematic-class/blob/master/LICENSE.md
Copyright (c) 2025, Tetsuya Mori <t2y3141592@gmail.com>. All rights reserved.
*/

const test = async ({ JSONClass, JSONClassError, JSONClassFactory, Suite, CommonSuite, chai, mode }) => {
  const scopes = [
    { scope: 'edge_normalized', preservePropertyOrder: false, fromFactory: false, keysGeneratorMethodName: "keys", validateMethodName: "validate" },
    { scope: 'edge_originalOrder', preservePropertyOrder: true, fromFactory: false, keysGeneratorMethodName: "keys", validateMethodName: "validate" },
    { scope: 'edge_normalized_factory', preservePropertyOrder: false, fromFactory: true, keysGeneratorMethodName: "keysGenerator", validateMethodName: "validateWithSchema" },
    { scope: 'edge_originalOrder_factory', preservePropertyOrder: true, fromFactory: true, keysGeneratorMethodName: "keysGenerator", validateMethodName: "validateWithSchema" },
  ];

  await Promise.all(scopes.map(async ({ scope, preservePropertyOrder, fromFactory, keysGeneratorMethodName, validateMethodName }) => {
    let suite = new Suite(scope, `Edge Test Suite [${mode}] - preservePropertyOrder: ${preservePropertyOrder}, fromFactory: ${fromFactory}`);

    const conflictingKeys = [
      'constructor',
      '__defineGetter__',
      '__defineSetter__',
      'hasOwnProperty',
      '__lookupGetter__',
      '__lookupSetter__',
      'isPrototypeOf',
      'propertyIsEnumerable',
      'toString',
      'valueOf',
      '__proto__',
      'toLocaleString',
      keysGeneratorMethodName,
      validateMethodName,
      'iterateProperties',
      'method', // defined in derived JSONClass
    ];

    suite.test = class EdgeTest extends CommonSuite {
      get description() { return 'Edge Test'; }
      async operation() {
        JSONClass.initClass();
      }
      async checkpoint() {
      }
    }

    suite.test = (base) => class DefineJSONClassScope extends base {
      get description() { return "Define JSONClassScope"; }
      async operation() {
        this.JSONClassScope = fromFactory
          ? JSONClassFactory(preservePropertyOrder, validateMethodName, keysGeneratorMethodName)
          : (class JSONClassScope extends JSONClass {}).initClass(preservePropertyOrder);
      }
      async checkpoint() {

      }
    }

    suite.test = (base) => class DefineLooseObject extends base {
      get description() { return "Define LooseObject"; }
      async operation() {
        this.LooseObject = (class LooseObject extends this.JSONClassScope {
            static schema = {
              "+": "*"
            };
            method() {}
          }).register();
      }
      async checkpoint() {

      }
    }

    suite.test = (base) => class DefineStrictObject extends base {
      get description() { return "Define StrictObject"; }
      async operation() {
        this.StrictObject = (class StrictObject extends this.JSONClassScope {
            static schema = {
              name: "undefined|string",
            };
            method() {}
          }).register();
        //console.log(`${this.description}: conflictingKeys = `, this.StrictObject.conflictingKeys);
      }
      async checkpoint() {

      }
    }

    suite.test = (base) => class DefineFormattedKeyObject extends base {
      get description() { return "Define StrictObject"; }
      async operation() {
        this.FormattedKey = (class FormattedKey extends this.JSONClassScope {
            static schema = {
              regex: /^.*$/,
            };
          }
        ).register();
        this.FormattedKeyObject = (class FormattedKeyObject extends this.JSONClassScope {
            static schema = {
              FormattedKey: "string",
            };
            method() {}
          }
        ).register();
      }
      async checkpoint() {

      }
    }

    suite.test = (base) => class LooseObjectPrototypeIntrusion extends base {
      * iteration() {
        for (let key of conflictingKeys) {
          yield { name: `LooseObject Key: ${key}`, key };
        }
      }
      async operation(parameters) {
        this.parameters = parameters;
        this.object = Object.create(null);
        Object.defineProperty(this.object, parameters.key, {
          value: `${parameters.key} value`,
          writable: true,
          enumerable: true,
          configurable: true,
        });
        //console.log(JSON.stringify(this.object));
      }
      async checkpoint(parameters) {
        try {
          this.result = new this.LooseObject(this.object);
          throw new Error("JSONClassError should have been thrown");
        }
        catch (e) {
          chai.assert.isOk(e instanceof JSONClassError, `JSONClassError is thrown`);
          chai.assert.equal(e.message, 'conflicting key', `conflicting key error is thrown`);
          chai.assert.equal(e.cause.key, parameters.key, `e.cause.key is ${parameters.key}`);
        }
      }
    }

    suite.test = (base) => class LooseObjectPrototypeIntrusionNoThrow extends base {
      * iteration() {
        for (let key of conflictingKeys) {
          yield { name: `LooseObject Key: ${key}`, key };
        }
      }
      async operation(parameters) {
        this.parameters = parameters;
        this.object = Object.create(null);
        Object.defineProperty(this.object, parameters.key, {
          value: `${parameters.key} value`,
          writable: true,
          enumerable: true,
          configurable: true,
        });
        //console.log(JSON.stringify(this.object));
      }
      async checkpoint(parameters) {
        const jsonPath = Object.assign([], { errors: [], recoveryMethod: "value" });
        this.result = new this.LooseObject(this.object, jsonPath);
        //console.log(this.result);
        chai.assert.equal(this.result.constructor, this.LooseObject, `constructor is consistent`);
        chai.assert.equal(this.result.__proto__, this.LooseObject.prototype, `__proto__ is consistent`);
        const error = jsonPath.errors[0]
        chai.assert.equal(error.message, 'conflicting key', `conflicting key error`);
        chai.assert.equal(error.key, parameters.key, `error.key is ${parameters.key}`);
      }
    }

    suite.test = (base) => class StrictObjectPrototypeIntrusion extends base {
      * iteration() {
        for (let key of conflictingKeys) {
          yield { name: `StrictObject Key: ${key}`, key };
        }
      }
      async operation(parameters) {
        this.parameters = parameters;
        this.object = Object.create(null);
        Object.defineProperty(this.object, parameters.key, {
          value: `${parameters.key} value`,
          writable: true,
          enumerable: true,
          configurable: true,
        });
        //console.log(JSON.stringify(this.object));
      }
      async checkpoint(parameters) {
        try {
          this.result = new this.StrictObject(this.object);
          throw new Error("JSONClassError should have been thrown");
        }
        catch (e) {
          chai.assert.isOk(e instanceof JSONClassError, `JSONClassError is thrown`);
          chai.assert.equal(e.message, 'conflicting key', `conflicting key error is thrown`);
          chai.assert.equal(e.cause.key, parameters.key, `e.cause.key is ${parameters.key}`);
        }
      }
    }

    suite.test = (base) => class StrictObjectPrototypeIntrusionNoThrow extends base {
      * iteration() {
        for (let key of conflictingKeys) {
          yield { name: `StrictObject Key: ${key}`, key };
        }
      }
      async operation(parameters) {
        this.parameters = parameters;
        this.object = Object.create(null);
        Object.defineProperty(this.object, parameters.key, {
          value: `${parameters.key} value`,
          writable: true,
          enumerable: true,
          configurable: true,
        });
        //console.log(JSON.stringify(this.object));
      }
      async checkpoint(parameters) {
        const jsonPath = Object.assign([], { errors: [], recoveryMethod: "value" });
        this.result = new this.StrictObject(this.object, jsonPath);
        //console.log(this.result);
        chai.assert.equal(this.result.constructor, this.StrictObject, `constructor is consistent`);
        chai.assert.equal(this.result.__proto__, this.StrictObject.prototype, `__proto__ is consistent`);
        const error = jsonPath.errors[0]
        chai.assert.equal(error.message, 'conflicting key', `conflicting key error`);
        chai.assert.equal(error.key, parameters.key, `error.key is ${parameters.key}`);
      }
    }

    suite.test = (base) => class FormattedKeyObjectPrototypeIntrusion extends base {
      * iteration() {
        for (let key of conflictingKeys) {
          yield { name: `ConflictingFormattedKeyObject Key: ${key}`, key };
        }
      }
      async operation(parameters) {
        this.parameters = parameters;
        this.object = Object.create(null);
        Object.defineProperty(this.object, parameters.key, {
          value: `${parameters.key} value`,
          writable: true,
          enumerable: true,
          configurable: true,
        });
        //console.log(JSON.stringify(this.object));
        //console.log(this.FormattedKeyObject.conflictingKeys);
      }
      async checkpoint(parameters) {
        try {
          this.result = new this.FormattedKeyObject(this.object);
          throw new Error("JSONClassError should have been thrown");
        }
        catch (e) {
          chai.assert.isOk(e instanceof JSONClassError, `JSONClassError is thrown`);
          chai.assert.equal(e.message, 'conflicting key', `conflicting key error is thrown`);
          chai.assert.equal(e.cause.key, parameters.key, `e.cause.key is ${parameters.key}`);
        }
      }
    }

    suite.test = (base) => class FormattedKeyObjectPrototypeIntrusionNoThrow extends base {
      * iteration() {
        for (let key of conflictingKeys) {
          yield { name: `ConflictingFormattedKeyObject Key: ${key}`, key };
        }
      }
      async operation(parameters) {
        this.parameters = parameters;
        this.object = Object.create(null);
        Object.defineProperty(this.object, parameters.key, {
          value: `${parameters.key} value`,
          writable: true,
          enumerable: true,
          configurable: true,
        });
        //console.log(JSON.stringify(this.object));
      }
      async checkpoint(parameters) {
        const jsonPath = Object.assign([], { errors: [], recoveryMethod: "value" });
        this.result = new this.FormattedKeyObject(this.object, jsonPath);
        //console.log(this.result);
        chai.assert.equal(this.result.constructor, this.FormattedKeyObject, `constructor is consistent`);
        chai.assert.equal(this.result.__proto__, this.FormattedKeyObject.prototype, `__proto__ is consistent`);
        const error = jsonPath.errors[0]
        chai.assert.equal(error.message, 'conflicting key', `conflicting key error`);
        chai.assert.equal(error.key, parameters.key, `error.key is ${parameters.key}`);
      }
    }

    suite.test = (base) => class DefineConflictingKeySchema extends base {
      * iteration() {
        for (let key of conflictingKeys) {
          yield { name: `DefineConflictingKeySchema Key: ${key}`, key };
        }
      }
      async operation(parameters) {
      }
      async checkpoint(parameters) {
        const schema = Object.create(null);
        Object.defineProperty(schema, "name", {
          value: "undefined|string",
          writable: true,
          enumerable: true,
          configurable: true,
        });
        Object.defineProperty(schema, parameters.key, {
          value: "string",
          writable: true,
          enumerable: true,
          configurable: true,
        });
        chai.assert.throws(() => this.ConflictingObject = (class ConflictingObject extends this.JSONClassScope { method() {} }).register(schema),
          JSONClassError, "conflicting key");
      }
    }

    suite.test = (base) => class MethodPropertyObject extends base {
      get description() { return "MethodPropertyObject"; }
      async operation() {
        this.MethodPropertyObject = (class MethodPropertyObject extends this.JSONClassScope {
            static schema = {
              method: "*", // dangerous
            };
            //method() { return "Original Method"; }
          }).register();
        //console.log(`${this.description}: conflictingKeys = `, this.StrictObject.conflictingKeys);
      }
      async checkpoint() {
        //chai.assert.throws(() => this.result = new this.MethodPropertyObject({ method() { return "Hello, Method"; } }), JSONClassError, "type mismatch");
        this.result = new this.MethodPropertyObject({ method() { return "Hello, Method"; } });
        chai.assert.equal(this.result.method(), "Hello, Method", `Dangerous assignment of function property`);
        //console.log(this.result);
      }
    }

    suite.test = (base) => class RecursiveObject extends base {
      get description() { return "RecursiveObject ConditionsDetector|(string|integer[])"; }
      async operation() {
        this.ConditionsLabel = (class ConditionsLabel extends this.JSONClassScope {}).register({
          regex: /^[a-zA-Z0-9_]+(:[a-zA-Z0-9_ ]+)?$/
        });
      
        this.ConditionsDetector = (class ConditionsDetector extends this.JSONClassScope {}).register({
          detector(value) {
            return value && typeof value === "object" && !Array.isArray(value)
              ? "Conditions"
              : false;
          }
        });
      
        this.Conditions = (class Conditions extends this.JSONClassScope {
          static schema = {
            ConditionsLabel: "ConditionsDetector|(string|integer[])"
          };
        }).register();

        this.ContainerObject = (class ContainerObject extends this.JSONClassScope {
          static schema = {
            container: "Conditions"
          };
        }).register();

        this.json = {
          "container": {
            "browser:Chrome": {
              "fullVersionBrowser:Google Chrome": {
                "default": [
                  "pending"
                ],
                "pending": [
                  "validated",
                  "invalidated"
                ],
                "validated": [
                  "invalidated"
                ],
                "invalidated": [
                  "validated"
                ]
              },
              "fullVersionBrowser:Chromium": [
                "invalidated;Chromium is invalid",
                3
              ],
              "default": [
                "invalidated;unrecognized Chromium-based browser is invalid",
                4
              ]
            },
            "browser:Edg": [
              "invalidated;Microsoft Edge support is in progress",
              5
            ],
            "default": [
              "invalidated;unrecognized browser is invalid"
            ]
          }
        };
        this.result = new this.ContainerObject(this.json);
      }
      async checkpoint() {
        [
          [ this.result.container, "result.container" ],
          [ this.result.container["browser:Chrome"], "result.container.browser:Chrome" ],
          [ this.result.container["browser:Chrome"]["fullVersionBrowser:Google Chrome"], "result.container.browser:Chrome.fullVersionBrowser:Google Chrome" ],
        ].forEach(([ v, p ]) => {
          chai.assert.isOk(v instanceof this.Conditions, `${p} instanceof Conditions`);
        });

        [
          [ this.result.container["browser:Chrome"]["fullVersionBrowser:Chromium"], "result.container.browser:Chrome.fullVersionBrowser:Chromium" ],
          [ this.result.container["browser:Chrome"]["fullVersionBrowser:Google Chrome"].default, "result.container.browser:Chrome.fullVersionBrowser:Google Chrome.default" ],
          [ this.result.container["browser:Edg"], "result.container.browser:Edg" ],
          [ this.result.container["default"], "result.container.default" ],
        ].forEach(([ v, p ]) => {
          chai.assert.isOk(Array.isArray(v), `${p} is Array`);
          v.forEach((item, index) => {
            chai.assert.isOk(typeof item === "string" || Number.isInteger(item), `[${index}] ${item} is string or integer`);
          });
        });
      }
    }

    suite.test = (base) => class RecursiveObject2 extends base {
      get description() { return "RecursiveObject2 (ConditionsValue|integer[])|null|Conditions"; }
      async operation() {
        this.ConditionsLabel = (class ConditionsLabel extends this.JSONClassScope {}).register({
          regex: /^[a-zA-Z0-9_]+(:[a-zA-Z0-9_ ]+)?$/
        });
      
        this.ConditionsValue = (class ConditionsValue extends this.JSONClassScope {}).register({
          validator(value) {
            return typeof value === "string" && value.match(/^[a-z](;.*)?/);
          }
        });
      
        this.Conditions = (class Conditions extends this.JSONClassScope {
          static schema = {
            ConditionsLabel: "(ConditionsValue|integer[])|null|Conditions"
          };
        }).register();

        this.ContainerObject = (class ContainerObject extends this.JSONClassScope {
          static schema = {
            container: "Conditions"
          };
        }).register();

        this.json = {
          "container": {
            "browser:Chrome": {
              "fullVersionBrowser:Google Chrome": {
                "default": [
                  "pending"
                ],
                "pending": [
                  "validated",
                  "invalidated"
                ],
                "validated": [
                  "invalidated"
                ],
                "invalidated": [
                  "validated"
                ]
              },
              "fullVersionBrowser:Chromium": [
                "invalidated;Chromium is invalid",
                3
              ],
              "default": [
                "invalidated;unrecognized Chromium-based browser is invalid",
                4
              ]
            },
            "browser:Edg": [
              "invalidated;Microsoft Edge support is in progress",
              5
            ],
            "default": [
              "invalidated;unrecognized browser is invalid"
            ]
          }
        };
        this.jsonPath = Object.assign([], { errors: [], recoveryMethod: "value" });
        this.result = new this.ContainerObject(this.json, this.jsonPath);
        //console.log(this.jsonPath);
        //console.log(JSON.stringify(this.ContainerObject.parsedTypes, null, 2));
      }
      async checkpoint() {
        [
          [ this.result.container, "result.container" ],
          [ this.result.container["browser:Chrome"], "result.container.browser:Chrome" ],
          [ this.result.container["browser:Chrome"]["fullVersionBrowser:Google Chrome"], "result.container.browser:Chrome.fullVersionBrowser:Google Chrome" ],
        ].forEach(([ v, p ]) => {
          chai.assert.isOk(v instanceof this.Conditions, `${p} instanceof Conditions`);
        });

        [
          [ this.result.container["browser:Chrome"]["fullVersionBrowser:Chromium"], "result.container.browser:Chrome.fullVersionBrowser:Chromium" ],
          [ this.result.container["browser:Chrome"]["fullVersionBrowser:Google Chrome"].default, "result.container.browser:Chrome.fullVersionBrowser:Google Chrome.default" ],
          [ this.result.container["browser:Edg"], "result.container.browser:Edg" ],
          [ this.result.container["default"], "result.container.default" ],
        ].forEach(([ v, p ]) => {
          chai.assert.isOk(Array.isArray(v), `${p} is Array`);
          v.forEach((item, index) => {
            chai.assert.isOk(typeof item === "string" || Number.isInteger(item), `[${index}] ${item} is string or integer`);
          });
        });
      }
    }

    suite.test = {
      '': [
      ],
      EdgeTest: {
        DefineJSONClassScope: {
          DefineLooseObject: {
            LooseObjectPrototypeIntrusion: 'LoosePrototypeIntrusionTest;Loose Prototype Intrusion Test',
            LooseObjectPrototypeIntrusionNoThrow: 'LoosePrototypeIntrusionNoThrowTest;No Throw Loose Prototype Intrusion Test',
          },
          DefineStrictObject: {
            StrictObjectPrototypeIntrusion: 'StrictPrototypeIntrusionTest;Strict Prototype Intrusion Test',
            StrictObjectPrototypeIntrusionNoThrow: 'StrictPrototypeIntrusionNoThrowTest;No Throw Strict Prototype Intrusion Test',
          },
          DefineFormattedKeyObject: {
            FormattedKeyObjectPrototypeIntrusion: 'FormattedKeyPrototypeIntrusionTest;FormattedKey Prototype Intrusion Test',
            FormattedKeyObjectPrototypeIntrusionNoThrow: 'FormattedKeyPrototypeIntrusionNoThrowTest;No Throw FormattedKey Prototype Intrusion Test',
          },
          DefineConflictingKeySchema: 'ConflictingKeySchemaTest;Conflicting Key Schema Test',
          MethodPropertyObject: 'MethodPropertyObjectTest;Method Property Object Test',
          RecursiveObject: 'RecursiveObjectTest;Recursive Object Test ConditionsDetector|(string|integer[])',
          RecursiveObject2: 'RecursiveObjectTest2;Recursive Object Test 2 (ConditionsValue|integer[])|null|Conditions',
        },
      },
    };

    for (var i = 0; i < suite.test.length; i++) {
      await suite.run(i);
    }
  }));

};

module.exports = test;
