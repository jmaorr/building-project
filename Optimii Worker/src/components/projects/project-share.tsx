"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Share2, UserPlus, Trash2, Check, Clock, Building2, Mail } from "lucide-react";
import {
    shareProjectWithEmail,
    getProjectShares,
    removeProjectShare,
} from "@/lib/actions/projects";
import { useToast } from "@/components/ui/use-toast";
import type { PermissionLevel } from "@/lib/db/schema";

interface ProjectShareProps {
    projectId: string;
    children?: React.ReactNode;
}

interface Share {
    id: string;
    orgId: string;
    orgName: string;
    permission: string;
    accepted: boolean;
    invitedAt: Date;
}

export function ProjectShare({ projectId, children }: ProjectShareProps) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [shares, setShares] = useState<Share[]>([]);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [permission, setPermission] = useState<PermissionLevel>("editor");
    const [submitting, setSubmitting] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState<{ id: string; name: string } | null>(null);

    async function loadShares() {
        if (!open) return;
        setLoading(true);
        try {
            const data = await getProjectShares(projectId);
            setShares(data);
        } catch (error) {
            console.error("Error loading shares:", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (open) {
            loadShares();
        }
    }, [open, projectId]);

    async function handleShare(e: React.FormEvent) {
        e.preventDefault();
        if (!email.trim()) return;

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            toast({
                title: "Invalid email",
                description: "Please enter a valid email address",
                variant: "destructive",
            });
            return;
        }

        setSubmitting(true);
        try {
            const result = await shareProjectWithEmail({
                projectId,
                email: email.trim(),
                permission,
            });

            if (result.success) {
                if (result.pending) {
                    toast({
                        title: "Invitation sent",
                        description: `An email has been sent to ${email}. They'll get access when they sign up.`,
                        variant: "success",
                    });
                } else {
                    toast({
                        title: "Project shared",
                        description: `${email} now has ${permission} access to this project.`,
                        variant: "success",
                    });
                }
                setEmail("");
                await loadShares();
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Failed to share project",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error sharing project:", error);
            toast({
                title: "Error",
                description: "Failed to share project",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    }

    async function handleRemove() {
        if (!confirmRemove) return;

        try {
            const result = await removeProjectShare(confirmRemove.id);
            if (result.success) {
                toast({ title: "Access removed", variant: "success" });
                await loadShares();
            } else {
                toast({
                    title: "Error",
                    description: result.error,
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error removing share:", error);
        } finally {
            setConfirmRemove(null);
        }
    }

    function getPermissionBadge(level: string) {
        switch (level) {
            case "admin":
                return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">Admin</Badge>;
            case "editor":
                return <Badge variant="secondary">Editor</Badge>;
            default:
                return <Badge variant="outline">Viewer</Badge>;
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    {children || (
                        <Button variant="outline" size="sm">
                            <Share2 className="mr-2 h-4 w-4" />
                            Share
                        </Button>
                    )}
                </DialogTrigger>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Share2 className="h-5 w-5" />
                            Share Project
                        </DialogTitle>
                        <DialogDescription>
                            Invite people to collaborate on this project by email.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Invite Form */}
                    <form onSubmit={handleShare} className="space-y-4 border-b pb-4">
                        <div className="space-y-2">
                            <label htmlFor="share-email" className="text-sm font-medium">
                                Email address
                            </label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="share-email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="colleague@example.com"
                                        className="pl-9"
                                    />
                                </div>
                                <Select value={permission} onValueChange={(v) => setPermission(v as PermissionLevel)}>
                                    <SelectTrigger className="w-28">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="viewer">Viewer</SelectItem>
                                        <SelectItem value="editor">Editor</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {permission === "viewer" && "Can view the project but cannot make changes"}
                                {permission === "editor" && "Can add and edit content within the project"}
                                {permission === "admin" && "Can manage settings, sharing, and all content"}
                            </p>
                        </div>
                        <Button type="submit" className="w-full" disabled={!email.trim() || submitting}>
                            {submitting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <UserPlus className="mr-2 h-4 w-4" />
                            )}
                            Send Invitation
                        </Button>
                    </form>

                    {/* Current Shares */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">Shared With</h4>
                        {loading ? (
                            <div className="flex justify-center py-4">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : shares.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                Not shared with anyone yet. Invite collaborators above.
                            </p>
                        ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {shares.map((share) => (
                                    <div
                                        key={share.id}
                                        className="flex items-center gap-3 p-2 rounded-lg border bg-card"
                                    >
                                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                                            <Building2 className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{share.orgName}</p>
                                            <div className="flex items-center gap-1">
                                                {share.accepted ? (
                                                    <span className="text-xs text-green-600 flex items-center gap-1">
                                                        <Check className="h-3 w-3" />
                                                        Accepted
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        Pending
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {getPermissionBadge(share.permission)}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                            onClick={() => setConfirmRemove({ id: share.id, name: share.orgName })}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirm Remove */}
            <AlertDialog open={!!confirmRemove} onOpenChange={() => setConfirmRemove(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Access</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove {confirmRemove?.name}&apos;s access to this project?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
