import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <SignIn
      appearance={{
        elements: {
          formButtonPrimary:
            "bg-primary text-primary-foreground hover:bg-primary/90",
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
  );
}





