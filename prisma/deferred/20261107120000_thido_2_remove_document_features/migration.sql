-- Thido 2.0: remove document-first features (brief wizard, comments and AI
-- suggestions, spreadsheets, sharing, history-retention notices, application
-- styles). DESTRUCTIVE: drops these tables and columns with their data.
-- Back up production before running `prisma migrate deploy`.

-- DropForeignKey
ALTER TABLE "Spreadsheet" DROP CONSTRAINT "Spreadsheet_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "Spreadsheet" DROP CONSTRAINT "Spreadsheet_folderId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentLinkAccess" DROP CONSTRAINT "DocumentLinkAccess_documentId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentLinkAccess" DROP CONSTRAINT "DocumentLinkAccess_userId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentHistoryRetention" DROP CONSTRAINT "DocumentHistoryRetention_documentId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentCollaborator" DROP CONSTRAINT "DocumentCollaborator_documentId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentCollaborator" DROP CONSTRAINT "DocumentCollaborator_invitedById_fkey";

-- DropForeignKey
ALTER TABLE "PromptAnswer" DROP CONSTRAINT "PromptAnswer_documentId_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_documentId_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_authorId_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_parentId_fkey";

-- DropForeignKey
ALTER TABLE "Suggestion" DROP CONSTRAINT "Suggestion_commentId_fkey";

-- DropForeignKey
ALTER TABLE "AiGeneration" DROP CONSTRAINT "AiGeneration_commentId_fkey";

-- DropIndex
DROP INDEX "Document_guestDraftId_key";

-- DropIndex
DROP INDEX "Document_shareToken_key";

-- DropIndex
DROP INDEX "AiGeneration_commentId_idx";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "reactivationNudgeSentAt";

-- AlterTable
ALTER TABLE "UserSettings" DROP COLUMN "aiCommentMode",
DROP COLUMN "applicationStyle";

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "guestDraftId",
DROP COLUMN "sharePermission",
DROP COLUMN "shareToken";

-- AlterTable
ALTER TABLE "AiGeneration" DROP COLUMN "commentId";

-- DropTable
DROP TABLE "Spreadsheet";

-- DropTable
DROP TABLE "DocumentLinkAccess";

-- DropTable
DROP TABLE "DocumentHistoryRetention";

-- DropTable
DROP TABLE "DocumentCollaborator";

-- DropTable
DROP TABLE "PromptAnswer";

-- DropTable
DROP TABLE "Comment";

-- DropTable
DROP TABLE "Suggestion";

-- DropEnum
DROP TYPE "AICommentMode";

-- DropEnum
DROP TYPE "DocumentPermission";

-- DropEnum
DROP TYPE "PromptStage";

-- DropEnum
DROP TYPE "AuthorType";

-- DropEnum
DROP TYPE "CommentIntent";

-- DropEnum
DROP TYPE "CommentStatus";

-- DropEnum
DROP TYPE "CommentScope";

-- DropEnum
DROP TYPE "CommentAiStatus";

-- DropEnum
DROP TYPE "SuggestionStatus";

