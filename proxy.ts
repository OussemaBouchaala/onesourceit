import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

// Signed-out visitors are sent to the matching sign-in page: /admin/connexion
// for the admin area, /connexion for the reseller account. The admin role
// itself is checked in app/admin/(panel)/layout.tsx and again in every
// Convex admin function.
const isAdminLogin = createRouteMatcher(["/admin/connexion"]);
const isAdmin = createRouteMatcher(["/admin(.*)"]);
const isAccount = createRouteMatcher(["/compte(.*)"]);
const isAuthPage = createRouteMatcher(["/connexion", "/inscription"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const signedIn = await convexAuth.isAuthenticated();
  if (isAdmin(request) && !isAdminLogin(request) && !signedIn) {
    return nextjsMiddlewareRedirect(request, "/admin/connexion");
  }
  if (isAccount(request) && !signedIn) {
    return nextjsMiddlewareRedirect(request, "/connexion");
  }
  if (isAuthPage(request) && signedIn) {
    return nextjsMiddlewareRedirect(request, "/compte");
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
