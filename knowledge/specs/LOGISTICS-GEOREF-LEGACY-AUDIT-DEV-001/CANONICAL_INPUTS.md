# Canonical Geographic Inputs

Phase 2 remains blocked. When a real reference institution exists, the audit flow accepts only:

1. **Address → Georef:** Georef normalizes an address and returns an approximate `address` coordinate with official hierarchy. It never overwrites a manual or GPS point.
2. **Coordinates → Georef inverse:** latitude/longitude are retained with their original `coordinateType`, source and validation state; Georef only proposes/validates territorial hierarchy.

Exact institution location requires a manually verified or GPS point. A locality centroid is explicitly approximate and is never promoted to an exact location. Every resulting proposal carries `coordinateType`, `source`, `crs`, `sourceRetrievedAt`, and `validationStatus`; no proposal writes until an explicit later approval.
