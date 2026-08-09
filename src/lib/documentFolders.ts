export const MAX_FOLDER_NAME_LENGTH = 80;

export type FolderNameResult =
  | { ok: true; name: string; nameKey: string }
  | { ok: false; error: string };

export function normalizeFolderName(value: unknown): FolderNameResult {
  if (typeof value !== "string") {
    return { ok: false, error: "Enter a folder name." };
  }

  const name = value.trim().replace(/\s+/g, " ");
  if (!name) {
    return { ok: false, error: "Enter a folder name." };
  }
  if (name.length > MAX_FOLDER_NAME_LENGTH) {
    return {
      ok: false,
      error: `Keep folder names to ${MAX_FOLDER_NAME_LENGTH} characters or fewer.`,
    };
  }

  return { ok: true, name, nameKey: name.toLocaleLowerCase("en-US") };
}
