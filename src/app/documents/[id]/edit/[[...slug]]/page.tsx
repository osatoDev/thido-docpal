import {
  EditDocumentPageContent,
  type EditDocumentSearchParams,
} from "../EditDocumentPageContent";

type Props = {
  params: Promise<{ id: string; slug?: string[] }>;
  searchParams: Promise<EditDocumentSearchParams>;
};

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
