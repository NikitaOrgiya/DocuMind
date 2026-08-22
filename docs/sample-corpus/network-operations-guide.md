# Network Operations Guide

## Overview

This guide describes how the Infrastructure team monitors, changes, and
troubleshoots the corporate network at Northwind Field Services. It covers
routine monitoring, planned change management, and the escalation process for
network incidents. It applies to all wired and wireless network segments
across the primary office and the two regional depots.

## Network monitoring

The network operations center (NOC) dashboard polls all core switches,
firewalls, and wireless controllers every 60 seconds. Alerts are generated
when:

- Link utilization on any core uplink exceeds 85% for more than 5 minutes.
- A core switch, firewall, or wireless controller stops responding to health
  checks for two consecutive polling cycles.
- Packet loss on a WAN circuit exceeds 2% over a rolling 10-minute window.

Alerts are routed to the on-call engineer through the paging system. Low and
medium severity alerts are also posted to the `#network-alerts` channel for
awareness. The NOC dashboard retains 90 days of historical metrics for
trend analysis and capacity planning.

## Change management

All network changes other than emergency fixes must go through the weekly
Change Advisory Board (CAB) review. A change request must include the
affected devices, a rollback plan, and a maintenance window. Standard
maintenance windows are Tuesday and Thursday, 21:00–23:00 local time, when
office occupancy is lowest.

Emergency changes (for example, blocking an active security threat) may be
applied immediately by any on-call engineer, but must be documented in the
change log within 24 hours and reviewed at the next CAB meeting.

## Network incident escalation

Network incidents are classified using the same Sev1–Sev4 scale defined in
the Incident Response Handbook. For network-specific incidents, the
escalation path is:

1. The on-call engineer acknowledges the page within 5 minutes and begins
   triage.
2. If the incident is confirmed as Sev1 or Sev2 (for example, a full site
   outage or a failed core switch), the on-call engineer must notify the
   Network Operations Lead within 15 minutes of confirmation.
3. If the incident is not resolved or mitigated within 1 hour of
   confirmation, it is escalated to the Director of IT, who decides whether
   to engage the ISP's emergency support line or bring in additional
   engineers.
4. For any incident that also involves suspected data loss on affected
   servers, the on-call engineer must additionally follow the escalation
   steps in the Incident Response Handbook and loop in the backup and
   recovery team described in the Backup and Recovery Runbook.

All Sev1 and Sev2 network incidents require a written summary in the
`#network-incidents` channel within one hour of resolution, even if the full
post-incident review has not yet been completed.

## Vendor and ISP coordination

Northwind maintains two independent internet circuits from separate ISPs for
redundancy. If the primary circuit degrades or fails, the edge routers
fail over automatically using BGP route preference; this failover is
transparent to users in most cases. Engineers should still open a ticket
with the affected ISP so the outage is tracked and credited under the
service level agreement.

Vendor support contacts and account numbers are maintained in the internal
vendor directory, not in this document, since they change more frequently
than operational procedure.

## Wireless network standards

All wireless access points broadcast using WPA3-Enterprise for the
corporate SSID and WPA3-Personal for the guest SSID. The guest network is
isolated on its own VLAN (VLAN 40) with no routing to internal systems other
than the internet edge. Guest network credentials rotate monthly and are
available from the front desk.

Access point firmware is updated automatically during the Tuesday
maintenance window described above. Engineers should avoid manually
rebooting access points during business hours, since this briefly
disconnects any clients associated with that access point.
