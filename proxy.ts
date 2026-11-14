import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

// Signed-out visitors are sent to /connexion. The admin role itself is
// checked in app/admin/layout.tsx and again in every Convex admin function.
const isProtected = createRouteMatcher(["/admin(.*)", "/compte(.*)"]);
const isAuthPage = createRouteMatcher(["/connexion", "/inscription"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const signedIn = await convexAuth.isAuthenticated();
  if (isProtected(request) && !signedIn) {
    return nextjsMiddlewareRedirect(request, "/connexion");
  }
  if (isAuthPage(request) && signedIn) {
    return nextjsMiddlewareRedirect(request, "/compte");
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
