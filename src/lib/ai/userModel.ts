import { prisma } from "@/lib/prisma";
import {
  DEFAULT_AI_MODEL,
  isAiModelId,
  type AiModelId,
} from "@/lib/ai/models";

export async function getUserAiModel(userId: string): Promise<AiModelId> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { aiModel: true },
  });

  return isAiModelId(settings?.aiModel)
    ? settings.aiModel
    : DEFAULT_AI_MODEL;
}
