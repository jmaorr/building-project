import { Suspense } from "react";
import Link from "next/link";
import { Plus, Search, Mail, Phone, Building2 } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getContacts } from "@/lib/actions/contacts";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { getSystemStatus } from "@/lib/status/system-status";
import { SystemStatusBanner } from "@/components/status/system-status-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { CardGridSkeleton } from "@/components/ui/card-grid-skeleton";

interface SearchParams {
  search?: string;
}

async function ContactList({
  searchParams,
  orgId,
}: {
  searchParams: SearchParams;
  orgId: string;
}) {
  const contacts = await getContacts({
    search: searchParams.search,
    orgId,
  });

  if (contacts.length === 0) {
    return (
      <EmptyState
        icon={<Search className="h-8 w-8" />}
        title="No contacts found"
        description={
          searchParams.search
            ? "Try adjusting your search"
            : "Add your first contact to get started"
        }
        action={
          !searchParams.search ? (
            <Button asChild>
              <Link href="/contacts/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Contact
              </Link>
            </Button>
          ) : null
        }
        className="py-16"
      />
    );
  }

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {contacts.map((contact) => (
        <Link key={contact.id} href={`/contacts/${contact.id}`}>
          <Card className="hover:border-brand/50 transition-colors h-full">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={contact.avatarUrl || undefined} />
                  <AvatarFallback className="bg-brand text-brand-foreground">
                    {getInitials(contact.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-medium truncate">{contact.name}</p>
                  {contact.company && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{contact.company}</span>
                    </div>
                  )}
                  {contact.email && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{contact.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function ContactListSkeleton() {
  return <CardGridSkeleton heightClassName="h-36" />;
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const [organization, systemStatus] = await Promise.all([
    getActiveOrganization(),
    getSystemStatus(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        description="Manage your team members, contractors, and vendors."
        actions={
          <Button asChild>
            <Link href="/contacts/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Link>
          </Button>
        }
      />

      {/* Search */}
      <form className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          name="search"
          placeholder="Search contacts..."
          defaultValue={params.search}
          className="pl-9"
        />
      </form>

      <SystemStatusBanner status={systemStatus} />

      {/* Contact Grid */}
      <Suspense fallback={<ContactListSkeleton />}>
        <ContactList searchParams={params} orgId={organization.id} />
      </Suspense>
    </div>
  );
}
