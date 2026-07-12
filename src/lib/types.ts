import type {
  Comment as PrismaComment,
  Suggestion as PrismaSuggestion,
} from "@prisma/client";

export type SuggestionWithStatus = PrismaSuggestion;

export type CommentWithReplies = PrismaComment & {
  replies: PrismaComment[];
  suggestion: SuggestionWithStatus | null;
};
