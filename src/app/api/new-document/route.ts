import { auth } from "@/lib/auth";
import { getOrCreateBlankDocument } from "@/lib/blankDocument";
import { reportServerError } from "@/lib/rollbar/server";

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function redirectTo(request: Request, pathname: string) {
  return Response.redirect(new URL(pathname, request.url), 303);
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    await reportServerError(new Error("Invalid request origin"), {
      source: "new-document",
      operation: "invalid-origin",
      status: 403,
    });
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return redirectTo(
      request,
      "/login?notice=sign-in-required&callbackUrl=/",
    );
  }

  const formData = await request.formData().catch(() => null);
  const kind = formData?.get("kind");

  if (kind === "document") {
    const document = await getOrCreateBlankDocument(session.user.id);
    return redirectTo(request, `/documents/${document.id}/edit`);
  }

  await reportServerError(new Error("Unsupported document type"), {
    source: "new-document",
    operation: "unsupported-kind",
    status: 400,
  });
  return Response.json(
    { error: "Choose a supported document type." },
    { status: 400 },
  );
}
