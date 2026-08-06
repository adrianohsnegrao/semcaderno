# ADR 0009: Use Business Time Zone for Operational Reporting

## Status

Accepted.

## Context

Merchants ask practical daily and monthly questions such as "Quanto entrou hoje?" and "Quanto sobrou este mês". These questions depend on the establishment's local calendar, not on server time or a device's temporary time zone.

## Decision

Each business owns a configured IANA time zone. Financial records store UTC instants and the business-local date derived from the business time zone at event time. Daily and monthly operational reports use the stored business-local date.

## Consequences

- Reports align with the merchant's local business day.
- Historical records do not shift if the business time zone changes later.
- Future persistence and API specifications must include both timestamp and business-date concepts.
- No date library is selected by this ADR.

## Alternatives Considered

- Use server time for reports. Rejected because it may not match the merchant's local day.
- Use client device time. Rejected because it is easier to spoof or misconfigure.
- Recalculate all historical local dates after a time-zone change. Rejected because it can alter past reports unexpectedly.

## Follow-up Work

- Specify onboarding behavior for selecting or defaulting the business time zone.
- Add tests for report period boundaries after implementation.
