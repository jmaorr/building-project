import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, AlertTriangle, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getProject, getProjectShares } from "@/lib/actions/projects";
import { ProjectShare } from "@/components/projects/project-share";

interface ProjectSettingsPageProps {
    params: Promise<{ id: string }>;
}

export default async function ProjectSettingsPage({ params }: ProjectSettingsPageProps) {
    const { id } = await params;
    const [project, shares] = await Promise.all([
        getProject(id),
        getProjectShares(id),
    ]);

    if (!project) {
        notFound();
    }

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div className="flex items-start gap-4">
                <Button variant="ghost" size="icon" asChild className="mt-1">
                    <Link href={`/projects/${id}`}>
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <PageHeader
                        title="Project Settings"
                        description={`Manage settings for ${project.name}`}
                        breadcrumbs={[
                            { title: "Projects", href: "/projects" },
                            { title: project.name, href: `/projects/${id}` },
                            { title: "Settings" },
                        ]}
                    />
                </div>
            </div>

            {/* General Settings */}
            <Card>
                <CardHeader>
                    <CardTitle>General</CardTitle>
                    <CardDescription>
                        Basic project information and details.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Project Name</label>
                        <Input defaultValue={project.name} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <Textarea
                            defaultValue={project.description || ""}
                            placeholder="Add a project description..."
                            rows={3}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Address</label>
                        <Input defaultValue={project.address || ""} placeholder="Project address" />
                    </div>
                    <Button>Save Changes</Button>
                </CardContent>
            </Card>

            {/* Sharing */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5" />
                                Organization Access
                            </CardTitle>
                            <CardDescription>
                                Organizations that have access to this project.
                            </CardDescription>
                        </div>
                        <ProjectShare projectId={id} />
                    </div>
                </CardHeader>
                <CardContent>
                    {shares.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">
                            This project is only visible to your organization.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {shares.map((share) => (
                                <div
                                    key={share.id}
                                    className="flex items-center gap-4 p-3 rounded-lg border"
                                >
                                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                                        <Building2 className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{share.orgName}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {share.accepted ? "Active" : "Pending invite"}
                                        </p>
                                    </div>
                                    <Badge variant={share.permission === "admin" ? "default" : "secondary"}>
                                        {share.permission}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Danger Zone
                    </CardTitle>
                    <CardDescription>
                        Irreversible actions that may affect your project.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                        <div>
                            <p className="font-medium">Delete this project</p>
                            <p className="text-sm text-muted-foreground">
                                Once deleted, this project cannot be recovered.
                            </p>
                        </div>
                        <Button variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Project
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
