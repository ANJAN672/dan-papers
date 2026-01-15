import GitHub from "@auth/core/providers/github";
import { convexAuth } from "@convex-dev/auth/server";

function normalizeBaseUrl(url: string) {
  return url.replace(/\/$/, "");
}

function isAllowedAbsoluteRedirect(redirectTo: string, baseUrl: string) {
  if (!redirectTo.startsWith(baseUrl)) return false;
  const after = redirectTo[baseUrl.length];
  return after === undefined || after === "?" || after === "/" || after === "#";
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    GitHub({
      profile(githubProfile) {
        return {
          id: githubProfile.id.toString(),
          // Use name, then login (username), then fallback to "User"
          name: githubProfile.name ?? (githubProfile as any).login ?? "User",
          email: githubProfile.email ?? undefined,
          // GitHub profile images are typically under `avatar_url`.
          image:
            (githubProfile as any).avatar_url ??
            (githubProfile as any).picture ??
            undefined,
          username: (githubProfile as any).login,
        };
      },
    }),
  ],
  callbacks: {
    async redirect({ redirectTo }) {
      const siteUrl = normalizeBaseUrl(process.env.SITE_URL ?? "");
      if (!siteUrl) {
        throw new Error("Missing environment variable `SITE_URL`");
      }

      const allowlistRaw = process.env.AUTH_REDIRECT_ALLOWLIST;
      const allowedBaseUrls = (allowlistRaw ? allowlistRaw.split(",") : [siteUrl])
        .map((s) => s.trim())
        .filter(Boolean)
        .map(normalizeBaseUrl);

      // Relative redirects are always resolved against SITE_URL
      if (redirectTo.startsWith("?") || redirectTo.startsWith("/")) {
        return `${siteUrl}${redirectTo}`;
      }

      // Absolute redirects must match an allowlisted base URL
      for (const baseUrl of allowedBaseUrls) {
        if (isAllowedAbsoluteRedirect(redirectTo, baseUrl)) {
          return redirectTo;
        }
      }

      throw new Error(
        `Invalid \`redirectTo\` ${redirectTo} for configured allowlist: ${allowedBaseUrls.join(", ")}`,
      );
    },
  },
});
