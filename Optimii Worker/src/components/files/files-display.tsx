"use client";

import { useState, useMemo } from "react";
import { 
  Search, 
  Grid3x3, 
  List, 
  Table as TableIcon,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  Download,
  Eye,
  Trash2,
  Filter,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { FilePreview, getFileType, FileThumbnail } from "./file-preview";
import type { File as FileType } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { SkeletonWrapper } from "@/components/ui/skeleton-wrapper";
import { TableSkeleton, CardSkeleton, ListSkeleton } from "@/components/ui/skeletons";

export type ViewMode = "grid" | "list" | "table";
export type SortOption = "name" | "date" | "type" | "stage";

export interface FilesDisplayProps {
  files: Array<FileType & { stageName?: string }>;
  stages?: Array<{ id: string; name: string }>;
  loading?: boolean;
  showSearch?: boolean;
  showFilters?: boolean;
  showSort?: boolean;
  showViewToggle?: boolean;
  showUploadButton?: boolean;
  showDeleteButton?: boolean;
  defaultViewMode?: ViewMode;
  defaultSort?: SortOption;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  emptyStateAction?: React.ReactNode;
  onFileClick?: (file: FileType) => void;
  onFilePreview?: (file: FileType) => void;
  onFileDelete?: (fileId: string) => void;
  onUploadClick?: () => void;
  className?: string;
}

export function FilesDisplay({
  files,
  stages = [],
  loading = false,
  showSearch = true,
  showFilters = true,
  showSort = true,
  showViewToggle = true,
  showDeleteButton = false,
  defaultViewMode = "table",
  defaultSort = "date",
  emptyStateTitle = "No files",
  emptyStateDescription = "Upload files to get started.",
  emptyStateAction,
  onFileClick,
  onFilePreview,
  onFileDelete,
  onUploadClick,
  className,
}: FilesDisplayProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>(defaultSort);
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [previewFile, setPreviewFile] = useState<FileType | null>(null);

  // Filter and sort files
  const filteredFiles = useMemo(() => {
    let result = [...files];

    // Apply search
    if (searchQuery) {
      result = result.filter((file) =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply stage filter
    if (filterStage !== "all") {
      result = result.filter((file) => file.stageId === filterStage);
    }

    // Apply type filter
    if (filterType !== "all") {
      result = result.filter((file) => {
        const fileType = getFileType(file.name);
        return fileType === filterType;
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "date":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "type":
          return getFileType(a.name).localeCompare(getFileType(b.name));
        case "stage":
          return (a.stageName || "").localeCompare(b.stageName || "");
        default:
          return 0;
      }
    });

    return result;
  }, [files, searchQuery, sortBy, filterStage, filterType]);

  const handleFileAction = (file: FileType, action: "preview" | "download" | "delete") => {
    switch (action) {
      case "preview":
        if (onFilePreview) {
          onFilePreview(file);
        } else {
          setPreviewFile(file);
        }
        break;
      case "download":
        window.open(file.url, "_blank");
        break;
      case "delete":
        if (onFileDelete) {
          onFileDelete(file.id);
        }
        break;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const getFileIcon = (fileName: string) => {
    const type = getFileType(fileName);
    switch (type) {
      case "image":
        return <ImageIcon className="h-5 w-5" />;
      case "pdf":
        return <FileText className="h-5 w-5" />;
      default:
        return <FileIcon className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <SkeletonWrapper 
        isLoading={true} 
        skeleton={
          viewMode === "table" ? (
            <TableSkeleton count={5} />
          ) : viewMode === "grid" ? (
            <CardSkeleton count={6} />
          ) : (
            <ListSkeleton count={5} />
          )
        }
        className={className}
      >
        <div />
      </SkeletonWrapper>
    );
  }

  if (files.length === 0 && !searchQuery && filterStage === "all" && filterType === "all") {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileIcon className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <h3 className="font-medium text-sm mb-1">{emptyStateTitle}</h3>
          <p className="text-xs text-muted-foreground text-center max-w-sm mb-4">
            {emptyStateDescription}
          </p>
          {emptyStateAction}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        {showSearch && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {/* Filters */}
        {showFilters && stages.length > 0 && (
          <Select value={filterStage} onValueChange={setFilterStage}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {stages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  {stage.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {showFilters && (
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="pdf">PDFs</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Sort */}
        {showSort && (
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Sort by date</SelectItem>
              <SelectItem value="name">Sort by name</SelectItem>
              <SelectItem value="type">Sort by type</SelectItem>
              {stages.length > 0 && <SelectItem value="stage">Sort by stage</SelectItem>}
            </SelectContent>
          </Select>
        )}

        {/* View Toggle */}
        {showViewToggle && (
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="h-8 w-8 p-0"
            >
              <TableIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="h-8 w-8 p-0"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-8 w-8 p-0"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Results count */}
      {(searchQuery || filterStage !== "all" || filterType !== "all") && (
        <div className="text-sm text-muted-foreground">
          Found {filteredFiles.length} {filteredFiles.length === 1 ? "file" : "files"}
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
      )}

      {/* Files Display */}
      {filteredFiles.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileIcon className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No files match your filters</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Table View */}
          {viewMode === "table" && (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-left text-sm text-muted-foreground">
                      <th className="py-3 px-4 font-medium">Name</th>
                      {stages.length > 0 && <th className="py-3 px-4 font-medium">Stage</th>}
                      <th className="py-3 px-4 font-medium">Size</th>
                      <th className="py-3 px-4 font-medium">Uploaded</th>
                      <th className="py-3 px-4 font-medium w-[100px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFiles.map((file) => (
                      <tr key={file.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <FileThumbnail
                              file={file}
                              className="w-10 h-10 shrink-0"
                              onClick={() => onFileClick ? onFileClick(file) : handleFileAction(file, "preview")}
                            />
                            <div className="min-w-0">
                              <button
                                onClick={() => onFileClick ? onFileClick(file) : handleFileAction(file, "preview")}
                                className="font-medium text-sm hover:text-brand truncate block max-w-full text-left"
                              >
                                {file.name}
                              </button>
                              {file.category && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  {file.category}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>
                        {stages.length > 0 && (
                          <td className="py-3 px-4 text-sm text-muted-foreground">
                            {file.stageName || "—"}
                          </td>
                        )}
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {formatFileSize(file.size)}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {formatDate(file.createdAt)}
                        </td>
                        <td className="py-3 px-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleFileAction(file, "preview")}>
                                <Eye className="h-4 w-4 mr-2" />
                                Preview
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleFileAction(file, "download")}>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </DropdownMenuItem>
                              {showDeleteButton && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleFileAction(file, "delete")}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Grid View */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredFiles.map((file) => (
                <Card
                  key={file.id}
                  className="group hover:border-brand/50 transition-colors cursor-pointer"
                  onClick={() => onFileClick ? onFileClick(file) : handleFileAction(file, "preview")}
                >
                  <CardContent className="p-4">
                    <FileThumbnail
                      file={file}
                      className="w-full mb-3"
                      onClick={() => onFileClick ? onFileClick(file) : handleFileAction(file, "preview")}
                    />
                    <p className="text-sm font-medium truncate mb-1">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    {file.stageName && (
                      <Badge variant="outline" className="text-xs mt-2">
                        {file.stageName}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* List View */}
          {viewMode === "list" && (
            <div className="space-y-2">
              {filteredFiles.map((file) => (
                <Card key={file.id} className="hover:border-brand/50 transition-colors">
                  <CardContent className="flex items-center gap-4 py-3 px-4">
                    <FileThumbnail
                      file={file}
                      className="w-12 h-12 shrink-0"
                      onClick={() => onFileClick ? onFileClick(file) : handleFileAction(file, "preview")}
                    />
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => onFileClick ? onFileClick(file) : handleFileAction(file, "preview")}
                        className="font-medium text-sm hover:text-brand truncate block max-w-full text-left"
                      >
                        {file.name}
                      </button>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)} • {formatDate(file.createdAt)}
                        {file.stageName && ` • ${file.stageName}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFileAction(file, "preview");
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFileAction(file, "download");
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {showDeleteButton && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFileAction(file, "delete");
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* File Preview Dialog */}
      {previewFile && (
        <FilePreview
          file={previewFile}
          open={!!previewFile}
          onOpenChange={(open) => !open && setPreviewFile(null)}
        />
      )}
    </div>
  );
}
