// import { withAuth } from "next-auth/middleware";

export default function middleware() {} // Temporarily disabled for diagnostics

// export default withAuth({
//   pages: {
//     signIn: "/login",
//   },
//   secret: process.env.NEXTAUTH_SECRET || "fallback_secret_for_local_dev",
// });

export const config = {
  matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico).*)"],
};
