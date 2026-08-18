# Setting up a DMARC policy for thido.ai

Covers [production-todo.md](./production-todo.md)'s open "Add a DMARC policy and monitoring address for the sending domain" item. DMARC is a DNS TXT record that tells receiving mail servers what to do with mail claiming to be from `thido.ai` that fails SPF/DKIM, and where to send reports about it. It's independent of Resend (Thido's email provider) — it's added directly in DNS, same place the `thido.ai` domain records already live (Route 53, per [production-todo.md:392](./production-todo.md)).

## 1. SPF and DKIM must be passing first

DMARC only "passes" a message if SPF or DKIM also passes **and** is aligned with the `From` domain. [production-todo.md:108](./production-todo.md) still shows SPF/DKIM as unconfirmed, so do this first:

1. In the Resend dashboard, go to **Domains → thido.ai**. Resend lists the exact SPF (TXT) and DKIM (CNAME or TXT) records it needs.
2. Add each record in Route 53 exactly as shown (name, type, value).
3. Back in Resend, click verify/refresh on the domain until it shows as verified. This confirms SPF and DKIM are live, not just added.

Skipping this means DMARC will see everything as failing, which defeats the point of setting it up.

## 2. Add the DMARC record

In Route 53, in the `thido.ai` hosted zone, create:

- **Record type:** TXT
- **Name:** `_dmarc` (Route 53 appends the zone name automatically, so this becomes `_dmarc.thido.ai`)
- **Value** (start here, monitor-only — see below):

  ```
  v=DMARC1; p=none; rua=mailto:dmarc-reports@thido.ai; fo=1
  ```

  - `p=none` — don't affect delivery yet, just collect data. Start here always.
  - `rua=mailto:...` — where aggregate reports get sent daily.
  - `fo=1` — also send forensic-style failure reports (useful early on; can drop later if the volume is noisy).

## 3. Get a mailbox to receive reports

`rua` needs a real, reachable inbox. Aggregate reports arrive as gzipped XML, not human-readable — you'll want something that parses them rather than reading raw attachments:

- If `thido.ai` already has a working mailbox (e.g. wherever `osato@thido.ai` currently receives mail — it's already the support/admin address used elsewhere in this project), you can point `rua` straight at that address, or a dedicated alias like `dmarc-reports@thido.ai` if that mailbox supports aliasing.
- Otherwise, a free DMARC report analyzer (dmarcian's free tier and Postmark's free DMARC monitor are common choices) gives you an address to use for `rua` and turns the raw reports into a readable dashboard.

## 4. Roll out gradually

1. **`p=none`** for 1-2 weeks. Watch the reports to confirm every legitimate source (Resend, and anything else that ever sends as `@thido.ai`) is passing SPF/DKIM alignment.
2. **`p=quarantine`** once the reports look clean — failing mail gets sent to spam instead of blocked outright.
3. **`p=reject`** once quarantine has run cleanly for a while — failing mail gets rejected outright. This is the actual anti-spoofing protection; `none` and `quarantine` are just safer ways to get there without breaking your own mail first.

Each step is just editing the same TXT record's `p=` value in Route 53.

## 5. Verify the record is live

```
dig txt _dmarc.thido.ai
```

or check it with a DMARC checker (e.g. MXToolbox's DMARC lookup). Once confirmed, update [production-todo.md:109](./production-todo.md).
