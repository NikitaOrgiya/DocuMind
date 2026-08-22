# Access Management Policy

## Overview

This policy governs how accounts and permissions are granted, reviewed,
and revoked across Northwind Field Services systems, including the
corporate directory, business applications, and infrastructure
administration consoles.

## Account provisioning

New employee accounts are created by IT during onboarding, based on the
role profile supplied by HR. Each role profile maps to a predefined set of
group memberships, so access matches the employee's job function from day
one rather than being assembled ad hoc. Any access beyond the standard
role profile must be requested individually and approved by the
employee's manager.

Contractor accounts follow the same provisioning process but are created
with a mandatory expiration date matching the contract end date, after
which the account is automatically disabled.

## Privileged access

Privileged accounts — those with administrative rights on servers,
network devices, cloud infrastructure, or the identity provider — are
issued separately from an employee's standard account and must not be used
for routine work such as email or document editing. Privileged accounts
require multi-factor authentication on every sign-in, with no exceptions.

Privileged access must be reviewed at least every 90 days (quarterly) by
the system owner responsible for that resource. The review confirms that
each privileged account holder still requires that level of access; any
account that fails to be reconfirmed during the review window is
automatically downgraded to standard access pending manager justification.

## Access reviews

In addition to the quarterly privileged access review, all application and
system access is reviewed annually as part of the broader access
certification cycle. Managers receive a list of their direct reports'
current access and must confirm or revoke each entry. Access that is
neither confirmed nor revoked within 30 days of the review opening is
escalated to IT Security for manual follow-up.

## Offboarding

When HR submits a termination notice, IT must revoke all account access —
including privileged access, VPN, and building systems tied to identity —
within 4 hours of the notice being received, regardless of whether the
termination is voluntary or involuntary. For involuntary terminations
flagged as high-risk by HR, access must be revoked before the employee is
notified of the termination.

Shared or service accounts that the departing employee had access to (for
example, a shared social media login) must have their credentials rotated
within 24 hours as a secondary precaution, since revoking the individual's
personal account does not affect shared credentials.

## Multi-factor authentication

MFA is required for all privileged accounts as noted above, and is also
required for any standard account accessing company systems from outside
the corporate network, including VPN and cloud application logins.
Approved MFA methods are the corporate authenticator app or a hardware
security key; SMS-based codes are not accepted as a primary MFA method due
to known interception risks, though SMS may be used as a temporary backup
method for at most 7 days while an employee provisions a supported method.
