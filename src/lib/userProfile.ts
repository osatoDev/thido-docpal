function firstCharacter(value: string) {
  return Array.from(value.trim())[0] ?? "";
}

export function getUserInitials(
  name: string | null | undefined,
  email: string | null | undefined,
) {
  const nameParts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (nameParts.length > 0) {
    const first = firstCharacter(nameParts[0]);
    const last =
      nameParts.length > 1
        ? firstCharacter(nameParts[nameParts.length - 1])
        : "";
    return `${first}${last}`.toLocaleUpperCase();
  }

  const emailName = email?.split("@")[0] ?? "";
  const emailParts = emailName.split(/[._-]+/).filter(Boolean);
  if (emailParts.length > 0) {
    const first = firstCharacter(emailParts[0]);
    const last =
      emailParts.length > 1
        ? firstCharacter(emailParts[emailParts.length - 1])
        : "";
    return `${first}${last}`.toLocaleUpperCase();
  }

  return "U";
}
