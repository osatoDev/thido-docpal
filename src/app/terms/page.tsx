import type { Metadata } from "next";

import { LegalDocument } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Terms of Service | Thido",
  description: "The terms that apply when you use Thido.",
};

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      description="These Terms govern your access to and use of Thido, including its document drafting, editing, commenting, and AI-assisted features."
    >
      <section>
        <h2>1. Agreement to these Terms</h2>
        <p>
          By creating an account or using Thido, you agree to these Terms. If
          you use Thido for an organisation, you confirm that you have authority
          to accept these Terms for that organisation. If you do not agree, do
          not use the service.
        </p>
        <p>
          You must be at least 18 years old, or the age of legal majority where
          you live, to use Thido.
        </p>
      </section>

      <section>
        <h2>2. Your account</h2>
        <p>
          You must provide accurate account information and keep your login
          credentials secure. You are responsible for activity performed through
          your account. Tell us promptly at{" "}
          <a href="mailto:support@thido.ai">support@thido.ai</a> if you believe
          your account has been compromised.
        </p>
        <p>
          You may sign in using a password or an available third-party identity
          provider. Your use of a third-party sign-in service is also governed by
          that provider&apos;s terms.
        </p>
      </section>

      <section>
        <h2>3. The service</h2>
        <p>
          Thido helps you create and refine documents. Features may change as we
          improve the service, and some features may be experimental. We may
          modify, suspend, or discontinue a feature, but will try to give
          reasonable notice when a material change would significantly affect
          your use.
        </p>
        <p>
          Beta access is free and does not require a payment card. Unless a paid
          plan is clearly offered and accepted by you, access to Thido does not
          create an obligation to pay.
        </p>
        <p>
          If you choose a paid subscription, its price, currency, billing
          interval, included features, taxes, and any trial will be shown before
          checkout. Subscriptions renew automatically for the displayed interval
          until cancelled. You can manage or cancel a subscription through the
          billing portal; cancellation normally takes effect at the end of the
          current paid period unless the checkout terms or applicable law state
          otherwise. Mandatory refund and cancellation rights continue to apply.
        </p>
      </section>

      <section>
        <h2>4. Your content</h2>
        <p>
          You retain your rights in the documents, prompts, comments, and other
          material you submit to Thido (&quot;User Content&quot;). You grant us a
          limited, non-exclusive licence to host, copy, transmit, process, and
          display User Content only as needed to operate, secure, maintain, and
          improve the service and to provide features you request.
        </p>
        <p>
          You confirm that you have the rights needed to submit User Content and
          allow this processing. Do not submit confidential, regulated, or highly
          sensitive information unless you have assessed whether Thido and its
          service providers are appropriate for that information.
        </p>
        <p>
          If you create a share link, anyone who obtains that link can view the
          shared document until you revoke it. You may also choose a link
          permission that lets signed-in link holders comment, edit, or receive
          full access. You are responsible for choosing appropriate content,
          recipients, and permissions. Revoking a link prevents future
          link-derived access through Thido but cannot retrieve copies already
          made by a recipient.
        </p>
        <p>
          You may also invite a person by email and choose their access level.
          View access permits reading, comment access permits feedback, edit
          access permits changes to document content, and full access also
          permits deletion and management of sharing. You are responsible for
          choosing the intended recipient and permission. A full-access
          collaborator can permanently delete the document, although inviting
          them does not transfer ownership.
          The same authority applies to a signed-in person using a full-access
          link, and the link may be forwarded to other people.
        </p>
      </section>

      <section>
        <h2>5. AI-generated material</h2>
        <p>
          Thido uses artificial intelligence to draft, revise, and comment on
          text. AI output may be inaccurate, incomplete, offensive, or similar
          to material generated for another user. You are responsible for
          reviewing output before relying on, publishing, or sharing it.
        </p>
        <p>
          Thido does not provide legal, medical, financial, or other professional
          advice. Do not use AI output as the sole basis for decisions that may
          materially affect a person&apos;s rights, health, safety, finances, or
          access to essential services.
        </p>
      </section>

      <section>
        <h2>6. Acceptable use</h2>
        <p>You may not use Thido to:</p>
        <ul>
          <li>break the law or violate another person&apos;s rights;</li>
          <li>create or distribute malware, fraud, spam, or deceptive content;</li>
          <li>harass, exploit, or endanger another person;</li>
          <li>attempt to bypass security, access controls, or usage limits;</li>
          <li>probe, disrupt, overload, or reverse engineer the service; or</li>
          <li>
            submit content that you are not permitted to disclose or process.
          </li>
        </ul>
        <p>
          You must also comply with the acceptable-use requirements of service
          providers used to deliver requested features. We may investigate
          suspected abuse and restrict access where reasonably necessary to
          protect users, the service, or others.
        </p>
      </section>

      <section>
        <h2>7. Thido&apos;s intellectual property</h2>
        <p>
          Thido and its software, design, branding, and documentation are owned
          by us or our licensors. These Terms give you a limited, revocable,
          non-transferable right to use the service; they do not transfer
          ownership of Thido&apos;s intellectual property to you.
        </p>
      </section>

      <section>
        <h2>8. Third-party services</h2>
        <p>
          Thido depends on third parties for hosting, databases, authentication,
          email delivery, payments, analytics, and AI processing. Their services may
          occasionally be unavailable or change. Our{" "}
          <a href="/privacy">Privacy Policy</a> describes the providers that may
          process personal data when you use Thido.
        </p>
      </section>

      <section>
        <h2>9. Suspension and termination</h2>
        <p>
          You may stop using Thido at any time. You may request account deletion
          by contacting <a href="mailto:support@thido.ai">support@thido.ai</a>.
          We may suspend or terminate access when we reasonably believe you have
          materially breached these Terms, created a security or legal risk, or
          used the service abusively. Where appropriate, we will give notice and
          an opportunity to remedy the issue.
        </p>
      </section>

      <section>
        <h2>10. Disclaimers</h2>
        <p>
          To the extent permitted by law, Thido is provided &quot;as is&quot; and
          &quot;as available&quot;. We do not guarantee uninterrupted operation,
          error-free output, or that generated content will be accurate or fit
          for a particular purpose. Nothing in these Terms excludes warranties or
          rights that cannot legally be excluded, including mandatory consumer
          rights.
        </p>
      </section>

      <section>
        <h2>11. Limitation of liability</h2>
        <p>
          To the extent permitted by law, Thido will not be liable for indirect,
          incidental, special, consequential, or punitive losses, or for lost
          profits, revenue, data, or business opportunities arising from your use
          of the service. Our total liability relating to the service will not
          exceed the greater of the amount you paid to Thido in the 12 months
          before the event giving rise to the claim or €100.
        </p>
        <p>
          These limits do not apply where liability cannot lawfully be limited,
          including liability for fraud, wilful misconduct, or death or personal
          injury caused by negligence where applicable law so provides.
        </p>
      </section>

      <section>
        <h2>12. Changes to these Terms</h2>
        <p>
          We may update these Terms to reflect changes to Thido, the law, or our
          business. We will update the effective date and provide reasonable
          notice of material changes. Continuing to use Thido after an update
          takes effect means you accept the revised Terms.
        </p>
      </section>

      <section>
        <h2>13. General terms</h2>
        <p>
          If any part of these Terms is unenforceable, the remaining parts will
          continue to apply. A delay in enforcing a term is not a waiver. You may
          not transfer these Terms without our consent; we may transfer them as
          part of a reorganisation, financing, merger, acquisition, or sale of
          the service, subject to applicable law.
        </p>
        <p>
          Applicable law and courts with lawful jurisdiction govern disputes.
          Mandatory consumer protections in your country of residence continue
          to apply.
        </p>
      </section>

      <section>
        <h2>14. Contact</h2>
        <p>
          Questions about these Terms may be sent to{" "}
          <a href="mailto:legal@thido.ai">legal@thido.ai</a>.
        </p>
      </section>
    </LegalDocument>
  );
}
