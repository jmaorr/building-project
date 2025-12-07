"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Loader2, UserPlus, Mail } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
    getContactRoles,
    createAndAddContactToProject,
    addContactToProject,
    getContacts
} from "@/lib/actions/contacts";
import type { Contact, ContactRole, PermissionLevel } from "@/lib/db/schema";

interface AddContactDialogProps {
    projectId: string;
    orgId: string;
    onSuccess?: () => void;
    children?: React.ReactNode;
}

export function AddContactDialog({ projectId, orgId, onSuccess, children }: AddContactDialogProps) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<"new" | "existing">("new");
    const [roles, setRoles] = useState<ContactRole[]>([]);
    const [existingContacts, setExistingContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form state - new contact
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [company, setCompany] = useState("");
    const [roleId, setRoleId] = useState<string>("");
    const [permission, setPermission] = useState<PermissionLevel>("viewer");
    const [sendInvite, setSendInvite] = useState(false);

    // Form state - existing contact
    const [selectedContactId, setSelectedContactId] = useState<string>("");

    useEffect(() => {
        if (open) {
            loadData();
        }
    }, [open]);

    async function loadData() {
        setLoading(true);
        try {
            const [rolesData, contactsData] = await Promise.all([
                getContactRoles(orgId),
                getContacts({ orgId }),
            ]);
            setRoles(rolesData);
            setExistingContacts(contactsData);
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);

        try {
            if (mode === "new") {
                if (!name.trim()) {
                    toast({
                        title: "Name required",
                        description: "Please enter a contact name.",
                        variant: "destructive",
                    });
                    return;
                }

                await createAndAddContactToProject({
                    projectId,
                    orgId,
                    name: name.trim(),
                    email: email.trim() || undefined,
                    phone: phone.trim() || undefined,
                    company: company.trim() || undefined,
                    permission,
                    sendInvite: sendInvite && !!email.trim(),
                });

                toast({
                    title: "Contact added",
                    description: sendInvite && email ? "Invitation sent." : "Contact added to project.",
                });
            } else {
                if (!selectedContactId) {
                    toast({
                        title: "Select a contact",
                        description: "Please select an existing contact.",
                        variant: "destructive",
                    });
                    return;
                }

                await addContactToProject({
                    projectId,
                    contactId: selectedContactId,
                    roleId: roleId || undefined,
                    permission,
                    sendInvite,
                });

                toast({
                    title: "Contact added",
                    description: "Contact added to project.",
                });
            }

            // Reset form
            setName("");
            setEmail("");
            setPhone("");
            setCompany("");
            setRoleId("");
            setPermission("viewer");
            setSendInvite(false);
            setSelectedContactId("");
            setOpen(false);
            onSuccess?.();
        } catch (error) {
            console.error("Error adding contact:", error);
            const errorMessage = error instanceof Error ? error.message : "Failed to add contact.";
            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add Team Member
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Team Member</DialogTitle>
                    <DialogDescription>
                        Add a contact to this project team.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {/* Mode Toggle */}
                        <div className="flex rounded-lg border p-1 mb-4">
                            <button
                                type="button"
                                className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${mode === "new" ? "bg-muted font-medium" : "text-muted-foreground"
                                    }`}
                                onClick={() => setMode("new")}
                            >
                                New Contact
                            </button>
                            <button
                                type="button"
                                className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${mode === "existing" ? "bg-muted font-medium" : "text-muted-foreground"
                                    }`}
                                onClick={() => setMode("existing")}
                            >
                                Existing Contact
                            </button>
                        </div>

                        <div className="space-y-4">
                            {mode === "new" ? (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Name *</Label>
                                        <Input
                                            id="name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="John Smith"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="john@example.com"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="phone">Phone</Label>
                                            <Input
                                                id="phone"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="0412 345 678"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="company">Company</Label>
                                        <Input
                                            id="company"
                                            value={company}
                                            onChange={(e) => setCompany(e.target.value)}
                                            placeholder="Company name"
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-2">
                                    <Label>Select Contact</Label>
                                    <Select
                                        value={selectedContactId}
                                        onValueChange={setSelectedContactId}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose a contact..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {existingContacts
                                                .filter((contact) => contact.id && typeof contact.id === "string" && contact.id.trim() !== "")
                                                .map((contact) => (
                                                    <SelectItem key={contact.id} value={contact.id}>
                                                        {contact.name || contact.email || "Unnamed Contact"}
                                                        {contact.company && (
                                                            <span className="text-muted-foreground ml-2">
                                                                ({contact.company})
                                                            </span>
                                                        )}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Role */}
                            <div className="space-y-2">
                                <Label>Role</Label>
                                <Select value={roleId || "none"} onValueChange={(v) => setRoleId(v === "none" ? "" : v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a role..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No role</SelectItem>
                                        {roles.map((role) => (
                                            <SelectItem key={role.id} value={role.id}>
                                                {role.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Permission */}
                            <div className="space-y-2">
                                <Label>Permission Level</Label>
                                <Select value={permission} onValueChange={(v) => setPermission(v as PermissionLevel)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="viewer">Viewer - Can view only</SelectItem>
                                        <SelectItem value="editor">Editor - Can edit</SelectItem>
                                        <SelectItem value="admin">Admin - Full control</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Send Invite */}
                            {(mode === "new" ? email : true) && (
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="sendInvite"
                                        checked={sendInvite}
                                        onCheckedChange={(checked) => setSendInvite(checked as boolean)}
                                    />
                                    <label
                                        htmlFor="sendInvite"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        <Mail className="inline mr-1 h-3 w-3" />
                                        Send email invitation
                                    </label>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="mt-6">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <UserPlus className="mr-2 h-4 w-4" />
                                )}
                                Add Contact
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
