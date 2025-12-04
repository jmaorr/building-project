import { notFound } from "next/navigation";
import { getProject, getProjectPhases } from "@/lib/actions/projects";
import { PhaseSubNav } from "@/components/projects/phase-sub-nav";

interface PhaseLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string; phaseSlug: string }>;
}

// Map slugs to phase names
const slugToPhaseName: Record<string, string> = {
  design: "Design",
  build: "Build",
  certification: "Certification",
};

export default async function PhaseLayout({ children, params }: PhaseLayoutProps) {
  const { id, phaseSlug } = await params;
  const [project, phases] = await Promise.all([
    getProject(id),
    getProjectPhases(id),
  ]);
  
  if (!project) {
    notFound();
  }

  const phaseName = slugToPhaseName[phaseSlug];
  const phase = phases.find((p) => p.name === phaseName);
  
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
