import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { reportServerError } = await import("@/lib/rollbar/server");
  const requestIdHeader = request.headers["x-vercel-id"];
  const requestId = Array.isArray(requestIdHeader)
    ? requestIdHeader[0]
    : requestIdHeader;

  await reportServerError(error, {
    source: "next-on-request-error",
    route: context.routePath,
    routeType: context.routeType,
    requestMethod: request.method,
    requestId,
  });
};
