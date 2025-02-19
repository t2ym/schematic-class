# Change Log

## [Unreleased]
### Added
### Changed
### Removed
### Fixed

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
