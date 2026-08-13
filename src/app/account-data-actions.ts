"use server";

import { auth, signOut } from "@/lib/auth";
import { normalizeCollaboratorEmail } from "@/lib/documentAuth";
import { prisma } from "@/lib/prisma";
import { reportServerError } from "@/lib/rollbar/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export type DeleteAccountState = {
  message?: string;
};

const DELETE_CONFIRMATION_PHRASE = "DELETE";

export async function deleteAccount(
  _state: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const session = await auth();
  if (!session?.user?.id) return { message: "Your session has expired." };

  if (formData.get("confirmation") !== DELETE_CONFIRMATION_PHRASE) {
    return {
      message: `Type ${DELETE_CONFIRMATION_PHRASE} in the box to confirm account deletion.`,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, stripeSubscriptionId: true },
  });
  if (!user) return { message: "Your session has expired." };

  if (user.stripeSubscriptionId && isStripeConfigured()) {
    try {
      await getStripe().subscriptions.cancel(user.stripeSubscriptionId);
    } catch (error) {
      // A billing-provider hiccup should not block a user's right to delete
      // their account; log it so a lingering subscription can be caught and
      // cancelled operationally instead.
      console.error(
        "Unable to cancel Stripe subscription during account deletion",
        error,
      );
      await reportServerError(error, {
        source: "account-deletion",
        operation: "cancel-subscription",
      });
    }
  }

  try {
    await prisma.$transaction(async (transaction) => {
      // DocumentCollaborator rows are keyed by email, not a user ID foreign
      // key, so they survive user deletion unless removed explicitly here.
      if (user.email) {
        await transaction.documentCollaborator.deleteMany({
          where: { email: normalizeCollaboratorEmail(user.email) },
        });
      }
      await transaction.user.delete({ where: { id: user.id } });
    });
  } catch (error) {
    console.error("Unable to delete account", error);
    await reportServerError(error, {
      source: "account-deletion",
      operation: "delete-user",
    });
    return {
      message: "Could not delete your account. Try again or contact support.",
    };
  }

  await signOut({ redirectTo: "/login?notice=account-deleted" });
  return {};
}
