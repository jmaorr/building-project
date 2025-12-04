"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, FileText, Check, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProject } from "@/lib/actions/projects";
import { getOrgTemplates, getTemplate } from "@/lib/actions/templates";
import type { ProjectTemplate, TemplatePhase, TemplateModule } from "@/lib/db/schema";
import { defaultModuleTypes } from "@/lib/db/seed";
import { cn } from "@/lib/utils";

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState<"template" | "details">("template");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Template state
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templatePreview, setTemplatePreview] = useState<{
    template: ProjectTemplate;
    phases: (TemplatePhase & { modules: (TemplateModule & { moduleType: typeof defaultModuleTypes[number] })[] })[];
  } | null>(null);
  const [expandedPreview, setExpandedPreview] = useState(false);

  // Load templates
  useEffect(() => {
    async function loadTemplates() {
      try {
        const orgTemplates = await getOrgTemplates("org-1"); // TODO: Get actual org ID
        setTemplates(orgTemplates);
        
        // Pre-select the default template
        const defaultTemplate = orgTemplates.find(t => t.isDefault);
        if (defaultTemplate) {
          setSelectedTemplateId(defaultTemplate.id);
          loadTemplatePreview(defaultTemplate.id);
        }
      } catch (error) {
        console.error("Error loading templates:", error);
      } finally {
        setLoadingTemplates(false);
      }
    }
    loadTemplates();
  }, []);

  async function loadTemplatePreview(id: string) {
    try {
      const detail = await getTemplate(id);
      setTemplatePreview(detail);
    } catch (error) {
      console.error("Error loading template preview:", error);
    }
  }

  function handleTemplateSelect(id: string) {
    setSelectedTemplateId(id);
    loadTemplatePreview(id);
  }

  function handleContinue() {
    if (selectedTemplateId) {
      setStep("details");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      
      console.log("Creating project with data:", {
        orgId: "org-1",
        templateId: selectedTemplateId,
        name: formData.get("name"),
      });
      
      const project = await createProject({
        orgId: "org-1", // TODO: Get from context
        templateId: selectedTemplateId || undefined,
        name: formData.get("name") as string,
        description: formData.get("description") as string || undefined,
        address: formData.get("address") as string || undefined,
        status: "draft",
        buildingType: formData.get("buildingType") as string || undefined,
        councilArea: formData.get("councilArea") as string || undefined,
        budget: formData.get("budget") ? parseFloat(formData.get("budget") as string) : undefined,
        targetCompletion: formData.get("targetCompletion") 
          ? new Date(formData.get("targetCompletion") as string) 
          : undefined,
      });
      
      console.log("Project created:", project);
      
      if (project) {
        router.push(`/projects/${project.id}`);
      } else {
        console.error("Project creation returned null");
        alert("Failed to create project. Please check the console for details.");
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Failed to create project:", error);
      alert(`Failed to create project: ${error instanceof Error ? error.message : "Unknown error"}`);
      setIsSubmitting(false);
    }
  }

  // Template selection step
  if (step === "template") {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/projects">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <PageHeader 
            title="New Project" 
            description="Choose a template to get started"
          />
        </div>

        {loadingTemplates ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Template Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select Template</CardTitle>
                <CardDescription>
                  Templates define the default phases and stages for your project. You can customize them later.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {templates.map(template => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleTemplateSelect(template.id)}
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all",
                        "hover:bg-accent/50 hover:border-brand/50",
                        selectedTemplateId === template.id
                          ? "border-brand bg-brand/5"
                          : "border-border"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg shrink-0",
                          selectedTemplateId === template.id
                            ? "bg-brand text-white"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{template.name}</h3>
                          {template.isDefault && (
                            <Badge variant="secondary" className="text-xs">Default</Badge>
                          )}
                          {template.isSystem && (
                            <Badge variant="outline" className="text-xs">System</Badge>
                          )}
                        </div>
                        {template.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {template.description}
                          </p>
                        )}
                      </div>
                      {selectedTemplateId === template.id && (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white shrink-0">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Template Preview */}
            {templatePreview && (
              <Card>
                <CardHeader
                  className="cursor-pointer"
                  onClick={() => setExpandedPreview(!expandedPreview)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Template Preview</CardTitle>
                      <CardDescription>
                        {templatePreview.phases.length} phases,{" "}
                        {templatePreview.phases.reduce((acc, p) => acc + p.modules.length, 0)} stages
                      </CardDescription>
                    </div>
                    {expandedPreview ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
                {expandedPreview && (
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {templatePreview.phases.map(phase => (
                        <div key={phase.id} className="border rounded-lg overflow-hidden">
                          <div className="bg-muted/50 px-4 py-2 border-b">
                            <h5 className="font-medium">{phase.name}</h5>
                          </div>
                          <div className="p-2">
                            {phase.modules.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-2">
                                No stages defined
                              </p>
                            ) : (
                              <div className="grid gap-1">
                                {phase.modules.map((module, idx) => (
                                  <div
                                    key={module.id}
                                    className="flex items-center gap-3 px-3 py-1.5 rounded-md bg-accent/30 text-sm"
                                  >
                                    <span className="text-muted-foreground w-5">{idx + 1}.</span>
                                    <span className="flex-1">{module.customName || module.moduleType.defaultName}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="outline" asChild>
                <Link href="/projects">Cancel</Link>
              </Button>
              <Button 
                onClick={handleContinue} 
                disabled={!selectedTemplateId}
              >
                Continue
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Details step
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setStep("template")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader title="Project Details" />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Selected Template Info */}
          {templatePreview && (
            <Card className="border-brand/30 bg-brand/5">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="rounded-full bg-brand/10 p-2">
                  <FileText className="h-5 w-5 text-brand" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Template: {templatePreview.template.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {templatePreview.phases.length} phases,{" "}
                    {templatePreview.phases.reduce((acc, p) => acc + p.modules.length, 0)} stages
                  </p>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setStep("template")}
                >
                  Change
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
              <CardDescription>
                Enter the essential details for your project.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Project Name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Riverside Renovation"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  placeholder="Brief description of the project..."
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="address" className="text-sm font-medium">
                  Address
                </label>
                <Input
                  id="address"
                  name="address"
                  placeholder="e.g., 42 River Road, Brisbane QLD 4000"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="buildingType" className="text-sm font-medium">
                    Building Type
                  </label>
                  <Select name="buildingType">
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New Build">New Build</SelectItem>
                      <SelectItem value="Renovation">Renovation</SelectItem>
                      <SelectItem value="Extension">Extension</SelectItem>
                      <SelectItem value="Fit-out">Fit-out</SelectItem>
                      <SelectItem value="Commercial">Commercial</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="councilArea" className="text-sm font-medium">
                    Council Area
                  </label>
                  <Input
                    id="councilArea"
                    name="councilArea"
                    placeholder="e.g., Brisbane City Council"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial & Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Financial & Timeline</CardTitle>
              <CardDescription>
                Set the budget and target completion date.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="budget" className="text-sm font-medium">
                    Budget (AUD)
                  </label>
                  <Input
                    id="budget"
                    name="budget"
                    type="number"
                    placeholder="e.g., 500000"
                    min="0"
                    step="1000"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="targetCompletion" className="text-sm font-medium">
                    Target Completion
                  </label>
                  <Input
                    id="targetCompletion"
                    name="targetCompletion"
                    type="date"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setStep("template")}>
              Back
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
