"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, Building2, FolderKanban } from "lucide-react";
import { acceptOrgInvite, getPendingOrgInvites } from "@/lib/actions/organizations";
import { acceptProjectShare, getPendingShares } from "@/lib/actions/projects";
import { useToast } from "@/components/ui/use-toast";

interface OrgInvite {
    id: string;
    orgName: string;
    role: string;
    invitedAt: Date;
}

interface ProjectInvite {
    id: string;
    projectId: string;
    projectName: string;
    permission: string;
    invitedAt: Date;
}

export default function InvitesPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [orgInvites, setOrgInvites] = useState<OrgInvite[]>([]);
    const [projectInvites, setProjectInvites] = useState<ProjectInvite[]>([]);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        loadInvites();
    }, []);

    async function loadInvites() {
        setLoading(true);
        try {
            const [orgs, projects] = await Promise.all([
                getPendingOrgInvites(),
                getPendingShares(),
            ]);
            setOrgInvites(orgs);
            setProjectInvites(projects);
        } catch (error) {
            console.error("Error loading invites:", error);
        } finally {
            setLoading(false);
        }
    }

    async function handleAcceptOrgInvite(inviteId: string) {
        setProcessingId(inviteId);
        try {
            const result = await acceptOrgInvite(inviteId);
            if (result.success) {
                toast({ title: "Joined organization!" });
                setOrgInvites((prev) => prev.filter((i) => i.id !== inviteId));
            } else {
                toast({
                    title: "Error",
                    description: result.error,
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error accepting invite:", error);
        } finally {
            setProcessingId(null);
        }
    }

    async function handleAcceptProjectInvite(shareId: string) {
        setProcessingId(shareId);
        try {
            const result = await acceptProjectShare(shareId);
            if (result.success) {
                toast({ title: "Project access granted!" });
                setProjectInvites((prev) => prev.filter((i) => i.id !== shareId));
            } else {
                toast({
                    title: "Error",
                    description: result.error,
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error accepting invite:", error);
        } finally {
            setProcessingId(null);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const hasInvites = orgInvites.length > 0 || projectInvites.length > 0;

    return (
        <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold">Pending Invitations</h1>
                <p className="text-muted-foreground mt-1">
                    Review and accept invitations to organizations and projects.
                </p>
            </div>

            {!hasInvites ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                        <h3 className="text-lg font-medium mb-1">All caught up!</h3>
                        <p className="text-muted-foreground text-center mb-4">
                            You don&apos;t have any pending invitations.
                        </p>
                        <Button onClick={() => router.push("/")}>Go to Dashboard</Button>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Organization Invites */}
                    {orgInvites.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5" />
                                    Organization Invites
                                </CardTitle>
                                <CardDescription>
                                    Join an organization to collaborate with a team.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {orgInvites.map((invite) => (
                                    <div
                                        key={invite.id}
                                        className="flex items-center gap-4 p-4 rounded-lg border"
                                    >
                                        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                                            <Building2 className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium">{invite.orgName}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Role: {invite.role}
                                            </p>
                                        </div>
                                        <Button
                                            onClick={() => handleAcceptOrgInvite(invite.id)}
                                            disabled={processingId === invite.id}
                                        >
                                            {processingId === invite.id ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <CheckCircle className="mr-2 h-4 w-4" />
                                            )}
                                            Accept
                                        </Button>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* Project Invites */}
                    {projectInvites.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FolderKanban className="h-5 w-5" />
                                    Project Invites
                                </CardTitle>
                                <CardDescription>
                                    Get access to shared projects.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {projectInvites.map((invite) => (
                                    <div
                                        key={invite.id}
                                        className="flex items-center gap-4 p-4 rounded-lg border"
                                    >
                                        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                                            <FolderKanban className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium">{invite.projectName}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Permission: {invite.permission}
                                            </p>
                                        </div>
                                        <Button
                                            onClick={() => handleAcceptProjectInvite(invite.id)}
                                            disabled={processingId === invite.id}
                                        >
                                            {processingId === invite.id ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <CheckCircle className="mr-2 h-4 w-4" />
                                            )}
                                            Accept
                                        </Button>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
