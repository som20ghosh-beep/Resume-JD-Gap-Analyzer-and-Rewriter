"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import type { Suggestion } from "@/lib/types";
import { useReviewStore } from "@/store/review-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { DiffView } from "@/components/suggestions/diff-view";

const ACTION_LABEL: Record<Suggestion["action"], string> = {
  REPHRASE: "Rephrase",
  CONFIRM: "Confirm",
  GAP: "Gap",
};

export function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  const updateSuggestion = useReviewStore((s) => s.updateSuggestion);
  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState(suggestion.proposedText ?? "");

  const isApproved = suggestion.status === "APPROVED";
  const isRejected = suggestion.status === "REJECTED";
  const canApprove = suggestion.action === "REPHRASE" || Boolean(suggestion.userInput?.trim());

  const approve = () => {
    if (isEditing) {
      updateSuggestion(suggestion.id, { proposedText: draftText, status: "APPROVED" });
      setIsEditing(false);
    } else {
      updateSuggestion(suggestion.id, { status: "APPROVED" });
    }
  };

  const reject = () => updateSuggestion(suggestion.id, { status: "REJECTED" });

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="flex flex-row items-start justify-between gap-3 px-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{suggestion.requirementText}</p>
          <p className="text-xs text-muted-foreground">{suggestion.rationale}</p>
        </div>
        <Badge variant={suggestion.action === "REPHRASE" ? "default" : "secondary"} className="shrink-0">
          {ACTION_LABEL[suggestion.action]}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-3 px-4">
        {suggestion.action === "REPHRASE" &&
          (isEditing ? (
            <Textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              aria-label={`Edit proposed text for "${suggestion.requirementText}"`}
              rows={3}
              className="text-sm"
              autoFocus
            />
          ) : (
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <DiffView before={suggestion.currentText ?? ""} after={suggestion.proposedText ?? ""} />
            </div>
          ))}

        {suggestion.action === "CONFIRM" && (
          <div className="space-y-1.5">
            <label htmlFor={`confirm-${suggestion.id}`} className="text-xs font-medium text-foreground">
              Describe your experience (required to approve)
            </label>
            <Textarea
              id={`confirm-${suggestion.id}`}
              value={suggestion.userInput ?? ""}
              onChange={(e) => updateSuggestion(suggestion.id, { userInput: e.target.value })}
              placeholder="e.g. Built and operated a Node.js API for 2 years at my last role."
              rows={2}
              className="text-sm"
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isApproved ? "default" : "outline"}
            disabled={!canApprove}
            onClick={approve}
            aria-pressed={isApproved}
          >
            <Check /> {isEditing ? "Save & approve" : "Approve"}
          </Button>
          <Button
            size="sm"
            variant={isRejected ? "destructive" : "outline"}
            onClick={reject}
            aria-pressed={isRejected}
          >
            <X /> Reject
          </Button>
          {suggestion.action === "REPHRASE" && !isEditing && (
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
              <Pencil /> Edit
            </Button>
          )}
          {isEditing && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsEditing(false);
                setDraftText(suggestion.proposedText ?? "");
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
