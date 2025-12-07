"use client";

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="space-y-6">
      <SignUp
        appearance={{
          elements: {
            formButtonPrimary:
              "bg-brand text-white hover:bg-brand/90",
            card: "bg-card border border-border shadow-lg",
            headerTitle: "text-foreground",
            headerSubtitle: "text-muted-foreground",
            socialButtonsBlockButton:
              "bg-secondary text-secondary-foreground border border-border hover:bg-accent",
            formFieldLabel: "text-foreground",
            formFieldInput:
              "bg-background border-input text-foreground focus:ring-ring",
            footerActionLink: "text-brand hover:text-brand/80",
            identityPreviewEditButton: "text-brand hover:text-brand/80",
          },
        }}
      />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-brand hover:text-brand/80">
          Sign in
        </Link>
      </p>
    </div>
  );
}
