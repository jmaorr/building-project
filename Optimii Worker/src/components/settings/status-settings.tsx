"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, GripVertical, Trash2, RotateCcw, Edit2, Check, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  getStatusConfigs,
  createStatusConfig,
  updateStatusConfig,
  deleteStatusConfig,
  reorderStatusConfigs,
  copySystemConfigsToOrg,
  resetOrgConfigsToDefaults,
} from "@/lib/actions/status-configs";
import type { StatusConfig } from "@/lib/db/schema";
import { useOrganization } from "@/components/providers";

const COLORS = [
  { value: "gray", label: "Gray", className: "bg-gray-500/10 text-gray-600" },
  { value: "blue", label: "Blue", className: "bg-blue-500/10 text-blue-600" },
  { value: "green", label: "Green", className: "bg-green-500/10 text-green-600" },
  { value: "amber", label: "Amber", className: "bg-amber-500/10 text-amber-600" },
  { value: "red", label: "Red", className: "bg-red-500/10 text-red-600" },
  { value: "purple", label: "Purple", className: "bg-purple-500/10 text-purple-600" },
  { value: "pink", label: "Pink", className: "bg-pink-500/10 text-pink-600" },
  { value: "indigo", label: "Indigo", className: "bg-indigo-500/10 text-indigo-600" },
];

interface StatusSettingsProps {
  orgId?: string;
  projectId?: string;
  projectName?: string;
}

