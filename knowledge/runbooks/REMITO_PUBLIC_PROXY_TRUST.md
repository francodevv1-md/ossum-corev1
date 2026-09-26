# Remito Public Proxy Trust and Retention Runbook

This is an activation checklist, not provider configuration. Replace every placeholder with reviewed evidence before deployment.

## Required ownership and evidence

- Ingress owner: `<team/on-call>`; canonical CIDRs: `<approved CIDRs>`; forwarding header: `<forwarded|x-forwarded-for>`.
- Direct-peer adapter: `<runtime adapter>`; prove the ingress overwrites client-supplied forwarding values.
- Spoof test evidence: `<link>`; rotation procedure and reviewer: `<procedure/link>`.
- Daily rate-key owner: `<team>`; keys are independent, at least 32 random bytes, retained no longer than 30 days.
- Scheduler owner: `<team/on-call>`; schedule: at least hourly; bearer secret: independent and at least 32 random bytes.
- Missed-run alert: `<alert link and paging target>`; trigger before any row reaches 30 days.
- Ingress/application/error/analytics redaction proof: `<evidence>`; redact URL tokens, Authorization, fingerprints, raw addresses, referrers and query data.

## Activation gates

1. Run trusted/untrusted peer and spoof tests; ambiguous provenance must fail before rate mutation or token lookup.
2. Confirm raw IP exists only transiently for HMAC and is absent from logs, metrics, errors and persistence.
3. Invoke maintenance with Authorization bearer only; verify cookies cannot authorize it and responses expose only aggregate purge telemetry.
4. Supply read-only proof that no rate row is 30 days old; successful checks remain daily aggregate metrics, not request records.
5. Exercise the missed-run alert and record owner acknowledgement. Do not activate without PASS evidence for every item.

## Emergency disablement and purge

- Disable public verification traffic at `<approved control>` while preserving compatibility obligations and lifecycle history.
- Rotate the scheduler/rate key through `<secret procedure>`; never paste secrets into tickets, logs or commands captured as evidence.
- Execute the approved emergency rate-bucket purge procedure `<procedure>`; this must not delete aggregate metrics or lifecycle audit.
- Re-run age, redaction and spoof proofs, then obtain Security and Operations approval before re-enabling traffic.
