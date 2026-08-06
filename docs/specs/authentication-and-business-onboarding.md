# Authentication and Business Onboarding Specification

## 1. Status and Metadata

Status: Accepted for planning.

Cycle: 003 - Authentication and Business Onboarding Specification.

Task: 001 - Specify Owner Signup, Business Creation, Membership Lifecycle, Session Boundaries, and Tenant Selection.

Created: 2026-07-31.

Scope type: implementation-independent authentication, onboarding, membership, authorization, session, and tenant-selection specification.

This document defines product and domain behavior only. It does not select or implement an authentication library, managed identity provider, email provider, SMS provider, session middleware, API framework, ORM, database schema, migration, UI, or deployment platform.

## 2. Context

Sem Caderno serves small Brazilian businesses that need a simple replacement for notebooks. Cycle 002 established that `Business` is the tenant boundary and that users access tenant-owned data only through active business memberships with capabilities.

This cycle defines how a global user identity is created and verified, how the first business and Owner membership are bootstrapped, how returning users sign in, how sessions carry identity and selected business context, and how membership lifecycle changes affect access.

Authentication and onboarding must be secure without becoming intimidating. The user-facing language should remain everyday Brazilian Portuguese, while internal domain terminology may use precise terms such as User, Business, Membership, Session, and Capability.

## 3. Goals

- Separate global User identity from tenant-owned Business Membership.
- Define first-owner signup and atomic business bootstrap.
- Define returning-user sign-in outcomes by membership state.
- Define session boundaries without selecting session technology.
- Define active business selection and switching.
- Define membership and invitation lifecycles.
- Define Owner, Manager, and Staff capability boundaries.
- Define business deactivation access effects.
- Define recovery and credential-sensitive behavior.
- Define audit boundaries for identity, session, membership, and onboarding actions.
- Align security, privacy, quality, architecture, domain model, and task documentation.

## 4. Non-Goals

- No application code.
- No package manifest or dependency installation.
- No monorepo, Next.js, Expo, NestJS, Fastify, or Turborepo initialization.
- No database schema or migration.
- No API contracts or endpoints.
- No UI screens, wireframes, or copy deck.
- No authentication provider, email provider, SMS provider, storage provider, Pix provider, or WhatsApp integration.
- No password hashing implementation, cookie naming, JWT design, token format, or crypto algorithm selection.
- No billing, subscription, plan, trial, or enterprise identity design.
- No expansion of the accepted MVP.

## 5. Terminology

User: global identity record for a person who can authenticate.

Business: tenant boundary for operational data.

Business Membership: tenant-owned relationship connecting one User to one Business with role group, capabilities, and status.

Role group: a named grouping of capabilities, such as Owner, Manager, or Staff.

Capability: a specific authorization permission evaluated inside one selected Business.

Session: an authenticated interaction context for a client device or browser. A session represents a global User and may have a selected active Business.

Active Business: the selected tenant context for business-scoped actions.

Invitation: a tenant-owned invitation allowing an identity to become a member of one Business.

Verified identity channel: an email address or future phone number that has been verified according to the chosen authentication mechanism.

## 6. Confirmed Inherited Decisions

- Use Spec-Driven Development with traceable delivery cycles.
- Keep the MVP deliberately narrow.
- Web is the primary operational client.
- Mobile is a supporting client.
- Business is the tenant boundary.
- User identity is global while operational records are tenant-owned.
- Active business membership is required for tenant-owned access.
- Tenant-owned records belong to exactly one business.
- Authorization uses capabilities grouped as Owner, Manager, and Staff.
- Manager exists as a domain capability group, but release-one exposure requires merchant validation.
- Suspended and removed memberships deny access but remain historically referenceable.
- Business hard deletion is outside ordinary operation; deactivation and retention are the default.
- Tenant-owned requests must be server-side scoped by business and active membership.
- Authentication and session mechanics are specified by this Cycle 003 document at the domain-behavior level.

## 7. Assumptions

- Email is the MVP identity channel because it is common for account creation, invitations, and recovery. Phone can be collected later but is not required for MVP identity verification.
- Password-based authentication is a reasonable MVP direction, but the exact credential method and library remain implementation decisions.
- A User may exist before creating or joining a Business, but such a User cannot access tenant-owned operational data.
- Most early users will have one active Business, but the domain must support multiple memberships.
- Shared counter devices are likely, so visible sign-out and bounded session expiration are required.
- These assumptions need user and implementation validation before release.

