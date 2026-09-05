# Landing ad video: "The Four-Second Draft"

A 33-second spot for the top of the marketing landing page. The job: show
Thido's two core features to the audiences we are focusing on first, **novelists
and proposal writers**, in the same calm, dry, editorial voice the rest of the
site uses. No hype, no generic AI imagery, no animated gradients (per
[landing-page-recommendations.md](./landing-page-recommendations.md)).

**Animated reference build:** a self-playing, scrubbable version of the spot with
a shot list is published as a Claude artifact ("The Four-Second Draft"). It is the
visual source of truth for timing, type, colour, and motion. Source file lives in
the scratchpad for this task; copy it into the repo if we want to self-host it.

---

## What it has to say

Thido has two features worth a spot:

1. **It asks what you actually want.** Instead of one blind prompt, Thido builds
   the brief with you: purpose, audience, tone, key points, length, plus a
   tailored craft question, then drafts from your answers. This is the guided
   wizard in `src/components/wizard/` and `src/lib/wizardQuestions.ts`.
2. **It edits inside the document.** Highlight a line, ask for a change in the
   margin, and it rewrites in place. AI is part of the writing surface, not a
   chatbot bolted to the side.

The villain is generic AI: a vague prompt in, cliche out, and every fix is a
round trip to a chat window. Each Thido feature answers one half of that.

**The through-line is a first novel chapter** ("The Long Field", Eleanor
returning to a childhood home that has been sold). A novel makes the "cliche vs.
voice" contrast visceral and sets Thido apart from every other AI-writing ad,
which are all business docs. The closing shot then holds on a second card, a
**project proposal**, so proposal writers see themselves too.

- **Length:** 33.0s. A 15s cutdown (shots 1, 2, 7) is described below.
- **Aspect:** 16:9 master. Also crop 1:1 and 9:16 for social.
- **Sound:** silent by default, captions burned in. Optional VO script below.
- **Tone:** dry, understated, confident. The site's own line, "AI almost never
  gets it right on the first try," is the thesis.

---

## Art direction

Pulled straight from `src/app/globals.css` so the spot matches the product.

| Token | Light | Dark |
|---|---|---|
| Stage / paper | `#f4f2ed` | `#141615` |
| Sheet | `#ffffff` | `#21251f` |
| Ink | `#222622` | `#e9ebe8` |
| Muted ink | `#5f645e` | `#a7aca6` |
| Hairline | `#d8d5ce` | `#363b36` |
| Pine (primary accent) | `#315f4e` | `#a4ccb8` |
| Sage (guidance, follow-ups, selection) | `#8fb3a3` | `#7eaa96` |
| Terracotta (margin comments only) | `#9a6737` | `#d7a878` |

Pine is the only accent that carries meaning (Thido's marks, the "kept" tag,
the tailored follow-up answer). Sage marks Thido's questions and the text
selection. Terracotta is reserved for margin comments, exactly as in the real
editor's `.comment-highlight`.

**Type**

| Role | Spot | Product equivalent |
|---|---|---|
| Display / captions / prose | Newsreader (500 / 400 italic) | Iowan Old Style |
| UI, brief fields, draft body | Hanken Grotesk | Geist Sans |
| Labels, prompt, counter, timecode | IBM Plex Mono | Geist Mono |

**Motion:** text sets itself line by line, fast and mechanical for the blind AI
draft, smoother for Thido's writing. The brief fills field by field with a caret
on the active row. Everything else is opacity and short slides. No parallax, no
bounce. Honour `prefers-reduced-motion`: cut between states, no slides, no caret
blink.

**Sound (optional):** one sustained low pad; a soft mechanical "clack" as the
blind draft lands; light key taps as the brief fills; a single clean tone when
the Thido mark resolves; near-silence on the end card.

---

## Shot list

