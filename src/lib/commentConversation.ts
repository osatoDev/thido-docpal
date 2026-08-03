type ThreadMessage = {
  authorType: "USER" | "AI";
  body: string;
};

export function formatCommentConversation(
  rootBody: string,
  replies: ThreadMessage[],
) {
  return [
    `User: ${rootBody}`,
    ...replies.map(
      (reply) =>
        `${reply.authorType === "AI" ? "Thido" : "User"}: ${reply.body}`,
    ),
  ].join("\n\n");
}
