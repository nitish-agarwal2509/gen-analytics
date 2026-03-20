import { useEffect, useRef, type KeyboardEvent } from "react";
import { SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSubmit: (question: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSubmit, disabled }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Ctrl/Cmd+K to focus input
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSubmit = () => {
    const value = textareaRef.current?.value.trim();
    if (!value || disabled) return;
    onSubmit(value);
    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-border bg-background p-4">
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Ask a question about your data..."
            rows={1}
            disabled={disabled}
            onKeyDown={handleKeyDown}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
          />
          <kbd className="pointer-events-none absolute right-2 top-2 hidden select-none rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline-block">
            {navigator.platform?.includes("Mac") ? "⌘" : "Ctrl"}K
          </kbd>
        </div>
        <Button size="icon" onClick={handleSubmit} disabled={disabled}>
          <SendHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
