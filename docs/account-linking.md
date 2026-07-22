# Linking Google and password accounts

## Why account linking needs an explicit policy

Two sign-in methods can present the same email address without proving the same thing. A password registration proves knowledge of a password and, after verification, control of the mailbox. Google OAuth proves control of a Google account and reports provider-specific email verification information.

Automatically merging accounts solely because their email strings match can create an account-takeover path when a provider supplies an unverified address, when an organization reassigns an address, or when a provider's identity guarantees are misunderstood.

## Common approaches

### 1. No automatic linking

When a Google login matches an existing password account, the application refuses the new provider login and asks the user to sign in with the original method. After signing in, the user can explicitly connect Google from account settings.

This is the safest common default and is close to Auth.js's normal behavior. Its main cost is additional friction and support questions.

### 2. Link from an authenticated settings page

The user first signs in to the existing account, chooses **Connect Google**, completes Google's OAuth flow, and confirms the link. The application adds an `Account` record to the already authenticated `User` rather than creating another user.

This is the recommended long-term approach for Thido because the existing session establishes which account is being modified. Sensitive linking and unlinking actions should require recent authentication. The application should never allow removal of the last usable sign-in method.

### 3. Email-mediated linking

When a collision occurs, the application sends a short-lived confirmation link to the shared address. Following the link confirms mailbox control before linking the identities.

This can help a user who cannot use the original sign-in method, but it effectively makes email access an account-recovery factor. It must use single-use, hashed, expiring tokens and should notify the user after linking.

### 4. Automatic linking for trusted providers

Some applications automatically link when a provider is allowlisted and asserts that the email is verified. This provides the smoothest experience, but it shifts substantial trust to provider configuration and email lifecycle rules.

If used, it should be limited to carefully reviewed providers, require an explicit verified-email claim, preserve an audit trail, and notify the account owner. It should not be enabled broadly through a generic “dangerous email account linking” option.

### 5. Keep separate accounts

The application can allow two users with the same visible email only when its data model has a provider-scoped identity key rather than a globally unique email. Thido currently makes email globally unique, so this approach would require a deliberate schema and product redesign.

## Recommended Thido policy

1. Keep automatic email-based linking disabled.
2. Require password accounts to verify their email before sign-in.
3. Add an authenticated **Connected accounts** section later.
4. Require a fresh password sign-in before connecting Google to a password account.
5. Require a fresh Google sign-in before adding or replacing a password on a Google-only account.
6. Send a security notification whenever a provider is linked or unlinked.
7. Record the provider, timestamp, user ID, and request metadata in an audit log.
8. Prevent unlinking when it would leave the user with no usable credential.

## Current behavior

Thido uses Auth.js with the Prisma adapter. Provider identities are stored in `Account`, and users are stored in `User`. Password authentication uses `User.passwordHash` rather than an `Account` row.

The application does not currently implement an account-settings linking flow and does not enable unsafe automatic linking. A Google attempt that collides with an existing user may therefore require the user to sign in using the method originally associated with the account. This should remain the default until an explicit authenticated linking interface is built.
