# Unit Scan Scenarios

## Known BIOPROTECE scan

Given a raw DataMatrix containing AI (22), AI (10), AI (21), and AI (17), when its AI (22) has one BIOPROTECE-scoped `GS1_AI_22` match, then the server stores one resolved `ScanEvent`, stores the full raw payload, links its article and aggregate line, and increments that line by one.

## Unknown scan

Given no single article match, when a raw scan is submitted, then the server stores a `PENDING` event with its raw payload and parsed traces without creating a line or article.

## Pending resolution

Given a pending event and an eligible existing article, when it is linked, then one transaction resolves the event, creates an aggregate line only if needed, and increments the line once.

## Confirmation

Given a draft receipt, confirmation rejects pending events and duplicate article/serial pairs. Resolved events become the individual stock trace inputs; commercial lines are not used as a mutable last-scan trace tuple.
