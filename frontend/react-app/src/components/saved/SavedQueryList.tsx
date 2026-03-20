import { Bookmark, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SavedQuery } from "@/types/api";

interface SavedQueryListProps {
  queries: SavedQuery[];
  onSelect: (question: string) => void;
  onDelete: (id: string) => void;
}

export function SavedQueryList({
  queries,
  onSelect,
  onDelete,
}: SavedQueryListProps) {
  if (queries.length === 0) return null;

  return (
    <div className="space-y-1">
      {queries.map((q) => (
        <div
          key={q.id}
          className="group flex items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent cursor-pointer"
          onClick={() => onSelect(q.question)}
        >
          <Bookmark className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="flex-1 line-clamp-2">{q.name}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(q.id);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
