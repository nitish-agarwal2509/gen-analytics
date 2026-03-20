import { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import type { Message, QueryState, VizConfig } from "@/types/api";

interface ChatHistoryProps {
  messages: Message[];
  activeQuery?: QueryState;
  onSaveQuery?: (input: {
    name: string;
    description?: string;
    question: string;
    sql: string;
    viz_config?: VizConfig;
  }) => Promise<unknown>;
}

export function ChatHistory({
  messages,
  activeQuery,
  onSaveQuery,
}: ChatHistoryProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeQuery?.steps.length, activeQuery?.explanation]);

  // Find the user question preceding each assistant message
  const getUserQuestion = (index: number): string | undefined => {
    for (let i = index - 1; i >= 0; i--) {
      if (messages[i].role === "user") return messages[i].content;
    }
    return undefined;
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {messages.map((msg, i) => (
          <ChatMessage
            key={msg.id}
            role={msg.role}
            content={msg.content}
            queryState={msg.queryState}
            userQuestion={msg.role === "assistant" ? getUserQuestion(i) : undefined}
            onSaveQuery={msg.role === "assistant" ? onSaveQuery : undefined}
          />
        ))}

        {activeQuery && activeQuery.status !== "idle" && (
          <ChatMessage
            role="assistant"
            queryState={activeQuery}
            isStreaming={
              activeQuery.status === "submitting" ||
              activeQuery.status === "streaming"
            }
          />
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
