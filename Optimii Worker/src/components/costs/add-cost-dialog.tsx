"use client";

import { useState, useEffect } from "react";
import { DollarSign, User, Building, Lock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createCost, updateCost, type CostWithFiles } from "@/lib/actions/costs";
import { COST_CATEGORIES } from "@/lib/constants/costs";
import type { Stage, Contact } from "@/lib/db/schema";

interface AddCostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  phaseId: string;
  stages?: Stage[];
  contacts?: Contact[];
  defaultStageId?: string;
  stageName?: string; // For auto-populating the name field
  currentUserId?: string;
  cost?: CostWithFiles | null; // For edit mode
  onCostCreated?: () => void;
  onCostUpdated?: () => void;
}

export function AddCostDialog({
  open,
  onOpenChange,
  projectId,
  phaseId,
  stages = [],
  contacts = [],
  defaultStageId,
  stageName,
  currentUserId,
  cost,
  onCostCreated,
  onCostUpdated,
}: AddCostDialogProps) {
  const isEditMode = !!cost;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(stageName || "");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [quotedAmount, setQuotedAmount] = useState("");
  const [actualAmount, setActualAmount] = useState("");
  const [stageId, setStageId] = useState(defaultStageId || "none");
  const [vendorType, setVendorType] = useState<"contact" | "manual">("manual");
  const [vendorContactId, setVendorContactId] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [notes, setNotes] = useState("");
  
  // Expanded sections
  const [showCategory, setShowCategory] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  // Load cost data when in edit mode
  useEffect(() => {
    if (open) {
      if (cost) {
        // Edit mode - populate with existing cost data
        setName(cost.name || "");
        setDescription(cost.description || "");
        setCategory(cost.category || "");
        setQuotedAmount(cost.quotedAmount?.toString() || "");
        setActualAmount(cost.actualAmount?.toString() || "");
        setStageId(cost.stageId || "none");
        setVendorType(cost.vendorContactId ? "contact" : "manual");
        setVendorContactId(cost.vendorContactId || "");
        setVendorName(cost.vendorName || "");
        setNotes(cost.notes || "");
        setShowCategory(!!cost.category);
        setShowNotes(!!cost.notes);
      } else {
        // Create mode - reset form
        resetForm();
      }
    }
  }, [open, cost]);

  // Reset form when dialog opens with stage name
  const resetForm = () => {
    setName(stageName || "");
    setDescription("");
    setCategory("");
    setQuotedAmount("");
    setActualAmount("");
    setStageId(defaultStageId || "none");
    setVendorType("manual");
    setVendorContactId("");
    setVendorName("");
    setNotes("");
    setShowCategory(false);
    setShowNotes(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Client-side validation
    if (!name.trim()) {
      alert("Name is required. Please enter a name for this cost.");
      return;
    }

    if (!projectId) {
      alert("Project ID is missing. Please refresh the page and try again.");
      return;
    }

    setIsSubmitting(true);
    
    const costData = {
      name: name.trim(),
      description: description.trim() || undefined,
      category: showCategory ? (category || undefined) : undefined,
      quotedAmount: quotedAmount ? parseFloat(quotedAmount) : undefined,
      actualAmount: actualAmount ? parseFloat(actualAmount) : undefined,
      vendorContactId: vendorType === "contact" && vendorContactId ? vendorContactId : undefined,
      vendorName: vendorType === "manual" && vendorName ? vendorName.trim() : undefined,
      notes: showNotes ? (notes.trim() || undefined) : undefined,
    };
    
    try {
      if (isEditMode && cost) {
        // Update existing cost
        console.log("Updating cost with data:", costData);
        const result = await updateCost(cost.id, costData);
        console.log("Update cost result:", result);
        
        if (result) {
          resetForm();
          onOpenChange(false);
          onCostUpdated?.();
        } else {
          alert("Failed to update cost. Please check the console for details.");
        }
      } else {
        // Create new cost
        const createData = {
          ...costData,
          projectId,
          phaseId,
          stageId: stageId !== "none" ? stageId : undefined,
          createdBy: currentUserId,
        };
        console.log("Creating cost with data:", createData);
        const result = await createCost(createData);
        console.log("Create cost result:", result);

        // If we get here, the cost was created successfully
        resetForm();
        onOpenChange(false);
        onCostCreated?.();
      }
    } catch (error) {
      console.error(`Failed to ${isEditMode ? "update" : "create"} cost:`, error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Full error:", error);
      alert(`Failed to ${isEditMode ? "update" : "create"} cost: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: string) => {
    const num = value.replace(/[^0-9.]/g, "");
    return num;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Cost" : "Add Cost"}</DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? "Update cost details, amounts, and payment information."
              : "Add a new cost item to track quotes, actuals, and payments."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Electrical Work, Permit Fees"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details about this cost..."
              rows={2}
            />
          </div>

          {/* Stage selector - only show when not adding from a specific stage */}
          {!defaultStageId && stages.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="stage">Link to Stage</Label>
              <Select value={stageId} onValueChange={setStageId}>
                <SelectTrigger>
                  <SelectValue placeholder="No stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No stage (General cost)</SelectItem>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Category - hidden by default */}
          {showCategory ? (
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {COST_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCategory(true)}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          )}

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quotedAmount">Quoted Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="quotedAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={quotedAmount}
                  onChange={(e) => setQuotedAmount(formatCurrency(e.target.value))}
                  placeholder="0.00"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="actualAmount">Actual Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="actualAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={actualAmount}
                  onChange={(e) => setActualAmount(formatCurrency(e.target.value))}
                  placeholder="0.00"
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Vendor */}
          <div className="space-y-3">
            <Label>Vendor / Payee</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={vendorType === "manual" ? "default" : "outline"}
                size="sm"
                onClick={() => setVendorType("manual")}
              >
                <Building className="mr-2 h-4 w-4" />
                Enter Name
              </Button>
              <Button
                type="button"
                variant={vendorType === "contact" ? "default" : "outline"}
                size="sm"
                onClick={() => setVendorType("contact")}
              >
                <User className="mr-2 h-4 w-4" />
                Select Contact
              </Button>
            </div>

            {vendorType === "manual" ? (
              <Input
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="Enter vendor name"
              />
            ) : (
              <Select value={vendorContactId} onValueChange={setVendorContactId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a contact" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name || contact.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Notes - hidden by default */}
          {showNotes ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="notes" className="flex items-center gap-1.5">
                  Internal Notes
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Only you will see these notes</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
              </div>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes about this cost..."
                rows={2}
              />
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowNotes(true)}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Internal Notes
            </Button>
          )}

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting 
                ? (isEditMode ? "Updating..." : "Adding...") 
                : (isEditMode ? "Update Cost" : "Add Cost")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

