"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Upload, X, FileText, Trash2, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FilePreview } from "@/components/files";
import { getCostFiles, detachFileFromCost } from "@/lib/actions/costs";
import type { File as FileType } from "@/lib/db/schema";

interface CostFilesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  costId: string;
  projectId: string;
  costName: string;
  onFilesUpdated?: () => void;
}

export function CostFilesDialog({
  open,
  onOpenChange,
  costId,
  projectId,
  costName,
  onFilesUpdated,
}: CostFilesDialogProps) {
  const [files, setFiles] = useState<FileType[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileType | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load files when dialog opens
  const loadFiles = useCallback(async () => {
    if (!costId) return;
    setLoading(true);
    try {
      const costFiles = await getCostFiles(costId);
      setFiles(costFiles);
    } catch (error) {
      console.error("Failed to load files:", error);
    } finally {
      setLoading(false);
    }
  }, [costId]);

  useEffect(() => {
    if (open && costId) {
      loadFiles();
    }
  }, [open, costId, loadFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setSelectedFiles([...selectedFiles, ...selected]);
  };

  const handleRemoveSelected = (index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("projectId", projectId);
        formData.append("costId", costId);
        formData.append("roundNumber", "1"); // Costs don't use rounds, but API expects this

        const response = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        });

        // Read response body once
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to upload file");
        }

        console.log("File uploaded successfully:", result);
      }
      setSelectedFiles([]);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      // Reload files list
      await loadFiles();
      // Notify parent component
      onFilesUpdated?.();
    } catch (error) {
      console.error("Failed to upload files:", error);
      alert(`Failed to upload files: ${error instanceof Error ? error.message : "Please try again."}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm("Are you sure you want to remove this file from this cost?")) return;
    
    try {
      await detachFileFromCost(fileId);
      await loadFiles();
      onFilesUpdated?.();
    } catch (error) {
      console.error("Failed to remove file:", error);
      alert("Failed to remove file. Please try again.");
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Files for {costName}</DialogTitle>
            <DialogDescription>
              Upload quotes, invoices, receipts, and other documents related to this cost.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* File Upload Section */}
            <div className="space-y-2">
              <Input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                Select Files
              </Button>
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Selected files:</p>
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm truncate flex-1">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRemoveSelected(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Existing Files */}
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading files...</div>
            ) : files.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                No files attached yet. Upload files to get started.
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium">Attached files ({files.length}):</p>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                            {file.type && ` • ${file.type}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setPreviewFile(file)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => window.open(file.url, "_blank")}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteFile(file.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {selectedFiles.length > 0 && (
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? "Uploading..." : `Upload ${selectedFiles.length} file${selectedFiles.length > 1 ? "s" : ""}`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Preview */}
      {previewFile && (
        <FilePreview
          file={previewFile}
          open={!!previewFile}
          onOpenChange={(open) => !open && setPreviewFile(null)}
        />
      )}
    </>
  );
}