## 8. Global Identity Model

### 8.1 Identity Versus Membership

A User is global. A Business Membership is tenant-owned. One User may belong to multiple Businesses through separate memberships. One verified identity may have multiple simultaneous memberships, including memberships with different role groups in different Businesses.

A User without an active membership cannot access tenant-owned operational data. They may access only global account flows such as verification, recovery, pending invitation acceptance, and business creation when allowed.

### 8.2 Identity Attributes

Global identity attributes:

- Stable User identifier.
- Normalized primary email.
- Email verification status.
- Credential or authentication binding, once implemented.
- Global security status, such as active or disabled.
- Global identity audit references.

Business-specific profile or preference attributes:

- Display name used inside a Business, if later needed.
- Role group and capabilities.
- Membership status.
- Business-specific notification preferences, if later specified.

### 8.3 Invitation Matching

MVP invitation matching uses normalized email. Normalization must be deterministic and documented before implementation. Phone-number matching is deferred.

An invitation can be accepted by:

- An existing User whose verified normalized email matches the invitation.
- A new User who creates and verifies the invited email.

Email mismatch must not create membership. The user should be guided to sign in or create an account using the invited email without revealing unnecessary account existence details.

### 8.4 Historical References

Operational records and audit events keep references to the User and Membership context that performed the action. If the membership is later suspended or removed, current access is denied but historical references remain.

Cross-business membership never implies cross-business data access. A User with active memberships in Businesses A and B must still select and be authorized within exactly one Business context for each tenant-owned operation.

## 9. First-Owner Signup and Business Bootstrap

### 9.1 Flow

1. User begins account creation.
2. User provides minimum identity information.
3. System creates or resolves a global identity.
4. User verifies the primary email before business activation.
5. User accepts required terms or notices.
6. User provides minimum business information.
7. System atomically creates the Business and initial Owner Membership.
8. System establishes an authenticated session.
9. System selects the new Business as the active tenant.
10. User enters the first usable onboarding state.

### 9.2 Minimum Information

Minimum identity information:

- Name or preferred display name.
- Primary email.
- Credential information, once the authentication method is specified.
- Terms or notice acceptance timestamp/reference.

Minimum business information:

- Business display name.
- Business time zone.

Optional or deferred:

- Phone verification.
- Pix key.
- Address.
- Tax identifiers.
- Business category.
- Product photo setup.

### 9.3 Verification Rule

Email verification is required before the Business becomes active for tenant-owned operations. The system may create a controlled pending identity before verification, but it must not allow operational business access until email verification and Owner membership activation complete.

Phone verification is deferred. It may become useful for recovery or WhatsApp flows later but is not required for MVP signup.

### 9.4 Time-Zone Suggestion

Onboarding must require a Business time zone. For the initial Brazilian audience, the system may suggest a default such as the user's detected browser/device time zone or `America/Manaus` when local context is known. The suggested value must be presented as editable and must not be treated as universally correct for Brazil.

### 9.5 Atomic Bootstrap

Business bootstrap must be atomic as a domain invariant: an active Business cannot be created without its initial active Owner Membership, and an active initial Owner Membership cannot be created without the Business.

If identity creation succeeds but business creation fails:

- The global User may remain.
- No active Business or Membership is created.
- The user can retry business creation idempotently.

If Business creation succeeds but Owner Membership creation fails:

- The bootstrap must roll back or leave no active Business visible to users.
- The system must not allow a Business with zero active Owners.
- The failure must be auditable as a bootstrap failure without exposing secrets.

Duplicate signup attempts:

- Same normalized email should resolve to the existing User path.
- If already verified, guide to sign in.
- If verification is pending, allow verification resend under abuse controls.
- If a matching invitation exists, guide toward invitation acceptance after sign-in or verification.

Initial Owner safeguards:

- The initial Owner cannot be suspended, removed, or demoted if that would leave the Business with zero active Owners.
- Ownership transfer is deferred. Adding another Owner may be specified later, but the last-owner invariant applies immediately.

## 10. Returning-User Sign-In

