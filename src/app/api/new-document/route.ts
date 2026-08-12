import { auth } from "@/lib/auth";
import { getOrCreateBlankDocument } from "@/lib/blankDocument";
import { prisma } from "@/lib/prisma";
import {
  createDefaultSpreadsheetTitle,
  createEmptySpreadsheetContent,
} from "@/lib/spreadsheet";

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

  if (kind === "spreadsheet") {
    const spreadsheet = await prisma.spreadsheet.create({
      data: {
        ownerId: session.user.id,
        title: createDefaultSpreadsheetTitle(),
        content: createEmptySpreadsheetContent(),
      },
      select: { id: true },
    });
    return redirectTo(request, `/spreadsheets/${spreadsheet.id}/edit`);
  }

  return Response.json(
    { error: "Choose a supported document type." },
    { status: 400 },
  );
}
