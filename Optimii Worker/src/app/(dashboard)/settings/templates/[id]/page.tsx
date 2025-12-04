"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Plus, 
  Trash2, 
  GripVertical,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Edit2,
  Check,
  X,
  AlertTriangle
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { ProjectTemplate, TemplatePhase, TemplateModule } from "@/lib/db/schema";
import { 
  getTemplate, 
  getSystemTemplates,
  updateTemplate,
  addTemplatePhase,
  updateTemplatePhase,
  deleteTemplatePhase,
  addTemplateModule,
  updateTemplateModule,
  deleteTemplateModule,
  reorderTemplateModules,
} from "@/lib/actions/templates";
import { defaultModuleTypes } from "@/lib/db/seed";

type ModuleWithType = TemplateModule & { moduleType: typeof defaultModuleTypes[number] };
type PhaseWithModules = TemplatePhase & { modules: ModuleWithType[] };
type TemplateDetail = {
  template: ProjectTemplate;
  phases: PhaseWithModules[];
};

interface TemplateEditorPageProps {
  params: Promise<{ id: string }>;
}

export default function TemplateEditorPage({ params }: TemplateEditorPageProps) {
  const { id } = use(params);
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Template data
  const [originalSystemTemplate, setOriginalSystemTemplate] = useState<TemplateDetail | null>(null);
  const [template, setTemplate] = useState<ProjectTemplate | null>(null);
  const [phases, setPhases] = useState<PhaseWithModules[]>([]);
  
  // UI state
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [editingPhaseName, setEditingPhaseName] = useState<string | null>(null);
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [showRevertDialog, setShowRevertDialog] = useState(false);
  
  // Drag state
  const [draggedStage, setDraggedStage] = useState<{ phaseId: string; moduleId: string; index: number } | null>(null);
  const [dragOverStage, setDragOverStage] = useState<{ phaseId: string; index: number } | null>(null);

  // Load template
  useEffect(() => {
    loadTemplate();
  }, [id]);

  async function loadTemplate() {
    setLoading(true);
    try {
      const detail = await getTemplate(id);
      if (detail) {
        setTemplate(detail.template);
        setPhases(detail.phases);
        
        // If this is a system template, also load the original for revert functionality
        if (detail.template.isSystem) {
          // Store the original system template for revert
          setOriginalSystemTemplate(detail);
        }
        
        // Expand first phase by default
        if (detail.phases.length > 0) {
          setExpandedPhases(new Set([detail.phases[0].id]));
        }
      }
    } catch (error) {
      console.error("Error loading template:", error);
    } finally {
      setLoading(false);
    }
  }

  const isSystemTemplate = template?.isSystem ?? false;

  // Save changes
  async function handleSave() {
    if (!template) return;
    
    setSaving(true);
    try {
      await updateTemplate(template.id, {
        name: template.name,
        description: template.description || "",
      });
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving template:", error);
    } finally {
      setSaving(false);
    }
  }

  // Revert to original system template
  async function handleRevert() {
    if (!originalSystemTemplate) return;
    
    // Restore the original system template data
    setTemplate(originalSystemTemplate.template);
    setPhases(originalSystemTemplate.phases);
    setHasChanges(false);
    setShowRevertDialog(false);
    
    // TODO: In production, this would delete any org-level overrides
    // and reload the original system template from the database
  }

  // Toggle phase expansion
  function togglePhase(phaseId: string) {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phaseId)) {
        next.delete(phaseId);
      } else {
        next.add(phaseId);
      }
      return next;
    });
  }

  // Update template info
  function updateTemplateInfo(field: "name" | "description", value: string) {
    if (!template) return;
    setTemplate({ ...template, [field]: value });
    setHasChanges(true);
  }

  // Phase operations
  async function handleAddPhase() {
    if (!template) return;
    
    try {
      const newPhase = await addTemplatePhase(template.id, {
        name: `Phase ${phases.length + 1}`,
        order: phases.length,
      });
      if (newPhase) {
        const phaseWithModules: PhaseWithModules = { ...newPhase, modules: [] };
        setPhases([...phases, phaseWithModules]);
        setExpandedPhases(prev => new Set([...prev, newPhase.id]));
        setEditingPhaseName(newPhase.id);
        setHasChanges(true);
      }
    } catch (error) {
      console.error("Error adding phase:", error);
    }
  }

  async function handleUpdatePhaseName(phaseId: string, name: string) {
    try {
      await updateTemplatePhase(phaseId, { name });
      setPhases(phases.map(p => p.id === phaseId ? { ...p, name } : p));
      setEditingPhaseName(null);
      setHasChanges(true);
    } catch (error) {
      console.error("Error updating phase:", error);
    }
  }

  async function handleDeletePhase(phaseId: string) {
    if (phases.length <= 1) {
      alert("Template must have at least one phase");
      return;
    }
    if (!confirm("Delete this phase and all its stages?")) return;
    
    try {
      await deleteTemplatePhase(phaseId);
      setPhases(phases.filter(p => p.id !== phaseId));
      setHasChanges(true);
    } catch (error) {
      console.error("Error deleting phase:", error);
    }
  }

  // Stage operations
  async function handleAddStage(phaseId: string) {
    try {
      const phase = phases.find(p => p.id === phaseId);
      const newModule = await addTemplateModule(phaseId, {
        moduleTypeId: "files",
        customName: `New Stage ${(phase?.modules.length || 0) + 1}`,
        order: phase?.modules.length || 0,
      });
      
      if (newModule) {
        const moduleWithType: ModuleWithType = {
          ...newModule,
          moduleType: defaultModuleTypes.find(mt => mt.code === "files") || defaultModuleTypes[0],
        };
        setPhases(phases.map(p => 
          p.id === phaseId 
            ? { ...p, modules: [...p.modules, moduleWithType] }
            : p
        ));
        setEditingStage(newModule.id);
        setHasChanges(true);
      }
    } catch (error) {
      console.error("Error adding stage:", error);
    }
  }

  async function handleUpdateStage(phaseId: string, moduleId: string, updates: { customName?: string; moduleTypeId?: string }) {
    try {
      await updateTemplateModule(moduleId, {
        customName: updates.customName,
      });
      
      setPhases(phases.map(p => {
        if (p.id !== phaseId) return p;
        return {
          ...p,
          modules: p.modules.map(m => {
            if (m.id !== moduleId) return m;
            return {
              ...m,
              customName: updates.customName ?? m.customName,
              moduleTypeId: updates.moduleTypeId ?? m.moduleTypeId,
              moduleType: updates.moduleTypeId 
                ? defaultModuleTypes.find(mt => mt.code === updates.moduleTypeId) || m.moduleType
                : m.moduleType,
            };
          }),
        };
      }));
      setEditingStage(null);
      setHasChanges(true);
    } catch (error) {
      console.error("Error updating stage:", error);
    }
  }

  async function handleDeleteStage(phaseId: string, moduleId: string) {
    if (!confirm("Delete this stage?")) return;
    
    try {
      await deleteTemplateModule(moduleId);
      setPhases(phases.map(p => 
        p.id === phaseId 
          ? { ...p, modules: p.modules.filter(m => m.id !== moduleId) }
          : p
      ));
      setHasChanges(true);
    } catch (error) {
      console.error("Error deleting stage:", error);
    }
  }

  // Drag and drop handlers
  function handleDragStart(e: React.DragEvent, phaseId: string, moduleId: string, index: number) {
    setDraggedStage({ phaseId, moduleId, index });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", moduleId);
  }

  function handleDragOver(e: React.DragEvent, phaseId: string, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    
    if (draggedStage && draggedStage.phaseId === phaseId) {
      setDragOverStage({ phaseId, index });
    }
  }

  function handleDragLeave() {
    setDragOverStage(null);
  }

  async function handleDrop(e: React.DragEvent, phaseId: string, dropIndex: number) {
    e.preventDefault();
    
    if (!draggedStage || draggedStage.phaseId !== phaseId) {
      setDraggedStage(null);
      setDragOverStage(null);
      return;
    }

    const phase = phases.find(p => p.id === phaseId);
    if (!phase) return;

    const newModules = [...phase.modules];
    const [movedModule] = newModules.splice(draggedStage.index, 1);
    const insertIndex = dropIndex > draggedStage.index ? dropIndex - 1 : dropIndex;
    newModules.splice(insertIndex, 0, movedModule);

    // Update order
    const reorderedIds = newModules.map(m => m.id);
    
    try {
      await reorderTemplateModules(phaseId, reorderedIds);
      
      setPhases(phases.map(p => 
        p.id === phaseId 
          ? { ...p, modules: newModules.map((m, i) => ({ ...m, order: i })) }
          : p
      ));
      setHasChanges(true);
    } catch (error) {
      console.error("Error reordering stages:", error);
    }

    setDraggedStage(null);
    setDragOverStage(null);
  }

  function handleDragEnd() {
    setDraggedStage(null);
    setDragOverStage(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-24">
        <p className="text-muted-foreground">Template not found</p>
        <Button asChild className="mt-4">
          <Link href="/settings?tab=templates">Back to Templates</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild className="mt-1">
          <Link href="/settings?tab=templates">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <PageHeader
            title={`Customize: ${template.name}`}
            description={isSystemTemplate 
              ? "Your changes will apply to your organization only"
              : "Edit template phases and stages"
            }
          />
        </div>
        <div className="flex items-center gap-2">
          {isSystemTemplate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRevertDialog(true)}
              disabled={!hasChanges}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Revert to Default
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Template Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Template Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={template.name}
              onChange={(e) => updateTemplateInfo("name", e.target.value)}
              placeholder="Template name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input
              value={template.description || ""}
              onChange={(e) => updateTemplateInfo("description", e.target.value)}
              placeholder="Optional description"
            />
          </div>
        </CardContent>
      </Card>

      {/* Phases */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Phases & Stages</CardTitle>
              <CardDescription>
                Drag stages to reorder. Click the edit icon to rename.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleAddPhase}>
              <Plus className="mr-2 h-4 w-4" />
              Add Phase
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {phases.map((phase) => (
            <div key={phase.id} className="border rounded-lg overflow-hidden">
              {/* Phase Header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b">
                <button
                  onClick={() => togglePhase(phase.id)}
                  className="p-1 hover:bg-accent rounded"
                >
                  {expandedPhases.has(phase.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                
                {editingPhaseName === phase.id ? (
                  <Input
                    value={phase.name}
                    onChange={(e) => setPhases(phases.map(p => 
                      p.id === phase.id ? { ...p, name: e.target.value } : p
                    ))}
                    onBlur={() => handleUpdatePhaseName(phase.id, phase.name)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdatePhaseName(phase.id, phase.name);
                      if (e.key === "Escape") setEditingPhaseName(null);
                    }}
                    className="h-8 flex-1 max-w-xs"
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => setEditingPhaseName(phase.id)}
                    className="flex-1 text-left font-medium hover:text-brand"
                  >
                    {phase.name}
                  </button>
                )}
                
                <Badge variant="secondary">{phase.modules.length} stages</Badge>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDeletePhase(phase.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Phase Content */}
              {expandedPhases.has(phase.id) && (
                <div className="p-4 space-y-2">
                  {phase.modules.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No stages yet</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => handleAddStage(phase.id)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add First Stage
                      </Button>
                    </div>
                  ) : (
                    <>
                      {phase.modules.map((module, index) => (
                        <div key={module.id}>
                          {/* Drop zone before */}
                          {dragOverStage?.phaseId === phase.id && dragOverStage?.index === index && (
                            <div className="h-1 bg-brand rounded mb-2" />
                          )}
                          
                          <div
                            draggable
                            onDragStart={(e) => handleDragStart(e, phase.id, module.id, index)}
                            onDragOver={(e) => handleDragOver(e, phase.id, index)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, phase.id, index)}
                            onDragEnd={handleDragEnd}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg border bg-background",
                              "hover:border-brand/50 transition-colors",
                              draggedStage?.moduleId === module.id && "opacity-50",
                              editingStage === module.id && "ring-2 ring-brand"
                            )}
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                            <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                            
                            {editingStage === module.id ? (
                              <>
                                <Input
                                  value={module.customName || ""}
                                  onChange={(e) => setPhases(phases.map(p => 
                                    p.id === phase.id 
                                      ? { ...p, modules: p.modules.map(m => 
                                          m.id === module.id ? { ...m, customName: e.target.value } : m
                                        )}
                                      : p
                                  ))}
                                  className="h-8 flex-1"
                                  placeholder="Stage name"
                                  autoFocus
                                />
                                <Select
                                  value={module.moduleTypeId}
                                  onValueChange={(value) => setPhases(phases.map(p => 
                                    p.id === phase.id 
                                      ? { ...p, modules: p.modules.map(m => 
                                          m.id === module.id 
                                            ? { 
                                                ...m, 
                                                moduleTypeId: value,
                                                moduleType: defaultModuleTypes.find(mt => mt.code === value) || m.moduleType
                                              } 
                                            : m
                                        )}
                                      : p
                                  ))}
                                >
                                  <SelectTrigger className="w-32 h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {defaultModuleTypes.map(type => (
                                      <SelectItem key={type.code} value={type.code}>
                                        {type.defaultName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleUpdateStage(phase.id, module.id, {
                                    customName: module.customName || undefined,
                                    moduleTypeId: module.moduleTypeId,
                                  })}
                                >
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setEditingStage(null)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <span className="flex-1 text-sm">
                                  {module.customName || module.moduleType.defaultName}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {module.moduleType.defaultName}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setEditingStage(module.id)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteStage(phase.id, module.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {/* Drop zone at end */}
                      <div
                        onDragOver={(e) => handleDragOver(e, phase.id, phase.modules.length)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, phase.id, phase.modules.length)}
                        className={cn(
                          "h-8 rounded border-2 border-dashed border-transparent transition-colors",
                          dragOverStage?.phaseId === phase.id && 
                          dragOverStage?.index === phase.modules.length && 
                          "border-brand bg-brand/5"
                        )}
                      />
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => handleAddStage(phase.id)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Stage
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Revert Dialog */}
      <AlertDialog open={showRevertDialog} onOpenChange={setShowRevertDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert to Default?</AlertDialogTitle>
            <AlertDialogDescription>
              This will discard all your customizations and restore the original system template.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevert}>
              Revert to Default
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
