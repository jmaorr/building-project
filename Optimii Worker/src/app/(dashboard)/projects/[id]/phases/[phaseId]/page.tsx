import { redirect } from "next/navigation";
import { getProject, getProjectPhases, getPhase } from "@/lib/actions/projects";

interface PhasePageProps {
  params: Promise<{ id: string; phaseId: string }>;
}

// Map phase names to slugs
const phaseSlugs: Record<string, string> = {
  Design: "design",
  Build: "build",
  Certification: "certification",
};

export default async function PhasePage({ params }: PhasePageProps) {
  const { id, phaseId } = await params;
  
  const [project, phase] = await Promise.all([
    getProject(id),
    getPhase(phaseId),
  ]);
  
  if (!project || !phase) {
    redirect(`/projects/${id}`);
  }

  // Redirect to the new slug-based route
  const slug = phaseSlugs[phase.name] || phase.name.toLowerCase();
  redirect(`/projects/${id}/${slug}`);
}