| # | Time | On screen | Caption (burned in) |
|---|---|---|---|
| 1 | 0.0–3.5 | Sheet titled **The Long Field**, kicker "DRAFT". A mono prompt: `write chapter one of my novel`. Three grey paragraphs of pure cliche snap in within a second: rain like tears, a heart "a maelstrom of emotion", a "weathered oaken door". | 0.8s: "Your AI wrote chapter one in four seconds." → 2.6s: "It reads like it was written in *four seconds*." |
| 2 | 3.5–10.8 | **Feature 1.** Kicker becomes "NEW CHAPTER". Thido asks what you want: **Purpose · Audience · Tone · Key points · Length**, each row filling with a short answer and a caret ("Spare. Close third person." / "Twelve years away. The house is sold. Maren does not know she is coming."). A sage-ruled **tailored follow-up** slides in ("Should Maren appear in the chapter, or just be felt?" → "Just be felt."). **Generate.** The form clears and a spare, specific first draft writes itself. | 4.0s: "Thido spends those four seconds asking what you actually want." → 8.6s: "So the first page sounds like *you*." |
| 3 | 10.8–14.3 | One line still tells: "She felt a deep sadness and nostalgia…". The old reflex: that paragraph lifts off as a card, flies to a **Chat** window, comes back more purple, not less. Margin counter **"round trips to a chat window"** climbs 2 → 4. | 11.0s: "Fix a line the old way and you are back in the chat window." |
| 4 | 14.3–17.0 | The paragraph settles. The chat window drops away. The **Thido** wordmark resolves centre-screen. The counter flips to **0** in pine. | 14.4s: "Thido keeps that *inside the document*." |
| 5 | 17.0–24.0 | **Feature 2.** Kicker becomes "REVISION 2". The telling line gets a sage **selection** and caret; an inline ask appears: `› show it, do not name it`. It **rewrites in place** to "The gate still stuck. She put her shoulder to it, the way she had at nine, at fifteen." A terracotta **margin comment** ("one idea per sentence") lands on the run-on opening line; it tightens too. The line that already works ("She had not told Maren she was coming.") gets a pine **KEPT** tag. A small "Thido" signature sits in the page corner. | 17.3s: "Point at the line that tells instead of shows." → 20.5s: "Ask for a better one. Keep what was already right." |
| 6 | 24.0–28.0 | Full-bleed paper. Two cards, ~2s each: **The Long Field** (kicker NOVEL, "Twelve years since Eleanor had walked this lane.") then **Riverside Studio** (kicker PROPOSAL, "You need it done by March. Here is the plan, and the price."). | 24.3s: "The chapter you keep restarting. The proposal that is due Friday." |
| 7 | 28.0–33.0 | Clean paper. **Thido** wordmark. Then the line, then the CTA. | (no lower-third) Card text: "Think clearly. Draft confidently." · then "Try Thido free — thido.ai · no card required" |

---

## Caption script (verbatim, in order)

1. Your AI wrote chapter one in four seconds.
2. It reads like it was written in *four seconds*.
3. Thido spends those four seconds asking what you actually want.
4. So the first page sounds like *you*.
5. Fix a line the old way and you are back in the chat window.
6. Thido keeps that *inside the document*.
7. Point at the line that tells instead of shows.
8. Ask for a better one. Keep what was already right.
9. The chapter you keep restarting. The proposal that is due Friday.

House style: no em dashes in body copy (the en-dash CTA is a set phrase on the
end card only). Matches the `em-dash-free application copy` regression test's
spirit.

The five brief-field labels come from `INITIAL_QUESTIONS` in
`src/lib/wizardQuestions.ts` (Format & length is shortened to "Length" for a
novel); keep them recognisable if you re-record.

---

## Optional voiceover

Only if we decide the landing page should have sound. Calm read, roughly one
line per shot.

> Your AI wrote the whole first chapter in four seconds. ...And it reads like
> it: the rain, the threshold, the maelstrom of emotion. Thido spends those
> seconds asking what you actually want instead: what the chapter has to do,
> whose voice, how much to hold back. Then it drafts a page that sounds like
> you. Change a line and you would normally be back in a chat window. Thido
> keeps that inside the document. Point at the line that tells instead of shows,
> ask for better, and keep what was already right. The chapter you keep
> restarting. The proposal that is due Friday. Think clearly, draft confidently.
> Thido dot A-I. No card required.