### 10.1 Sign-In Identifier

The MVP conceptual sign-in identifier is normalized email. Password-based authentication is the likely MVP direction, but the exact mechanism remains an implementation decision.

Errors must avoid account enumeration. A failed sign-in response should not reveal whether the email exists, is unverified, has no active memberships, or has only suspended memberships. Follow-up flows may provide safe guidance after the user proves control of the email.

Rate limiting, throttling, suspicious-pattern detection, and abuse protections are required at the architecture level. Specific algorithms and vendors are deferred.

### 10.2 Successful Sign-In Outcomes

After successful authentication:

- Exactly one active membership in an active Business: select that Business automatically unless a remembered Business points to another valid active membership.
- Multiple active memberships: select the remembered Business if still valid; otherwise require explicit Business selection.
- No active memberships: allow global account access only and show paths to create a Business or accept pending invitations.
- Only suspended memberships: deny tenant access and provide non-revealing support/recovery guidance.
- Only removed memberships: deny tenant access; historical membership does not authorize access.
- Memberships only in deactivated Businesses: deny ordinary tenant operations; allow only flows later specified for export, retention, or reactivation by authorized Owners.
- Pending invitation: allow invitation review and acceptance after identity verification.

Remembered tenant context may improve convenience, but it must be revalidated server-side on every sign-in and every tenant-owned request.

### 10.3 Web and Mobile

Web and mobile sign-in share identity, membership, and authorization rules. Sessions are client-specific and independent. Signing in on mobile does not automatically establish a web session, and signing out on one device does not necessarily sign out all devices unless a security-sensitive event requires revocation.

## 11. Session Model and Boundaries

### 11.1 Conceptual Session Contents

A session represents:

- Global authenticated User.
- Selected active Business when one is selected.
- Current active Membership for that Business.
- Capabilities derived from that Membership.
- Session status and expiration.
- Security freshness when needed for sensitive actions.

Tenant selection belongs both in session state for usability and in request context for authorization. The session may remember a selected Business, but every tenant-owned request must independently derive and validate active membership and required capabilities.

A client-provided business identifier is never sufficient authorization.

### 11.2 Session Lifecycle

Session creation happens after successful authentication.

Session renewal or rotation is required conceptually after:

- Successful authentication.
- Credential reset.
- Business switch.
- Role or capability escalation.
- Other security-sensitive changes later specified.

Explicit sign-out ends the current session. Global sign-out from all devices is deferred except when required by credential reset, account compromise response, or membership/business revocation rules.

Session listings and individual device revocation are future possibilities, not MVP requirements.

### 11.3 Revocation and Revalidation

Sessions must be forced to revalidate or be revoked when:

- Membership is suspended or removed.
- Role or capabilities are reduced.
- Business is deactivated.
- User identity is disabled.
- Credential reset completes.
- Account compromise is suspected or confirmed.

Role or capability changes must not leave stale authorization granting continued access. The implementation may use short-lived authorization snapshots, session versioning, or server-side lookup later, but the invariant is immediate or bounded revocation.

Web and mobile sessions are independent but must observe the same revocation rules.

### 11.5 Current-Session Resolution Profile

Cycle 018 specializes the implementation boundary without implementing authentication. Browser requests carry only the ADR 0023 protected opaque cookie. The server edge validates the exact credential syntax and derives a versioned keyed digest before application invocation; raw credential material never enters application models, contracts, PostgreSQL, logs, audit, analytics, or support data.

The no-input Cycle 016 `CurrentSessionStatePort` will be replaced by an explicit application-owned resolution input containing optional digest lookup evidence and one evaluation instant. The first persistence slice uses fixed absolute expiry only. A matching session is authenticated only when unrevoked, evaluated strictly before `expires_at`, and attached to an existing User whose `disabled_at` is null. Missing, malformed, unknown, revoked, expired, or disabled-User evidence produces the same anonymous inspection result. Database failure remains an infrastructure failure and must not become anonymous.

The stored selected Business is a nullable remembered candidate. Session inspection may return it without authorizing it. Business selection/switching and every protected tenant operation still validate Business, Membership, capability, lifecycle, and same-Business references independently. Exact issuance duration, key rotation, CSRF evidence, login/logout, retention, and HTTP integration remain deferred. See the [Session Credential Resolution and Lifecycle Specification](session-credential-resolution-lifecycle-specification.md).

