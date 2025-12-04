"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Building2, Hammer, PenTool, ClipboardCheck, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { completeOnboarding } from "@/lib/actions/users";

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

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [selectedType, setSelectedType] = useState<UserType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user has already completed onboarding
  useEffect(() => {
    if (isLoaded && user) {
      // Check if user type was stored during signup
      const pendingType = sessionStorage.getItem("pendingUserType");
      if (pendingType) {
        setSelectedType(pendingType as UserType);
      }

      // Check if already onboarded via user metadata
      const userType = user.unsafeMetadata?.userType as UserType | undefined;
      if (userType) {
        // Already onboarded, redirect to dashboard
        router.push("/");
      }
    }
  }, [isLoaded, user, router]);

  const handleTypeSelect = (type: UserType) => {
    setSelectedType(type);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!selectedType || !user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Update Clerk user metadata
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          userType: selectedType,
          onboardedAt: new Date().toISOString(),
        },
      });

      // Update our database
      const result = await completeOnboarding(selectedType);
      
      if (!result.success) {
        throw new Error(result.error || "Failed to complete onboarding");
      }

      // Clear pending type from session storage
      sessionStorage.removeItem("pendingUserType");

      // Redirect to dashboard
      router.push("/");
    } catch (err) {
      console.error("Onboarding error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Welcome to Optimii
          </h1>
          <p className="text-muted-foreground">
            Tell us about yourself to personalize your experience
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
                disabled={isSubmitting}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-lg border-2 text-left transition-all",
                  "hover:bg-accent/50 hover:border-brand/50",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
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

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!selectedType || isSubmitting}
          className={cn(
            "w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2",
            selectedType && !isSubmitting
              ? "bg-brand text-white hover:bg-brand/90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Setting up your account...
            </>
          ) : (
            "Get Started"
          )}
        </button>
      </div>
    </div>
  );
}

