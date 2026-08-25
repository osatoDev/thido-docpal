import { PageLoadingSkeleton } from "@/components/PageLoadingSkeleton";

export default function LoadingSpreadsheet() {
  return (
    <PageLoadingSkeleton
      label="Opening spreadsheet…"
      variant="spreadsheet"
    />
  );
}