### 11.4 Tenant-Specific Cached Data

Switching Businesses must clear, invalidate, or reload tenant-specific cached data, including visible records, report summaries, drafts tied to a Business, and selected customer/product context.

Tenant-specific drafts may survive only if stored under the original Business context and cannot be submitted under another Business. A switch must never carry tenant-owned identifiers across the boundary.

## 12. Tenant Selection and Switching

Initial active Business selection:

- Use a valid remembered Business if the User still has active membership and the Business is active.
- If exactly one active Business remains, select it.
- If multiple active Businesses remain and no remembered Business is valid, require explicit selection.

Explicit tenant picker is required when multiple active Businesses are available and no valid remembered Business should be used.

When remembered membership is suspended, removed, or the Business is deactivated, the remembered Business must be ignored and tenant access denied or reselection required.

Business switching:

1. User requests switch to a Business.
2. Server validates active Business, active Membership, and minimum access capability.
3. Session tenant context is replaced or rotated.
4. Tenant-specific cached data is invalidated.
5. Subsequent requests validate the new Business context.

URLs and deep links containing business context must be validated like any other request. If a user changes an identifier to another Business, the request must be denied. The system may return a generic not-found or access-denied response depending on context, but it must not reveal another tenant's existence to unauthorized users.

Background jobs, exports, mobile requests, and future provider callbacks must preserve tenant context from trusted server-side records, not from untrusted client values.

## 13. Membership Lifecycle and State Transitions

Accepted membership states:

- `invited`
- `active`
- `suspended`
- `removed`
- `invitation_expired`

State meanings:

- `invited`: invitation exists but has not been accepted.
- `active`: User can access the Business according to capabilities.
- `suspended`: access is temporarily denied; historical reference remains.
- `removed`: access is ended; historical reference remains.
- `invitation_expired`: invitation can no longer be accepted.

Permitted transitions:

```text
invited -> active
invited -> invitation_expired
invited -> removed
active -> suspended
active -> removed
suspended -> active
suspended -> removed
removed -> invited
invitation_expired -> invited
```

Transition initiators:

- Owner can invite, resend, cancel, suspend, reactivate, remove, and change role, subject to last-owner rules.
- Manager may manage members only if a later release decision grants that capability; default MVP assumption is no.
- Staff cannot manage members.
- System may expire invitations.

Access consequences:

- Only `active` memberships authorize tenant-owned access.
- `invited`, `suspended`, `removed`, and `invitation_expired` never authorize operational access.

Session consequences:

- Suspension, removal, or role reduction requires affected sessions to revalidate or be revoked.
- Reactivation does not automatically restore old sessions; user must sign in or revalidate.

Historical behavior:

- All membership states remain referenceable for audit and operational history.
- Role changes update the current membership with audit history; they do not require a new membership.
- Reinvitation after removal or expiration may create a new invitation record linked to prior membership history. It must not erase the prior membership state.

## 14. Capability-Oriented Authorization

Authorization must evaluate capabilities inside the selected Business. Role names are groupings only.

| Capability | Owner | Manager | Staff | Sensitive | Notes |
| --- | --- | --- | --- | --- | --- |
| `business.settings.manage` | yes | no by default | no | yes | Includes Pix settings later. |
| `members.invite` | yes | no by default | no | yes | Manager exposure requires validation. |
| `members.suspend_remove` | yes | no by default | no | yes | Last-owner invariant applies. |
| `members.role.assign` | yes | no by default | no | yes | Non-owners cannot grant Owner by default. |
| `customers.manage` | yes | yes | yes | no | Needed for daily work. |
| `products.manage` | yes | yes | yes | no | Needed for daily work. |
| `sales.record` | yes | yes | yes | no | MVP core operation. |
| `payments.record` | yes | yes | yes | yes | Financial and customer-sensitive. |
| `expenses.record` | yes | yes | no by default | yes | Staff access requires merchant validation. |
| `financial.correct` | yes | yes | no by default | yes | Staff access requires later specific rule. |
| `reports.operational.view` | yes | yes | yes | no | Example: "Quem está devendo". |
| `reports.financial.view` | yes | yes | no by default | yes | Example: "Quanto sobrou este mês". |
| `data.export` | yes | no by default | no | yes | Manager access requires validation. |
| `business.deactivate` | yes | no | no | yes | High-risk action. |

