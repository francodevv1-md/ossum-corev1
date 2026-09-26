# Design: Logistics GPS Route History DEV

The authorized company route resolves the authenticated company before querying one mapped vehicle. The service requests `/positions` for the bounded ISO interval, validates existing GPS payloads, filters the mapped device, sorts ascending, caps the last 1,000 points, and returns only map coordinates, time, and speed. The client fetches only after Show route and MapLibre draws a GeoJSON line plus endpoints.
