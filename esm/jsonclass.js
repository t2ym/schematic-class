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
// Version [0.1.4] - 2025-03-03
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
  [keysGeneratorMethodName](initProperties, initPropertiesKeys, jsonPath) {
    const schema = this.constructor.schema;
    const schemaKeys = this.constructor.schemaKeys;
    const conflictingKeys = this.constructor.conflictingKeys;
    const keys = [];
    if (initProperties) {
      if (this.constructor.preservePropertyOrder) {
        const processedKeys = Object.create(null);
        for (const key of schemaKeys) {
          if (schema[key] === "-") {
            processedKeys[key] = true;
            keys.push(key); // hidden key
          }
        }
        for (const key of initPropertiesKeys) {
          processedKeys[key] = true;
          if (conflictingKeys[key]) {
            this.constructor.onError({ jsonPath, type: "undefined", key, value: initProperties[key], message: "conflicting key" });
            continue;
          }
          keys.push(key);
        }  
        for (const key of schemaKeys) {
          if (processedKeys[key]) {
            continue;
          }
          keys.push(key);
        }
      }
      else {
        for (const key of schemaKeys) {
          keys.push(key);
        }
        for (const key of initPropertiesKeys) {
          if (schema[key]) {
            continue;
          }
          if (conflictingKeys[key]) {
            this.constructor.onError({ jsonPath, type: "undefined", key, value: initProperties[key], message: "conflicting key" });
            continue;
          }
          keys.push(key); // additional property
        }
      }
    }
    else { // if initProperties object is null, only hidden properties are defined
      for (const key of schemaKeys) {
        if (schema[key] === "-") {
          keys.push(key); // hidden key
        }
      }
    }
    return keys;
  }
  iterateProperties(initProperties, jsonPath) {
    const schema = this.constructor.schema;
    const inventory = this.constructor.inventory;
    const parsedTypes = this.constructor.parsedTypes;
    const loading = !(jsonPath && jsonPath.validate);
    const initPropertiesKeys = initProperties ? Object.keys(initProperties) : []; // avoiding redundant calculation of Object.keys()
    const keys = this[keysGeneratorMethodName](initProperties, initPropertiesKeys, jsonPath);
    for (const property of keys) {
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
          for (const key of initPropertiesKeys) {
            jsonPath && jsonPath.push(key);
            const originalValue = initProperties[key];
            let value = originalValue;
            if (conflictingKeys[key]) {
              this.constructor.onError({ jsonPath, type: property, key, value, message: "conflicting key" });
              jsonPath && jsonPath.pop();
              continue;
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

export { JSONClass, JSONClassError, JSONClassFactory };

