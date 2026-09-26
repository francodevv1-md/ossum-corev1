# Contact Address Geolocation Specification

## Purpose

Define institution-scoped geographic capture, review, validation, preview, and audit behavior for existing ContactAddress geographic metadata.

## Requirements

### Requirement: Institution-Only Geographic Entry

The system MUST expose and persist the geographic workflow only for Contacts in the `instituciones` group. Other Contact groups MUST NOT receive or modify geographic values through this workflow.

#### Scenario: Institution workflow is available
- GIVEN an authorized user edits an `instituciones` Contact
- WHEN the address is opened for editing
- THEN geographic entry and lookup controls are available

#### Scenario: Non-institution workflow is gated
- GIVEN an authorized user edits a Contact outside `instituciones`
- WHEN the address is opened for editing
- THEN geographic controls are unavailable and supplied geographic workflow values are rejected

### Requirement: Geographic Candidate Capture and Lookup

The system MUST perform address lookup through a server-authorized boundary, normalize returned candidates, and MUST NOT automatically mark any result as verified. The user MUST explicitly select a lookup candidate or enter coordinates manually.

#### Scenario: Lookup returns normalized candidates
- GIVEN an institution address with a searchable value
- WHEN the user requests a lookup
- THEN normalized candidates are returned for review without changing the address status

#### Scenario: Lookup has no usable result
- GIVEN a lookup returns no result, ambiguous candidates, or a provider failure
- WHEN the result is presented
- THEN the system preserves the current values, reports the applicable state, and requires explicit selection or manual entry

#### Scenario: Manual coordinates are pending
- GIVEN an authorized user enters valid latitude and longitude manually
- WHEN the address is saved without administrator validation
- THEN the coordinates are stored as a candidate or pending value and are not verified

### Requirement: Role-Gated Geographic Validation and Data Protection

The system MUST allow `admin` and `operator` users to propose candidate or pending geographic values. Only an `admin` MUST set `verified` or `manual_verified`. A write MUST NOT silently overwrite already validated geographic data with unvalidated data.

#### Scenario: Operator proposes a value
- GIVEN an operator selects a candidate or enters manual coordinates
- WHEN the address is saved
- THEN the value is saved as candidate or pending and no verified status is assigned

#### Scenario: Operator cannot validate
- GIVEN an operator submits `verified` or `manual_verified`
- WHEN the server evaluates the write
- THEN the request is rejected and existing data remains unchanged

#### Scenario: Admin validates a value
- GIVEN an admin reviews a geographic candidate
- WHEN the admin validates it
- THEN the selected value is saved with the requested verified status

#### Scenario: Validated data is protected
- GIVEN an address has validated geographic data
- WHEN an unvalidated proposal targets that address
- THEN the system requires an explicit non-silent resolution and preserves validated data until that resolution

### Requirement: Tenant Isolation and Geographic Audit Trail

The system MUST enforce company isolation for geographic reads and writes. It MUST record candidate/pending writes and administrator validation with actor, company, contact address, action, status transition, and geographic source.

#### Scenario: Cross-tenant access is denied
- GIVEN a user is authorized for company A but not company B
- WHEN the user reads or writes company B geographic data
- THEN the request is denied and no data is disclosed or changed

#### Scenario: Geographic actions are auditable
- GIVEN a candidate/pending write or admin validation succeeds
- WHEN the transaction completes
- THEN one audit event contains the required actor, company, address, action, transition, and source details

### Requirement: Fixed Geographic Preview

The system MUST render a fixed, non-Logistics geographic preview for a selected or manually entered valid coordinate pair. The preview MUST remain usable on supported narrow and wide viewports.

#### Scenario: Preview reflects selected coordinates
- GIVEN valid geographic coordinates are selected or entered
- WHEN the form renders the preview
- THEN a fixed map preview shows that coordinate pair without changing the Logistics map

#### Scenario: Responsive preview
- GIVEN the institution form is viewed on a narrow or wide supported viewport
- WHEN valid coordinates are present
- THEN the preview remains visible, operable, and does not obscure required form actions
