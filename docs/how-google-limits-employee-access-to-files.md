# How Google limits employee access to users' files

## Short answer

Google uses two different security models, and the distinction matters:

1. **Ordinary Google Docs and Drive:** Google encrypts files in transit and at rest, then limits employee access through permissions, approvals, monitoring, and audit logs. This makes unauthorized access difficult and detectable, but it does not make access cryptographically impossible because Google operates the service and controls the server-side encryption system.
2. **Workspace client-side encryption:** An organization controls the encryption keys through an external key service. Content is encrypted before it reaches Drive. Google states that it does not have the keys and cannot decrypt these files.

So the accurate claim is not that Google employees can never read every Google Docs file. For ordinary files, exceptionally authorized personnel may be able to access content when there is a valid operational, support, security, or legal reason. Client-side encrypted files provide the stronger technical boundary.

## How ordinary Google Workspace files are protected

Google's standard model is based on reducing, controlling, and recording privileged access:

- Access is denied by default and granted according to least privilege.
- Only a limited group of personnel can receive production access.
- Access can be temporary and scoped to a specific task.
- A valid business justification is required.
- Strong authentication, approved devices, and access-control-list membership are used.
- Approval by another qualified person may be required.
- Access is logged, monitored, and investigated when it looks unusual.

Google's [Workspace security whitepaper](https://workspace.google.com/learn-more/security/security-whitepaper/page-7/) describes limited employee access, access-control lists, formal approval workflows, logging, monitoring, and investigation of unusual access. Google's [privileged-access documentation](https://docs.cloud.google.com/docs/security/privileged-access-management) also describes default-deny, temporary least-privilege access, justifications, trusted devices, strong authentication, approvals, and auditing.

Some enterprise offerings add [Access Transparency](https://docs.cloud.google.com/assured-workloads/access-transparency/docs/overview), which records actions taken by Google personnel and the reason for the access. Access Approval can require a customer's approval for qualifying requests. These controls provide accountability, but they are still policy and access-control protections rather than a mathematical guarantee that the provider cannot decrypt the data.

## How client-side encryption changes the boundary

With Workspace client-side encryption, the file is encrypted before it reaches Google's Drive servers. The customer's organization supplies or selects a Key Access Control List Service, often called a KACLS, and controls who may unwrap the file's data-encryption key.

Google's Drive documentation says that because Google does not have access to those encryption keys, it cannot decrypt the files. See [Get started with encrypted files in Drive, Docs, Sheets, and Slides](https://support.google.com/drive/answer/10519333) and the [Drive API client-side encryption guide](https://developers.google.com/workspace/cse/guides/handle-cse-files).

The simplified flow is:

1. The browser creates a unique key for the document.
2. The browser encrypts the document content.
3. The organization's external key service wraps and controls access to that key.
4. Google stores the encrypted document and the wrapped key.
5. An authorized user's browser obtains permission from the key service and decrypts the content.

Google's [CSE encryption and decryption guide](https://developers.google.com/workspace/cse/guides/encrypt-and-decrypt-data) documents this key-wrapping flow. Google's [CSE setup overview](https://support.google.com/a/answer/14309952) says the organization must use its own encryption keys through an external service or its own implementation.

### Important limitations

Client-side encryption is not the default for ordinary consumer Google Docs. It is available only on certain Workspace editions and must be configured by an administrator.

It also has product tradeoffs. Features that require Google's servers to understand the content can become limited or unavailable. For example, Google says its servers cannot scan client-side encrypted content for phishing, malware, or data-loss-prevention matches because the servers do not have access to the content. See Google's [client-side encryption FAQ](https://knowledge.workspace.google.com/admin/security/client-side-encryption-faq).

Encryption also does not protect content after an authorized recipient decrypts it. A compromised browser extension, device, collaborator account, screen capture, or customer key service can still expose it. Some metadata, such as a file title or sharing information, can remain visible depending on the product and configuration.

## What this means for Thido

There are two honest product promises Thido could choose between.

### Controlled provider access

Thido can follow the ordinary SaaS model:

- Encrypt traffic and stored data.
- Deny production access by default.
- Separate support, engineering, and database privileges.
- Use short-lived, ticket-linked access instead of permanent access.
- Require a second person's approval before document-content access.
- Record an immutable audit event for every privileged read.
- Alert on unusual access and periodically review permissions.
- Keep document content, prompts, and generated text out of application logs and error reports.
- Give users a visible history of provider access where practical.

This can make employee access rare, justified, and accountable. It cannot truthfully support an absolute claim that Thido employees are technically unable to read documents.

### Provider-unreadable documents

To promise that Thido itself cannot read stored document content, Thido would need client-side or end-to-end encryption with keys that Thido does not control. Documents would be decrypted only in an authorized user's browser or another customer-controlled environment.

That decision affects core Thido features. Server-side AI editing, document generation, search, previews, conversion, exports, moderation, recovery, and collaboration cannot operate normally on ciphertext. An AI feature would need one of these approaches:

- the user explicitly decrypts and sends selected content for each AI request;
- AI runs locally on the user's device;
- AI runs inside infrastructure controlled by the customer; or
- the product clearly offers a less-private mode in which Thido can process the content.

The right near-term statement for Thido should therefore describe concrete safeguards, not claim that employees cannot read documents until the stronger key architecture exists and has been independently verified.

