"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { FilesDisplay } from "@/components/files";
import { getFilesByPhase } from "@/lib/actions/files";
import { getProjectPhases, getPhaseStages } from "@/lib/actions/projects";
import { resolvePhaseFromSlug } from "@/lib/utils/slug";
import type { File as FileType, Stage } from "@/lib/db/schema";

export default function FilesPage() {
  const params = useParams();
  const id = params.id as string;
  const phaseSlug = params.phaseSlug as string;

  const [files, setFiles] = useState<(FileType & { stageName?: string })[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const phases = await getProjectPhases(id);
        const phase = resolvePhaseFromSlug(phases, phaseSlug);
        
        if (!phase) return;

        const [phaseFiles, phaseStages] = await Promise.all([
          getFilesByPhase(phase.id),
          getPhaseStages(phase.id),
        ]);

        // Add stage names to files
        const filesWithStageNames = phaseFiles.map(file => ({
          ...file,
          stageName: file.stageId 
            ? phaseStages.find(s => s.id === file.stageId)?.name 
            : undefined,
        }));

        setFiles(filesWithStageNames);
        setStages(phaseStages);
      } catch (error) {
        console.error("Failed to load files:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, phaseSlug]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Files</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          All documents uploaded across stages in this phase
        </p>
      </div>

      {/* Files Display Component */}
      <FilesDisplay
        files={files}
        stages={stages.map(s => ({ id: s.id, name: s.name }))}
        loading={loading}
        showSearch={true}
        showFilters={true}
        showSort={true}
        showViewToggle={true}
        showDeleteButton={false}
        defaultViewMode="table"
        defaultSort="date"
        emptyStateTitle="No files yet"
        emptyStateDescription="Files uploaded to any stage in this phase will appear here."
      />
    </div>
  );
}