Safeguards:

- An Owner cannot remove, suspend, or demote themselves if that leaves no active Owner.
- A Manager or Staff member cannot grant capabilities they do not possess.
- Non-owners cannot promote anyone to Owner unless a later accepted rule permits it.
- Business deactivation requires `business.deactivate`.
- Authorization is evaluated only inside the selected Business.

Manager is retained as a domain role group, but release-one UI exposure is a product decision pending merchant validation. The authorization model must work if release one exposes only Owner and Staff.

## 15. Business Lifecycle and Onboarding Completion

Business states:

- `active`
- `deactivated`

No subscription, billing, trial, or plan states are part of this MVP specification.

A newly bootstrapped Business becomes `active` only when the verified User, Business, and initial Owner Membership exist together.

Onboarding completion should be derived from required setup steps rather than stored as a broad lifecycle state unless a future implementation specification justifies a stored flag. Minimum configuration before recording the first sale:

- Active Business.
- At least one active Owner.
- Business display name.
- Business time zone.

Users may leave and resume optional onboarding steps. Optional setup such as first product, Pix key, or photo setup must not block all operation unless a later workflow specification says so.

Deactivation:

- Immediately blocks new tenant-owned operational actions.
- Requires `business.deactivate`.
- Forces active sessions for that Business to revalidate or lose tenant context.
- Retains financial, membership, and audit data.
- Is potentially reversible only by a future reactivation specification.
- Does not imply ordinary hard deletion.

After deactivation, ordinary members cannot browse retained operational data unless a later export, retention, or legal access flow explicitly permits it.

## 16. Invitations

### 16.1 Creation and Delivery Boundary

Invitation creation is domain behavior. Email delivery is a future provider integration.

An invitation records:

- Business.
- Invited normalized email.
- Intended role group.
- Created by actor.
- Expiration timestamp.
- Status.
- Audit reference.

Invitation secret values must not be stored or logged in plaintext. The exact token implementation is deferred.

### 16.2 Invitation Rules

- Only authorized members can create invitations.
- Invitation role cannot exceed the inviter's authority.
- Duplicate active invitations to the same normalized email and Business should be idempotent or rejected with safe guidance.
- Inviting an already active member should not create a new active membership.
- Inviting a User active in another Business is allowed; acceptance creates membership only in the inviting Business.
- Pending invitations expire automatically.
- Invitations can be resent without creating duplicate memberships.
- Invitations can be cancelled before acceptance.
- Business deactivation cancels or disables pending invitations.

### 16.3 Acceptance

Existing User:

- Sign in.
- Verify that the User's normalized verified email matches the invitation.
- Accept invitation.
- Activate membership in the invited Business.

New User:

- Create identity with invited email.
- Verify email.
- Accept invitation.
- Activate membership.

Failure cases:

- Email mismatch: reject acceptance.
- Already used: reject replay.
- Expired: reject and allow authorized resend.
- Cancelled: reject.
- Business deactivated: reject.
- Concurrent acceptance: exactly one acceptance succeeds.

## 17. Recovery and Sensitive Identity Operations

MVP-required recovery behavior:

- Forgotten password or lost credential flow must allow recovery through the verified primary email.
- Credential reset must revoke or force revalidation of existing sessions.
- Reset responses must avoid account enumeration.
- Reset secrets must be single-use, expire, and never be logged.

Sensitive operations:

- Changing verified email requires proving control of the current account and verifying the new email before it becomes primary.
- Changing primary email must re-evaluate pending invitations and future sign-in identity matching.
- Suspected compromised account requires revoking sessions and may require support/manual review, but support procedures are deferred.
- Current-session sign-out is required.
- Global sign-out from all devices is required after credential reset or compromise response, but general user-managed device lists are deferred.

Unavailable identity channel:

- Self-service recovery is unavailable if the user cannot access the verified email and no alternate verified channel exists.
- Manual recovery and Owner recovery with no other active Owner are future operational processes and must not be claimed as available until specified.

Duplicate-account prevention:

