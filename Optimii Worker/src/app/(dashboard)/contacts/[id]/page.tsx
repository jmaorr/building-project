import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Building2, Edit, FolderKanban } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getContact, getContactProjects } from "@/lib/actions/contacts";
import { getProject } from "@/lib/actions/projects";

interface ContactPageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { id } = await params;
  const contact = await getContact(id);
  
  if (!contact) {
    notFound();
  }

  const contactProjects = await getContactProjects(id);
  
  // Get project details for each associated project
  const projectsWithDetails = await Promise.all(
    contactProjects.map(async (cp) => {
      const project = await getProject(cp.projectId);
      return { project, role: cp.role };
    })
  );

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild className="mt-1">
          <Link href="/contacts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <PageHeader
            title={contact.name}
            breadcrumbs={[
              { title: "Contacts", href: "/contacts" },
              { title: contact.name },
            ]}
            actions={
              <Button variant="outline" size="sm">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            }
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact Info */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-20 w-20 mb-4">
                  <AvatarImage src={contact.avatarUrl || undefined} />
                  <AvatarFallback className="bg-brand text-brand-foreground text-xl">
                    {getInitials(contact.name)}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-semibold">{contact.name}</h2>
                {contact.company && (
                  <p className="text-muted-foreground">{contact.company}</p>
                )}
              </div>
              
              <div className="mt-6 space-y-3">
                {contact.email && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <a 
                        href={`mailto:${contact.email}`}
                        className="text-sm hover:text-brand transition-colors"
                      >
                        {contact.email}
                      </a>
                    </div>
                  </div>
                )}
                
                {contact.phone && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <a 
                        href={`tel:${contact.phone}`}
                        className="text-sm hover:text-brand transition-colors"
                      >
                        {contact.phone}
                      </a>
                    </div>
                  </div>
                )}
                
                {contact.company && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Company</p>
                      <p className="text-sm">{contact.company}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {contact.notes && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Projects */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FolderKanban className="h-5 w-5" />
                Associated Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              {projectsWithDetails.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    This contact is not associated with any projects.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {projectsWithDetails.map(({ project, role }) => project && (
                    <Link 
                      key={project.id} 
                      href={`/projects/${project.id}`}
                      className="block"
                    >
                      <div className="flex items-center justify-between p-4 rounded-lg border hover:border-brand/50 transition-colors">
                        <div>
                          <p className="font-medium">{project.name}</p>
                          {project.address && (
                            <p className="text-sm text-muted-foreground">
                              {project.address}
                            </p>
                          )}
                        </div>
                        {role && (
                          <Badge variant="secondary">
                            {role.name}
                          </Badge>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}




