# Backup and Recovery Runbook

## Overview

This runbook describes how server and infrastructure backups are taken,
verified, and restored at Northwind Field Services. It covers production
servers and core infrastructure; workstation backup procedures are
described separately in the Workstation Support Policy.

## Backup schedule

Production servers receive a full backup every night at 01:00 local time,
with incremental backups captured every hour during business hours (08:00
to 20:00). Database servers additionally ship transaction logs
continuously to the backup store, allowing point-in-time recovery to
within approximately 5 minutes of a failure.

Backups are stored in two geographically separated locations: the primary
backup store in the same region as production, and a secondary copy
replicated to a second region within 6 hours of creation.

## Backup verification

An automated verification job runs daily against the previous night's full
backup: it restores the backup into an isolated sandbox environment, runs
a set of integrity and application-level health checks, and records a pass
or fail result in the backup dashboard. Any failed verification triggers an
immediate page to the on-call infrastructure engineer, since an unverified
backup cannot be trusted during an actual restoration.

In addition to daily automated verification, a full manual restoration
drill is performed quarterly against a non-production environment to
confirm the end-to-end recovery process works, not just the backup file
itself.

## Server restoration procedure

When a production server fails and restoration from backup is required,
engineers must follow these steps in order:

1. Confirm the scope of the failure — determine whether it is isolated to
   one server, one service, or part of a broader incident — before taking
   any restoration action.
2. Notify the Incident Commander (see the Incident Response Handbook for
   this role) so the restoration is tracked as part of the active
   incident timeline, and so other responders know a restoration is in
   progress.
3. Identify the most recent backup that passed verification. Do not restore
   from a backup that failed or has not yet completed verification unless
   no verified backup exists and the Incident Commander explicitly accepts
   that risk.
4. Restore the server into an isolated environment first when time
   permits, and validate application health checks before cutting traffic
   back to it. When the incident severity requires immediate restoration
   directly to production, this validation step happens immediately after
   cutover instead of before.
5. Once restored, confirm data integrity against the most recent
   transaction log or checksum available, and document the actual data
   loss window (the gap between the last verified backup or log entry and
   the failure) in the incident record.
6. Close out the restoration in the incident timeline and hand back to the
   Incident Commander for the post-incident review process.

## Disaster recovery testing

A full disaster recovery test — simulating the loss of an entire region —
is conducted twice per year. Results, including total recovery time and
any gaps found, are documented and used to update this runbook.

## Data retention

Daily backups are retained for 30 days. Monthly backups (the last full
backup of each calendar month) are retained for 12 months. Yearly archival
backups are retained for 7 years to satisfy financial record-keeping
requirements. Backups are encrypted at rest using the same key management
service used for production data.
