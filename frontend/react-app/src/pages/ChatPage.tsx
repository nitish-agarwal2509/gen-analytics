import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { ChatHistory } from "@/components/chat/ChatHistory";
import { ChatInput } from "@/components/chat/ChatInput";
import { useQueryStream } from "@/hooks/useQueryStream";
import type { Message, VizConfig } from "@/types/api";

const EXAMPLE_QUESTIONS = [
  "What was the total payout amount last month?",
  "How many successful payouts in the last 7 days?",
  "Show payouts by status for the last 30 days",
  "Show daily payout count for the last 2 weeks",
  "Top 10 reward events by count last month",
];

export interface ChatPageHandle {
  submitQuestion: (question: string) => void;
  clearSession: () => void;
}

interface ChatPageProps {
  messages?: Message[];
  onMessagesChange?: (messages: Message[]) => void;
  onSaveQuery?: (input: {
    name: string;
    description?: string;
    question: string;
    sql: string;
    viz_config?: VizConfig;
  }) => Promise<unknown>;
}

export const ChatPage = forwardRef<ChatPageHandle, ChatPageProps>(
  function ChatPage({ messages: externalMessages, onMessagesChange, onSaveQuery }, ref) {
    const [internalMessages, setInternalMessages] = useState<Message[]>([]);
    const messages = externalMessages ?? internalMessages;
    const setMessages = onMessagesChange ?? setInternalMessages;

    const { state, submitQuery, reset, clearSession, loadSessionHistory } = useQueryStream();

    // Restore chat history from session on mount
    useEffect(() => {
      loadSessionHistory().then((restored) => {
        if (restored.length > 0) {
          setMessages(restored);
        }
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // When query completes, push into messages
    useEffect(() => {
      if (state.status === "done" || state.status === "error") {
        setMessages([
          ...messages,
          {
            id: state.queryId ?? crypto.randomUUID(),
            role: "assistant",
            content: state.explanation ?? state.error ?? "",
            queryState: { ...state },
            timestamp: Date.now(),
          },
        ]);
        reset();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.status]);

    const handleSubmit = useCallback(
      (question: string) => {
        const userMsg: Message = {
          id: crypto.randomUUID(),
          role: "user",
          content: question,
          timestamp: Date.now(),
        };
        setMessages([...messages, userMsg]);
        submitQuery(question);
      },
      [messages, setMessages, submitQuery],
    );

    useImperativeHandle(ref, () => ({ submitQuestion: handleSubmit, clearSession }), [
      handleSubmit, clearSession,
    ]);

    const isProcessing =
      state.status === "submitting" || state.status === "streaming";

    return (
      <div className="flex h-full flex-col">
        {messages.length === 0 && state.status === "idle" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
            <div className="text-center">
              <h2 className="text-xl font-semibold">
                What would you like to know?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ask any question about your data, or try one of these examples:
              </p>
            </div>
            <div className="flex max-w-2xl flex-wrap justify-center gap-2">
              {EXAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  className="rounded-full border border-border px-4 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                  onClick={() => handleSubmit(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ChatHistory
            messages={messages}
            activeQuery={state}
            onSaveQuery={onSaveQuery}
          />
        )}

        <ChatInput onSubmit={handleSubmit} disabled={isProcessing} />
      </div>
    );
  },
);