- Normalized primary email should identify one global User.
- Duplicate signup should route to sign-in, verification resend, invitation acceptance, or business selection instead of creating duplicate identities.

## 18. Audit Boundaries

Minimum audit categories:

- Signup started and completed.
- Email verification requested and completed.
- Sign-in success.
- Security-relevant sign-in failure patterns.
- Sign-out.
- Credential reset requested and completed.
- Session revoked.
- Business created.
- Business deactivated and future reactivation.
- Invitation created, resent, cancelled, expired, and accepted.
- Membership activated, suspended, reactivated, removed, and role changed.
- Tenant switch when useful for security investigation.
- Access denial for sensitive operations.

Useful audit context:

- Actor identity, when known.
- Business context, when applicable.
- Target identity or membership.
- Timestamp.
- Action.
- Outcome.
- Reason or reference for sensitive changes.
- Request or correlation reference when useful.

Do not log:

- Passwords.
- Reset secrets.
- Session secrets.
- Invitation secrets.
- Full authentication tokens.
- Provider secrets.
- Unnecessary personal or financial data.

Domain audit history, security audit records, and operational logs are related but distinct. None of them should become a generic event-sourcing platform.

## 19. Security and Privacy Implications

Security design controls:

- Tenant isolation through active membership validation.
- Least privilege through capabilities.
- Email verification before active business operations.
- Invitation secrecy and replay protection.
- Account enumeration resistance.
- Abuse protection for signup, sign-in, recovery, and invitation flows.
- Session fixation prevention through session rotation after authentication.
- Session revalidation or revocation after membership, role, credential, and business-status changes.
- CSRF protection is required if cookie-based sessions are later selected.
- XSS risk must be considered because session theft would expose business data.
- Shared counter devices require visible sign-out and bounded session lifetime.
- Mobile device loss requires session revocation behavior after credential reset or compromise response.
- Logs and audit records must avoid secrets and unnecessary personal data.

This specification defines technical controls and product behavior. It does not claim full LGPD compliance or replace legal review and operational policy.

## 20. Concurrency, Idempotency, and Failure Handling

Behavioral invariants:

- Repeated signup with the same normalized email must not create duplicate Users.
- Repeated business bootstrap submission must not create duplicate active Businesses for the same completed request.
- Business and initial Owner Membership creation are atomic.
- Duplicate invitation submission should be idempotent or safely rejected.
- Concurrent invitation acceptance allows only one successful activation.
- Concurrent role changes must result in one auditable final role.
- Concurrent removal and request authorization must not allow access after removal beyond a bounded revalidation window.
- Simultaneous last-owner removal attempts must preserve at least one active Owner.
- Business deactivation during an operation must prevent new tenant-owned effects after deactivation is observed.
- Retried recovery or invitation actions must reject replayed, expired, or already-used secrets.

Specific API idempotency headers, database locks, transactions, and queue behavior are deferred.

## 21. User-Facing Terminology

Internal term to user-facing Brazilian Portuguese:

- Sign in: "Entrar"
- Create account: "Criar conta"
- Business: "Estabelecimento"
- Active business selection: "Escolher estabelecimento"
- Switch business: "Trocar estabelecimento"
- Team member: "Pessoa da equipe"
- Owner: "Dono" or "Responsavel", subject to UX validation
- Manager: "Gerente"
- Staff: "Atendente" or "Funcionario", subject to UX validation
- Invitation: "Convite"
- Suspended access: "Acesso suspenso"
- Removed access: "Acesso removido"
- Sign out: "Sair"
- Recover access: "Recuperar acesso"
- Password or credential reset: "Redefinir acesso"

Avoid exposing these internal terms in the UI:

- Tenant.
- Membership.
- Capability.
- Session token.
- Authorization context.
- Provider callback.

## 22. Examples and Edge Cases

1. New owner creates account and first Business successfully.
   Outcome: email is verified, Business is active, initial Owner Membership is active, session is established, and the Business is selected.
   Invariant: no active Business exists without an active Owner.

2. Identity creation succeeds but business bootstrap fails.
   Outcome: User may remain global, no active Business access is granted, and retry does not duplicate identity.
   Invariant: partial bootstrap does not create tenant access.

