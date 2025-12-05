import { redirect } from "next/navigation";
import { getProject, getPhase } from "@/lib/actions/projects";
import { createPhaseSlug } from "@/lib/utils/slug";

interface PhasePageProps {
  params: Promise<{ id: string; phaseId: string }>;
}

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
  const slug = createPhaseSlug(phase);
  redirect(`/projects/${id}/${slug}`);
}
