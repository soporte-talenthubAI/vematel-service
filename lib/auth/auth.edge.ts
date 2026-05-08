import type { NextAuthConfig } from "next-auth";

// Config edge-compatible (sin Prisma ni bcrypt) — usado solo en el middleware
export const authEdgeConfig: NextAuthConfig = {
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;

      // Rutas públicas
      if (
        path.startsWith("/login") ||
        path.startsWith("/api/auth") ||
        path.startsWith("/api/tiendanube/auth")
      ) {
        if (isLoggedIn && path.startsWith("/login")) {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        return true;
      }

      if (!isLoggedIn) {
        return Response.redirect(new URL("/login", nextUrl));
      }

      return true;
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
};