3. Existing owner signs in with one active Business.
   Outcome: session is established and the Business may be selected automatically after server validation.
   Invariant: remembered tenant is still revalidated.

4. User with multiple Businesses signs in.
   Outcome: valid remembered Business is selected or explicit selection is required.
   Invariant: one Business context is active for tenant-owned operations.

5. Remembered Business is no longer accessible.
   Outcome: remembered context is ignored; user must select another valid Business or receives no-tenant state.
   Invariant: stale context never authorizes access.

6. Owner invites a new Staff member.
   Outcome: invitation is created for normalized email and intended Staff role.
   Invariant: delivery provider is outside domain behavior.

7. Existing User accepts invitation to another Business.
   Outcome: new Membership is activated in invited Business only.
   Invariant: membership in one Business does not grant access to another.

8. Invitation is expired, cancelled, mismatched, or already used.
   Outcome: acceptance is rejected with safe guidance.
   Invariant: invitation replay does not create access.

9. Member is suspended while active session exists.
   Outcome: session is revoked or forced to revalidate before further tenant-owned access.
   Invariant: suspended membership cannot authorize access.

10. Member is removed but remains referenced by historical records.
    Outcome: current access is denied; prior records still show the historical actor reference.
    Invariant: removal does not erase audit history.

11. Role is reduced while user is signed in.
    Outcome: session authorization is refreshed or revoked within bounded time.
    Invariant: stale capabilities cannot continue granting sensitive actions.

12. Cross-tenant identifier substitution occurs.
    Outcome: request is denied or returned as not found without leaking another tenant.
    Invariant: client-provided Business identifiers are never sufficient authorization.

13. Only active Owner tries to leave, remove, suspend, or demote themselves.
    Outcome: action is rejected.
    Invariant: active Business cannot have zero active Owners.

14. Two Owners concurrently try to remove one another.
    Outcome: concurrency control preserves at least one active Owner and creates audit records.
    Invariant: last-owner rule is enforced atomically.

15. Business is deactivated while users have active sessions.
    Outcome: sessions for that Business lose tenant context or are revoked; no new operational action is allowed.
    Invariant: deactivated Business blocks ordinary tenant operations.

16. User changes or resets credentials.
    Outcome: sensitive-change audit is recorded and affected sessions are revoked or revalidated.
    Invariant: old credentials or sessions do not continue silently.

17. Shared counter device is left signed in.
    Outcome: visible sign-out and session expiration reduce risk; final timeout value is deferred.
    Invariant: shared-device risk is treated as a product/security requirement.

18. Mobile deep link references inaccessible Business.
    Outcome: mobile session authenticates the User but denies Business access and does not load tenant data.
    Invariant: deep links do not bypass server-side membership validation.

## 23. Rejected or Deferred Alternatives

Rejected for MVP:

- Tenant-owned User identity.
- Access to tenant data without active membership.
- Trusting client-provided Business identifiers as authorization.
- Allowing a Business to have zero active Owners.
- Treating invitation possession alone as enough for access without identity verification.
- Letting suspended or removed memberships authorize access.
- Ordinary hard deletion of Business or membership history.
- Social login as a required MVP feature.
- Enterprise SSO, SCIM, directory sync, or complex identity federation.

Deferred:

- Exact authentication library or managed identity provider.
- Exact password policy and hashing implementation.
- Email delivery provider.
- SMS and phone verification.
- Cookie, token, or session storage format.
- User-managed device list and individual device revocation.
- Ownership transfer workflow.
- Business reactivation workflow.
- Manual support recovery process.
- Legal retention periods.

## 24. Open Questions

Product validation:

- Should release one expose Manager, or only Owner and Staff?
- Should Staff be allowed to record expenses?
- Should Staff view "Quanto sobrou este mês" or only operational views?
- Which user-facing terms are clearest: "Dono" versus "Responsavel", and "Atendente" versus "Funcionario"?
- What session duration is acceptable on shared counter devices?
- Do early merchants expect phone-based recovery?

Deferred implementation decisions:

- Authentication library or managed identity provider.
- Password-based implementation details or alternative credential method.
- Email delivery provider.
- Session storage mechanism.
- Cookie/token format.
- ORM and persistence schema.
- API framework.
- Rate-limiting implementation.
- Audit storage implementation.

