import { notFound } from "next/navigation";
import { getProject, getProjectPhases } from "@/lib/actions/projects";
import { PhaseSubNav } from "@/components/projects/phase-sub-nav";
import { resolvePhaseFromSlug } from "@/lib/utils/slug";

interface PhaseLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string; phaseSlug: string }>;
}

export default async function PhaseLayout({ children, params }: PhaseLayoutProps) {
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

  return (
    <div className="-m-4 lg:-m-6">
      {/* Sub-navigation for phase sections */}
      <PhaseSubNav projectId={id} phaseSlug={phaseSlug} />
      
      {/* Phase content */}
      <div className="p-4 lg:p-6">
        {children}
      </div>
    </div>
  );
}
