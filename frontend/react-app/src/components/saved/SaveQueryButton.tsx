import { useState } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { VizConfig } from "@/types/api";

interface SaveQueryButtonProps {
  question: string;
  sql: string;
  vizConfig?: VizConfig | null;
  onSave: (input: {
    name: string;
    description?: string;
    question: string;
    sql: string;
    viz_config?: VizConfig;
  }) => Promise<unknown>;
}

export function SaveQueryButton({
  question,
  sql,
  vizConfig,
  onSave,
}: SaveQueryButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        question,
        sql,
        viz_config: vizConfig ?? undefined,
      });
      setOpen(false);
      setName("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-xs text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Bookmark className="h-3.5 w-3.5" />
        Save
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Query</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Give this query a name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!name.trim() || saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
