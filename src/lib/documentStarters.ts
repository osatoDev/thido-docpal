import type { GuestDraftAnswers } from "@/lib/guestDraft";

export type DocumentStarter = {
  id: string;
  label: string;
  answers: GuestDraftAnswers;
};

export const DOCUMENT_STARTERS: readonly DocumentStarter[] = [
  {
    id: "project-proposal",
    label: "Project proposal",
    answers: {
      purpose: "Propose a new project and secure approval to begin.",
      audience: "Decision-makers who understand the problem but need a clear plan and rationale.",
      tone: "Confident, concise, and practical.",
      keyPoints: "The problem, proposed approach, expected impact, timeline, resources, and next decision.",
      format: "A structured two-page proposal with clear headings.",
    },
  },
  {
    id: "client-update",
    label: "Client update",
    answers: {
      purpose: "Update a client on progress, decisions, and what happens next.",
      audience: "A busy client who wants clarity on outcomes, risks, and upcoming actions.",
      tone: "Warm, direct, and reassuring.",
      keyPoints: "Progress since the last update, completed work, open questions, risks, and next steps.",
      format: "A concise email of roughly 400 words with short sections.",
    },
  },
  {
    id: "strategy-memo",
    label: "Strategy memo",
    answers: {
      purpose: "Recommend a direction and explain the reasoning behind it.",
      audience: "Leadership colleagues who know the context and need to make a decision.",
      tone: "Analytical, candid, and decisive.",
      keyPoints: "Current situation, available options, trade-offs, recommendation, risks, and immediate actions.",
      format: "A one-page decision memo with a recommendation at the top.",
    },
  },
  {
    id: "executive-brief",
    label: "Executive brief",
    answers: {
      purpose: "Give senior leaders the essential context and a clear decision or takeaway.",
      audience: "Executives with limited time who need the implications more than the background detail.",
      tone: "Succinct, factual, and decision-oriented.",
      keyPoints: "Headline finding, business impact, supporting evidence, risks, and requested action.",
      format: "A one-page brief with an executive summary and short sections.",
    },
  },
  {
    id: "meeting-recap",
    label: "Meeting recap",
    answers: {
      purpose: "Record what was discussed and make ownership of next steps unambiguous.",
      audience: "Meeting participants and stakeholders who could not attend.",
      tone: "Neutral, clear, and action-focused.",
      keyPoints: "Context, decisions, unresolved questions, action items, owners, and deadlines.",
      format: "A short recap with bullet lists for decisions and actions.",
    },
  },
  {
    id: "product-requirements",
    label: "Product requirements",
    answers: {
      purpose: "Define a product change clearly enough for design and engineering to plan delivery.",
      audience: "Product, design, engineering, data, and go-to-market collaborators.",
      tone: "Precise, practical, and user-centered.",
      keyPoints: "User problem, goals, non-goals, requirements, constraints, success measures, and open questions.",
      format: "A structured product requirements document with numbered requirements.",
    },
  },
  {
    id: "business-case",
    label: "Business case",
    answers: {
      purpose: "Justify an investment by comparing its expected value, cost, and risk.",
      audience: "Budget owners and leaders responsible for approving the investment.",
      tone: "Evidence-led, balanced, and persuasive.",
      keyPoints: "Opportunity, alternatives, costs, expected benefits, assumptions, risks, and recommendation.",
      format: "A three-page business case with a summary and simple comparison table.",
    },
  },
  {
    id: "research-summary",
    label: "Research summary",
    answers: {
      purpose: "Turn research findings into clear insights and implications for the team.",
      audience: "Colleagues who need the findings but did not take part in the research.",
      tone: "Objective, accessible, and specific about uncertainty.",
      keyPoints: "Research question, method, strongest findings, limitations, implications, and recommended follow-up.",
      format: "A two-page summary with findings grouped by theme.",
    },
  },
  {
    id: "blog-post",
    label: "Blog post",
    answers: {
      purpose: "Explain a useful idea in a way that earns attention and builds understanding.",
      audience: "Curious readers with some interest in the topic but no specialist knowledge.",
      tone: "Conversational, informed, and free of hype.",
      keyPoints: "Opening problem, central idea, supporting examples, practical takeaway, and closing perspective.",
      format: "An 800-word article with a strong title and descriptive subheadings.",
    },
  },
  {
    id: "press-release",
    label: "Press release",
    answers: {
      purpose: "Announce a meaningful development and make its relevance immediately clear.",
      audience: "Journalists, industry readers, customers, and partners.",
      tone: "Credible, concise, and news-focused.",
      keyPoints: "Announcement, why it matters, supporting facts, attributable quote, availability, and company context.",
      format: "A conventional press release of 500–700 words with headline, dateline, and boilerplate.",
    },
  },
  {
    id: "grant-application",
    label: "Grant application",
    answers: {
      purpose: "Make a compelling, evidence-based case for funding a defined programme of work.",
      audience: "Grant reviewers assessing fit, feasibility, impact, and responsible use of funds.",
      tone: "Specific, credible, and outcomes-focused.",
      keyPoints: "Need, proposed work, beneficiaries, delivery plan, team capability, budget logic, impact, and evaluation.",
      format: "A structured application that mirrors common funder assessment criteria.",
    },
  },
  {
    id: "policy-brief",
    label: "Policy brief",
    answers: {
      purpose: "Explain a policy issue and recommend a practical course of action.",
      audience: "Policymakers and advisers who need concise, evidence-based options.",
      tone: "Impartial, authoritative, and solution-oriented.",
      keyPoints: "Issue, affected groups, evidence, policy options, trade-offs, recommendation, and implementation considerations.",
      format: "A two-page policy brief with a summary and clearly separated recommendations.",
    },
  },
  {
    id: "job-description",
    label: "Job description",
    answers: {
      purpose: "Describe a role clearly and attract qualified candidates who understand the expectations.",
      audience: "Potential applicants evaluating the work, team, and required experience.",
      tone: "Welcoming, concrete, and inclusive.",
      keyPoints: "Role purpose, responsibilities, outcomes, essential skills, preferred experience, team context, and application process.",
      format: "A concise job description with scannable sections and bullet points.",
    },
  },
];

export function getDocumentStarter(id: string) {
  return DOCUMENT_STARTERS.find((starter) => starter.id === id) ?? null;
}
