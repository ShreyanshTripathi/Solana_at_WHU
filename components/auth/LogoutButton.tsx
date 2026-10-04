"use client";

import { usePrivy } from "@privy-io/react-auth";
import { logout } from "@/app/login/actions";
import { useI18n } from "@/lib/i18n/client";

const button = "opacity-80 hover:opacity-100 underline-offset-2 hover:underline";

// Ends both sessions: Privy's in the browser, then our cookie on the server.
function PrivyLogoutButton() {
  const { logout: privyLogout } = usePrivy();
  const { m } = useI18n();
  return (
    <button
      type="button"
      className={button}
      onClick={async () => {
        await privyLogout().catch(() => undefined);
        await logout();
      }}
    >
      {m.nav.logOut}
    </button>
  );
}

export function LogoutButton({ privyEnabled }: { privyEnabled: boolean }) {
  const { m } = useI18n();
  if (privyEnabled) return <PrivyLogoutButton />;
  return (
    <form action={logout}>
      <button type="submit" className={button}>
        {m.nav.logOut}
      </button>
    </form>
  );
}
