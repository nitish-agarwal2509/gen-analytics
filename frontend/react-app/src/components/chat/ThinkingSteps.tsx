import { CheckCircle2, Loader2 } from "lucide-react";
import type { ThinkingStep } from "@/types/api";

interface ThinkingStepsProps {
  steps: ThinkingStep[];
  isActive: boolean;
}

export function ThinkingSteps({ steps, isActive }: ThinkingStepsProps) {
  if (steps.length === 0) return null;

  return (
    <div className="space-y-1 text-sm">
      {steps.map((step, i) => {
        const isCurrent = isActive && i === steps.length - 1;
        return (
          <div
            key={step.step}
            className="flex items-center gap-2 text-muted-foreground"
          >
            {isCurrent ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            )}
            <span>
              Step {step.step}: {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
