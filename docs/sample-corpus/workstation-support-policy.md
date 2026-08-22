# Workstation Support Policy

## Overview

This policy defines how Northwind Field Services provisions, patches,
backs up, and eventually retires employee workstations, including laptops,
desktops, and docking accessories. It applies to all company-owned
endpoints, not personal devices used under the bring-your-own-device
exception.

## Standard workstation configuration

New workstations are imaged with the current standard build before
handoff, which includes the endpoint protection agent, the backup agent,
and the corporate VPN client. Local administrator rights are not granted by
default; employees who need elevated access for their role must request it
through the IT service portal, and grants are time-limited to 90 days
unless renewed.

## Software installation

Software from the approved catalog can be self-installed by employees
through the software center without additional approval. Software outside
the catalog requires a request that is reviewed by IT Security for license
compliance and security risk before installation. Installation requests are
typically processed within two business days.

## Workstation backups

Workstation backups run automatically every night at 22:00 local time,
capturing the user profile, documents, and desktop folders. Backups are
incremental after the first full backup and are retained for 30 days.

Backup verification is not optional: every Friday, the backup system
performs an automated restore test of a randomly sampled file from each
active workstation's most recent backup and confirms the restored file
matches the original checksum. Any workstation that fails verification is
flagged in the IT dashboard, and the assigned technician must re-run a full
backup and confirm success within one business day.

Employees can also request an on-demand restore of an individual file or
folder by filing a ticket; most single-file restores complete within 30
minutes during business hours.

## Patch management

Operating system and application patches are deployed on a staged
schedule. Standard (non-critical) patches are applied within 14 calendar
days of release, after passing one week of testing on the pilot ring.
Critical security patches, as designated by IT Security, are fast-tracked
and applied within 72 hours of release, bypassing the pilot ring when the
vulnerability is actively being exploited in the wild.

Workstations that have not checked in for patch compliance within 21 days
are automatically flagged for technician follow-up, since this often
indicates a device that is offline, lost, or misconfigured.

## Hardware refresh cycle

Laptops are refreshed on a 4-year cycle; desktops on a 5-year cycle,
reflecting their typically lower usage intensity. Employees are notified
approximately 60 days before their scheduled refresh so they can plan data
migration with their assigned technician. Devices that fail hardware
diagnostics before their scheduled refresh date are replaced early at no
cost to the employee's department budget.

Retired hardware is wiped using a certified data-destruction process and
either donated through the company's equipment donation program or
recycled through an e-waste vendor, depending on condition.
