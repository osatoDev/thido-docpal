import type { Metadata } from "next";

import { LegalDocument } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Privacy Policy — Thido",
  description: "How Thido collects, uses, shares, and protects personal data.",
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      description="This Policy explains what information Thido handles, why we use it, which service providers help us operate the product, and the choices available to you."
      effectiveDate="30 July 2026"
    >
      <section>
        <h2>1. Who is responsible for your data</h2>
        <p>
          Thido is responsible for the personal data described in this Policy.
          For privacy questions, rights requests, or account-deletion requests,
          contact <a href="mailto:privacy@thido.ai">privacy@thido.ai</a>.
        </p>
      </section>

      <section>
        <h2>2. Information we collect</h2>
        <h3>Account and authentication data</h3>
        <p>
          We process your name, email address, profile image, email-verification
          status, and account identifiers. If you use a password, we store a
          salted cryptographic hash, not the password itself. If you use Google
          sign-in, we receive basic profile information and store the provider
          identifiers and tokens needed to maintain the connection.
        </p>

        <h3>Documents and prompts</h3>
        <p>
          We store the documents you create, titles, prompt questions and
          answers, comments, suggestions, document status, AI preferences, and
          associated timestamps. Thido currently stores this editable content
          in its PostgreSQL database; it does not currently store documents as
          uploaded files in object storage.
        </p>
        <p>
          You may begin an outline before signing in. During that guest flow,
          the answers are kept temporarily in your browser and are not sent to
          Thido&apos;s servers until you authenticate and ask us to create the
          document.
        </p>
        <p>
          If someone shares a document directly, we store the recipient&apos;s
          normalised email address, the permission selected by the sharer, who
          sent the invitation, and invitation timestamps. We use the address to
          deliver the invitation and to grant access when the recipient signs in
          with that address. Depending on the selected permission, the recipient
          may view, comment on, edit, delete, or manage sharing for the document.
        </p>
        <p>
          If you enable link sharing, we store a random share-link token. Anyone
          who receives the link can view the document title, body, and your
          profile name without an account until you revoke the link. The shared
          view does not expose your email address, other account details,
          comments, or editing controls. Recipients may still copy or retain
          content they can view.
        </p>

        <h3>Communications</h3>
        <p>
          We process your email address and the content needed to send account
          verification, password-reset, and document-invitation messages. If you
          contact us, we may retain your message and related support
          correspondence.
        </p>

        <h3>Usage and technical data</h3>
        <p>
          We receive technical information such as IP-derived location, browser,
          operating system, device type, referring page, requested route, and
          timestamps. We also process security and operational information needed
          to authenticate requests, enforce rate limits, diagnose failures, and
          protect Thido.
        </p>
      </section>

      <section>
        <h2>3. How and why we use information</h2>
        <ul>
          <li>to create and secure your account and keep you signed in;</li>
          <li>to save, display, edit, organise, and share your documents;</li>
          <li>to generate drafts, follow-up questions, comments, and revisions;</li>
          <li>to send verification, password-reset, invitation, and service messages;</li>
          <li>to understand aggregate product usage and improve reliability;</li>
          <li>to prevent fraud, misuse, and security incidents; and</li>
          <li>to meet legal obligations and enforce our Terms.</li>
        </ul>
        <p>
          Where European data-protection law applies, our legal bases are
          performance of our contract with you, our legitimate interests in
          operating and securing Thido, consent where we specifically request
          it, and compliance with legal obligations. You may object to processing
          based on legitimate interests as described below.
        </p>
      </section>

      <section>
        <h2>4. AI processing</h2>
        <p>
          When you request an AI feature, Thido sends the text and instructions
          needed to fulfil that request to one or more third-party AI model
          providers. Depending on the feature, this may include document text,
          prompt answers, selected text, comments, and nearby context. The
          provider may vary based on feature availability, performance, safety,
          or product configuration. Do not include personal or confidential
          information that is unnecessary for your request.
        </p>
        <p>
          We select provider accounts and commercial services intended for API
          use and apply available data controls appropriate to Thido. Provider
          retention periods and permitted processing may differ. We require each
          provider to process submitted material under its applicable commercial
          terms, our configuration, and relevant data-protection obligations. We
          will update this Policy if a provider change materially affects how
          your information is handled.
        </p>
        <p>
          Thido&apos;s AI features assist with writing; they do not make decisions
          that produce legal or similarly significant effects about you.
        </p>
      </section>

      <section>
        <h2>5. Service providers and disclosures</h2>
        <p>
          We disclose information only as needed to operate Thido, follow your
          instructions, protect the service, complete a business transaction, or
          comply with law. Our principal service providers are:
        </p>
        <div className="legal-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Provider</th>
                <th>Purpose</th>
                <th>Information involved</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <a href="https://vercel.com/legal/privacy-policy" rel="noreferrer" target="_blank">
                    Vercel
                  </a>
                </td>
                <td>Application hosting and web analytics</td>
                <td>Requests, technical data, and analytics events</td>
              </tr>
              <tr>
                <td>
                  <a href="https://neon.com/privacy-policy" rel="noreferrer" target="_blank">
                    Neon
                  </a>
                </td>
                <td>Managed PostgreSQL database infrastructure</td>
                <td>Account, document, prompt, comment, and settings data</td>
              </tr>
              <tr>
                <td>AI model providers</td>
                <td>AI generation and text processing</td>
                <td>Prompts, relevant document content, and generated output</td>
              </tr>
              <tr>
                <td>
                  <a href="https://resend.com/legal/privacy-policy" rel="noreferrer" target="_blank">
                    Resend
                  </a>
                </td>
                <td>Transactional email delivery</td>
                <td>Email address and verification, reset, or invitation email content</td>
              </tr>
              <tr>
                <td>
                  <a href="https://rollbar.com/privacy/" rel="noreferrer" target="_blank">
                    Rollbar
                  </a>
                </td>
                <td>Application error tracking and incident diagnosis</td>
                <td>
                  Error messages, stack traces, route patterns, deployment
                  identifiers, and technical data
                </td>
              </tr>
              <tr>
                <td>
                  <a href="https://policies.google.com/privacy" rel="noreferrer" target="_blank">
                    Google
                  </a>
                </td>
                <td>Optional Google account sign-in</td>
                <td>Basic profile and OAuth authentication data</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          We do not sell personal data. We do not share personal data for
          cross-context behavioural advertising. If ownership or control of Thido
          changes, information may be transferred as part of that transaction,
          subject to this Policy and applicable law. You may contact us for
          information about the AI model providers currently used by Thido.
        </p>
      </section>

      <section>
        <h2>6. Analytics, cookies, and browser storage</h2>
        <p>
          Thido uses essential cookies for authentication and security, plus a
          preference cookie that remembers your light or dark theme. Disabling
          essential cookies may prevent sign-in and other core features from
          working.
        </p>
        <p>
          The guest drafting flow uses your browser&apos;s session storage to
          preserve unfinished outline answers during navigation, refreshes, and
          the sign-in redirect. Thido treats a stored guest outline as expired
          after 24 hours and removes it after the authenticated document is
          created. Session storage is local to the browser tab or session and may
          disappear sooner if you close the tab, clear site data, or use browser
          privacy controls.
        </p>
        <p>
          We use Vercel Web Analytics to measure page visits and product usage.
          Vercel states that this service does not use third-party cookies. It
          derives an anonymous visitor identifier from request data, discards the
          identifier after 24 hours, and records information such as route,
          referrer, coarse location, browser, operating system, and device type.
          We do not intentionally send document text, prompts, email addresses,
          or authentication secrets as analytics events. See Vercel&apos;s{" "}
          <a
            href="https://vercel.com/docs/analytics/privacy-policy"
            rel="noreferrer"
            target="_blank"
          >
            Web Analytics privacy documentation
          </a>
          .
        </p>
        <p>
          We use Rollbar to group application errors and alert us when Thido
          fails. The integration is configured to exclude document text,
          prompts, comments, form input, email addresses, authentication
          secrets, request bodies, and public share-link tokens. Session replay
          and automatic browser activity recording are disabled. Rollbar may
          receive an error message, stack trace, sanitised route pattern,
          deployment identifier, provider request identifier, and other
          technical context needed to diagnose the failure.
        </p>
      </section>

      <section>
        <h2>7. Retention</h2>
        <p>
          We generally retain account information and documents while your
          account is active or as needed to provide Thido. Verification links
          expire after 24 hours and password-reset links expire after one hour.
          We may retain limited records longer where reasonably necessary for
          security, dispute resolution, backup integrity, or legal compliance.
        </p>
        <p>
          You may request deletion by contacting{" "}
          <a href="mailto:privacy@thido.ai">privacy@thido.ai</a>. Some data may
          remain temporarily in backups or where retention is legally required.
          Our providers apply their own documented deletion and backup cycles to
          data they process for us.
        </p>
      </section>

      <section>
        <h2>8. International transfers</h2>
        <p>
          Thido&apos;s providers may process information in countries other than
          the one where you live, including the United States. Where required,
          we rely on recognised transfer mechanisms and provider contractual
          safeguards for international transfers.
        </p>
      </section>

      <section>
        <h2>9. Security</h2>
        <p>
          We use technical and organisational measures designed to protect your
          information, including encrypted connections, access controls, hashed
          passwords and one-time authentication tokens, and server-side access to
          infrastructure credentials. No service can guarantee absolute security.
          Please use a unique password and notify us if you suspect unauthorised
          account access.
        </p>
      </section>

      <section>
        <h2>10. Your rights and choices</h2>
        <p>
          Depending on where you live, you may have rights to access, correct,
          delete, restrict, or obtain a copy of personal data, object to certain
          processing, withdraw consent, or appeal our response. You may also have
          the right to complain to your local data-protection authority. We may
          need to verify your identity before completing a request.
        </p>
        <p>
          Send requests to <a href="mailto:privacy@thido.ai">privacy@thido.ai</a>.
          You can disconnect Thido from your Google Account through Google&apos;s
          account security settings, but doing so does not by itself delete your
          Thido account or stored documents.
        </p>
      </section>

      <section>
        <h2>11. Children</h2>
        <p>
          Thido is not directed to children under 18, and we do not knowingly
          collect their personal data. If you believe a child has provided data
          to Thido, contact us so we can investigate and take appropriate action.
        </p>
      </section>

      <section>
        <h2>12. Changes to this Policy</h2>
        <p>
          We may update this Policy as Thido or applicable law changes. We will
          update the effective date and provide reasonable notice when a change
          materially affects your privacy rights.
        </p>
      </section>

      <section>
        <h2>13. Contact</h2>
        <p>
          For privacy questions or requests, email{" "}
          <a href="mailto:privacy@thido.ai">privacy@thido.ai</a>. For general
          account support, email{" "}
          <a href="mailto:support@thido.ai">support@thido.ai</a>.
        </p>
      </section>
    </LegalDocument>
  );
}
