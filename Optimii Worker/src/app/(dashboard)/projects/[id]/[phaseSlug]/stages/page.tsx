import { notFound } from "next/navigation";
import Link from "next/link";
import { getProject, getProjectPhases, getPhaseStages } from "@/lib/actions/projects";
import { PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/projects/status-badge";
import { resolvePhaseFromSlug } from "@/lib/utils/slug";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { ChevronRight, FileText } from "lucide-react";

interface StagesPageProps {
  params: Promise<{ id: string; phaseSlug: string }>;
}

export default async function StagesPage({ params }: StagesPageProps) {
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${phase.name} Stages`}
        description={`Manage and track all stages in the ${phase.name.toLowerCase()} phase.`}
      />

      {stages.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              No stages created yet
            </p>
            <p className="text-xs text-muted-foreground">
              Stages will be automatically created based on your project template.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {stages.map((stage) => (
            <AccordionItem key={stage.id} value={stage.id} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-4 flex-1 pr-4">
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium">{stage.name}</h3>
                      <StatusBadge status={stage.status} type="stage" />
                    </div>
                    {stage.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {stage.description}
                      </p>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-4 pb-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {stage.moduleType.defaultName} module
                      {stage.allowsRounds && ` • Round ${stage.currentRound}`}
                      {stage.requiresApproval && " • Approval required"}
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/projects/${id}/${phaseSlug}/stages/${stage.id}`}>
                        View Details
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}

