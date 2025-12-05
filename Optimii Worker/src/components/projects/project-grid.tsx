"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteProject } from "@/lib/actions/projects";
import type { Project } from "@/lib/db/schema";
import { ProjectCard } from "./project-card";

type ProjectListItem = {
  project: Project;
  progress?: number;
  currentPhase?: string;
};

interface ProjectGridProps {
  items: ProjectListItem[];
}

export function ProjectGrid({ items }: ProjectGridProps) {
  const router = useRouter();
  const [projects, setProjects] = useState(items);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string) => {
    if (isPending) return;
    const confirmed = window.confirm("Delete this project and all of its data? This cannot be undone.");
    if (!confirmed) return;

    setPendingId(id);
    startTransition(async () => {
      try {
        const success = await deleteProject(id);
        if (success) {
          setProjects((prev) => prev.filter((item) => item.project.id !== id));
          router.refresh();
        } else {
          alert("Failed to delete project. Please try again.");
        }
      } catch (error) {
        console.error("Error deleting project:", error);
        alert("Something went wrong while deleting the project.");
      } finally {
        setPendingId(null);
      }
    });
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map(({ project, progress = 0, currentPhase }) => (
        <ProjectCard
          key={project.id}
          project={project}
          progress={progress}
          currentPhase={currentPhase}
          onDelete={handleDelete}
          isDeleting={isPending && pendingId === project.id}
        />
      ))}
    </div>
  );
}
