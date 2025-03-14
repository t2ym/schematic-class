/*
@license https://github.com/t2ym/schematic-class/blob/master/LICENSE.md
Copyright (c) 2025, Tetsuya Mori <t2y3141592@gmail.com>. All rights reserved.
*/

const test = async ({ JSONClass, JSONClassError, JSONClassFactory, Suite, CommonSuite, chai, mode }) => {
  const scopes = [
    { scope: 'demo_normalized', preservePropertyOrder: false, fromFactory: false, keysGeneratorMethodName: "keys", validateMethodName: "validate" },
    { scope: 'demo_originalOrder', preservePropertyOrder: true, fromFactory: false, keysGeneratorMethodName: "keys", validateMethodName: "validate" },
    { scope: 'demo_normalized_factory', preservePropertyOrder: false, fromFactory: true, keysGeneratorMethodName: "keysGenerator", validateMethodName: "validateWithSchema" },
    { scope: 'demo_originalOrder_factory', preservePropertyOrder: true, fromFactory: true, keysGeneratorMethodName: "keysGenerator", validateMethodName: "validateWithSchema" },
  ];

  await Promise.all(scopes.map(async ({ scope, preservePropertyOrder, fromFactory, keysGeneratorMethodName, validateMethodName }) => {
    let suite = new Suite(scope, `Demo Test Suite [${mode}] - preservePropertyOrder: ${preservePropertyOrder}, fromFactory: ${fromFactory}`);

    suite.test = class DemoTest extends CommonSuite {
      get description() { return 'Demo Test'; }
      async operation() {
        JSONClass.initClass();
      }
      async checkpoint() {
      }
    }

    suite.test = (base) => class RunDemo extends base {
      get description() { return 'Run Demo'; }
      async operation() {
        // Define a new local scope for the type inventory
        // The default preservePropertyOrder is true; Set as false to normalize the property order as the schema order
        // If the type inventory scope is global and preservePropertyOrder is false, there is no need to define a new scope.
        const JSONClassScope = fromFactory
          ? JSONClassFactory(preservePropertyOrder, validateMethodName, keysGeneratorMethodName)
          : (class JSONClassScope extends JSONClass {}).initClass(preservePropertyOrder);
        if (fromFactory) {
          chai.assert.isNotOk(JSONClass.isPrototypeOf(JSONClassScope), `JSONClass is NOT a prototype of JSONClassScope`);
        }
        else {
          chai.assert.isOk(JSONClass.isPrototypeOf(JSONClassScope), `JSONClass is a prototype of JSONClassScope`);
        }

        class WrappedJSONClass extends JSONClassScope {
          static get schema() { // ES2018-compliant syntax to define a schema
            return {
              _hidden_string_property: "-",
              _hidden_number_property: "-",
              string_property: "string",
              number_property: "number",
              integer_property: "integer",
              boolean_property: "boolean",
              optional_string_property: "string|undefined",
              optional_string_property2: "string|undefined",
              nullable_property: "null|ValueObject",
              nullable_property2: "null|ValueObject",
              array_property: "string|boolean|integer|null|ValueObject[]",
              object_property: "ObjectPropertyClass",
              "+": "*", // allow any additional properties
            };
          }
        }
        WrappedJSONClass.register();

        class KeyStringFormat extends JSONClassScope {
          /* @if ESVERSION='ES2022' */
          static schema = {
            "regex": /^[A-Za-z0-9]{64}\|.*$/,
          };
          /* @endif */
          /* @if ESVERSION='ES2018' **
          static get schema() { return {
            "regex": /^[A-Za-z0-9]{64}\|.*$/,
          } };
          /* @endif */
        }
        KeyStringFormat.register();

        class ObjectPropertyClass extends JSONClassScope {
          /* @if ESVERSION='ES2022' */
          /*
          static schema = {
            KeyStringFormat: "null|ValueObject" // The key format must be registered BEFORE the object class which uses it
          };
          */
          /* @endif */
          /* @if ESVERSION='ES2018' **
          static get schema() { return {
            KeyStringFormat: "null|ValueObject" // The key format must be registered BEFORE the object class which uses it
          } };
          /* @endif */
          // Note: Property order is always preserved if the schema specifies a key format
          //       Unintuitively, preservePropertyOrder must not be true and is always automatically set as false if the schema specifies a key format
        }
        ObjectPropertyClass.register({
          KeyStringFormat: "null|ValueObject" // The key format must be registered BEFORE the object class which uses it
        });

        class ValueStringFormat extends JSONClassScope {
          static get schema() {
            return {
              "regex": /^[A-Za-z0-9]{64}\|.*$/,
            };
          }
          static get preservePropertyOrder() {
            return false;
          }
        }
        ValueStringFormat.register();
        const desc = Object.getOwnPropertyDescriptors(ValueStringFormat);
        chai.assert.equal(desc.schema.value, ValueStringFormat.schema, `schema is converted to a plain property`);
        chai.assert.equal(desc.preservePropertyOrder.value, ValueStringFormat.preservePropertyOrder, `preservePropertyOrder is converted to a plain property`);

        class ValueObject extends JSONClassScope {
          /* @if ESVERSION='ES2022' */
          static schema = {
            number_property: "number",
            formatted_string_property: "undefined|ValueStringFormat",
          };
          /* @endif */
          /* @if ESVERSION='ES2018' **
          static get schema() { return {
            number_property: "number",
            formatted_string_property: "undefined|ValueStringFormat",
          } };
          /* @endif */
        }
        ValueObject.register();

        const json = {
          _hidden_string_property: "invalid hidden string property assignment", // assigning hidden properties is invalid
          //_hidden_number_property: -1,
          unknown_property: "unknown property value",
          //boolean_property: true,
          optional_string_property: "optional string property value",
          unknown_string_property: "unknown string property value",
          unknown_array_property: [ 1, 2, 3 ],
          number_property: 1234.5,
          integer_property: 5.2,
          string_property: "string property value",
          object_property: {
            "6d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64": {
              number_property: 123,
              formatted_string_property: "4d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64",
            },
            "2d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64": {
              number_property: 145,
              formatted_string_property: "x4d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64",
            },
            "4d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64": null,
          },
          nullable_property: null,
          nullable_property2: { number_property: 100 },
          array_property: [ { number_property: 1 }, { number_property: 2 }, "array string value 0", "array string value 1", true, false, 123.4, "ABCD", null ],
        };
        let jsonPath = Object.assign([], { errors: [], recoveryMethod: "value", allowHiddenPropertyAssignment: false });
        //console.log(`json = ${JSON.stringify(json, null, 2)}`);

        try {
          new WrappedJSONClass(json);
          chai.assert.isOk(false, `new WrappedJSONClass(json) must throw on the first error`);
        }
        catch (e) {
          chai.assert.isOk(e instanceof JSONClassError, `new WrappedJSONClass(json) must throw JSONClassError`);
          //console.log(`e.cause:`, JSON.stringify(e.cause, null, 2));
          chai.assert.deepEqual(e.cause, {
            "jsonPath": [
              "_hidden_string_property"
            ],
            "type": "_hidden_string_property",
            "value": "invalid hidden string property assignment",
            "message": "hidden property assignment"
          }, `e.cause`);
        }
        try {
          new WrappedJSONClass(json, null);
          chai.assert.isOk(false, `new WrappedJSONClass(json, null) must throw on the first error`);
        }
        catch (e) {
          chai.assert.isOk(e instanceof JSONClassError, `new WrappedJSONClass(json, null) must throw JSONClassError`);
          //console.log(`e.cause:`, JSON.stringify(e.cause, null, 2));
          chai.assert.deepEqual(e.cause, {
            "jsonPath": null,
            "type": "_hidden_string_property",
            "value": "invalid hidden string property assignment",
            "message": "hidden property assignment"
          }, `e.cause`);
        }
        let wrapped = new WrappedJSONClass(null);
        //console.log(`new WrappedJSONClass(null)`, Object.getOwnPropertyDescriptors(wrapped));
        chai.assert.deepEqual(Object.getOwnPropertyDescriptors(wrapped), {
            _hidden_string_property: {
              value: undefined,
              writable: true,
              enumerable: false,
              configurable: true
            },
            _hidden_number_property: {
              value: undefined,
              writable: true,
              enumerable: false,
              configurable: true
            }
          }, `new WrappedJSONClass(null) defines non-enumerable properties with undefined values for hidden properties`);
        wrapped = new WrappedJSONClass();
        //console.log(`new WrappedJSONClass()`, Object.getOwnPropertyDescriptors(wrapped));
        chai.assert.deepEqual(Object.getOwnPropertyDescriptors(wrapped), {
              _hidden_string_property: {
                value: undefined,
                writable: true,
                enumerable: false,
                configurable: true
              },
              _hidden_number_property: {
                value: undefined,
                writable: true,
                enumerable: false,
                configurable: true
              }
            }, `new WrappedJSONClass() defines non-enumerable properties with undefined values for hidden properties`);
        wrapped =
          new WrappedJSONClass(json, jsonPath); // accumulate multiple errors; messy and slow on many errors
          //new WrappedJSONClass(json); // throw on the first error
          //new WrappedJSONClass(json, null); // throw on the first error without jsonPath; fastest
          /*
          new WrappedJSONClass({
            string_property: "",
            number_property: 0,
            integer_property: 0,
            boolean_property: false,
            nullable_property: null,
            nullable_property2: null,
            array_property: [],
            object_property: {},
          });
          */
        /*
        wrapped.object_property["6d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64"]
          = new ValueObject({
            number_property: 10,
            formatted_string_property: "4d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64",
          });
          */
        if (jsonPath.errors && jsonPath.errors.length > 0) {
          // wrapped object is broken
          //console.log("JSONClass Errors:", jsonPath.errors);
          (preservePropertyOrder 
            ? [
                {
                  jsonPath: [ '_hidden_string_property' ],
                  type: '_hidden_string_property',
                  value: 'invalid hidden string property assignment',
                  message: 'hidden property assignment'
                },
                {
                  jsonPath: [ '_hidden_string_property' ],
                  type: '_hidden_string_property',
                  value: 'invalid hidden string property assignment',
                  message: 'hidden property assignment'
                },
                {
                  jsonPath: [ 'integer_property' ],
                  type: [ 'integer' ],
                  value: 5.2,
                  message: 'type mismatch'
                },
                {
                  jsonPath: [
                    'object_property',
                    '2d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64',
                    'formatted_string_property'
                  ],
                  type: [ 'undefined', 'ValueStringFormat' ],
                  value: 'x4d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64',
                  message: 'type mismatch'
                },
                {
                  jsonPath: [ 'array_property', 6 ],
                  type: [ 'string', 'boolean', 'integer', 'null', 'ValueObject' ],
                  value: 123.4,
                  message: 'type mismatch'
                },
                {
                  jsonPath: [ 'boolean_property' ],
                  type: [ 'boolean' ],
                  message: 'type mismatch',
                  value: undefined
                }
              ]
            :
              [
                {
                  jsonPath: [ '_hidden_string_property' ],
                  type: '_hidden_string_property',
                  value: 'invalid hidden string property assignment',
                  message: 'hidden property assignment'
                },
                {
                  jsonPath: [ 'integer_property' ],
                  type: [ 'integer' ],
                  value: 5.2,
                  message: 'type mismatch'
                },
                {
                  jsonPath: [ 'boolean_property' ],
                  type: [ 'boolean' ],
                  message: 'type mismatch',
                  value: undefined
                },
                {
                  jsonPath: [ 'array_property', 6 ],
                  type: [ 'string', 'boolean', 'integer', 'null', 'ValueObject' ],
                  value: 123.4,
                  message: 'type mismatch'
                },
                {
                  jsonPath: [
                    'object_property',
                    '2d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64',
                    'formatted_string_property'
                  ],
                  type: [ 'undefined', 'ValueStringFormat' ],
                  value: 'x4d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64',
                  message: 'type mismatch'
                }
              ]
          ).forEach((value, index) => {
            chai.assert.deepEqual(jsonPath.errors[index], value, `jsonPath.errors[${index}]`);
          });
          //console.log(`Broken Object preservePropertyOrder: ${preservePropertyOrder}`, JSON.stringify(wrapped, null, 2));
          chai.assert.strictEqual(wrapped._hidden_string_property, undefined, `_hidden_string_property is undefined`);
          switch (jsonPath.recoveryMethod) {
          case "value":
            chai.assert.strictEqual(wrapped.integer_property, 5.2, `invalid integer_property is assigned`);
            chai.assert.strictEqual(wrapped.array_property[6], 123.4, `invalid array item is assigned`);
            chai.assert.strictEqual(
              wrapped.object_property
                ['2d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64']
                .formatted_string_property,
              'x4d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64', `invalid formatted_string_property is assigned`);
            break;
          default:
            break;
          }
          chai.assert.strictEqual(wrapped.boolean_property, undefined, `missing boolean_property has the placeholder value undefined`);
          chai.assert.strictEqual(JSON.stringify(wrapped, null, 2), (preservePropertyOrder
            ? 
`{
  "unknown_property": "unknown property value",
  "optional_string_property": "optional string property value",
  "unknown_string_property": "unknown string property value",
  "unknown_array_property": [
    1,
    2,
    3
  ],
  "number_property": 1234.5,
  "integer_property": 5.2,
  "string_property": "string property value",
  "object_property": {
    "6d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64": {
      "number_property": 123,
      "formatted_string_property": "4d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64"
    },
    "2d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64": {
      "number_property": 145,
      "formatted_string_property": "x4d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64"
    },
    "4d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64": null
  },
  "nullable_property": null,
  "nullable_property2": {
    "number_property": 100
  },
  "array_property": [
    {
      "number_property": 1
    },
    {
      "number_property": 2
    },
    "array string value 0",
    "array string value 1",
    true,
    false,
    123.4,
    "ABCD",
    null
  ]
}`
            :
`{
  "string_property": "string property value",
  "number_property": 1234.5,
  "integer_property": 5.2,
  "optional_string_property": "optional string property value",
  "nullable_property": null,
  "nullable_property2": {
    "number_property": 100
  },
  "array_property": [
    {
      "number_property": 1
    },
    {
      "number_property": 2
    },
    "array string value 0",
    "array string value 1",
    true,
    false,
    123.4,
    "ABCD",
    null
  ],
  "object_property": {
    "6d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64": {
      "number_property": 123,
      "formatted_string_property": "4d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64"
    },
    "2d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64": {
      "number_property": 145,
      "formatted_string_property": "x4d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64"
    },
    "4d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64": null
  },
  "unknown_property": "unknown property value",
  "unknown_string_property": "unknown string property value",
  "unknown_array_property": [
    1,
    2,
    3
  ]
}`
            ), `JSON matches`);

          //console.log(`wrapped[validateMethodName](jsonPath2)`);
          let jsonPath2 = Object.assign([], { errors: [], recoveryMethod: "value" });
          wrapped[validateMethodName](jsonPath2);
          //console.log(`preservePropertyOrder: ${preservePropertyOrder}; jsonPath2.errors = `, JSON.stringify(jsonPath2.errors, null, 2));
          chai.assert.strictEqual(JSON.stringify(jsonPath2.errors, null, 2), (preservePropertyOrder
            ?
`[
  {
    "jsonPath": [
      "integer_property"
    ],
    "type": [
      "integer"
    ],
    "value": 5.2,
    "message": "type mismatch"
  },
  {
    "jsonPath": [
      "object_property",
      "2d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64",
      "formatted_string_property"
    ],
    "type": [
      "undefined",
      "ValueStringFormat"
    ],
    "value": "x4d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64",
    "message": "type mismatch"
  },
  {
    "jsonPath": [
      "array_property",
      6
    ],
    "type": [
      "string",
      "boolean",
      "integer",
      "null",
      "ValueObject"
    ],
    "value": 123.4,
    "message": "type mismatch"
  },
  {
    "jsonPath": [
      "boolean_property"
    ],
    "type": [
      "boolean"
    ],
    "message": "type mismatch"
  }
]`
            :
`[
  {
    "jsonPath": [
      "integer_property"
    ],
    "type": [
      "integer"
    ],
    "value": 5.2,
    "message": "type mismatch"
  },
  {
    "jsonPath": [
      "boolean_property"
    ],
    "type": [
      "boolean"
    ],
    "message": "type mismatch"
  },
  {
    "jsonPath": [
      "array_property",
      6
    ],
    "type": [
      "string",
      "boolean",
      "integer",
      "null",
      "ValueObject"
    ],
    "value": 123.4,
    "message": "type mismatch"
  },
  {
    "jsonPath": [
      "object_property",
      "2d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64",
      "formatted_string_property"
    ],
    "type": [
      "undefined",
      "ValueStringFormat"
    ],
    "value": "x4d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64",
    "message": "type mismatch"
  }
]`
            ), `jsonPath2.errors matches`);
          wrapped.object_property["4d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64"] = new ValueObject({
            number_property: 99,
            formatted_string_property: "3d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64",
          });
          //console.log(`modified wrapped = `, wrapped);
          //console.log(`wrapped[validateMethodName](jsonPath3)`);
          let jsonPath3 = Object.assign([], { errors: [], recoveryMethod: "value" });
          wrapped[validateMethodName](jsonPath3);
          //console.log(`preservePropertyOrder: ${preservePropertyOrder}; jsonPath3.errors = `, JSON.stringify(jsonPath3.errors, null, 2));
          chai.assert.strictEqual(JSON.stringify(jsonPath3.errors, null, 2), (preservePropertyOrder
            ?
`[
  {
    "jsonPath": [
      "integer_property"
    ],
    "type": [
      "integer"
    ],
    "value": 5.2,
    "message": "type mismatch"
  },
  {
    "jsonPath": [
      "object_property",
      "2d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64",
      "formatted_string_property"
    ],
    "type": [
      "undefined",
      "ValueStringFormat"
    ],
    "value": "x4d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64",
    "message": "type mismatch"
  },
  {
    "jsonPath": [
      "array_property",
      6
    ],
    "type": [
      "string",
      "boolean",
      "integer",
      "null",
      "ValueObject"
    ],
    "value": 123.4,
    "message": "type mismatch"
  },
  {
    "jsonPath": [
      "boolean_property"
    ],
    "type": [
      "boolean"
    ],
    "message": "type mismatch"
  }
]`
            :
`[
  {
    "jsonPath": [
      "integer_property"
    ],
    "type": [
      "integer"
    ],
    "value": 5.2,
    "message": "type mismatch"
  },
  {
    "jsonPath": [
      "boolean_property"
    ],
    "type": [
      "boolean"
    ],
    "message": "type mismatch"
  },
  {
    "jsonPath": [
      "array_property",
      6
    ],
    "type": [
      "string",
      "boolean",
      "integer",
      "null",
      "ValueObject"
    ],
    "value": 123.4,
    "message": "type mismatch"
  },
  {
    "jsonPath": [
      "object_property",
      "2d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64",
      "formatted_string_property"
    ],
    "type": [
      "undefined",
      "ValueStringFormat"
    ],
    "value": "x4d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64",
    "message": "type mismatch"
  }
]`
            ), `jsonPath3.errors matches`);
          /*
          // It is very risky to adjust JSON properties on errors
          json.integer_property = 5;
          json.object_property["2d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64"].formatted_string_property
            = "4d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64";
          json.array_property[6] = 123;
          console.log(`fixed json = ${JSON.stringify(json, null, 2)}`);
          */
          // It is very risky to adjust properties on errors
          wrapped.boolean_property = true;
          wrapped.integer_property = 5;
          wrapped.array_property[6] = 123;
          wrapped.object_property["2d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64"].formatted_string_property
            = "4d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64";
          ///console.log(`fixed wrapped =`, wrapped);
          ///console.log(`wrapped[validateMethodName](jsonPath4)`);
          let jsonPath4 = Object.assign([], { errors: [], recoveryMethod: "value" });
          wrapped[validateMethodName](jsonPath4);
          //console.log(`preservePropertyOrder: ${preservePropertyOrder}; jsonPath4.errors = `, JSON.stringify(jsonPath4.errors, null, 2));
          chai.assert.equal(jsonPath4.errors.length, 0, `jsonPath4.errors is empty`);
          wrapped[validateMethodName](null);
          const array_error_json = JSON.parse(JSON.stringify(wrapped));
          array_error_json.array_property = "array is expected";
          chai.assert.throws(() => new WrappedJSONClass(array_error_json), JSONClassError, 'type mismatch');
          const array_error_jsonPath = Object.assign([], { errors: [], recoveryMethod: "null" });
          new WrappedJSONClass(array_error_json, array_error_jsonPath);
          chai.assert.equal(array_error_jsonPath.errors[0].message, "type mismatch", "Array type mismatch");
          // hidden property does not throw on cloning an instance of the same class
          wrapped._hidden_string_property = "hidden string property value";
          ///console.log(`fixed wrapped._hidden_string_property = ${wrapped._hidden_string_property}`);
          let jsonPath5 = Object.assign([], { allowHiddenPropertyAssignment: true });
          wrapped = new WrappedJSONClass(wrapped, jsonPath5); // not throw; allow assignment of hidden properties
          chai.assert.strictEqual(wrapped._hidden_string_property, "hidden string property value", `effective allowHiddenPropertyAssignment: true`);
          ///console.log(`cloned w/ allowHiddenPropertyAssignment wrapped._hidden_string_property = ${wrapped._hidden_string_property}`);
          wrapped = new WrappedJSONClass(wrapped); // not throw; skip assignment of hidden properties and initialize as undefined
          chai.assert.strictEqual(wrapped._hidden_string_property, undefined, `effective allowHiddenPropertyAssignment: false`);
          const type_error_wrapped = new WrappedJSONClass(wrapped);
          type_error_wrapped.nullable_property2 = JSON.parse(JSON.stringify(type_error_wrapped.nullable_property2)); // not a ValueObject instance
          chai.assert.throws(() => type_error_wrapped[validateMethodName](), JSONClassError, 'type mismatch');
        }
        ///console.log(`cloned wrapped._hidden_string_property = ${wrapped._hidden_string_property}`);
        Object.assign(wrapped, {
          _hidden_string_property: "hidden string property value",
          _hidden_number_property: -1,
        });
        ///console.log(wrapped);
        chai.assert.strictEqual(wrapped._hidden_string_property, "hidden string property value", `hidden string property is set`);
        chai.assert.strictEqual(wrapped._hidden_number_property, -1, `hidden number property is set`);
        //console.log(`preservePropertyOrder: ${preservePropertyOrder}; JSON.stringify(wrapped) = ${JSON.stringify(wrapped, null, 2)}`);
        chai.assert.strictEqual(JSON.stringify(wrapped, null, 2), (preservePropertyOrder
          ?
`{
  "unknown_property": "unknown property value",
  "optional_string_property": "optional string property value",
  "unknown_string_property": "unknown string property value",
  "unknown_array_property": [
    1,
    2,
    3
  ],
  "number_property": 1234.5,
  "integer_property": 5,
  "string_property": "string property value",
  "object_property": {
    "6d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64": {
      "number_property": 123,
      "formatted_string_property": "4d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64"
    },
    "2d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64": {
      "number_property": 145,
      "formatted_string_property": "4d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64"
    },
    "4d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64": {
      "number_property": 99,
      "formatted_string_property": "3d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64"
    }
  },
  "nullable_property": null,
  "nullable_property2": {
    "number_property": 100
  },
  "array_property": [
    {
      "number_property": 1
    },
    {
      "number_property": 2
    },
    "array string value 0",
    "array string value 1",
    true,
    false,
    123,
    "ABCD",
    null
  ],
  "boolean_property": true
}`
          :
`{
  "string_property": "string property value",
  "number_property": 1234.5,
  "integer_property": 5,
  "boolean_property": true,
  "optional_string_property": "optional string property value",
  "nullable_property": null,
  "nullable_property2": {
    "number_property": 100
  },
  "array_property": [
    {
      "number_property": 1
    },
    {
      "number_property": 2
    },
    "array string value 0",
    "array string value 1",
    true,
    false,
    123,
    "ABCD",
    null
  ],
  "object_property": {
    "6d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64": {
      "number_property": 123,
      "formatted_string_property": "4d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64"
    },
    "2d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64": {
      "number_property": 145,
      "formatted_string_property": "4d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64"
    },
    "4d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64": {
      "number_property": 99,
      "formatted_string_property": "3d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64"
    }
  },
  "unknown_property": "unknown property value",
  "unknown_string_property": "unknown string property value",
  "unknown_array_property": [
    1,
    2,
    3
  ]
}`
          ), `JSON.stringify(wrapped) matches`);
        //console.log(`JSON.stringify({ ...wrapped, status: "validated" }) = ${JSON.stringify({ ...wrapped, status: "validated" }, null, 2)}`);

        ///console.log(`JSONClassScope.inventory`, JSONClassScope.inventory);
        [ WrappedJSONClass, KeyStringFormat, ObjectPropertyClass, ValueStringFormat, ValueObject ].forEach((_class) => {
          chai.assert.strictEqual(JSONClassScope.inventory[_class.name], _class, `class ${_class.name} exists in JSONClassScope.inventory`);
        });
        //console.log(`JSONClassScope.parsedTypes`, JSONClassScope.parsedTypes);
        const parsedTypes = {
          '-': [ '-' ],
          '*': [ '*' ],
          'string|undefined': [ 'string', 'undefined' ],
          number: [ 'number' ],
          integer: [ 'integer' ],
          string: [ 'string' ],
          ObjectPropertyClass: [ 'ObjectPropertyClass' ],
          'null|ValueObject': [ 'null', 'ValueObject' ],
          'undefined|ValueStringFormat': [ 'undefined', 'ValueStringFormat' ],
          'string|boolean|integer|null|ValueObject[]': [ [ 'string', 'boolean', 'integer', 'null', 'ValueObject' ] ],
          boolean: [ 'boolean' ]
        };
        for (let parsedType in parsedTypes) {
          chai.assert.deepEqual(JSONClassScope.parsedTypes[parsedType], parsedTypes[parsedType], `JSONClassScope.parsedTypes["${parsedType}"] matches`);
        }
        chai.assert.strictEqual(JSONClassScope.preservePropertyOrder, preservePropertyOrder, `preservePropertyOrder: ${preservePropertyOrder} matches`);
        class InvalidSchemaObject extends JSONClassScope {
        }
        InvalidSchemaObject.register(false, {
          invalid_type: "UnknownType"
        });
        chai.assert.throws(() => new InvalidSchemaObject({ invalid_type: "invalid value" }), JSONClassError, 'unregistered type');
        chai.assert.throws(() => new KeyStringFormat({}), JSONClassError, 'unregistered type'); // invalid usage of KeyStringFormat
        const jsonPath6 = Object.assign([], { errors: [], recoveryMethod: "null" });
        chai.assert.strictEqual(new InvalidSchemaObject({ invalid_type: "invalid value" }, jsonPath6).invalid_type, null, `recoveryMethod: null`);
        const jsonPath7 = Object.assign([], { errors: [], recoveryMethod: "undefined" });
        chai.assert.strictEqual(new InvalidSchemaObject({ invalid_type: "invalid value" }, jsonPath7).invalid_type, undefined, `recoveryMethod: undefined`);
        chai.assert.throws(() => new ObjectPropertyClass({ invalid_key: null }), JSONClassError, 'key mismatch');
        const jsonPath8 = Object.assign([], { errors: [], recoveryMethod: "undefined" });
        new ObjectPropertyClass({ invalid_key: null }, jsonPath8);
        JSONClassScope.inventory["HackedKeyType"] = Object;
        class InvalidKeyTypeObject extends JSONClassScope {
          static schema = {
            HackedKeyType: "string"
          };
        }
        InvalidKeyTypeObject.register();
        chai.assert.throws(() => new InvalidKeyTypeObject({ property: "string value" }), JSONClassError, 'invalid key type');
        chai.assert.throws(() => new ValueObject({ number_property: 1, unknown_property: null }), JSONClassError, 'type mismatch');
        class IntegerRangeValidator extends JSONClassScope {
          static schema = {
            validator(value) { return Number.isInteger(value) && value >= 0 && value <= 100; }
          }
        }
        IntegerRangeValidator.register();
        class StartsWithValidator extends JSONClassScope {
          static schema = {
            validator(value) { return typeof value === "string" && value.startsWith("prefix:"); }
          }
        }
        StartsWithValidator.register();
        class ValidatorTest extends JSONClassScope {
          static schema = {
            StartsWithValidator: "IntegerRangeValidator",
          }
        }
        ValidatorTest.register();
        new ValidatorTest({ "prefix:property": 50 });
        chai.assert.throws(() => new ValidatorTest({ "prefix:property": 150 }), JSONClassError, 'type mismatch');
        chai.assert.throws(() => new ValidatorTest({ "invalid prefix:property": 50 }), JSONClassError, 'key mismatch');
        chai.assert.throws(() => new ValidatorTest({ "invalid prefix:property": 150 }), JSONClassError, 'key mismatch');
        class ValidatorTest2 extends JSONClassScope {
          static schema = {
            array_property: "IntegerRangeValidator[]",
          }
        }
        ValidatorTest2.register();
        new ValidatorTest2({ "array_property": [ 10, 20, 30 ] });
        chai.assert.throws(() => new ValidatorTest2({ "array_property": [ 150, 200, 300 ] }), JSONClassError, 'type mismatch');

        (class TypeAValidator extends JSONClassScope { }).register({
          validator(value) { return value === "A"; }
        });
        class TypeA extends JSONClassScope {
          static schema = {
            type: "TypeAValidator",
            property: "string"
          }
        }
        TypeA.register();
        (class TypeBValidator extends JSONClassScope { }).register({
          validator(value) { return value === "B"; }
        });
        class TypeB extends JSONClassScope {
          static schema = {
            type: "TypeBValidator",
            property: "string"
          }
        }
        TypeB.register();
        (class TypeDetectorMetaType extends JSONClassScope { }).register({
          detector(value) { return { "A": "TypeA", "B": "TypeB" }[value && value.type]; }
        });
        class MultitypeObject extends JSONClassScope {
          static schema = {
            accept_multi_types: "TypeDetectorMetaType"
          }
        }
        MultitypeObject.register();
        new MultitypeObject({ accept_multi_types: { type: "A", property: "this is TypeA" } });
        new MultitypeObject({ accept_multi_types: { type: "B", property: "this is TypeB" } });
        chai.assert.throws(() => new MultitypeObject({ accept_multi_types: { type: "unknown", property: "this is unknown type" } }), JSONClassError, 'type mismatch');
      }
      async checkpoint() {

      }
    }

    suite.test = {
      '': [
      ],
      DemoTest: {
        RunDemo: '',
      },
    };

    for (var i = 0; i < suite.test.length; i++) {
      await suite.run(i);
    }
  }));

};

module.exports = test;
