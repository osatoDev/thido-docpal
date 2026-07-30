import type {
  Comment as PrismaComment,
  Suggestion as PrismaSuggestion,
} from "@prisma/client";

export type SuggestionWithStatus = PrismaSuggestion;

export type CommentAiProgress = {
  status: "QUEUED" | "PENDING" | "SUCCEEDED" | "FAILED";
  startedAt: string | null;
};

type CommentWithAuthor = PrismaComment & {
  author: { name: string | null } | null;
};

export type CommentWithReplies = PrismaComment & {
  author: { name: string | null } | null;
  replies: CommentWithAuthor[];
  suggestion: SuggestionWithStatus | null;
};
