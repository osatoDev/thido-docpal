import { auth } from "@/lib/auth";
import { safeRedirectPath } from "@/lib/authInput";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const callbackUrl = safeRedirectPath(searchParams.get("callbackUrl"));
  const session = await auth();

  if (!session?.user?.id) {
    return Response.redirect(new URL(callbackUrl, request.url), 303);
  }

  const separator = callbackUrl.includes("?") ? "&" : "?";
  return Response.redirect(
    new URL(
      `${callbackUrl}${separator}signup=1&conversionId=${session.user.id}`,
      request.url,
    ),
    303,
  );
}
