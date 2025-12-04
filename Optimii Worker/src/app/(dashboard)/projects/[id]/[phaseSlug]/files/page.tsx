import { notFound } from "next/navigation";
import { getProject, getProjectPhases, getPhaseStages } from "@/lib/actions/projects";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Download, Search, Upload, Filter, FolderOpen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { resolvePhaseFromSlug } from "@/lib/utils/slug";

interface MasterFilesPageProps {
  params: Promise<{ id: string; phaseSlug: string }>;
}

export default async function MasterFilesPage({ params }: MasterFilesPageProps) {
  const { id, phaseSlug } = await params;
  const [project, phases] = await Promise.all([
    getProject(id),
    getProjectPhases(id),
  ]);
  
  if (!project) {
    notFound();
  }

  const phase = resolvePhaseFromSlug(phases, phaseSlug);
  
  if (!phase) {
    notFound();
  }

  const stages = await getPhaseStages(phase.id);

  // TODO: Aggregate files from all stages
  const allFiles: Array<{
    id: string;
    name: string;
    stageName: string;
    roundNumber: number;
    size: number;
    type: string;
    uploadedBy: string;
    uploadedAt: Date;
  }> = [];

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Files</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            All documents uploaded across {phase.name.toLowerCase()} stages
          </p>
        </div>
        <Button size="sm">
          <Upload className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Upload File</span>
          <span className="sm:hidden">Upload</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search files..." className="pl-9" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="shrink-0">
              <Filter className="mr-2 h-4 w-4" />
              All Stages
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Filter by Stage</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>All Stages</DropdownMenuItem>
            {stages.map((stage) => (
              <DropdownMenuItem key={stage.id}>{stage.name}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {allFiles.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-1">No files yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Files uploaded to any stage in this phase will appear here.
            </p>
            <Button className="mt-4">
              <Upload className="mr-2 h-4 w-4" />
              Upload First File
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {allFiles.map((file) => (
            <Card key={file.id} className="group hover:border-brand/50 transition-colors">
              <CardContent className="flex items-center gap-3 sm:gap-4 py-3 px-4">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-muted shrink-0">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {file.stageName}
                    </Badge>
                    {file.roundNumber > 1 && (
                      <span>Round {file.roundNumber}</span>
                    )}
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline">{formatFileSize(file.size)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Download className="h-4 w-4" />
                    <span className="sr-only">Download</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
