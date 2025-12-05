"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { createOrganization } from "@/lib/actions/organizations";
import { Loader2, Home, HardHat, FileSignature, Ruler } from "lucide-react";

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2>(1);
    const [userType, setUserType] = useState<"owner" | "builder" | "architect" | "certifier">("owner");
    const [orgName, setOrgName] = useState("");
    const [loading, setLoading] = useState(false);

    const handleCreateOrg = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orgName.trim()) return;

        setLoading(true);
        try {
            const result = await createOrganization({
                name: orgName,
                userType,
            });

            if (result.success) {
                router.push("/");
                router.refresh();
            } else {
                alert("Failed to create organization. Please try again.");
            }
        } catch (error) {
            console.error("Onboarding error:", error);
            alert("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const userTypes = [
        {
            id: "owner",
            title: "Property Owner",
            description: "I own the property and want to manage my project.",
            icon: Home,
        },
        {
            id: "builder",
            title: "Builder",
            description: "I am a builder managing construction projects.",
            icon: HardHat,
        },
        {
            id: "architect",
            title: "Architect / Designer",
            description: "I design buildings and manage plans.",
            icon: Ruler,
        },
        {
            id: "certifier",
            title: "Certifier",
            description: "I inspect and certify building works.",
            icon: FileSignature,
        },
    ] as const;

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle>Welcome to Optimii</CardTitle>
                    <CardDescription>
                        {step === 1
                            ? "Let's get you set up. What best describes your role?"
                            : "Great! Now let's set up your organization."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {step === 1 ? (
                        <div className="grid gap-4">
                            {userTypes.map((type) => {
                                const Icon = type.icon;
                                return (
                                    <button
                                        key={type.id}
                                        onClick={() => setUserType(type.id)}
                                        className={`flex items-start gap-4 p-4 rounded-lg border-2 text-left transition-all hover:border-primary ${userType === type.id ? "border-primary bg-primary/5" : "border-transparent bg-muted"
                                            }`}
                                    >
                                        <div className={`p-2 rounded-full ${userType === type.id ? "bg-primary text-primary-foreground" : "bg-background"}`}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium">{type.title}</h3>
                                            <p className="text-sm text-muted-foreground">{type.description}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <form id="org-form" onSubmit={handleCreateOrg} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="orgName">Organization Name</Label>
                                <Input
                                    id="orgName"
                                    placeholder={userType === "owner" ? "My Project" : "My Company Name"}
                                    value={orgName}
                                    onChange={(e) => setOrgName(e.target.value)}
                                    required
                                />
                                <p className="text-sm text-muted-foreground">
                                    This is the name of your team or workspace.
                                </p>
                            </div>
                        </form>
                    )}
                </CardContent>
                <CardFooter className="flex justify-between">
                    {step === 2 ? (
                        <Button variant="ghost" onClick={() => setStep(1)} disabled={loading}>
                            Back
                        </Button>
                    ) : (
                        <div />
                    )}

                    {step === 1 ? (
                        <Button onClick={() => setStep(2)}>
                            Next
                        </Button>
                    ) : (
                        <Button type="submit" form="org-form" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Get Started
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
