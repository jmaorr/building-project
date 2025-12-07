"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Edit,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
  FileText,
  Loader2,
  Star,
  RotateCcw,
  Save,
  X,
  GripVertical,
  Check,
  Edit2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectTemplate, TemplatePhase, TemplateStage } from "@/lib/db/schema";
import {
  getOrgTemplates,
  getTemplate,
  createTemplate,
  deleteTemplate,
  updateTemplate,
  addTemplatePhase,
  updateTemplatePhase,
  deleteTemplatePhase,
  addTemplateModule,
  updateTemplateModule,
  deleteTemplateModule,
  reorderTemplateModules,
} from "@/lib/actions/templates";
import { defaultStageTypes } from "@/lib/db/seed";
import { useOrganization } from "@/components/providers";

type ModuleWithType = TemplateStage & { moduleType: typeof defaultStageTypes[number] };
type PhaseWithModules = TemplatePhase & { modules: ModuleWithType[] };
type TemplateDetail = {
  template: ProjectTemplate;
  phases: PhaseWithModules[];
};

export function TemplatesSettings() {
  const { organization } = useOrganization();
  const orgId = organization?.id;
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templateDetail, setTemplateDetail] = useState<TemplateDetail | null>(null);
  const [originalDetail, setOriginalDetail] = useState<TemplateDetail | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [editingPhaseName, setEditingPhaseName] = useState<string | null>(null);
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [showRevertDialog, setShowRevertDialog] = useState(false);

  // Drag state
  const [draggedStage, setDraggedStage] = useState<{ phaseId: string; moduleId: string; index: number } | null>(null);
  const [dragOverStage, setDragOverStage] = useState<{ phaseId: string; index: number } | null>(null);

  const loadTemplates = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const orgTemplates = await getOrgTemplates(orgId);
      setTemplates(orgTemplates);
    } catch (error) {
      console.error("Error loading templates:", error);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  // Load templates
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  async function loadTemplateDetail(id: string) {
    try {
      const detail = await getTemplate(id);
      setTemplateDetail(detail);
      setOriginalDetail(detail);
      if (detail && detail.phases.length > 0) {
        setExpandedPhases(new Set([detail.phases[0].id]));
      }
    } catch (error) {
      console.error("Error loading template detail:", error);
    }
  }

  function handleTemplateSelect(id: string) {
    if (isEditing && hasChanges) {
      if (!confirm("You have unsaved changes. Discard them?")) return;
    }

    setIsEditing(false);
    setHasChanges(false);

    if (selectedTemplate === id) {
      setSelectedTemplate(null);
      setTemplateDetail(null);
      setOriginalDetail(null);
    } else {
      setSelectedTemplate(id);
      loadTemplateDetail(id);
    }
  }

  async function handleDelete(templateId: string) {
    const template = templates.find(t => t.id === templateId);
    if (template?.isSystem) {
      alert("Cannot delete system templates. You can revert customizations instead.");
      return;
    }
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      await deleteTemplate(templateId);
      await loadTemplates();
      if (selectedTemplate === templateId) {
        setSelectedTemplate(null);
        setTemplateDetail(null);
        setOriginalDetail(null);
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error deleting template:", error);
    }
  }

  function handleStartEdit() {
    setIsEditing(true);
    if (templateDetail && templateDetail.phases.length > 0) {
      setExpandedPhases(new Set(templateDetail.phases.map(p => p.id)));
    }
  }

  function handleCancelEdit() {
    if (hasChanges && !confirm("Discard your changes?")) return;
    setTemplateDetail(originalDetail);
    setIsEditing(false);
    setHasChanges(false);
    setEditingPhaseName(null);
    setEditingStage(null);
  }

  async function handleSave() {
    if (!templateDetail) return;

    setSaving(true);
    try {
      await updateTemplate(templateDetail.template.id, {
        name: templateDetail.template.name,
        description: templateDetail.template.description || "",
      });
      setOriginalDetail(templateDetail);
      setHasChanges(false);
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving template:", error);
    } finally {
      setSaving(false);
    }
  }

  function handleRevert() {
    setTemplateDetail(originalDetail);
    setHasChanges(false);
    setShowRevertDialog(false);
  }

  // Update template info
  function updateTemplateInfo(field: "name" | "description", value: string) {
    if (!templateDetail) return;
    setTemplateDetail({
      ...templateDetail,
      template: { ...templateDetail.template, [field]: value }
    });
    setHasChanges(true);
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

  // Phase operations
  async function handleAddPhase() {
    if (!templateDetail) return;

    try {
      const newPhase = await addTemplatePhase(templateDetail.template.id, {
        name: `Phase ${templateDetail.phases.length + 1}`,
        order: templateDetail.phases.length,
      });
      if (newPhase) {
        const phaseWithModules: PhaseWithModules = { ...newPhase, modules: [] };
        setTemplateDetail({
          ...templateDetail,
          phases: [...templateDetail.phases, phaseWithModules]
        });
        setExpandedPhases(prev => new Set([...prev, newPhase.id]));
        setEditingPhaseName(newPhase.id);
        setHasChanges(true);
      }
    } catch (error) {
      console.error("Error adding phase:", error);
    }
  }

  async function handleUpdatePhaseName(phaseId: string, name: string) {
    if (!templateDetail) return;
    try {
      await updateTemplatePhase(phaseId, { name });
      setTemplateDetail({
        ...templateDetail,
        phases: templateDetail.phases.map(p => p.id === phaseId ? { ...p, name } : p)
      });
      setEditingPhaseName(null);
      setHasChanges(true);
    } catch (error) {
      console.error("Error updating phase:", error);
    }
  }

  async function handleDeletePhase(phaseId: string) {
    if (!templateDetail) return;
    if (templateDetail.phases.length <= 1) {
      alert("Template must have at least one phase");
      return;
    }
    if (!confirm("Delete this phase and all its stages?")) return;

    try {
      await deleteTemplatePhase(phaseId);
      setTemplateDetail({
        ...templateDetail,
        phases: templateDetail.phases.filter(p => p.id !== phaseId)
      });
      setHasChanges(true);
    } catch (error) {
      console.error("Error deleting phase:", error);
    }
  }

  // Stage operations
  async function handleAddStage(phaseId: string) {
    if (!templateDetail) return;
    try {
      const phase = templateDetail.phases.find(p => p.id === phaseId);
      const newModule = await addTemplateModule(phaseId, {
        moduleTypeId: "files",
        customName: `New Stage ${(phase?.modules.length || 0) + 1}`,
        order: phase?.modules.length || 0,
      });

      if (newModule) {
        const moduleWithType: ModuleWithType = {
          ...newModule,
          moduleType: defaultStageTypes.find(mt => mt.code === "files") || defaultStageTypes[0],
        };
        setTemplateDetail({
          ...templateDetail,
          phases: templateDetail.phases.map(p =>
            p.id === phaseId
              ? { ...p, modules: [...p.modules, moduleWithType] }
              : p
          )
        });
        setEditingStage(newModule.id);
        setHasChanges(true);
      }
    } catch (error) {
      console.error("Error adding stage:", error);
    }
  }

  async function handleUpdateStage(phaseId: string, moduleId: string, updates: { customName?: string; moduleTypeId?: string }) {
    if (!templateDetail) return;
    try {
      await updateTemplateModule(moduleId, { customName: updates.customName });

      setTemplateDetail({
        ...templateDetail,
        phases: templateDetail.phases.map(p => {
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
                  ? defaultStageTypes.find(mt => mt.code === updates.moduleTypeId) || m.moduleType
                  : m.moduleType,
              };
            }),
          };
        })
      });
      setEditingStage(null);
      setHasChanges(true);
    } catch (error) {
      console.error("Error updating stage:", error);
    }
  }

  async function handleDeleteStage(phaseId: string, moduleId: string) {
    if (!templateDetail) return;
    if (!confirm("Delete this stage?")) return;

    try {
      await deleteTemplateModule(moduleId);
      setTemplateDetail({
        ...templateDetail,
        phases: templateDetail.phases.map(p =>
          p.id === phaseId
            ? { ...p, modules: p.modules.filter(m => m.id !== moduleId) }
            : p
        )
      });
      setHasChanges(true);
    } catch (error) {
      console.error("Error deleting stage:", error);
    }
  }

  // Drag and drop
  function handleDragStart(e: React.DragEvent, phaseId: string, moduleId: string, index: number) {
    setDraggedStage({ phaseId, moduleId, index });
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, phaseId: string, index: number) {
    e.preventDefault();
    if (draggedStage && draggedStage.phaseId === phaseId) {
      setDragOverStage({ phaseId, index });
    }
  }

  function handleDragLeave() {
    setDragOverStage(null);
  }

  async function handleDrop(e: React.DragEvent, phaseId: string, dropIndex: number) {
    e.preventDefault();
    if (!templateDetail || !draggedStage || draggedStage.phaseId !== phaseId) {
      setDraggedStage(null);
      setDragOverStage(null);
      return;
    }

    const phase = templateDetail.phases.find(p => p.id === phaseId);
    if (!phase) return;

    const newModules = [...phase.modules];
    const [movedModule] = newModules.splice(draggedStage.index, 1);
    const insertIndex = dropIndex > draggedStage.index ? dropIndex - 1 : dropIndex;
    newModules.splice(insertIndex, 0, movedModule);

    try {
      await reorderTemplateModules(phaseId, newModules.map(m => m.id));
      setTemplateDetail({
        ...templateDetail,
        phases: templateDetail.phases.map(p =>
          p.id === phaseId
            ? { ...p, modules: newModules.map((m, i) => ({ ...m, order: i })) }
            : p
        )
      });
      setHasChanges(true);
    } catch (error) {
      console.error("Error reordering:", error);
    }

    setDraggedStage(null);
    setDragOverStage(null);
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
              <CardTitle>Project Templates</CardTitle>
              <CardDescription>
                Templates define the default phases and stages for new projects.
              </CardDescription>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No templates available</p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map(template => (
                <TemplateListItem
                  key={template.id}
                  template={template}
                  isSelected={selectedTemplate === template.id}
                  onSelect={() => handleTemplateSelect(template.id)}
                  onDelete={!template.isSystem ? () => handleDelete(template.id) : undefined}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Template Detail / Edit Panel */}
      {templateDetail && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="space-y-3">
                    <Input
                      value={templateDetail.template.name}
                      onChange={(e) => updateTemplateInfo("name", e.target.value)}
                      className="text-lg font-semibold h-auto py-1"
                      placeholder="Template name"
                    />
                    <Input
                      value={templateDetail.template.description || ""}
                      onChange={(e) => updateTemplateInfo("description", e.target.value)}
                      className="text-sm text-muted-foreground"
                      placeholder="Description (optional)"
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <CardTitle>{templateDetail.template.name}</CardTitle>
                      {templateDetail.template.isSystem && (
                        <Badge variant="outline" className="text-xs">System</Badge>
                      )}
                    </div>
                    {templateDetail.template.description && (
                      <CardDescription>{templateDetail.template.description}</CardDescription>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    {templateDetail.template.isSystem && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowRevertDialog(true)}
                        disabled={!hasChanges}
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Revert
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges}>
                      {saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleStartEdit}>
                    <Edit className="mr-2 h-4 w-4" />
                    Customize
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {isEditing ? (
              // Edit Mode
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Drag stages to reorder. Click edit icon to rename.
                  </p>
                  <Button variant="outline" size="sm" onClick={handleAddPhase}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Phase
                  </Button>
                </div>

                {templateDetail.phases.map((phase) => (
                  <div key={phase.id} className="border rounded-lg overflow-hidden">
                    {/* Phase Header */}
                    <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b">
                      <button onClick={() => togglePhase(phase.id)} className="p-1 hover:bg-accent rounded">
                        {expandedPhases.has(phase.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>

                      {editingPhaseName === phase.id ? (
                        <Input
                          value={phase.name}
                          onChange={(e) => setTemplateDetail({
                            ...templateDetail,
                            phases: templateDetail.phases.map(p => p.id === phase.id ? { ...p, name: e.target.value } : p)
                          })}
                          onBlur={() => handleUpdatePhaseName(phase.id, phase.name)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdatePhaseName(phase.id, phase.name);
                            if (e.key === "Escape") setEditingPhaseName(null);
                          }}
                          className="h-8 flex-1 max-w-xs"
                          autoFocus
                        />
                      ) : (
                        <button onClick={() => setEditingPhaseName(phase.id)} className="flex-1 text-left font-medium hover:text-brand">
                          {phase.name}
                        </button>
                      )}

                      <Badge variant="secondary">{phase.modules.length} stages</Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeletePhase(phase.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Phase Content */}
                    {expandedPhases.has(phase.id) && (
                      <div className="p-4 space-y-2">
                        {phase.modules.length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground">
                            <p className="text-sm">No stages yet</p>
                            <Button variant="outline" size="sm" className="mt-2" onClick={() => handleAddStage(phase.id)}>
                              <Plus className="mr-2 h-4 w-4" />
                              Add Stage
                            </Button>
                          </div>
                        ) : (
                          <>
                            {phase.modules.map((module, index) => (
                              <div key={module.id}>
                                {dragOverStage?.phaseId === phase.id && dragOverStage?.index === index && (
                                  <div className="h-1 bg-brand rounded mb-2" />
                                )}

                                <div
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, phase.id, module.id, index)}
                                  onDragOver={(e) => handleDragOver(e, phase.id, index)}
                                  onDragLeave={handleDragLeave}
                                  onDrop={(e) => handleDrop(e, phase.id, index)}
                                  onDragEnd={() => { setDraggedStage(null); setDragOverStage(null); }}
                                  className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-lg border bg-background hover:border-brand/50 transition-colors",
                                    draggedStage?.moduleId === module.id && "opacity-50",
                                    editingStage === module.id && "ring-2 ring-brand"
                                  )}
                                >
                                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                                  <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>

                                  {editingStage === module.id ? (
                                    <>
                                      <Input
                                        value={module.customName || ""}
                                        onChange={(e) => setTemplateDetail({
                                          ...templateDetail,
                                          phases: templateDetail.phases.map(p =>
                                            p.id === phase.id
                                              ? { ...p, modules: p.modules.map(m => m.id === module.id ? { ...m, customName: e.target.value } : m) }
                                              : p
                                          )
                                        })}
                                        className="h-8 flex-1"
                                        placeholder="Stage name"
                                        autoFocus
                                      />
                                      <Select
                                        value={module.moduleTypeId}
                                        onValueChange={(value) => setTemplateDetail({
                                          ...templateDetail,
                                          phases: templateDetail.phases.map(p =>
                                            p.id === phase.id
                                              ? {
                                                ...p, modules: p.modules.map(m =>
                                                  m.id === module.id
                                                    ? { ...m, moduleTypeId: value, moduleType: defaultStageTypes.find(mt => mt.code === value) || m.moduleType }
                                                    : m
                                                )
                                              }
                                              : p
                                          )
                                        })}
                                      >
                                        <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          {defaultStageTypes.map(type => (
                                            <SelectItem key={type.code} value={type.code}>{type.defaultName}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleUpdateStage(phase.id, module.id, { customName: module.customName || undefined, moduleTypeId: module.moduleTypeId })}>
                                        <Check className="h-4 w-4 text-green-600" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingStage(null)}>
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <span className="flex-1 text-sm">{module.customName || module.moduleType.defaultName}</span>
                                      <Badge variant="outline" className="text-xs">{module.moduleType.defaultName}</Badge>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingStage(module.id)}>
                                        <Edit2 className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteStage(phase.id, module.id)}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}

                            <div
                              onDragOver={(e) => handleDragOver(e, phase.id, phase.modules.length)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, phase.id, phase.modules.length)}
                              className={cn(
                                "h-8 rounded border-2 border-dashed border-transparent",
                                dragOverStage?.phaseId === phase.id && dragOverStage?.index === phase.modules.length && "border-brand bg-brand/5"
                              )}
                            />

                            <Button variant="outline" size="sm" className="w-full" onClick={() => handleAddStage(phase.id)}>
                              <Plus className="mr-2 h-4 w-4" />
                              Add Stage
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              // Preview Mode
              <TemplatePreview phases={templateDetail.phases} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Template Dialog */}
      <CreateTemplateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        orgId={orgId}
        onCreated={async (id) => {
          await loadTemplates();
          setSelectedTemplate(id);
          await loadTemplateDetail(id);
          setIsEditing(true);
        }}
      />

      {/* Revert Dialog */}
      <AlertDialog open={showRevertDialog} onOpenChange={setShowRevertDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert to Default?</AlertDialogTitle>
            <AlertDialogDescription>
              This will discard your changes and restore the original template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevert}>Revert</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// =============================================================================
// Template List Item
// =============================================================================

interface TemplateListItemProps {
  template: ProjectTemplate;
  isSelected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}

function TemplateListItem({ template, isSelected, onSelect, onDelete }: TemplateListItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
        isSelected ? "border-brand bg-brand/5" : "border-border hover:bg-accent/50"
      )}
      onClick={onSelect}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium truncate">{template.name}</h4>
          {template.isDefault && (
            <Badge variant="secondary" className="text-xs">
              <Star className="mr-1 h-3 w-3" />
              Default
            </Badge>
          )}
          {template.isSystem && <Badge variant="outline" className="text-xs">System</Badge>}
        </div>
        {template.description && (
          <p className="text-sm text-muted-foreground truncate mt-0.5">{template.description}</p>
        )}
      </div>

      <div className="flex items-center gap-1">
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        {isSelected ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </div>
    </div>
  );
}

// =============================================================================
// Template Preview
// =============================================================================

function TemplatePreview({ phases }: { phases: PhaseWithModules[] }) {
  return (
    <div className="space-y-4">
      {phases.map(phase => (
        <div key={phase.id} className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-4 py-2 border-b">
            <h5 className="font-medium">{phase.name}</h5>
          </div>
          <div className="p-2">
            {phase.modules.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No stages defined</p>
            ) : (
              <div className="grid gap-1">
                {phase.modules.map((module, idx) => (
                  <div key={module.id} className="flex items-center gap-3 px-3 py-2 rounded-md bg-accent/30 text-sm">
                    <span className="text-muted-foreground w-6">{idx + 1}.</span>
                    <span className="flex-1">{module.customName || module.moduleType.defaultName}</span>
                    <Badge variant="outline" className="text-xs">{module.moduleType.defaultName}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Create Template Dialog
// =============================================================================

function CreateTemplateDialog({ open, onOpenChange, onCreated, orgId }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: (id: string) => void; orgId?: string }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (!orgId) {
      console.error("No organization ID available");
      return;
    }

    setIsSubmitting(true);
    try {
      const template = await createTemplate(orgId, {
        name: name.trim(),
        description: description.trim() || undefined,
        phases: [
          { name: "Design", order: 0, modules: [] },
          { name: "Build", order: 1, modules: [] },
          { name: "Certification", order: 2, modules: [] },
        ],
      });
      setName("");
      setDescription("");
      onOpenChange(false);
      onCreated(template.id);
    } catch (error) {
      console.error("Error creating template:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Template</DialogTitle>
          <DialogDescription>Create a custom template with your own phases and stages.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Template Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Commercial Fit-out" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe when this template should be used..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!name.trim() || isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Template
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