---

## Producing the final file

**Route A — screen-record the reference build (fastest).**
Open the artifact, set the browser to exactly 1920×1080, hide the transport and
shot list (zoom so only the stage shows, or capture just the `.stage` element),
let it autoplay once, and record with QuickTime / OBS. Do one pass in light
theme and one in dark. Trim to the 0.0–33.0 window.

**Route B — rebuild in After Effects / Motion.**
Use the shot list for timing and the token table for colour. The brief fields,
prompt, and paragraph reveals are text layers; the flying paragraph and chat
window are position/scale keyframes; captions are a lower-third comp. This is
the route for grain, real easing, and a soundtrack.

**Route C — AI video tool (Veo / Runway / Sora).**
Generate per shot, then edit together and add the caption comp on top (do not
rely on the model for legible on-screen text). Suggested prompts:

- *Shot 1:* "Static locked shot of a clean white manuscript page on a warm
  off-white desk, black serif title 'The Long Field', three paragraphs of grey
  body text appearing line by line very fast, minimal, literary, soft daylight,
  no camera movement."
- *Shot 2:* "The same page, now a short form: five labelled rows, Purpose,
  Audience, Tone, Key points, Length, each filling in with a typed one-line
  answer, then a highlighted follow-up question and a dark Generate button;
  clean, calm, warm neutral palette, still camera."
- *Shot 3:* "One paragraph lifts off the manuscript page like a floating card
  and slides right into a small chat window, then slides back, subtle clean
  motion graphics, warm neutrals, no text jitter."
- *Shot 4:* "The floating paragraph settles back onto the page; a small
  deep-green logomark and the word 'Thido' in a serif typeface fade in centered
  over the page; calm, confident, minimal."
- *Shot 6:* "A single sheet of paper, the heading changing once with a quick
  vertical roll from a novel title 'The Long Field' to 'Riverside Studio',
  warm off-white, editorial, still camera."
- *Shot 7:* "Centered deep-green 'Thido' wordmark on warm off-white, then a
  serif line 'Think clearly. Draft confidently.' fades in below; quiet,
  premium, minimal."

---

## 15-second cutdown

Keep shots **1, 2, 7** — the setup, feature 1, and the sign-off:

| Time | Content |
|---|---|
| 0.0–3.5 | Shot 1: blind prompt, cliche fills the page. Caption: "Four seconds. Every cliche intact." |
| 3.5–11.0 | Shot 2, tightened: Thido asks what you want, you answer, Generate, a page with a voice appears. Caption: "Thido asks first, so it sounds like you." |
| 11.0–15.0 | Shot 7: wordmark, "Think clearly. Draft confidently.", thido.ai. |

This drops feature 2 (inline editing). If the hero slot should show editing
instead, swap shot 2 for shots 4+5. The `:33` is the better all-round cut and is
the one that also reaches proposal writers (shot 6).

---

## Placement and performance

If the video is embedded on `/` (the landing route), it must not regress the
landing performance budgets tracked in
[landing-page-load-speed.md](./landing-page-load-speed.md) and
[production-todo.md](./production-todo.md): FCP < 1.8s, LCP < 2.5s, CLS < 0.1.

- Do not autoplay a heavy asset above the fold on first paint. Use a poster
  image (a still of shot 7 or shot 1) and load the video on interaction or when
  it scrolls into view.
- Host the MP4/WebM as a static asset (or a CDN/Mux-style embed), not a
  client-rendered animation on the critical path.
- Reserve the box with an explicit aspect ratio so it contributes no layout
  shift.
- Provide the caption script as real text near the embed for accessibility and
  for users who never play it.

There is a matching checklist item under **Testing and continuous integration**
in `production-todo.md`.
