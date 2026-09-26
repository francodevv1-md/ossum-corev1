# Logistics GPS Route History

The system MUST authorize the company server-side, accept only 1, 3, 6, 12, or 24 hours (default 6), and return a sanitized, sorted, maximum 1,000-point route for one mapped vehicle. It MUST NOT expose provider secrets, IMEI, raw payloads, or provider errors. The map MUST show the route only after an explicit operator action and clear it on vehicle change or hide.
