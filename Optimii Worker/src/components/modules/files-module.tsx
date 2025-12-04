"use client";

import { useState } from "react";
import { Upload, FileText, Download, Trash2, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ModuleHeader, ModuleEmptyState } from "@/components/projects/module-tabs";

interface FilesModuleProps {
  moduleId: string;
  moduleName: string;
}

// Mock file data - will be replaced with actual data from actions
const mockFiles = [
  { id: "1", name: "Floor Plans v2.pdf", type: "application/pdf", size: 2400000, uploadedAt: new Date("2024-02-15") },
  { id: "2", name: "Site Survey.dwg", type: "application/acad", size: 5600000, uploadedAt: new Date("2024-02-10") },
  { id: "3", name: "Material Schedule.xlsx", type: "application/vnd.ms-excel", size: 156000, uploadedAt: new Date("2024-02-08") },
];

export function FilesModule({ moduleId, moduleName }: FilesModuleProps) {
  const [files] = useState(mockFiles);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  if (files.length === 0) {
    return (
      <>
        <ModuleHeader 
          title={moduleName}
          description="Upload and organize project files and documents"
          actions={
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Upload Files
            </Button>
          }
        />
        <ModuleEmptyState
          icon={FolderOpen}
          title="No files uploaded"
          description="Upload project documents, plans, and other files to keep everything organized."
          action={
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Upload Files
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <ModuleHeader 
        title={moduleName}
        description="Upload and organize project files and documents"
        actions={
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Upload Files
          </Button>
        }
      />
      
      <div className="space-y-2">
        {files.map((file) => (
          <Card key={file.id} className="group">
            <CardContent className="flex items-center gap-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(file.size)} • Uploaded {formatDate(file.uploadedAt)}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}




