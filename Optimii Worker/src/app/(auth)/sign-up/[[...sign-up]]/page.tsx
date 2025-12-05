"use client";

import { useState } from "react";
import { SignUp } from "@clerk/nextjs";
import { Building2, Hammer, PenTool, ClipboardCheck, Check } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type UserType = "owner" | "builder" | "architect" | "certifier";

const userTypes: {
  id: UserType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "owner",
    label: "Property Owner",
    description: "I'm building or renovating my property",
    icon: Building2,
  },
  {
    id: "builder",
    label: "Builder",
    description: "I build and manage construction projects",
    icon: Hammer,
  },
  {
    id: "architect",
    label: "Architect / Designer",
    description: "I design and plan building projects",
    icon: PenTool,
  },
  {
    id: "certifier",
    label: "Building Certifier",
    description: "I inspect and certify building projects",
    icon: ClipboardCheck,
  },
];

export default function SignUpPage() {
  const [step, setStep] = useState<"type" | "signup">("type");
  const [selectedType, setSelectedType] = useState<UserType | null>(null);

  const handleTypeSelect = (type: UserType) => {
    setSelectedType(type);
  };

  const handleContinue = () => {
    if (selectedType) {
      // Store the selected type in session storage so we can retrieve it after signup
      sessionStorage.setItem("pendingUserType", selectedType);
      setStep("signup");
    }
  };

  if (step === "signup") {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <button
            onClick={() => setStep("type")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to user type
          </button>
        </div>
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
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Welcome to Optimii
        </h1>
        <p className="text-muted-foreground">
          Tell us about yourself to get started
        </p>
      </div>

      <div className="grid gap-3">
        {userTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedType === type.id;

          return (
            <button
              key={type.id}
              onClick={() => handleTypeSelect(type.id)}
              className={cn(
                "flex items-center gap-4 p-4 rounded-lg border-2 text-left transition-all",
                "hover:bg-accent/50 hover:border-brand/50",
                isSelected
                  ? "border-brand bg-brand/5"
                  : "border-border bg-card"
              )}
            >
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-lg",
                  isSelected
                    ? "bg-brand text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground">{type.label}</h3>
                <p className="text-sm text-muted-foreground">
                  {type.description}
                </p>
              </div>
              {isSelected && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white">
                  <Check className="h-4 w-4" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={handleContinue}
        disabled={!selectedType}
        className={cn(
          "w-full py-3 px-4 rounded-lg font-medium transition-all",
          selectedType
            ? "bg-brand text-white hover:bg-brand/90"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        )}
      >
        Continue
      </button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-brand hover:text-brand/80">
          Sign in
        </Link>
      </p>
    </div>
  );
}
