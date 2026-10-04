// Which login methods are switched on. Privy needs the app id and verification key; deleting
// the Privy login as part of account deletion also needs the app secret. Demo login is local only.
export function authConfig() {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || null;
  const privyVerificationKey = process.env.PRIVY_VERIFICATION_KEY?.replace(/\\n/g, "\n") || null;
  return {
    privyAppId,
    privyVerificationKey,
    privyAppSecret: process.env.PRIVY_APP_SECRET || null,
    privyEnabled: Boolean(privyAppId && privyVerificationKey),
    demoLogin: process.env.DEMO_LOGIN === "true",
  };
}
