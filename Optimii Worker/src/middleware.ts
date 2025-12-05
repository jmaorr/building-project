import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
]);

// Set to true to bypass authentication during local development
const DEV_BYPASS_AUTH = process.env.NODE_ENV === "development";

export default clerkMiddleware(async (auth, req) => {
  // In development, optionally bypass auth for easier testing
  if (DEV_BYPASS_AUTH) {
    return;
  }

  // Protect all routes except public ones
  if (!isPublicRoute(req)) {
    await auth.protect();

    // Check if user has completed onboarding (has an organization)
    // We can't easily check DB here without Edge middleware adapter, 
    // so for now we'll rely on a custom claim or just let the app handle it via a layout check
    // OR we can check if the user is visiting /onboarding and let them pass

    // For this implementation, we'll handle the redirect in the root layout or a specific check
    // But to be safe, let's allow /onboarding access
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
