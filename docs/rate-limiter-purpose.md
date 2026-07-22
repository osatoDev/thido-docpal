# The general purpose of a rate limiter

A rate limiter controls how frequently a person, device, account, or software client may perform an operation during a period of time.

For example, an application might permit:

- five login attempts per 15 minutes;
- 100 API requests per minute;
- three password-reset emails per hour;
- ten expensive document generations per day.

When the relevant limit is reached, the application temporarily refuses additional requests, usually with an HTTP `429 Too Many Requests` response or a user-friendly message asking the user to wait.

## Why rate limits are necessary

### Protecting accounts

Without a rate limit, an attacker can submit thousands of password guesses against an account. A login rate limit makes this type of automated guessing slower, more expensive, and easier to detect.

Rate limiting does not replace strong passwords, password hashing, multi-factor authentication, or breached-password detection. It adds another obstacle when those protections are attacked.

### Preventing abuse

Public forms and APIs can be automated. Attackers may repeatedly create accounts, send emails, submit comments, scrape data, or trigger actions that were intended for occasional human use.

A rate limiter places a measurable boundary around that activity.

### Controlling costs

Some operations directly cost money. Examples include sending emails, calling AI models, generating images, processing files, and querying paid third-party APIs.

Without rate limits, a programming error or malicious client can create a large bill in a short period. A limit acts as a spending guardrail.

### Preserving reliability

Even legitimate traffic can overload an application. A broken client might retry continuously, or a popular event might suddenly create more requests than the system can process.

Rate limiting helps the service retain capacity for other users instead of allowing one source to consume every available connection, worker, or API quota.

### Providing fair access

In a shared system, one unusually active customer should not make the product slow for everyone else. Per-user or per-organization limits distribute limited capacity more fairly.

## What can be limited

A limit needs a key that identifies the request source or resource being protected. Common choices include:

| Key | Useful for | Limitation |
|---|---|---|
| IP address | Anonymous traffic and broad abuse prevention | Offices, schools, and mobile networks may share an IP |
| User ID | Authenticated product usage | Does not protect endpoints used before login |
| Email address | Login and recovery attempts against an account | An attacker can vary email addresses |
| API key | Programmatic clients | A compromised client can rotate keys if issuance is weak |
| Organization ID | Enforcing plan or tenant quotas | One user can consume the organization's allowance |
| Device or browser identifier | Additional abuse signals | Can be deleted, forged, or privacy-sensitive |
| Operation or resource ID | Protecting one expensive action or object | Usually needs to be combined with another identity |

Effective systems often combine limits. A login endpoint might have one limit for the IP address, another for the IP-and-email combination, and a broader system-wide emergency limit.

## Rate limiting versus quotas

The terms overlap, but they usually emphasize different goals:

- A **rate limit** controls request speed, such as 60 requests per minute.
- A **quota** controls total consumption, such as 1,000 AI generations per billing month.
- A **concurrency limit** controls how many operations may run simultaneously, such as two document generations at once.

A mature product may use all three.

## Common algorithms

### Fixed window

The system counts requests inside fixed periods, such as each clock minute. It is simple and efficient, but traffic can burst across a window boundary: a client could use its entire allowance at 12:00:59 and again at 12:01:00.

### Sliding window

The system evaluates the most recent duration relative to the current request. A 60-second sliding window always considers the previous 60 seconds rather than the current clock minute. This produces smoother enforcement but requires more state or calculation.

### Token bucket

The client has a bucket of tokens. Requests consume tokens, and tokens replenish at a steady rate. This permits controlled short bursts while enforcing a sustainable average rate.

### Leaky bucket

Requests enter a queue and leave at a controlled rate. This smooths bursts and is useful when downstream work must be processed steadily.

## What happens when a limit is reached

An application should normally:

1. Reject or delay the operation before expensive work begins.
2. Return `429 Too Many Requests` for an HTTP API.
3. Provide a `Retry-After` header when the waiting period is known.
4. Show a clear but non-sensitive message to a person using the interface.
5. Record enough information to monitor unusual rejection patterns.

Authentication endpoints should avoid messages that reveal whether an email address or account exists.

## Rate limiting is not authorization

A permitted request is not necessarily a legitimate request. Rate limiting only answers whether a request source has exceeded a configured frequency. The application must still authenticate the caller, verify authorization, validate the input, and protect the underlying data.

Similarly, a rate limit is not a complete denial-of-service defense. Distributed attackers can use many addresses and identities. Platform-level firewalls, bot detection, caching, capacity controls, and monitoring provide additional layers.

## Characteristics of a good production limiter

A production limiter should be:

- **shared**, so all application instances observe the same counters;
- **atomic**, so concurrent requests cannot exceed the limit through a race condition;
- **expiring**, so unused counters are removed automatically;
- **observable**, so operators can see rejections and adjust incorrect limits;
- **specific**, with different limits for cheap reads and expensive or sensitive mutations;
- **fair**, accounting for shared IP addresses and legitimate bursts;
- **fail-aware**, with a deliberate policy for what happens if the limiter's storage is unavailable.

The goal is not to stop people from using the product. It is to keep normal use fast and available while placing boundaries around automated, accidental, or disproportionately expensive behavior.
