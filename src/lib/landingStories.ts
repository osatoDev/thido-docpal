/**
 * Short "use case as a story" vignettes for the unauthenticated landing page.
 * Each is a persona, the situation they arrived with, what they did in Thido,
 * and what they left with. Keep the copy concrete and em-dash-free (enforced by
 * the application-copy regression test).
 *
 * `situation` reads as its own sentence. `withThido` is phrased to follow
 * "In Thido, they ..." so it must start with a base-form verb.
 */
export type LandingStory = {
  persona: string;
  situation: string;
  withThido: string;
  outcome: string;
};

export const LANDING_STORIES: readonly LandingStory[] = [
  {
    persona: "A product manager",
    situation:
      "Has a page of scattered notes from three meetings and a spec due tomorrow.",
    withThido:
      "paste the notes in, ask Thido to shape them into a product brief, then edit the sections that matter and question the ones that do not.",
    outcome: "A structured first draft to circulate, written in an afternoon.",
  },
  {
    persona: "A founder",
    situation:
      "Needs to send investors a monthly update but keeps rewriting the opening line.",
    withThido:
      "give Thido the month's numbers and wins as a rough list, get a clear draft back, and tighten the tone until it sounds like them.",
    outcome: "An update that goes out on time and reads with confidence.",
  },
  {
    persona: "A student",
    situation:
      "Understands the argument for an essay but cannot get it onto the page.",
    withThido:
      "talk the thesis through with Thido, build an outline together, and expand each point in their own words.",
    outcome: "An essay that is genuinely theirs, without the blank-page stall.",
  },
] as const;
