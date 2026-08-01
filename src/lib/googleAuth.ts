type GoogleEmailProfile = {
  email_verified?: boolean | null;
};

export const verifiedGoogleAccountLinking = {
  allowDangerousEmailAccountLinking: true,
} as const;

export function hasVerifiedGoogleEmail(
  profile: GoogleEmailProfile | undefined,
) {
  return profile?.email_verified === true;
}
