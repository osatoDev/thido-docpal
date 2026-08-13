import { signOutAllDevices } from "@/app/account-actions";

export function SecurityPanel() {
  return (
    <section
      className="border-t border-[var(--border-strong)] pt-7"
      aria-labelledby="security-heading"
    >
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,22rem)] sm:items-start sm:gap-10">
        <div>
          <h2 id="security-heading" className="font-semibold">
            Security
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Sign out everywhere you&apos;re currently signed in, including
            other browsers and devices. You&apos;ll need to sign in again
            here too.
          </p>
        </div>

        <div className="app-panel flex flex-col gap-3 rounded-xl p-4">
          <form action={signOutAllDevices}>
            <button
              type="submit"
              className="secondary-button w-full rounded-md px-3 py-2.5 text-sm font-semibold"
            >
              Sign out of all devices
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
