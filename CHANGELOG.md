# Change Log

## [Unreleased]
### Added
### Changed
- [performance] Issue #20 Performance optimization on for loops
### Removed
### Fixed

## [0.1.3] - 2025-03-01
### Fixed
- [vulnerability] Issue #18 Additional fix for conflicting key error

## [0.1.2] - 2025-03-01
### Fixed
- [vulnerability] Issue #18 Add conflicting key error

## [0.1.1] - 2025-02-25
### Changed
- [doc] Issue #16 Refine API documentation

## [0.1.0] - 2025-02-25
### Added
- [doc] Issue #16 Add API documentation

## [0.0.12] - 2025-02-22
### Added
- Issue #15: detector() schema to define a meta type to detect a real type
- [test] Issue #15 Add cases for detector() schema

## [0.0.11] - 2025-02-22
### Added
- Issue #11: Export JSONClassFactory to customize default values and method names
- [test] Issue #11 Add cases for JSONClassFactory
- Issue #13: validator() schema
- [test] Issue #13 Add cases for validator() schema
### Changed
- [internal design change] Issue #12 Replace isRegex and matchRegex() with validator()
### Removed
### Fixed
- [test] Issue #5 Make the test runner function async

## [0.0.10] - 2025-02-20
### Added
- [test] Issue #5 Add a throw case and a preservePropertyOrder: true case
- [test] Issue #5 Insert assertions in demo test
- [test] Issue #5 Add a case for non-enumerable hidden property definitions with null value for initProperties
- [test] Issue #5 Add a case for Array type mismatch
- [test] Issue #5 Add a case for non-JSONClass type mismatch
- [test] Issue #5 Add a case for unregistered type
- [test] Issue #5 Add a case for key mismatch
- [test] Issue #5 Add a case for invalid key type
- [test] Issue #5 Add a case for validate(null)
- [test] Issue #5 Add cases for register(schema) and resigter(preservePropertyOrder, schema) (old compatible order)
- [test] Issue #5 Add a case for unknown property error
- [test] Issue #5 Add a case for unregistered type without throwing an error
- [test] Issue #5 Add a case for recoveryMethod null and undefined
- [test] Issue #5 Add a case for Array type mismatch with recoveryMethod null
- [test] Issue #5 Add a case for preservePropertyOrder getter function
- [test] Issue #5 Add a case for invalid key type with recoveryMethod undefined
- [test] Issue #5 Add a case for unregistered type with invalid regex usage
### Changed
- [design change] Issue #10: Reverse the order of arguments in JSONClass.register()
### Fixed
- Issue #8: Insert missing jsonPath.pop() before continue on finding a hidden property
- Issue #9: Check initProperties is truthy before `in` operator

## [0.0.9] - 2025-02-19
### Fixed
- [npm] Issue #6: Remove exports section from package.json to enable importing as ES module

## [0.0.8] - 2025-02-19
### Added
- [test] Issue #5: Sequential test suites registration

## [0.0.7] - 2025-02-19
### Added
- [test] Issue #5: Add demo test suites to check the test configuration

## [0.0.6] - 2025-02-18
### Added
- [demo] Issue #4: Add a case for allowHiddenPropertyAssignment in instantiation from the same class instance
### Changed
- [design change] Issue #4: Hidden properties from the same class instance should be assigned only if allowHiddenPropertyAssignment is true

## [0.0.5] - 2025-02-18
### Added
- [doc] CHANGELOG.md
- [doc] LICENSE.md
### Changed
- Replace the license with the link to LICENSE.md
### Removed
- Change Log in the source code

## [0.0.4] - 2025-02-17
### Changed
- [npm] Register the package as "schematic-class"

## [0.0.3] - 2025-02-17
### Added
- Add jsonPath.allowHiddenPropertyAssignment: true option. Default: false
- [demo] Add a case for invalid hidden property assignment and copying of hidden properties
### Fixed
- [vulnerability] Error without recovery on hidden property assignment from a JSON object which is not a same class instance

## [0.0.2] - 2025-02-15
### Changed
- [demo] Add a case for a missing property
### Fixed
- Iterate over missing properties properly when preservePropertyOrder is true
- Set value property of errors as undefined on missing property errors

## [0.0.1] - 2025-02-14
### Added
- Initial version
- Subject to drastic changes
