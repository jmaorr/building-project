import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, UserPlus, Mail, Phone, MoreHorizontal } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getProject } from "@/lib/actions/projects";
import { getProjectContacts, getContactRoles } from "@/lib/actions/contacts";

interface ProjectContactsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectContactsPage({ params }: ProjectContactsPageProps) {
  const { id } = await params;
  const project = await getProject(id);
  
  if (!project) {
    notFound();
  }

  const [contacts, roles] = await Promise.all([
    getProjectContacts(id),
    getContactRoles("org-1"),
  ]);

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  // Group contacts by role
  const contactsByRole = contacts.reduce((acc, pc) => {
    const roleName = pc.role?.name || "Team Member";
    if (!acc[roleName]) {
      acc[roleName] = [];
    }
    acc[roleName].push(pc);
    return acc;
  }, {} as Record<string, typeof contacts>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild className="mt-1">
          <Link href={`/projects/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <PageHeader
            title="Project Team"
            description={`Manage team members for ${project.name}`}
            breadcrumbs={[
              { title: "Projects", href: "/projects" },
              { title: project.name, href: `/projects/${id}` },
              { title: "Team" },
            ]}
            actions={
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Team Member
              </Button>
            }
          />
        </div>
      </div>

      {contacts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <UserPlus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-1">No team members</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add team members to collaborate on this project.
            </p>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Team Member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(contactsByRole).map(([roleName, roleContacts]) => (
            <Card key={roleName}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {roleName}
                  <Badge variant="secondary" className="font-normal">
                    {roleContacts.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {roleContacts.map(({ contact, role, isPrimary, permission }) => (
                  <div
                    key={contact.id}
                    className="flex items-center gap-4 p-3 rounded-lg border"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={contact.avatarUrl || undefined} />
                      <AvatarFallback className="bg-brand text-brand-foreground">
                        {getInitials(contact.name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/contacts/${contact.id}`}
                          className="font-medium hover:text-brand transition-colors"
                        >
                          {contact.name}
                        </Link>
                        {isPrimary && (
                          <Badge variant="outline" className="text-xs">Primary</Badge>
                        )}
                      </div>
                      {contact.company && (
                        <p className="text-sm text-muted-foreground">
                          {contact.company}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {contact.email && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <a href={`mailto:${contact.email}`}>
                            <Mail className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {contact.phone && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <a href={`tel:${contact.phone}`}>
                            <Phone className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/contacts/${contact.id}`}>
                              View Contact
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>Change Role</DropdownMenuItem>
                          <DropdownMenuItem>
                            {isPrimary ? "Remove as Primary" : "Set as Primary"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            Remove from Project
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}




