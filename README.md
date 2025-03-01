[![npm version](https://badge.fury.io/js/schematic-class.svg)](https://badge.fury.io/js/schematic-class)

# `JSONClass` from npm `schematic-class`

Integrated JSON schema for JavaScript classes

```js
class MyClass extends JSONClass {
  static schema = { // ES2022 syntax
    name: "string",
    birth_date: "BirthDay", // string with format
    careers: "Career[]", // class name as type; array of class objects
  };
  getAge() { ... }
}
MyClass.register();

class Career extends JSONClass { }
Career.register({ company: "string" }); // schema on register()

(class BirthDay extends JSONClass {}).register({ // regex meta-type
  regex: /^[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4}$/
});

try {
  let o = new MyClass({ // validation on instantiation
    "name": "John Smith",
    "birth_date": "1/1/2001",
    "careers": [ { "company": "Hello, Inc." } ]
  });
  o.careers[0] instanceof Career; // type is set
  o.getAge(); // operation on properties
  o.validate();
  JSON.stringify(o); // directly stringifiable
}
catch (e) {
  if (e instanceof JSONClassError) { ... }
}
```

## Table of Contents

- [`JSONClass` from npm `schematic-class`](#jsonclass-from-npm-schematic-class)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Install](#install)
  - [Quick Demo](#quick-demo)
    - [On Node](#on-node)
    - [On Browser](#on-browser)
  - [Import](#import)
    - [Global JSONClass](#global-jsonclass)
    - [Scoped JSONClass](#scoped-jsonclass)
  - [API](#api)
    - [`JSONClassFactory()` function](#jsonclassfactory-function)
    - [`JSONClass` class](#jsonclass-class)
      - [`static initClass(preservePropertyOrder)`](#static-initclasspreservepropertyorder)
      - [`static register(schema = this.schema, preservePropertyOrder = undefined, conflictingKeys = keysHash(this.prototype))`](#static-registerschema--thisschema-preservepropertyorder--undefined-conflictingkeys--keyshashthisprototype)
      - [\[Internal\] `static create(types, value, jsonPath)`](#internal-static-createtypes-value-jsonpath)
      - [\[Internal\] `static onError(errorParameters)`](#internal-static-onerrorerrorparameters)
      - [`constructor(initProperties = null, jsonPath = [])`](#constructorinitproperties--null-jsonpath--)
      - [`validate(jsonPath = [])`](#validatejsonpath--)
      - [\[Internal\] `* keys(initProperties, jsonPath)`](#internal--keysinitproperties-jsonpath)
      - [\[Internal\] `iterateProperties(initProperties, jsonPath)`](#internal-iteratepropertiesinitproperties-jsonpath)
    - [Schema Properties](#schema-properties)
      - [Enumerable Properties](#enumerable-properties)
      - [Special Properties](#special-properties)
    - [Schema Types](#schema-types)
      - [Primitive Types](#primitive-types)
      - [Special Types](#special-types)
      - [Class Types](#class-types)
      - [Meta-Types](#meta-types)
      - [Type Operators](#type-operators)
      - [Example Types](#example-types)
  - [Test](#test)
  - [License](#license)

## Features

- Original JSON schema definitions associated with JavaScript classes
- Properties and class objects from a JSON parsed object
- Schema validation
  - "throw on the first error" mode
  - "accumulate errors" mode
- Optional property order normalization
- Method definition and invocation for JSON class objects
- Scope definition for classes for JSON schema

## Install
```sh
npm i schematic-class
```

## Quick Demo

### On Node

```sh
cd schematic-class
node src/jsonclass.js
```

### On Browser

1. Copy jsonclass.js from [Gist](https://gist.githubusercontent.com/t2ym/1f31de2cba3a29dcf848452b7b8208be/raw/c7583e97dd77f772fc1fd3e1a2804f8dbbe3c545/jsonclass.js) or [Repo](https://raw.githubusercontent.com/t2ym/schematic-class/refs/heads/main/src/jsonclass.js) to clipboard
2. Open a browser
3. Open DevTools on the browser by F12
4. Open the debugger console in DevTools
5. Paste `jsonclass.js` content from the clipboard

## Import

### Global JSONClass

```js
import { JSONClass, JSONClassError } from 'schematic-class';
```
```js
const { JSONClass, JSONClassError } = require('schematic-class');
```

### Scoped JSONClass

```js
import { JSONClassFactory, JSONClassError } from 'schematic-class';
const JSONClassScope = JSONClassFactory(/* parameters */);
```
```js
const { JSONClassFactory, JSONClassError } = require('schematic-class');
const JSONClassScope = JSONClassFactory(/* parameters */);
```

## API

### `JSONClassFactory()` function

- Parameters
  - `preservePropertyOrderDefaultValue = true` : `boolean`: `true` to preserve the order of properties as default
  - `validateMethodName = 'validate'` : `string`: set a non-conflicting name to customize the name of `validate()` method
  - `keysGeneratorMethodName = 'keys'` : `string`: set a non-conflicting name to customize the name of `*keys()` generator method

- Return Value
  - `JSONClass` : `class` : Each scoped `JSONClass` object is unique
    - Reexport it to share the scoped class among different sources

- Example
```js
const JSONClass = JSONClassFactory(false);
```

### `JSONClass` class

- The exported `JSONClass` is a singleton object
  - while classes from `JSONClassFactory()` have different identities on each invocation
- Scoped `JSONClass` class can be created by either
  - `JSONClassFactory()` or
  - `class JSONClassScope extends JSONClass {}` followed by `JSONClassScope.initClass()`

#### `static initClass(preservePropertyOrder)`

- Initialize the registered class inventory

- Parameters
  - `preservePropertyOrder = preservePropertyOrderDefaultValue`: `boolean`: `true` to preserve the order of properties; `false` to normalize the order as its schema definitions

- Initialized Class Properties
  - `static inventory = {}`: `object`: inventory of defined types
    - key: `string`: type name, which is defined by the class name
    - value: `class`: class for the type
  - `static parsedTypes = {}`: `object`: types in schema are parsed and stored
    - key: `string`: schema entry in string
    - value: `Array`: parsed types in an array
  - `static preservePropertyOrder`: `boolean` or `undefined`: handed from the parameter

- Return Value
  - `this` `JSONClass` object

#### `static register(schema = this.schema, preservePropertyOrder = undefined, conflictingKeys = keysHash(this.prototype))`

- Register the schema for the class and customize the `preservePropertyOrder`

- Parameters
  - `schema = this.schema`: `null-prototype object`: specify the schema for the class; defaults to `this.schema`
  - `preservePropertyOrder`: `boolean`: customize `preservePropertyOrder` if necessary
  - `conflictingKeys = keysHash(this.prototype)` : `null-prototype object`: specify a hash object for conflicting key names with `true` values
    - The default value `keysHash(this.prototype)` contains properties with defined string key names in `Class.prototype` and its prototypes
      - Typical value: 
```js
{
  constructor: true,
  validate: true,
  keys: true,
  iterateProperties: true,
  __defineGetter__: true,
  __defineSetter__: true,
  hasOwnProperty: true,
  __lookupGetter__: true,
  __lookupSetter__: true,
  isPrototypeOf: true,
  propertyIsEnumerable: true,
  toString: true,
  valueOf: true,
  ['__proto__']: true,
  toLocaleString: true
}
```
- Initialized Class Properties
  - `static conflictingKeys`: `null-prototype object`: handed from the parameter

- Example
```js
// Schema in register() parameter
class MyClass extends JSONClass {
}
MyClass.register({
  property: "string"
});

// Schema in ES2022 class property
class MyES2022Class extends JSONClass {
  static schema = {
    property: "string"
  }
}
MyES2022Class.register();

// Schema in static getter
class MyGetterClass extends JSONClass {
  static get schema() {
    return {
      property: "string"
    }
  }
}
// getter is converted to the static property this.schema for performance
MyGetterClass.register(); 
```

#### [Internal] `static create(types, value, jsonPath)`

- (Currently) internal method to create a typed value
  - It recursively creates typed values in properties if necessary

- Parameters
  - `types`: `Array`: an array of candidate types in strings
  - `value`: `value in a JSON type`: target value to create the typed value
  - `jsonPath`: `Array`: stack of JSON property names handed by the caller

- Return Value
  - The typed object value or the primitive value

#### [Internal] `static onError(errorParameters)`

- (Internal) method to throw an `Error` object or accumulate errors in `jsonPath.errors`

- Parameters
  - `errorParameters`: `object`:
    - `properties`:
      - `jsonPath`: `Array`: stack of JSON property names handed by the caller
      - `type`: `Array` or `string`: (the list of) expected type(s)
      - `key`: `string`: optional property key
      - `value`: `any`: the value to validate
      - `message`: `string`: error message
        - "type mismatch": not (one of) the expected type(s)
        - "unregistered type": unknown type
        - "hidden property assignment": unexpected assignment of a hidden property
        - "key mismatch": not the expected key format
        - "invalid key type": unknown key format type
        - "conflicting key": conflicting key name such as `"__proto__"`

#### `constructor(initProperties = null, jsonPath = [])`

- Instantiate a class instance, validating the handed `initProperties` against the schema
- It can throw `JSONClassError` on the first error when `jsonPath.errors` is not set

- Parameters
  - `initProperties = null`: `JSON object`: specify the properties for the instance
    - `null` to initialize the object without initial properties; no validation
  - `jsonPath = []`: `Array`: optionally set a stack of the current json property paths in strings
    - `jsonPath.errors`: `Array`: if set as `[]`, errors are accumulated instead of throwing on the first error; the array can be inspected on return to check errors
    - `jsonPath.recoveryMethod = "undefined"`: `string`: if `errors` is set, one of the following recovery methods on errors can be specified
      - "value": preserve the value
      - "null": replace with null
      - "undefined": discard the property; this is the default
    - `jsonPath.allowHiddenPropertyAssignment`: `boolean`: `true` to allow hidden property assignments; `false` or `undefined` to prohibit hidden property assignments

- Return Value
  - The typed class instance, whose properties are validated if `jsonPath.errors` is not set or `jsonPath.errors` is empty

- Example
```js
try {
  let jsonData = JSON.parse(jsonString);
  let obj = MyClass(jsonData);
}
catch (e) {
  if (e instanceof JSONClassError) { ... }
}

let jsonData = JSON.parse(jsonString);
let jsonPath = Object.assign([], { errors: [], recoveryMethod: "value" });
let obj2 = MyClass(jsonData, jsonPath);
if (jsonPath.errors.length > 0) {
  // some errors in validation
}
```

#### `validate(jsonPath = [])`

- Validate the `this` object against the schema
  - Property objects are validated recursively
  - It can throw on the first error or accumulate errors in `jsonPath.errors`
- The method name can be customized with `JSONClassFactory()`'s second parameter `validateMethodName` to avoid possible conflict with expected property names to validate

- Parameters
  - `jsonPath = []`: `Array`: the same as that of the `constructor` parameter

- Return Value
  - `boolean`: `true` when validated; `false` when not validated
    - If `jsonPath.errors` is not set, `true` is always returned as a `JSONErrorClass` object is thrown on the first error

- Example
```js
let jsonData = JSON.parse(jsonString);
let obj = MyClass(jsonData);

try {
  obj.property = "value";
  obj.validate();
  // validated
}
catch (e) {
  if (e instanceof JSONClassError) { ... }
}

let jsonPath = Object.assign([], { errors: [], recoveryMethod: "value" });
obj.validate(jsonPath);
if (jsonPath.errors.length > 0) {
  // some errors in validation
}
```

#### [Internal] `* keys(initProperties, jsonPath)`

- Internal method to generate property keys for `interateProperties()`
  - The order of generated keys is controlled by `preservePropertyOrder` class property
- The method name can be customized with `JSONClassFactory()`'s third parameter `keysGeneratorMethodName` to avoid possible conflict with expected property names to validate

- Parameters
  - `initProperties`: `object`: the target value object to validate
  - `jsonPath = []`: `Array`: the same as that of the `constructor` parameter

#### [Internal] `iterateProperties(initProperties, jsonPath)`

- Internal method to iterate over properties to validate and assign them
  - Called from `constructor()`

- Parameters
  - `initProperties`: `object`: the target value object to validate
  - `jsonPath = []`: `Array`: the same as that of the `constructor` parameter


### Schema Properties

#### Enumerable Properties
- `any_valid_property_name`: enumerable property

#### Special Properties
- `any_valid_property_name`: hidden property
  - Marked with `"-"` special type
- `"+"`: additional property
- `"regex"`: regex property
  - Used in a meta-type to specify a regex pattern in the value
- `validator(value)`: validator function
  - Used in a meta-type to specify a callback function to validate the value
  - Copied to `Class.validator`
    - `this` in the function is the class, not the schema
- `detector(value)`: detector function
  - Used in a meta-type to specify a callback function to detect the value type
  - Copied to `Class.detector`
    - `this` in the function is the class, not the schema

### Schema Types

#### Primitive Types
- `"string"`: string type
- `"number"`: number type
- `"integer"`: integer type
- `"boolean"`: boolean type
- `"null"`: null value
- `"object"`: object type
  - Usage is strongly discouraged as it just copies the reference to the value without validation

#### Special Types
- `"undefined"`: optional property
  - Used with other type(s) to specify the valid type(s)
  - For example, `"undefined|string"` is for an optional string property
- `"-"`: hidden property
  - Hidden properties are defined as `enumerable: false` and do not appear in `JSON.stringify()`
- `RegExp` literal object
  - Sepecify a regex pattern for a string property in `regex` special property

#### Class Types
- `AnyClassName`: class with schema
  - Extends the base `JSONClass` (or a customized base class)

#### Meta-Types
- `AnyClassName`: meta-type name
  - Extends the base `JSONClass` (or a customized base class)
  - Has one of the following special properties in schema
    - `"regex"`: regex pattern validation
    - `validator(value)`: validator callback
    - `detector(value)`: detector callback

#### Type Operators
- `|`: or operator
  - Joins multiple types to check over the types in the joined order
- `[]`: array operator
  - Used as a postfix
  - Specifies an `Array` value

#### Example Types

- Primitive Types
```js
class TypeWithPrimitives extends JSONClass {
  static schema = {
    string_property: "string",
    number_proerpty: "number",
    integer_property: "integer",
    boolean_property: "boolean",
    null_property: "null",
    object_property: "object", // highly discouraged
    "+": "undefined", // optional properties are not permitted
  };
}
TypeWithPrimitives.register();
```

- Class Object Types
```js
class TypeName extends JSONClass {
  static schema = { ... };
}
TypeName.register();

class TypeWithObjects extends JSONClass {
  static schema = {
    typed_object: "TypeName",
    array_property: "TypeName[]"
    nullable_property: "null|TypeName",
    optional_string_property: "undefined|string",
    mixed_array_property: "string|number|TypeName[]",
  };
}
TypeWithObjects.register();
```

- Meta-Types
```js
class RegexFormat extends JSONClass {
  static schema = {
    regex: /^pattern:/
  };
}
RegexFormat.register();

class NonNegativeInteger extends JSONClass {
  static schema = {
    validator(value) { return Number.isInteger(value) && value >= 0; }
  };
}
NonNegativeInteger.register();

class FormattedKeysObject extends JSONClass {
  static schema = {
    RegexFormat: "TypeName",
  };
}
FormattedKeysObject.register();

class ConstrainedValueObject extends JSONClass {
  static schema = {
    formatted_property: "RegexFormat",
    non_negative_integer: "NonNegativeInteger",
  };
}
ConstrainedValueObject.register();
```

- Variable Type Detector
```js
// base class
class BaseClass extends JSONClass {
  static schema = {
    type: "string"
  };
}
// validators
class TypeAName extends JSONClass {
  static schema = {
    validator(value) { return value === "A"; }
  };
}
class TypeBName extends JSONClass {
  static schema = {
    validator(value) { return value === "B"; }
  };
}
// derived classes
class TypeA extends BaseClass {
  static schema = {
    type: "TypeAName"
    number: "number"
  };
}
class TypeB extends BaseClass {
  static schema = {
    type: "TypeBName"
    string: "string"
  };
}
// detector meta-type
class DerivedClassDetector extends JSONClass {
  static schema = {
    // any properties of any values can be used to distinguish types
    // falsy value to report no matching type is found
    detector(value) { return { "A": "TypeA", "B": "TypeB" }[value]; }
  };
}
DerivedClassDetector.register();

class VariableTypeValueClass extends JSONClass {
  static schema = {
    variable_type: "DerivedClassDetector"
  };
}
VariableTypeValueClass.register();

// instantiation and validation
let obj = new VariableTypeValueClass({ variable_type: { type: "A", number: 1 } });
obj.variable_type instanceof TypeA === true;
obj.variable_type.type === "A";
```

- Hidden Properties
```js
class TypeWithHiddenProperties extends JSONClass {
  static schema = {
    hidden_property: "-", // not visible in JSON.stingify()
    hidden_property2: "-", // not visible in JSON.stingify()
    string_property: "string",
  };
}
TypeWithHiddenProperties.register();

let obj = new TypeWithHiddenProperties({ string_property: "str" });
let errorObj = new TypeWithHiddenProperties({
    hidden_property: "hidden value",
    string_property: "str"
  }); // throws JSONClassError

let jsonPath = Object.assign([], { allowHiddenPropertyAssignment: true });
let obj2 = new TypeWithHiddenProperties({
    hidden_property: "hidden value",
    string_property: "str"
  }, jsonPath); // allowed
obj2.hidden_property2 = "hidden value 2";
obj2.hidden_property === "hidden value";
JSON.stringify(obj2) === `{"string_property":"str"}`;
```

## Test

```sh
git clone https://github.com/t2ym/schematic-class
cd schematic-class
npm i
npm test
chrome test/coverage/index.html
```

## License

[BSD-2-Clause](LICENSE.md)
