"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TemplatesSettings } from "@/components/settings/templates-settings";
import { StatusSettings } from "@/components/settings/status-settings";
import { TeamSettings } from "@/components/settings/team-settings";
import { updateOrganization } from "@/lib/actions/organizations";
import { useToast } from "@/components/ui/use-toast";

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [orgName, setOrgName] = useState("");
  const [accentColor, setAccentColor] = useState("#5e6ad2");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadOrganization() {
      try {
        const response = await fetch("/api/organization");
        if (!response.ok) {
          throw new Error("Failed to fetch organization");
        }
        const data = await response.json();
        const org = data.organization;
        setOrgName(org.name || "");
        setAccentColor(org.accentColor || "#5e6ad2");
      } catch (error) {
        console.error("Failed to load organization:", error);
        toast({
          title: "Error",
          description: "Failed to load organization settings",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadOrganization();
  }, [toast]);

  const handleSaveOrganization = async () => {
    setIsSaving(true);
    try {
      const result = await updateOrganization({
        name: orgName,
        accentColor: accentColor,
      });

      if (result.success) {
        toast({
          title: "Success",
          description: "Organization settings updated successfully",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update organization settings",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to save organization:", error);
      toast({
        title: "Error",
        description: "Failed to update organization settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account and organization settings."
      />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="statuses">Statuses</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">First Name</label>
                  <Input placeholder="John" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Last Name</label>
                  <Input placeholder="Doe" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input type="email" placeholder="john@example.com" disabled />
                <p className="text-xs text-muted-foreground">
                  Email is managed through your authentication provider.
                </p>
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization Settings</CardTitle>
              <CardDescription>
                Customize your organization&apos;s branding and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Organization Name</label>
                <Input 
                  placeholder="Optimii" 
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Brand Color</label>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-16 h-10 p-1 cursor-pointer"
                    disabled={isLoading}
                  />
                  <Input 
                    placeholder="#5e6ad2" 
                    className="flex-1"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  This color will be used as the accent throughout the portal.
                </p>
              </div>
              <Button onClick={handleSaveOrganization} disabled={isLoading || isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <TeamSettings />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <TemplatesSettings />
        </TabsContent>

        <TabsContent value="statuses" className="space-y-4">
          <StatusSettings />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to be notified about updates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Notification settings coming soon.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
