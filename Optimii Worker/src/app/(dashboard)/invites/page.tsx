"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, Building2, FolderKanban, Shield, Edit, Eye } from "lucide-react";
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
    invitedBy?: string;
}

const roleLabels: Record<string, { label: string; icon: React.ReactNode }> = {
    owner: { label: "Owner", icon: <Shield className="h-3 w-3" /> },
    admin: { label: "Admin", icon: <Shield className="h-3 w-3" /> },
    member: { label: "Member", icon: <Edit className="h-3 w-3" /> },
};

const permissionLabels: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    admin: { 
        label: "Admin", 
        icon: <Shield className="h-3 w-3" />,
        className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
    },
    editor: { 
        label: "Editor", 
        icon: <Edit className="h-3 w-3" />,
        className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
    },
    viewer: { 
        label: "Viewer", 
        icon: <Eye className="h-3 w-3" />,
        className: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20"
    },
};

function formatDate(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat("en-AU", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(d);
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

    async function handleAcceptOrgInvite(inviteId: string, orgName: string) {
        setProcessingId(inviteId);
        try {
            const result = await acceptOrgInvite(inviteId);
            if (result.success) {
                toast({ 
                    title: "Joined organization!", 
                    description: `You are now a member of ${orgName}.` 
                });
                setOrgInvites((prev) => prev.filter((i) => i.id !== inviteId));
                router.refresh();
            } else {
                toast({
                    title: "Error",
                    description: result.error,
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error accepting invite:", error);
            toast({
                title: "Error",
                description: "Failed to accept invitation",
                variant: "destructive",
            });
        } finally {
            setProcessingId(null);
        }
    }

    async function handleAcceptProjectInvite(shareId: string, projectName: string) {
        setProcessingId(shareId);
        try {
            const result = await acceptProjectShare(shareId);
            if (result.success) {
                toast({ 
                    title: "Project access granted!", 
                    description: `You can now access "${projectName}".` 
                });
                setProjectInvites((prev) => prev.filter((i) => i.id !== shareId));
                router.refresh();
            } else {
                toast({
                    title: "Error",
                    description: result.error,
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error accepting invite:", error);
            toast({
                title: "Error",
                description: "Failed to accept invitation",
                variant: "destructive",
            });
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
                        <Button onClick={() => router.push("/projects")}>
                            View Projects
                        </Button>
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
                                    Join an organization to collaborate with their team and access their projects.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {orgInvites.map((invite) => {
                                    const roleConfig = roleLabels[invite.role] || roleLabels.member;
                                    return (
                                        <div
                                            key={invite.id}
                                            className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                                        >
                                            <div className="h-12 w-12 rounded-lg bg-brand/10 flex items-center justify-center">
                                                <Building2 className="h-6 w-6 text-brand" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{invite.orgName}</p>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Badge variant="outline" className="flex items-center gap-1">
                                                        {roleConfig.icon}
                                                        {roleConfig.label}
                                                    </Badge>
                                                    <span>•</span>
                                                    <span>Invited {formatDate(invite.invitedAt)}</span>
                                                </div>
                                            </div>
                                            <Button
                                                onClick={() => handleAcceptOrgInvite(invite.id, invite.orgName)}
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
                                    );
                                })}
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
                                    You&apos;ve been invited to collaborate on these projects.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {projectInvites.map((invite) => {
                                    const permConfig = permissionLabels[invite.permission] || permissionLabels.viewer;
                                    return (
                                        <div
                                            key={invite.id}
                                            className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                                        >
                                            <div className="h-12 w-12 rounded-lg bg-brand/10 flex items-center justify-center">
                                                <FolderKanban className="h-6 w-6 text-brand" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{invite.projectName}</p>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Badge variant="outline" className={permConfig.className}>
                                                        {permConfig.icon}
                                                        <span className="ml-1">{permConfig.label}</span>
                                                    </Badge>
                                                    <span>•</span>
                                                    <span>Invited {formatDate(invite.invitedAt)}</span>
                                                </div>
                                            </div>
                                            <Button
                                                onClick={() => handleAcceptProjectInvite(invite.id, invite.projectName)}
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
                                    );
                                })}
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
