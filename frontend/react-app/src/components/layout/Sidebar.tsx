import { MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { SavedQueryList } from "@/components/saved/SavedQueryList";
import type { Message, SavedQuery } from "@/types/api";

interface SidebarProps {
  messages: Message[];
  savedQueries: SavedQuery[];
  onClearSession: () => void;
  onSelectSavedQuery: (question: string) => void;
  onDeleteSavedQuery: (id: string) => void;
}

export function Sidebar({
  messages,
  savedQueries,
  onClearSession,
  onSelectSavedQuery,
  onDeleteSavedQuery,
}: SidebarProps) {
  const userQuestions = messages.filter((m) => m.role === "user");

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="px-4 py-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Session History
        </h2>
      </div>
      <Separator />
      <ScrollArea className="flex-1 px-2 py-2">
        {userQuestions.length === 0 ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">
            No queries yet. Ask a question to get started.
          </p>
        ) : (
          <div className="space-y-1">
            {userQuestions.map((q, i) => (
              <div
                key={q.id}
                className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent"
              >
                <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="line-clamp-2">
                  {i + 1}. {q.content}
                </span>
              </div>
            ))}
          </div>
        )}

        {savedQueries.length > 0 && (
          <>
            <Separator className="my-3" />
            <h2 className="px-2 text-sm font-medium text-muted-foreground mb-1">
              Saved Queries
            </h2>
            <SavedQueryList
              queries={savedQueries}
              onSelect={onSelectSavedQuery}
              onDelete={onDeleteSavedQuery}
            />
          </>
        )}
      </ScrollArea>
      <Separator />
      <div className="p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={onClearSession}
        >
          <Trash2 className="h-4 w-4" />
          Clear Session
        </Button>
      </div>
    </aside>
  );
}
