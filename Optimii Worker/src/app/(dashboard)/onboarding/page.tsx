import { redirect } from "next/navigation";

/**
 * Onboarding page - no longer required as all users automatically get an org.
 * Redirects to dashboard.
 */
export default function OnboardingPage() {
  redirect("/");
}