export function StatusSettings({ orgId, projectId, projectName }: StatusSettingsProps) {
  const { id: activeOrgId } = useOrganization();
  const [configs, setConfigs] = useState<StatusConfig[]>([]);
  const [entityType, setEntityType] = useState<"stage" | "project" | "phase">("stage");
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [hasCustomConfigs, setHasCustomConfigs] = useState(false);
  
  // New status form state
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("gray");
  const [newIsDefault, setNewIsDefault] = useState(false);
  const [newIsFinal, setNewIsFinal] = useState(false);
  const [newTriggersApproval, setNewTriggersApproval] = useState(false);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadConfigs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getStatusConfigs({ entityType, projectId, orgId: orgId || activeOrgId });
      setConfigs(data);
      // Check if we have custom configs (org or project level)
      setHasCustomConfigs(data.some(c => c.orgId !== null || c.projectId !== null));
    } catch (error) {
      console.error("Failed to load status configs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [activeOrgId, entityType, projectId, orgId]);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = configs.findIndex(c => c.id === active.id);
      const newIndex = configs.findIndex(c => c.id === over.id);
      
      const newConfigs = arrayMove(configs, oldIndex, newIndex);
      setConfigs(newConfigs);
      
      await reorderStatusConfigs(newConfigs.map(c => c.id));
    }
  };

  const handleAdd = async () => {
    if (!newCode.trim() || !newLabel.trim()) return;
    
    // If using system configs, copy them to org first
    if (!hasCustomConfigs) {
      await copySystemConfigsToOrg(orgId || activeOrgId, entityType);
    }
    
    const result = await createStatusConfig({
      orgId: projectId ? undefined : (orgId || activeOrgId),
      projectId,
      entityType,
      code: newCode.toLowerCase().replace(/\s+/g, "_"),
      label: newLabel,
      color: newColor,
      isDefault: newIsDefault,
      isFinal: newIsFinal,
      triggersApproval: newTriggersApproval,
    });
    
    if (result) {
      loadConfigs();
      resetNewForm();
      setIsAddDialogOpen(false);
    }
  };

  const handleUpdate = async (id: string, data: Partial<StatusConfig>) => {
    await updateStatusConfig(id, data);
    loadConfigs();
    setEditingId(null);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteStatusConfig(deleteId);
      loadConfigs();
      setDeleteId(null);
    }
  };

  const handleReset = async () => {
    await resetOrgConfigsToDefaults(orgId || activeOrgId, entityType);
    loadConfigs();
    setShowResetConfirm(false);
  };

  const handleCustomize = async () => {
    await copySystemConfigsToOrg(orgId || activeOrgId, entityType);
    loadConfigs();
  };

  const resetNewForm = () => {
    setNewCode("");
    setNewLabel("");
    setNewColor("gray");
    setNewIsDefault(false);
    setNewIsFinal(false);
    setNewTriggersApproval(false);
  };

  const getColorClass = (color: string) => {
    const colorDef = COLORS.find(c => c.value === color);
    return colorDef?.className || COLORS[0].className;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            {projectId ? `${projectName} Statuses` : "Status Configuration"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {projectId 
              ? "Customize statuses for this project"
              : "Configure default statuses for your organization"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={entityType} onValueChange={(v) => setEntityType(v as typeof entityType)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stage">Stages</SelectItem>
              <SelectItem value="project">Projects</SelectItem>
              <SelectItem value="phase">Phases</SelectItem>
            </SelectContent>
          </Select>
          {hasCustomConfigs && (
            <Button variant="outline" size="sm" onClick={() => setShowResetConfirm(true)}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          )}
          <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Status
          </Button>
        </div>
      </div>

      {/* Customization Banner */}
      {!hasCustomConfigs && !isLoading && (
        <div className="flex items-center gap-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <AlertCircle className="h-5 w-5 text-blue-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-600">Using System Defaults</p>
            <p className="text-xs text-blue-600/80">
              Click &quot;Customize&quot; to create your own status configuration
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={handleCustomize}>
            Customize
          </Button>
        </div>
      )}

      {/* Status List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading...
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {entityType === "stage" ? "Stage" : entityType === "project" ? "Project" : "Phase"} Statuses
            </CardTitle>
            <CardDescription>
              Drag to reorder. The first status marked as default will be used for new items.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={configs.map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {configs.map((config) => (
                    <SortableStatusItem
                      key={config.id}
                      config={config}
                      isEditing={editingId === config.id}
                      colors={COLORS}
                      getColorClass={getColorClass}
                      onEdit={() => setEditingId(config.id)}
                      onSave={(data) => handleUpdate(config.id, data)}
                      onCancel={() => setEditingId(null)}
                      onDelete={() => setDeleteId(config.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            
            {configs.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                No statuses configured. Add one to get started.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Status Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Status</DialogTitle>
            <DialogDescription>
              Create a custom status for {entityType === "stage" ? "stages" : entityType === "project" ? "projects" : "phases"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Label</Label>
                <Input
                  placeholder="e.g., Under Review"
                  value={newLabel}
                  onChange={(e) => {
                    setNewLabel(e.target.value);
                    if (!newCode) {
                      setNewCode(e.target.value.toLowerCase().replace(/\s+/g, "_"));
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  placeholder="e.g., under_review"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Select value={newColor} onValueChange={setNewColor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLORS.map(color => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${color.className.replace(/\/10/g, "")}`} />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Default Status</Label>
                  <p className="text-xs text-muted-foreground">Applied to new items</p>
                </div>
                <Switch checked={newIsDefault} onCheckedChange={setNewIsDefault} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Final Status</Label>
                  <p className="text-xs text-muted-foreground">Marks item as complete</p>
                </div>
                <Switch checked={newIsFinal} onCheckedChange={setNewIsFinal} />
              </div>
              {entityType === "stage" && (
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Triggers Approval</Label>
                    <p className="text-xs text-muted-foreground">Requires approval to set</p>
                  </div>
                  <Switch checked={newTriggersApproval} onCheckedChange={setNewTriggersApproval} />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!newCode.trim() || !newLabel.trim()}>
              Add Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Status</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this status? Items currently using this status will need to be updated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to Defaults</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all your custom statuses and revert to the system defaults. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>
              Reset to Defaults
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// =============================================================================
// Sortable Status Item
// =============================================================================

function SortableStatusItem({
  config,
  isEditing,
  colors,
  getColorClass,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: {
  config: StatusConfig;
  isEditing: boolean;
  colors: typeof COLORS;
  getColorClass: (color: string) => string;
  onEdit: () => void;
  onSave: (data: Partial<StatusConfig>) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [editLabel, setEditLabel] = useState(config.label);
  const [editColor, setEditColor] = useState(config.color);
  const [editIsDefault, setEditIsDefault] = useState(config.isDefault);
  const [editIsFinal, setEditIsFinal] = useState(config.isFinal);
  const [editTriggersApproval, setEditTriggersApproval] = useState(config.triggersApproval);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: config.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = () => {
    onSave({
      label: editLabel,
      color: editColor,
      isDefault: editIsDefault,
      isFinal: editIsFinal,
      triggersApproval: editTriggersApproval,
    });
  };

  useEffect(() => {
    if (isEditing) {
      setEditLabel(config.label);
      setEditColor(config.color);
      setEditIsDefault(config.isDefault);
      setEditIsFinal(config.isFinal);
      setEditTriggersApproval(config.triggersApproval);
    }
  }, [isEditing, config]);

  if (isEditing) {
    return (
      <div className="p-4 rounded-lg border-2 border-brand bg-brand/5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Label</Label>
            <Input
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Color</Label>
            <Select value={editColor} onValueChange={setEditColor}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {colors.map(color => (
                  <SelectItem key={color.value} value={color.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${color.className.replace(/\/10/g, "")}`} />
                      {color.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-xs">
            <Switch checked={editIsDefault} onCheckedChange={setEditIsDefault} />
            Default
          </label>
          <label className="flex items-center gap-2 text-xs">
            <Switch checked={editIsFinal} onCheckedChange={setEditIsFinal} />
            Final
          </label>
          {config.entityType === "stage" && (
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={editTriggersApproval} onCheckedChange={setEditTriggersApproval} />
              Triggers Approval
            </label>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Check className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:border-muted-foreground/30 transition-colors"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      
      <Badge className={getColorClass(config.color)}>
        {config.label}
      </Badge>
      
      <span className="text-xs text-muted-foreground font-mono">
        {config.code}
      </span>
      
      <div className="flex-1 flex items-center gap-2">
        {config.isDefault && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            Default
          </Badge>
        )}
        {config.isFinal && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            Final
          </Badge>
        )}
        {config.triggersApproval && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            Approval
          </Badge>
        )}
        {config.isSystem && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            System
          </Badge>
        )}
      </div>
      
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
        {!config.isSystem && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-destructive hover:text-destructive" 
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

