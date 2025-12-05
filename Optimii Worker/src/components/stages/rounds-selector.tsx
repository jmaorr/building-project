"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import type { Stage } from "@/lib/db/schema";
import { startNewRound } from "@/lib/actions/projects";

interface RoundsSelectorProps {
  stage: Stage;
  currentRound: number;
  onRoundChange: (round: number) => void;
  onNewRound: () => void;
}

export function RoundsSelector({
  stage,
  currentRound,
  onRoundChange,
  onNewRound,
}: RoundsSelectorProps) {
  if (!stage.allowsRounds) {
    return null;
  }

  const rounds = Array.from({ length: stage.currentRound }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-between mb-4 pb-4 border-b">
      <Tabs value={currentRound.toString()} onValueChange={(v) => onRoundChange(Number(v))}>
        <TabsList>
          {rounds.map((round) => (
            <TabsTrigger key={round} value={round.toString()}>
              Round {round}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          const result = await startNewRound(stage.id);
          if (result) {
            onNewRound();
          }
        }}
      >
        <Plus className="mr-2 h-4 w-4" />
        Start New Round
      </Button>
    </div>
  );
}

