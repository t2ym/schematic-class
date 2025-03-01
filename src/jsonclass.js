/*
@license https://github.com/t2ym/schematic-class/blob/master/LICENSE.md
Copyright (c) 2025, Tetsuya Mori <t2y3141592@gmail.com>. All rights reserved.
*/
/*

  Integrated JSON schema for JavaScript classes

# Dependencies
- ES2018 and later
  - Support class fields syntax as well

# Features
- Original JSON schema definitions associated with JavaScript classes
- Properties and class objects from a JSON parsed object
- Schema validation
  - "throw on the first error" mode
  - "accumulate errors" mode
- Optional property order normalization
- Method definition and invocation for JSON class objects
- Scope definition for classes for JSON schema

# TODOs
- detailed demo, comprehensive test, packaging, etc.

*/
// Version [0.1.2] - 2025-03-01
class JSONClassError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = this.constructor.name;
  }
}
const keys = (object) => object
  ? Object.getOwnPropertyNames(object).concat(keys(Object.getPrototypeOf(object)))
  : [];
const keysHash = (object) => keys(object).reduce((a, c) => { a[c] = true; return a; }, Object.create(null));
const JSONClassFactory = (
  preservePropertyOrderDefaultValue = true,
  validateMethodName = 'validate',
  keysGeneratorMethodName = 'keys'
) =>
(class JSONClass { // declaration and initialization at once with ES2018 syntax
  static initClass(preservePropertyOrder = preservePropertyOrderDefaultValue) { // ES2018 compliant initialization called just after the class definition
    // this method can be used to define a new scope for JSONClass in a derived class
    Object.defineProperties(this, {
      inventory: {
        value: {},
        writable: true,
        enumerable: true,
        configurable: true,  
      },
      parsedTypes: {
        value: {},
        writable: true,
        enumerable: true,
        configurable: true,  
      },
      preservePropertyOrder: {
        value: preservePropertyOrder,
        writable: true,
        enumerable: true,
        configurable: true,  
      },
    });
    return this;
  }
  static register(schema = this.schema, preservePropertyOrder = undefined, conflictingKeys = keysHash(this.prototype)) {
    if (typeof schema === "boolean" && typeof preservePropertyOrder === "object" && preservePropertyOrder) { // old order
      let tmp = preservePropertyOrder;
      preservePropertyOrder = schema;
      schema = tmp;
    }
    let desc = Object.getOwnPropertyDescriptor(this, "schema");
    if (!desc || !desc.value || typeof desc.get === "function") {
      // override the schema getter in ES2018 syntax to a plain property with the same name
      Object.defineProperty(this, "schema", {
        value: schema,
        writable: true,
        enumerable: true,
        configurable: true,
      });
      desc = Object.getOwnPropertyDescriptor(this, "schema");
    }
    this.schema = Object.assign(Object.create(null), this.schema); // nullify the prototype of this.schema
    this.schemaKeys = Object.keys(this.schema); // iteration accelerator for for..of loop
    const plusSchemaIndex = this.schemaKeys.indexOf("+");
    if (plusSchemaIndex >= 0) {
      this.schemaKeys.splice(plusSchemaIndex, 1); // remove "+" schema
    }
    this.conflictingKeys = conflictingKeys;
    const conflicting = [];
    const conflictingKeysTypes = [];
    for (let key of this.schemaKeys) {
      if (this.conflictingKeys[key]) {
        conflicting.push(key);
        conflictingKeysTypes.push(this.schema[key]);
      }
    }
    if (conflicting.length > 0) {
      this.onError({ jsonPath: [], type: conflictingKeysTypes, key: conflicting, value: undefined, message: "conflicting key" });
    }
    if (this.schema.regex instanceof RegExp) {
      this.validator = (str) => this.schema.regex.test(str); // set the validator function
    }
    else if (typeof this.schema.validator === "function") {
      this.validator = this.schema.validator;
    }
    if (typeof this.schema.detector === "function") {
      this.detector = this.schema.detector;
    }
    for (let keySchema in this.schema) {
      if (this.inventory[keySchema]) {
        preservePropertyOrder = false; // override the flag
      }
      break;
    }
    desc = Object.getOwnPropertyDescriptor(this, "preservePropertyOrder");
    if ((typeof preservePropertyOrder != "undefined" && preservePropertyOrder != this.preservePropertyOrder) ||
        (desc && typeof desc.get === "function")) {
      // override the preservePropertyOrder getter in ES2018 syntax to a plain property with the same name
      Object.defineProperty(this, "preservePropertyOrder", {
        value: preservePropertyOrder,
        writable: true,
        enumerable: true,
        configurable: true,
      });
      desc = Object.getOwnPropertyDescriptor(this, "preservePropertyOrder");
    }
    this.inventory[this.name] = this;
    return this;
  }
  static create(types, value, jsonPath) {
    //console.log(`${this.name}.create(): path: ${JSON.stringify(jsonPath)}, types: ${types}, value: ${value}`);
    const inventory = this.inventory;
    const loading = !(jsonPath && jsonPath.validate);
    for (const type of types) {
      switch (type) {
      case "-": // hidden property of any type
      case "*": // property of any type
        return value;
      case "string": // string property
      case "number": // number property
      case "boolean": // boolean property
      case "object": // any object
        if (typeof value === type) {
          return value;
        }
        break;
      case "null": // null value property
        if (value === null) {
          return value;
        }
        break;
      case "undefined": // optional property
        if (typeof value === "undefined") {
          return value;
        }
        break;
      case 'integer': // integer property
        if (Number.isInteger(value)) {
          return value;
        }
        break;
      default:
        if (Array.isArray(type)) { // property with an Array value
          if (!Array.isArray(value)) {
            value = this.onError({ jsonPath, type: "Array", value, message: "type mismatch" });
          }
          if (Array.isArray(value)) { // value is an Array
            const length = value.length;
            const newValue = [];
            let itemValue;
            for (let index = 0; index < length; index++) {
              jsonPath && jsonPath.push(index);
              itemValue = this.create(type, value[index], jsonPath);
              if (loading) { newValue[index] = itemValue; }
              jsonPath && jsonPath.pop();
            }
            return loading ? newValue : value;
          }
          else {
            return value;
          }
        }
        else {
          let valueType;
          if (Object.hasOwn(inventory, type) && JSONClass.isPrototypeOf(valueType = inventory[type])) {
            if (valueType.validator) {
              if (valueType.validator(value)) {
                return value;
              }
            }
            else {
              if (typeof value === "object" && value !== null) {
                let detectedType;
                if (valueType.detector) {
                  detectedType = valueType.detector(value);
                  if (detectedType && Object.hasOwn(inventory, detectedType) && JSONClass.isPrototypeOf(inventory[detectedType])) {
                    valueType = inventory[detectedType];
                  }
                }
                else {
                  detectedType = type;
                }
                if (detectedType) {
                  if (loading) {
                    return new valueType(value, jsonPath);
                  }
                  else {
                    if (value instanceof JSONClass) {
                      value.iterateProperties(value, jsonPath);
                    }
                    else {
                      this.onError({ jsonPath, type: detectedType, value, message: "type mismatch" });
                    }
                    return value;
                  }
                }
              }
            }
          }
          else {
            value = this.onError({ jsonPath, type, value, message: "unregistered type" });
            return value;
          }
        }
        break;
      }
    }
    return this.onError({ jsonPath, type: types, value, message: "type mismatch" });
  }
  static onError(errorParameters) {
    const errorParametersClone = JSON.parse(JSON.stringify(errorParameters));
    if (!Object.hasOwn(errorParametersClone, "value")) {
      errorParametersClone.value = errorParameters.value; // set value as undefined on a missing property error
    }
    if (Array.isArray(errorParameters.jsonPath) && Array.isArray(errorParameters.jsonPath.errors)) {
      errorParameters.jsonPath.errors.push(errorParametersClone);
      switch (errorParameters.jsonPath.recoveryMethod) {
      case "value": // preserve the value
        return errorParameters.value;
      case "null": // replace with null
        return null;
      case "undefined": // discard the property
      default:
        return undefined;
      }
    }
    else {
      throw new JSONClassError(errorParameters.message, { cause: errorParametersClone });
    }
  }
  constructor(initProperties = null, jsonPath = []) {
    this.iterateProperties(initProperties, jsonPath);
  }
  [validateMethodName](jsonPath = []) {
    if (!jsonPath) {
      jsonPath = [];
    }
    jsonPath.validate = true; // flag for validation
    this.iterateProperties(this, jsonPath); // if jsonPath.errors exists, throw on the first error
    // not thrown
    return !jsonPath.errors || (jsonPath.errors && jsonPath.errors.length == 0)
  }
  * [keysGeneratorMethodName](initProperties, jsonPath) {
    const schema = this.constructor.schema;
    const conflictingKeys = this.constructor.conflictingKeys;
    if (initProperties) {
      if (this.constructor.preservePropertyOrder) {
        const processedKeys = Object.create(null);
        for (let key of this.constructor.schemaKeys) {
          if (schema[key] === "-") {
            processedKeys[key] = true;
            yield key; // hidden key
          }
        }
        for (let key in initProperties) {
          processedKeys[key] = true;
          if (conflictingKeys[key]) {
            this.constructor.onError({ jsonPath, type: "undefined", key, value: initProperties[key], message: "conflicting key" });
            continue;
          }
          yield key;
        }  
        for (let key of this.constructor.schemaKeys) {
          if (processedKeys[key]) {
            continue;
          }
          yield key;
        }
      }
      else {
        for (let key of this.constructor.schemaKeys) {
          yield key;
        }
        for (let key in initProperties) {
          if (schema[key]) {
            continue;
          }
          if (conflictingKeys[key]) {
            this.constructor.onError({ jsonPath, type: "undefined", key, value: initProperties[key], message: "conflicting key" });
            continue;
          }
          yield key; // additional property
        }
      }
    }
    else { // if initProperties object is null, only hidden properties are defined
      for (let key of this.constructor.schemaKeys) {
        if (schema[key] === "-") {
          yield key; // hidden key
        }
      }
    }
  }
  iterateProperties(initProperties, jsonPath) {
    const schema = this.constructor.schema;
    const inventory = this.constructor.inventory;
    const parsedTypes = this.constructor.parsedTypes;
    const loading = !(jsonPath && jsonPath.validate);
    for (const property of this[keysGeneratorMethodName](initProperties, jsonPath)) {
      jsonPath && jsonPath.push(property);
      let currentSchema = schema[property] || schema["+"] || "undefined";
      if (currentSchema === "-") {
        Object.defineProperty(this, property, {
          value: this[property],
          writable: true,
          configurable: true,
          enumerable: false, // hidden property
        });
        if (loading && initProperties && (property in initProperties) && !(jsonPath && jsonPath.allowHiddenPropertyAssignment)) {
          // handling of hidden properties in initProperties:
          //  - value assigned if allowHiddenPropertyAssignment is true
          //  - error thrown if
          //      allowHiddenPropertyAssignment is false or undefined and
          //      initProperties is not an instance of the same class
          if (!(initProperties instanceof this.constructor)) {
            this.constructor.onError({ jsonPath, type: property, value: initProperties[property], message: "hidden property assignment" });
          }
          jsonPath && jsonPath.pop();
          continue; // no recovery from errors
        }
      }
      const types = parsedTypes[currentSchema] ||
        (parsedTypes[currentSchema] =
          property === "regex" && currentSchema instanceof RegExp
            ? [ currentSchema ]
            : currentSchema.endsWith("[]")
              ? [ currentSchema.substring(0, currentSchema.length - 2).split('|') ]
              : currentSchema.split("|")
        );
      if (Object.hasOwn(inventory, property)) {
        const keyType = inventory[property];
        if (JSONClass.isPrototypeOf(keyType)) {
          jsonPath && jsonPath.pop();
          const conflictingKeys = this.constructor.conflictingKeys;
          for (let key in initProperties) {
            jsonPath && jsonPath.push(key);
            const originalValue = initProperties[key];
            let value = originalValue;
            if (conflictingKeys[key]) {
              value = this.constructor.onError({ jsonPath, type: property, key, value, message: "conflicting key" });
            }
            else if (!keyType.validator(key)) {
              value = this.constructor.onError({ jsonPath, type: property, key, value, message: "key mismatch" });
            }
            if (value === originalValue) {
              value = this.constructor.create(types, value, jsonPath)
            }
            if (loading) { this[key] = value; }
            jsonPath && jsonPath.pop();
          }
          break; // all keys have been processed
        }
        else {
          this.constructor.onError({ jsonPath, type: property, message: "invalid key type" })
        }
      }
      else {
        const value = this.constructor.create(types, (initProperties ? initProperties[property] : undefined), jsonPath);
        if (loading) { this[property] = value; } // if value is undefined, make a JSON-invisible placeholder for the property with the undefined value
      }
      jsonPath && jsonPath.pop();
    }
  }
}).initClass();
const JSONClass = JSONClassFactory();

