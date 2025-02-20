/*
@license https://github.com/t2ym/schematic-class/blob/master/LICENSE.md
Copyright (c) 2025, Tetsuya Mori <t2y3141592@gmail.com>. All rights reserved.
*/

const test = ({ JSONClass, JSONClassError, Suite, CommonSuite, chai, mode }) => {
  const scopes = [
    { scope: 'demo_normalized', preservePropertyOrder: false },
    { scope: 'demo_originalOrder', preservePropertyOrder: true },
  ];

  scopes.forEach(({ scope, preservePropertyOrder }) => {
    let suite = new Suite(scope, `Demo Test Suite [${mode}] - preservePropertyOrder: ${preservePropertyOrder}`);

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
        const JSONClassScope = (class JSONClassScope extends JSONClass {}).initClass(preservePropertyOrder);
        chai.assert.isOk(JSONClass.isPrototypeOf(JSONClassScope), `JSONClass is a prototype of JSONClassScope`);

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
          static schema = {
            KeyStringFormat: "null|ValueObject" // The key format must be registered BEFORE the object class which uses it
          };
          /* @endif */
          /* @if ESVERSION='ES2018' **
          static get schema() { return {
            KeyStringFormat: "null|ValueObject" // The key format must be registered BEFORE the object class which uses it
          } };
          /* @endif */
          // Note: Property order is always preserved if the schema specifies a key format
          //       Unintuitively, preservePropertyOrder must not be true and is always automatically set as false if the schema specifies a key format
        }
        ObjectPropertyClass.register();

        class ValueStringFormat extends JSONClassScope {
          static get schema() {
            return {
              "regex": /^[A-Za-z0-9]{64}\|.*$/,
            };
          }
        }
        ValueStringFormat.register();

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
        let wrapped =
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
          console.log("JSONClass Errors:", jsonPath.errors);
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
          console.log("Broken Object", wrapped);
          console.log(`wrapped._hidden_string_property = ${wrapped._hidden_string_property}`);
          console.log(`wrapped.validate(jsonPath2)`);
          let jsonPath2 = Object.assign([], { errors: [], recoveryMethod: "value" });
          wrapped.validate(jsonPath2);
          console.log(`jsonPath2.errors = `, jsonPath2.errors);
          wrapped.object_property["4d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64"] = new ValueObject({
            number_property: 99,
            formatted_string_property: "3d2ba64aaca23acc9667bd5127bccb33b805acf8bf02f00b88efe08a0f3f6f8d|Chrome 118.0.0.0 Windows x64",
          });
          console.log(`modified wrapped = `, wrapped);
          console.log(`wrapped.validate(jsonPath3)`);
          let jsonPath3 = Object.assign([], { errors: [], recoveryMethod: "value" });
          wrapped.validate(jsonPath3);
          console.log(`jsonPath3.errors = `, jsonPath3.errors);
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
          console.log(`fixed wrapped =`, wrapped);
          console.log(`wrapped.validate(jsonPath4)`);
          let jsonPath4 = Object.assign([], { errors: [], recoveryMethod: "value" });
          wrapped.validate(jsonPath4);
          console.log(`jsonPath4.errors = `, jsonPath4.errors);
          // hidden property does not throw on cloning an instance of the same class
          wrapped._hidden_string_property = "hidden string property value";
          console.log(`fixed wrapped._hidden_string_property = ${wrapped._hidden_string_property}`);
          let jsonPath5 = Object.assign([], { allowHiddenPropertyAssignment: true });
          wrapped = new WrappedJSONClass(wrapped, jsonPath5); // not throw; allow assignment of hidden properties
          console.log(`cloned w/ allowHiddenPropertyAssignment wrapped._hidden_string_property = ${wrapped._hidden_string_property}`);
          wrapped = new WrappedJSONClass(wrapped); // not throw; skip assignment of hidden properties and initialize as undefined
        }
        console.log(`cloned wrapped._hidden_string_property = ${wrapped._hidden_string_property}`);
        Object.assign(wrapped, {
          _hidden_string_property: "hidden string property value",
          _hidden_number_property: -1,
        });
        console.log(wrapped);
        console.log(`wrapped._hidden_string_property = ${wrapped._hidden_string_property}`);
        console.log(`wrapped._hidden_number_property = ${wrapped._hidden_number_property}`);
        console.log(`JSON.stringify(wrapped) = ${JSON.stringify(wrapped, null, 2)}`);
        //console.log(`JSON.stringify({ ...wrapped, status: "validated" }) = ${JSON.stringify({ ...wrapped, status: "validated" }, null, 2)}`);

        console.log(`JSONClassScope.inventory`, JSONClassScope.inventory);
        console.log(`JSONClassScope.parsedTypes`, JSONClassScope.parsedTypes);
        console.log(`JSONClassScope.preservePropertyOrder`, JSONClassScope.preservePropertyOrder);
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
      suite.run(i);
    }
  });

};

module.exports = test;
