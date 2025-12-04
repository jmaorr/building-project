import { notFound } from "next/navigation";
import { getProject, getProjectPhases } from "@/lib/actions/projects";
import { ProjectHeader } from "@/components/projects/project-header";

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { id } = await params;
  const [project, phases] = await Promise.all([
    getProject(id),
    getProjectPhases(id),
  ]);
  
  if (!project) {
    notFound();
  }

  return (
    <div className="min-h-full -m-4 lg:-m-6">
      {/* Unified Project Header with Tabs */}
      <ProjectHeader project={project} phases={phases} />
      
      {/* Content area */}
      <div className="p-4 lg:p-6">
        {children}
      </div>
    </div>
  );
}