/* @if MODULE_TYPE='CJS' **
module.exports = { JSONClass, JSONClassError, JSONClassFactory };
/* @endif */
/* @if MODULE_TYPE='ESM' **
export { JSONClass, JSONClassError, JSONClassFactory };
/* @endif */
/* @if MODULE_TYPE='' */
if (typeof window === "object" || typeof require !== "undefined" && typeof "module" !== "undefined" && require.main === module) {
  const { argv } = typeof window === "object" ? { argv: [] } : require("node:process");
  if (argv[2] === "CJS" || argv[2] === "ESM") {
    const fs = require("node:fs");
    const pp = require("preprocess");
    const originalScript = fs.readFileSync(__filename, "utf8");
    const moduleScript = pp.preprocess(originalScript, { MODULE_TYPE: argv[2], ESVERSION: "ES2018" }, { type: "js" });
    console.log(moduleScript);
  }
  else if (argv[2]) {
    const fs = require("node:fs");
    const pp = require("preprocess");
    const originalScript = fs.readFileSync(__filename, "utf8");
    const ESVERSION = argv[2] == "ES2018" ? "ES2018" : "ES2022";
    const demoScript = pp.preprocess(originalScript, { MODULE_TYPE: "", ESVERSION: ESVERSION }, { type: "js" });
    console.log(demoScript);
  }
  else {
    const demo = () => {
      // Define a new local scope for the type inventory
      // The default preservePropertyOrder is true; Set as false to normalize the property order as the schema order
      // If the type inventory scope is global and preservePropertyOrder is false, there is no need to define a new scope.
      const JSONClassScope = (class JSONClassScope extends JSONClass {}).initClass(false /* preservePropertyOrder */);
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
  
      try {
        let jsonPath = Object.assign([], { errors: [], recoveryMethod: "value", allowHiddenPropertyAssignment: false });
        console.log(`json = ${JSON.stringify(json, null, 2)}`);
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
          console.error("JSONClass Errors:", jsonPath.errors);
          console.error("Broken Object", wrapped);
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
      }
      catch (e) {
        console.error(e);
      }
  
      console.log(`JSONClassScope.inventory`, JSONClassScope.inventory);
      console.log(`JSONClassScope.parsedTypes`, JSONClassScope.parsedTypes);
      console.log(`JSONClassScope.preservePropertyOrder`, JSONClassScope.preservePropertyOrder);
  
    };
    demo();

    console.log(`\n\nnpm i preprocess && node jsonclass.js {CJS|ESM|ES2018|ES2022} \nto produce one of CJS, ESM, and demo in ES2018, ES2022 module versions, respectively`)
  }
}
/* @endif */