### Cycle 017 implementation-readiness finding

Cycle 017 confirmed that server-side persistence and revocation are required, but a real current-session adapter is not yet authorized. The accepted documents do not specify how the opaque browser session identifier becomes request-scoped lookup evidence for the no-input `CurrentSessionStatePort`, how the raw value is converted to the stored keyed digest, or which boundary owns the digest key and version selection.

The documents also do not close the effective expiry exposed when idle and absolute endpoints coexist, deterministic current-time ownership, or whether missing, revoked, expired, disabled-User, and invalid remembered-Business evidence resolves to anonymous inspection, a stable application rejection, or another state. These are security semantics, not ordinary repository details. They require a narrow specification before session SQL, migration, adapter, or Fastify composition is implemented.

## 25. Acceptance Criteria

- Global User identity and tenant-owned Membership are clearly separated.
- First-owner signup and business bootstrap are unambiguous.
- Initial Owner Membership and last-owner invariant are defined.
- Partial bootstrap failure behavior is defined.
- Returning-user sign-in behavior is defined for relevant membership states.
- Session boundaries are implementation-independent and explicit.
- Active tenant selection and switching are defined.
- Every tenant-owned request requires server-side membership validation.
- Remembered tenant context is never trusted without revalidation.
- Membership states and transitions are explicit.
- Invitation behavior and replay protection requirements are explicit.
- Suspension, removal, role change, and business deactivation consequences are explicit.
- Capability-oriented authorization is aligned with Cycle 002.
- Manager exposure is handled without contradicting merchant-validation requirement.
- Staff access to expenses and sensitive reports is isolated as merchant-validation questions.
- Recovery and credential-sensitive operations are addressed.
- Audit boundaries are defined without exposing secrets.
- Security and privacy implications are aligned.
- Concurrency and idempotency expectations are defined.
- User-facing Brazilian Portuguese terminology is documented.
- Future test targets are documented in the test strategy.
- Open questions are separated from accepted decisions.
- No application code, dependency, package manifest, schema, migration, scaffold, UI, API, or integration is introduced.

## 26. Traceability

Product requirements:

- Basic user and business access control is inside the MVP.
- The product must preserve tenant isolation and auditability.
- The product must remain simple for merchants with limited technology familiarity.
- Security, privacy, and LGPD considerations must exist from the beginning.

Related documents:

- [Product Vision](../product/vision.md)
- [MVP Scope](../product/mvp-scope.md)
- [Domain and Tenancy Specification](domain-and-tenancy.md)
- [Architecture Baseline](../architecture/architecture.md)
- [Domain Model Baseline](../architecture/domain-model.md)
- [Privacy and LGPD](../security/privacy-and-lgpd.md)
- [Test Strategy](../quality/test-strategy.md)
- [Tasks](../tasks.md)

Related ADRs:

- [ADR 0001: Use Spec-Driven Development and Traceable Delivery Cycles](../architecture/decisions/0001-use-sdd-and-traceable-cycles.md)
- [ADR 0002: Keep the MVP Deliberately Small](../architecture/decisions/0002-keep-mvp-deliberately-small.md)
- [ADR 0006: Use Business as the Tenant Boundary](../architecture/decisions/0006-business-as-tenant-boundary.md)
- [ADR 0010: Use Global User Identity with Tenant-Scoped Memberships](../architecture/decisions/0010-global-user-tenant-memberships.md)
- [ADR 0011: Require Atomic First-Owner Business Bootstrap](../architecture/decisions/0011-atomic-first-owner-business-bootstrap.md)
- [ADR 0012: Server-Validate Active Business Context for Sessions and Requests](../architecture/decisions/0012-server-validated-active-business-context.md)

## 27. Recommended Follow-up Specification

Recommended next cycle: Data Persistence and Tenant Enforcement Specification.

Why: Cycles 002 and 003 define tenant invariants, membership lifecycle, active business context, session revocation requirements, audit boundaries, last-owner rules, and bootstrap atomicity. The next highest-risk dependency is specifying how persistence will enforce those invariants without yet implementing database schemas or selecting ORM details beyond documented open decisions.

Non-goals for that cycle should include application implementation, migrations, API endpoints, UI screens, provider integrations, and MVP scope expansion.
