# Why a planner request uses so many input tokens

A request like "list 10 cinemas near Berlin Naija Foodie, I'm driving" used about 99,000 input tokens with the basic search tool, and about 408,000 with the advanced one. Very little of that is text Thido writes itself.

## What Thido sends

The system prompt, the day's plan, the date and time zone, and the request add up to roughly 1,000 to 2,000 tokens. On its own, that would cost well under a cent.

## Where the rest comes from

### 1. Search results count as input

Each web search returns around 10 results, and each result includes text from the page, not just its link. All of that goes into the conversation for Claude to read, and it's billed as input tokens. A single search can easily add 10,000 to 20,000 tokens.

### 2. Claude reads the whole conversation again after every search

Web search runs in a loop on Anthropic's side:

1. Claude reads the request and decides to search.
2. The results are added to the conversation.
3. Claude reads **everything so far** (the prompt plus all results) and decides whether to search again or answer.

Each of those reads is billed in full. Earlier results are paid for again every time Claude takes another step, so the total grows much faster than the number of searches.

A rough estimate for 3 searches, assuming about 15,000 tokens of results per search:

| Step | What Claude reads | Input tokens |
| --- | --- | --- |
| 1. Decide to search | Prompt | ~2,000 |
| 2. After search 1 | Prompt + results 1 | ~17,000 |
| 3. After search 2 | Prompt + results 1 and 2 | ~32,000 |
| 4. After search 3, write the answer | Prompt + results 1, 2 and 3 | ~47,000 |
| **Total** | | **~98,000** |

That comes out very close to the 99,390 we measured. These per-step numbers are an estimate: the API reports only the total, not a figure for each step.

### 3. Paused turns are sent again

If a long search loop hits Anthropic's step limit, the reply comes back as `pause_turn`. Thido then sends the whole conversation back, results included, so Claude can carry on (`answerPlanRequest` does this up to 4 times). Each continuation re-reads everything again.

### 4. The advanced tool takes more steps

The advanced search tool (`web_search_20260209`, "dynamic filtering") has Claude write and run code to filter results before reading them. That should mean less to read at each step, but it adds steps (writing code, running it, reading the output), and Claude used it to dig further, such as checking the venue's exact address and car parks. Every extra step re-reads the conversation, so on this request it used about 4 times as many tokens as the basic tool. It also gave clearly better sources.

## What would bring it down

| Change | Effect | Trade-off |
| --- | --- | --- |
| Allow 2 searches instead of 3 (`REQUEST_MAX_SEARCHES`) | Removes the most expensive step, roughly a 45% saving on the estimate above | Less checking across sources |
| Use a cheaper model for requests only (e.g. Haiku 5.5) | Same tokens at a lower price per token | Weaker judgement about which options fit |
| Keep the basic tool (current choice) | About $0.22 instead of $0.85 per request | Weaker sources |

Writing a shorter prompt would make almost no difference: the search results are what you pay for.

To see the real per-request breakdown instead of an estimate, Thido could record each response's `usage` (input, output, and search count) in AI telemetry. That would show how many searches requests actually use, and whether lowering the limit is worth it.
