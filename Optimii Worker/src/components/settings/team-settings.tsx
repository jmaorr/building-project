"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, UserPlus, Mail, Trash2, Clock, Users, Shield } from "lucide-react";
import {
    inviteUserToOrg,
    getOrgMembers,
    getOrgPendingInvites,
    removeOrgMember,
    cancelOrgInvite,
} from "@/lib/actions/organizations";
import { useToast } from "@/components/ui/use-toast";

interface Member {
    id: string;
    userId: string;
    name: string;
    email: string;
    role: string;
}

interface PendingInvite {
    id: string;
    email: string;
    role: string;
    invitedAt: Date;
}

export function TeamSettings() {
    const { toast } = useToast();
    const [members, setMembers] = useState<Member[]>([]);
    const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
    const [loading, setLoading] = useState(true);
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
    const [submitting, setSubmitting] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState<{ type: "member" | "invite"; id: string; name: string } | null>(null);

    async function loadTeam() {
        setLoading(true);
        try {
            const [membersData, invitesData] = await Promise.all([
                getOrgMembers(),
                getOrgPendingInvites(),
            ]);
            setMembers(membersData);
            setPendingInvites(invitesData);
        } catch (error) {
            console.error("Error loading team:", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadTeam();
    }, []);

    async function handleInvite(e: React.FormEvent) {
        e.preventDefault();
        if (!inviteEmail.trim()) return;

        setSubmitting(true);
        try {
            const result = await inviteUserToOrg({
                email: inviteEmail.trim(),
                role: inviteRole,
            });

            if (result.success) {
                toast({
                    title: "Invite sent",
                    description: `An invitation has been sent to ${inviteEmail}`,
                });
                setIsInviteOpen(false);
                setInviteEmail("");
                setInviteRole("member");
                await loadTeam();
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Failed to send invite",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error inviting user:", error);
            toast({
                title: "Error",
                description: "Failed to send invite",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    }

    async function handleRemove() {
        if (!confirmRemove) return;

        try {
            let result;
            if (confirmRemove.type === "member") {
                result = await removeOrgMember(confirmRemove.id);
            } else {
                result = await cancelOrgInvite(confirmRemove.id);
            }

            if (result.success) {
                toast({
                    title: confirmRemove.type === "member" ? "Member removed" : "Invite cancelled",
                });
                await loadTeam();
            } else {
                toast({
                    title: "Error",
                    description: result.error,
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setConfirmRemove(null);
        }
    }

    function getRoleBadge(role: string) {
        switch (role) {
            case "owner":
                return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Owner</Badge>;
            case "admin":
                return <Badge variant="secondary">Admin</Badge>;
            default:
                return <Badge variant="outline">Member</Badge>;
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Team Members
                            </CardTitle>
                            <CardDescription>
                                Manage who has access to your organization.
                            </CardDescription>
                        </div>
                        <Button onClick={() => setIsInviteOpen(true)}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Invite Member
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {members.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No team members yet</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {members.map((member) => (
                                <div
                                    key={member.id}
                                    className="flex items-center gap-4 p-3 rounded-lg border bg-card"
                                >
                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                        <span className="text-sm font-medium">
                                            {member.name?.charAt(0)?.toUpperCase() || member.email.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{member.name || member.email}</p>
                                        {member.name && (
                                            <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                                        )}
                                    </div>
                                    {getRoleBadge(member.role)}
                                    {member.role !== "owner" && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                            onClick={() => setConfirmRemove({ type: "member", id: member.id, name: member.name || member.email })}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pending Invites */}
            {pendingInvites.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Pending Invites
                        </CardTitle>
                        <CardDescription>
                            Invitations that haven&apos;t been accepted yet.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {pendingInvites.map((invite) => (
                                <div
                                    key={invite.id}
                                    className="flex items-center gap-4 p-3 rounded-lg border bg-muted/30"
                                >
                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{invite.email}</p>
                                        <p className="text-sm text-muted-foreground">
                                            Invited {new Date(invite.invitedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <Badge variant="outline">{invite.role}</Badge>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                        onClick={() => setConfirmRemove({ type: "invite", id: invite.id, name: invite.email })}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Invite Dialog */}
            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Invite Team Member</DialogTitle>
                        <DialogDescription>
                            Send an email invitation to join your organization.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleInvite}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email Address</label>
                                <Input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="colleague@example.com"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Role</label>
                                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "admin" | "member")}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="member">
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4" />
                                                <span>Member</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="admin">
                                            <div className="flex items-center gap-2">
                                                <Shield className="h-4 w-4" />
                                                <span>Admin</span>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Admins can invite and manage team members.
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={!inviteEmail.trim() || submitting}>
                                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                                Send Invite
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Confirm Remove Dialog */}
            <AlertDialog open={!!confirmRemove} onOpenChange={() => setConfirmRemove(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {confirmRemove?.type === "member" ? "Remove Team Member" : "Cancel Invite"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmRemove?.type === "member"
                                ? `Are you sure you want to remove ${confirmRemove?.name} from the team?`
                                : `Are you sure you want to cancel the invite to ${confirmRemove?.name}?`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {confirmRemove?.type === "member" ? "Remove" : "Cancel Invite"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
