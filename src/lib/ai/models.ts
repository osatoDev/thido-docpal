export const AI_MODELS = [
  {
    id: "claude-sonnet-5",
    label: "Sonnet 5",
    description: "Best balance of quality and speed",
  },
  {
    id: "claude-opus-4-8",
    label: "Opus 4.8",
    description: "Deepest reasoning and highest quality",
  },
  {
    id: "claude-haiku-4-5",
    label: "Haiku 4.5",
    description: "Fastest responses",
  },
] as const;

export type AiModelId = (typeof AI_MODELS)[number]["id"];

export const DEFAULT_AI_MODEL: AiModelId = "claude-sonnet-5";

export function isAiModelId(value: unknown): value is AiModelId {
  return AI_MODELS.some((model) => model.id === value);
}

export function supportsAdaptiveThinking(model: AiModelId) {
  return model !== "claude-haiku-4-5";
}
