export type FeedbackActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  submissionId?: string;
};

export const initialFeedbackActionState: FeedbackActionState = {
  status: "idle",
};
