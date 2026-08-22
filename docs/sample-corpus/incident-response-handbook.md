# Incident Response Handbook

## Overview

This handbook defines how Northwind Field Services detects, classifies,
and responds to operational incidents across infrastructure, network, and
application systems. It is the shared reference for severity levels and
response roles used by the Network Operations Guide and the Backup and
Recovery Runbook.

## Severity classification

Incidents are classified on a four-level scale:

- **Sev1 — Critical**: Full outage of a production system or widespread
  impact across most users, or any confirmed data loss. Requires immediate
  response, 24/7.
- **Sev2 — High**: Significant degradation or an outage affecting a subset
  of users or a single non-redundant system. Requires response within
  business hours or immediate response if occurring during business
  hours.
- **Sev3 — Moderate**: Limited impact with a workaround available.
  Addressed during normal working hours.
- **Sev4 — Low**: Cosmetic or minor issue with no meaningful user impact.
  Scheduled into normal work.

Initial responders should classify conservatively — when in doubt between
two severities, treat the incident as the higher severity until more
information is available, then downgrade if warranted.

## Incident response roles

- **Incident Commander (IC)**: Owns the overall response, coordinates
  responders, makes escalation and communication decisions, and is the
  single point of contact for status updates during the incident. Any Sev1
  or Sev2 incident must have a named IC within 15 minutes of
  classification.
- **Technical Lead**: Owns the technical investigation and remediation,
  reporting status to the IC rather than making independent
  communication decisions.
- **Scribe**: Maintains the incident timeline in real time, capturing key
  decisions, timestamps, and actions taken. Required for all Sev1
  incidents.

A single person may hold more than one role for Sev3/Sev4 incidents, but
Sev1 incidents require the IC and Technical Lead to be different people.

## Response procedure

1. **Detect and classify**: The responder who first identifies the issue
   classifies its severity using the scale above and opens an incident
   record.
2. **Assemble**: For Sev1/Sev2, the IC assembles the needed responders,
   which may include the Network Operations on-call engineer or the
   infrastructure engineer covering backups, depending on the affected
   system.
3. **Mitigate**: The immediate goal is to stop user impact, which may mean
   a rollback, failover, or temporary workaround rather than a full root
   cause fix.
4. **Restore**: If the mitigation requires restoring a server or data from
   backup, follow the Server Restoration Procedure in the Backup and
   Recovery Runbook exactly, and keep the IC informed of restoration
   progress so it's reflected in the incident timeline.
5. **Verify**: Confirm the system is healthy and user impact has actually
   stopped, not just that the immediate symptom is gone.
6. **Stand down**: The IC formally closes the incident once verification
   is complete and communicates resolution to affected stakeholders.

## Post-incident review

Every Sev1 and Sev2 incident requires a post-incident review (postmortem)
completed within 5 business days of resolution. The review is blameless,
focuses on contributing factors and systemic fixes rather than individual
fault, and must produce at least one concrete follow-up action with an
owner and due date. Reviews are stored in the incident archive and are
referenced during the annual risk assessment.

## Communication protocol

For Sev1 incidents, the IC posts an update to the `#incidents` channel at
least every 30 minutes, even if the update is "still investigating, no
change." For Sev2, updates are expected at least hourly. Customer-facing
communication, if needed, is drafted by the IC and approved by the
Director of IT before being sent, to keep messaging accurate and
consistent.
