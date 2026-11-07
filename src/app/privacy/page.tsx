import type { Metadata } from "next";

import { LegalDocument } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Privacy Policy | Thido",
  description: "How Thido collects, uses, shares, and protects personal data.",
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      description="This Policy explains what information Thido handles, why we use it, which service providers help us operate the product, and the choices available to you."
      effectiveDate="6 November 2026"
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

        <h3>Plans and documents</h3>
        <p>
          We store the plans and documents you create, their titles, saved
          versions, the AI feedback Thido gives on your plans, your settings, and
          associated timestamps. Thido stores this content in its PostgreSQL
          database. Images you add to a document are stored in Vercel Blob
          object storage.
        </p>
        <p>
          Your plans and documents are private to your account. Thido does not
          offer share links or collaborators.
        </p>

        <h3>Communications</h3>
        <p>
          We process your email address and the content needed to send account
          verification, password-reset, and service messages, such as a
          reminder shortly after sign-up if you have not added anything yet. If
          you contact us, we may retain your message and related support
          correspondence.
        </p>
        <p>
          Signed-in users may send private messages to the Thido founding team.
          We store the message, its category, replies, response timestamps, and
          the page path the user chose to include. We do not automatically add
          plan or document text or editor selections to founder conversations.
        </p>

        <h3>Beta access and billing</h3>
        <p>
          We store your beta-place number and the date access was granted. If
          you choose a paid plan, we store Stripe customer, subscription, price,
          status, renewal, and cancellation identifiers needed to provide and
          manage that plan. Payment details are collected by Stripe through its
          hosted checkout and billing portal; Thido does not store your full
          payment-card number.
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
          <li>to save, display, edit, and organise your plans and documents;</li>
          <li>to place tasks you type on the right day and time, and to give feedback on your plans;</li>
          <li>to send verification, password-reset, and service messages;</li>
          <li>to receive, answer, and monitor response times for founder messages;</li>
          <li>to provide beta access and administer optional paid plans;</li>
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
          Thido sends the text and instructions needed for its AI features to
          one or more third-party AI model providers. When you add a task in
          plain language, this is the text you typed, your local date, and your
          time zone. When Thido reviews a day, this is that day&apos;s tasks.
          The provider may vary based on feature availability, performance,
          safety, or product configuration. Do not include personal or
          confidential information that is unnecessary for your request.
        </p>
        <p>
          Besides reviews you ask for, Thido may automatically review a
          day&apos;s plan a few times a day after you add a task. You can lower
          how often this happens, or turn it off, under Automatic plan feedback
          in Settings.
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
          Thido&apos;s AI features help you plan; they do not make decisions
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
                <td>Application hosting, image storage, and web analytics</td>
                <td>Requests, technical data, document images, and analytics events</td>
              </tr>
              <tr>
                <td>
                  <a href="https://neon.com/privacy-policy" rel="noreferrer" target="_blank">
                    Neon
                  </a>
                </td>
                <td>Managed PostgreSQL database infrastructure</td>
                <td>Account, plan, document, plan feedback, and settings data</td>
              </tr>
              <tr>
                <td>AI model providers</td>
                <td>AI generation and text processing</td>
                <td>Task text, the tasks for the day being reviewed, and generated output</td>
              </tr>
              <tr>
                <td>
                  <a href="https://resend.com/legal/privacy-policy" rel="noreferrer" target="_blank">
                    Resend
                  </a>
                </td>
                <td>Transactional email delivery</td>
                <td>Email address and verification, reset, or service email content</td>
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
                  <a href="https://stripe.com/privacy" rel="noreferrer" target="_blank">
                    Stripe
                  </a>
                </td>
                <td>Hosted checkout, subscriptions, and billing management</td>
                <td>
                  Account and contact details, payment information, transaction
                  details, and Thido billing identifiers
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
          We use Vercel Web Analytics to measure page visits and product usage.
          Vercel states that this service does not use third-party cookies. It
          derives an anonymous visitor identifier from request data, discards the
          identifier after 24 hours, and records information such as route,
          referrer, coarse location, browser, operating system, and device type.
          We do not intentionally send plan or document text, email addresses, or
          authentication secrets as analytics events. See Vercel&apos;s{" "}
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
          fails. The integration is configured to exclude plan and document
          text, form input, email addresses, authentication secrets, and
          request bodies. Session replay
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
          Billing and transaction records may be retained for the periods
          required for accounting, tax, dispute, and legal obligations.
          Founder-message threads may be retained with the account so the user
          and team can refer to the conversation; a specific support retention
          period will be published before broader production use.
          We may retain limited records longer where reasonably necessary for
          security, dispute resolution, backup integrity, or legal compliance.
        </p>
        <p>
          Version history keeps one saved version of each document per day,
          and every version from the current day. Versions older than 30 days
          are reduced to one per week, and versions older than six months to
          one per month. This happens automatically, without notice, when a
          new version is saved. Removed versions cannot be restored through
          version history. The current document is not affected.
        </p>
        <p>
          You can delete your account and its data from Settings, or request
          deletion by contacting{" "}
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
          You can download a copy of your plans, documents, and account data
          from Settings. Send other requests to{" "}
          <a href="mailto:privacy@thido.ai">privacy@thido.ai</a>.
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
