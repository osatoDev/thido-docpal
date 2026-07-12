import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic();

/**
 * Always use Opus 4.8 unless a user explicitly asks for a different model —
 * this is a deliberate product choice, not something to silently downgrade
 * for cost.
 */
export const CLAUDE_MODEL = "claude-opus-4-8";
