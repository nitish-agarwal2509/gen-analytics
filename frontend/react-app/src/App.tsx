import { useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { ChatPage, type ChatPageHandle } from "@/pages/ChatPage";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useTheme } from "@/hooks/useTheme";
import { useSavedQueries } from "@/hooks/useSavedQueries";
import type { Message } from "@/types/api";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppInner() {
  const { theme, toggleTheme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const { savedQueries, saveQuery, deleteQuery } = useSavedQueries();
  const chatPageRef = useRef<ChatPageHandle>(null);

  const handleClearSession = () => {
    setMessages([]);
  };

  const handleSelectSavedQuery = (question: string) => {
    chatPageRef.current?.submitQuestion(question);
  };

  return (
    <TooltipProvider>
      <AppLayout
        header={<Header theme={theme} onToggleTheme={toggleTheme} />}
        sidebar={
          <Sidebar
            messages={messages}
            savedQueries={savedQueries}
            onClearSession={handleClearSession}
            onSelectSavedQuery={handleSelectSavedQuery}
            onDeleteSavedQuery={deleteQuery}
          />
        }
      >
        <ChatPage
          ref={chatPageRef}
          messages={messages}
          onMessagesChange={setMessages}
          onSaveQuery={saveQuery}
        />
      </AppLayout>
    </TooltipProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppInner />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
