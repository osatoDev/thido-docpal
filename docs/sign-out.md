# How sign-out works

The dashboard renders a normal HTML form whose Server Action calls the `signOut()` function exported by `src/lib/auth.ts`:

```tsx
<form
  action={async () => {
    "use server";
    await signOut({ redirectTo: "/login?notice=signed-out" });
  }}
>
  <button type="submit">Sign out</button>
</form>
```

Submitting the form sends a server request. Auth.js validates the request, clears the Auth.js session cookie, and redirects to the configured destination. The login page recognizes `notice=signed-out` and displays a visible confirmation.

Thido uses encrypted JWT sessions, so normal sign-out removes the current browser's cookie; it does not delete a database `Session` row. Other browsers retain their own cookies.

A password reset is stronger than normal sign-out. It increments `User.sessionVersion`. Every JWT contains the version that existed when it was created, and the Auth.js JWT callback compares it with the database on later requests. Existing sessions on other devices become invalid when their versions no longer match.

The `/forbidden` page also provides **Use another account**. That form calls the same Auth.js `signOut()` function and redirects to login with `/admin` as the callback path.
