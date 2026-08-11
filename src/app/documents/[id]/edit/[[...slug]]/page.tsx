import type { Metadata } from "next";

import {
  EditDocumentPageContent,
  getAccessibleEditDocument,
  type EditDocumentSearchParams,
} from "../EditDocumentPageContent";
import { auth } from "@/lib/auth";
import { documentTabTitle } from "@/lib/documentUrls";

type Props = {
  params: Promise<{ id: string; slug?: string[] }>;
  searchParams: Promise<EditDocumentSearchParams>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ id }, session] = await Promise.all([params, auth()]);
  if (!session?.user?.id) {
    return { title: documentTabTitle() };
  }

  const document = await getAccessibleEditDocument(
    id,
    session.user.id,
    session.user.email,
  );
  return { title: documentTabTitle(document?.title) };
}

export default async function EditDocumentPage({ params, searchParams }: Props) {
  const [{ id, slug }, query] = await Promise.all([params, searchParams]);
  return (
    <EditDocumentPageContent
      id={id}
      slugSegments={slug ?? []}
      searchParams={query}
    />
  );
}
