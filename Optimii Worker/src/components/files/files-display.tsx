"use client";

import { useState, useMemo } from "react";
import { FileText, Download, Search, Filter, Grid, List, ArrowUpDown, Eye, Trash2, FolderOpen, Upload, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilePreview, FileThumbnail, getFileType } from "@/components/files";
import type { File as FileType } from "@/lib/db/schema";

export type ViewMode = "table" | "grid" | "list";
export type SortOption = "name" | "date" | "size" | "stage";

export interface FilesDisplayProps {
  files: (FileType & { stageName?: string })[];
  stages?: Array<{ id: string; name: string }>;
  loading?: boolean;
  // Display options
  showSearch?: boolean;
  showFilters?: boolean;
  showSort?: boolean;
  showViewToggle?: boolean;
  showUploadButton?: boolean;
  showDeleteButton?: boolean;
  defaultViewMode?: ViewMode;
  defaultSort?: SortOption;
  // Callbacks
  onFilePreview?: (file: FileType) => void;
  onFileDownload?: (file: FileType) => void;
  onFileDelete?: (fileId: string) => void;
  onUploadClick?: () => void;
  // Customization
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  emptyStateAction?: React.ReactNode;
  // Additional columns/fields for table view
  tableColumns?: Array<{
    key: string;
    label: string;
    render: (file: FileType & { stageName?: string }) => React.ReactNode;
  }>;
}

export function FilesDisplay({
  files,
  stages = [],
  loading = false,
  showSearch = true,
  showFilters = true,
  showSort = true,
  showViewToggle = true,
  showUploadButton = false,
  showDeleteButton = true,
  defaultViewMode = "table",
  defaultSort = "date",
  onFilePreview,
  onFileDownload,
  onFileDelete,
  onUploadClick,
  emptyStateTitle = "No files yet",
  emptyStateDescription = "Files uploaded will appear here.",
  emptyStateAction,
  tableColumns,
}: FilesDisplayProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [sortBy, setSortBy] = useState<SortOption>(defaultSort);
  const [previewFile, setPreviewFile] = useState<FileType | null>(null);

  // Filter and sort files
  const filteredAndSortedFiles = useMemo(() => {
    let filtered = files;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (file) =>
          file.name.toLowerCase().includes(query) ||
          file.stageName?.toLowerCase().includes(query)
      );
    }

    // Filter by stage
    if (selectedStage) {
      filtered = filtered.filter((file) => file.stageId === selectedStage);
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "size":
          return (b.size || 0) - (a.size || 0);
        case "stage":
          return (a.stageName || "").localeCompare(b.stageName || "");
        case "date":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return sorted;
  }, [files, searchQuery, selectedStage, sortBy]);

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const handlePreview = (file: FileType) => {
    setPreviewFile(file);
    onFilePreview?.(file);
  };

  const handleDownload = (file: FileType) => {
    window.open(file.url, "_blank");
    onFileDownload?.(file);
  };

  const handleDelete = (fileId: string) => {
    if (confirm("Are you sure you want to delete this file?")) {
      onFileDelete?.(fileId);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded w-48" />
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-4 bg-muted animate-pulse rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Controls */}
        {(showSearch || showFilters || showSort || showViewToggle || showUploadButton) && (
          <div className="flex flex-col sm:flex-row gap-3">
            {showSearch && (
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search files..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            )}
            {showFilters && stages.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="shrink-0">
                    <Filter className="mr-2 h-4 w-4" />
                    {selectedStage
                      ? stages.find((s) => s.id === selectedStage)?.name || "Filter"
                      : "All Stages"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter by Stage</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSelectedStage(null)}>
                    All Stages
                  </DropdownMenuItem>
                  {stages.map((stage) => (
                    <DropdownMenuItem
                      key={stage.id}
                      onClick={() => setSelectedStage(stage.id)}
                    >
                      {stage.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {showSort && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="shrink-0">
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    Sort:{" "}
                    {sortBy === "name"
                      ? "Name"
                      : sortBy === "size"
                        ? "Size"
                        : sortBy === "stage"
                          ? "Stage"
                          : "Date"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSortBy("date")}>
                    Date
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("name")}>
                    Name
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("size")}>
                    Size
                  </DropdownMenuItem>
                  {stages.length > 0 && (
                    <DropdownMenuItem onClick={() => setSortBy("stage")}>
                      Stage
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {showViewToggle && (
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  title="Card view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  title="Table view"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  title="Grid view"
                >
                  <Grid className="h-4 w-4" />
                </Button>
              </div>
            )}
            {showUploadButton && onUploadClick && (
              <Button onClick={onUploadClick} className="shrink-0">
                <Upload className="mr-2 h-4 w-4" />
                Upload Files
              </Button>
            )}
          </div>
        )}

        {/* Files Display */}
        {filteredAndSortedFiles.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium mb-1">
                {files.length === 0 ? emptyStateTitle : "No files match your filters"}
              </h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                {files.length === 0
                  ? emptyStateDescription
                  : "Try adjusting your search or filters."}
              </p>
              {emptyStateAction && <div className="mt-4">{emptyStateAction}</div>}
            </CardContent>
          </Card>
        ) : viewMode === "table" ? (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium text-sm">Name</th>
                  {stages.length > 0 && (
                    <th className="text-left p-4 font-medium text-sm">Stage</th>
                  )}
                  <th className="text-right p-4 font-medium text-sm">Size</th>
                  <th className="text-left p-4 font-medium text-sm">Uploaded</th>
                  {tableColumns?.map((col) => (
                    <th key={col.key} className="text-left p-4 font-medium text-sm">
                      {col.label}
                    </th>
                  ))}
                  <th className="text-right p-4 font-medium text-sm w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedFiles.map((file) => (
                  <tr
                    key={file.id}
                    className="border-b hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                        <span className="font-medium">{file.name}</span>
                      </div>
                    </td>
                    {stages.length > 0 && (
                      <td className="p-4">
                        {file.stageName ? (
                          <Badge variant="secondary">{file.stageName}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    )}
                    <td className="p-4 text-right text-sm text-muted-foreground">
                      {formatFileSize(file.size)}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {formatDate(file.createdAt)}
                    </td>
                    {tableColumns?.map((col) => (
                      <td key={col.key} className="p-4">
                        {col.render(file)}
                      </td>
                    ))}
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handlePreview(file)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDownload(file)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {showDeleteButton && onFileDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDelete(file.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredAndSortedFiles.map((file) => (
              <div key={file.id} className="group relative">
                <FileThumbnail
                  file={file}
                  className="w-full"
                  onClick={() => handlePreview(file)}
                />
                <div className="mt-1.5">
                  <p className="text-xs font-medium truncate">{file.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                {showDeleteButton && onFileDelete && (
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-6 w-6 shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(file.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          // List view
          <div className="space-y-2">
            {filteredAndSortedFiles.map((file) => {
              const fileType = getFileType(file.type, file.name);
              return (
                <Card
                  key={file.id}
                  className="group hover:border-brand/50 transition-colors cursor-pointer"
                  onClick={() => handlePreview(file)}
                >
                  <CardContent className="flex items-center gap-4 py-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-muted shrink-0 overflow-hidden">
                      {fileType === "image" ? (
                        <img
                          src={file.url}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : fileType === "pdf" ? (
                        <FileText className="h-5 w-5 text-red-500" />
                      ) : (
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(file.size)} • {formatDate(file.createdAt)}
                      </p>
                    </div>
                    {file.stageName && (
                      <Badge variant="secondary">{file.stageName}</Badge>
                    )}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview(file);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(file);
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {showDeleteButton && onFileDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(file.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

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


