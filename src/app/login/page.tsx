import { isTestLoginEnabled, signIn } from "@/lib/auth";

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold">Thido DocPal</h1>
        <p className="text-sm text-gray-500">
          Sign in to start drafting documents with AI.
        </p>
      </div>
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/dashboard" });
        }}
      >
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Continue with Google
        </button>
      </form>

      {isTestLoginEnabled && (
        <form
          action={async (formData: FormData) => {
            "use server";
            await signIn("test-login", {
              email: formData.get("email"),
              name: formData.get("name"),
              redirectTo: "/dashboard",
            });
          }}
          className="flex w-full max-w-xs flex-col gap-2 rounded-md border border-dashed border-gray-300 p-4"
        >
          <p className="text-xs font-medium text-gray-500">
            Test login (dev only)
          </p>
          <input
            type="email"
            name="email"
            required
            placeholder="you@example.com"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            name="name"
            placeholder="Name (optional)"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-300"
          >
            Continue without Google
          </button>
        </form>
      )}
    </main>
  );
}
