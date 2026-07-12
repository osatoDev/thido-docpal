export const INITIAL_QUESTIONS = [
  {
    order: 1,
    key: "purpose",
    label: "Purpose",
    question: "What are you trying to accomplish with this document?",
  },
  {
    order: 2,
    key: "audience",
    label: "Audience",
    question:
      "Who's the primary reader, and what do they already know or care about?",
  },
  {
    order: 3,
    key: "tone",
    label: "Tone",
    question: "What tone should it have? (e.g. formal, conversational, persuasive, technical)",
  },
  {
    order: 4,
    key: "keyPoints",
    label: "Key points",
    question: "What are the must-include facts, points, or takeaways?",
  },
  {
    order: 5,
    key: "format",
    label: "Format & length",
    question:
      "What format and roughly how long? (e.g. one-pager, memo, blog post, ~500 words)",
  },
] as const;
