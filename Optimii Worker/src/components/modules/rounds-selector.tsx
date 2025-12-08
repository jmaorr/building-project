"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, Trash2 } from "lucide-react";
import type { Stage } from "@/lib/db/schema";
import { deleteRound } from "@/lib/actions/projects";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface RoundsSelectorProps {
  stage: Stage;
  currentRound: number;
  onRoundChange: (round: number) => void;
  onNewRound: () => void;
  onRoundDeleted?: () => void;
}

export function RoundsSelector({
  stage,
  currentRound,
  onRoundChange,
  onNewRound,
  onRoundDeleted,
}: RoundsSelectorProps) {
  const [deletingRound, setDeletingRound] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!stage.allowsRounds) {
    return null;
  }

  // Use stage.currentRound as the source of truth for how many rounds exist
  // currentRound is just which round is currently selected
  const maxRounds = stage.currentRound;
  const rounds = Array.from({ length: maxRounds }, (_, i) => i + 1);

  const handleDeleteRound = async (roundNumber: number) => {
    setIsDeleting(true);
    try {
      const result = await deleteRound(stage.id, roundNumber);
      if (result.success) {
        setDeletingRound(null);
        // If we deleted the current round, switch to round 1
        if (roundNumber === currentRound) {
          onRoundChange(1);
        } else if (roundNumber < currentRound) {
          // If we deleted a round before the current one, stay on current round (it's now one less)
          onRoundChange(currentRound - 1);
        }
        onRoundDeleted?.();
      } else {
        alert(result.error || "Failed to delete round");
      }
    } catch (error) {
      console.error("Failed to delete round:", error);
      alert("Failed to delete round. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4 pb-4 border-b">
        <Tabs 
          key={`rounds-${stage.id}-${maxRounds}`}
          value={currentRound.toString()} 
          onValueChange={(v) => {
            const roundNum = Number(v);
            if (!isNaN(roundNum) && roundNum >= 1 && roundNum <= maxRounds) {
              onRoundChange(roundNum);
            }
          }}
        >
          <TabsList>
            {rounds.map((round) => (
              <TabsTrigger 
                key={`round-${stage.id}-${round}`} 
                value={round.toString()}
                className="relative group"
              >
                <span className="flex items-center gap-2">
                  Round {round}
                  {round > 1 ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity -mr-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                          }}
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingRound(round);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Round {round}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <span className="h-4 w-4 -mr-1" aria-hidden="true" />
                  )}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // Let the parent component handle round creation to avoid duplicate calls
            onNewRound();
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Start New Round
        </Button>
      </div>

      <AlertDialog open={deletingRound !== null} onOpenChange={(open) => !open && setDeletingRound(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Round {deletingRound}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete Round {deletingRound} and all files and comments associated with it.
              {deletingRound === currentRound && " You will be switched to Round 1."}
              {deletingRound === 1 && " This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingRound !== null && handleDeleteRound(deletingRound)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

