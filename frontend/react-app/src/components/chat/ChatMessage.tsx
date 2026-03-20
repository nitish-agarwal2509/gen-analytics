import { User, Bot } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card } from "@/components/ui/card";
import { ThinkingSteps } from "./ThinkingSteps";
import { StreamingIndicator } from "./StreamingIndicator";
import { SqlViewer } from "@/components/results/SqlViewer";
import { ResultTable } from "@/components/results/ResultTable";
import { ChartRenderer } from "@/components/results/ChartRenderer";
import { SaveQueryButton } from "@/components/saved/SaveQueryButton";
import type { QueryState, VizConfig } from "@/types/api";

interface UserMessageProps {
  content: string;
}

function UserMessage({ content }: UserMessageProps) {
  return (
    <div className="flex items-start gap-3 justify-end">
      <Card className="max-w-[70%] bg-primary px-4 py-2.5 text-primary-foreground">
        <p className="text-sm">{content}</p>
      </Card>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <User className="h-4 w-4" />
      </div>
    </div>
  );
}

interface AssistantMessageProps {
  queryState: QueryState;
  isStreaming?: boolean;
  userQuestion?: string;
  onSaveQuery?: (input: {
    name: string;
    description?: string;
    question: string;
    sql: string;
    viz_config?: VizConfig;
  }) => Promise<unknown>;
}

function AssistantMessage({
  queryState,
  isStreaming,
  userQuestion,
  onSaveQuery,
}: AssistantMessageProps) {
  const { status, steps, sql, validation, results, visualization, explanation, error, elapsedSeconds, toolCalls } =
    queryState;

  const showStreamingIndicator =
    isStreaming && steps.length === 0 && !sql && !explanation;

  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 max-w-[85%] space-y-3">
        {showStreamingIndicator && <StreamingIndicator />}

        {steps.length > 0 && (
          <ThinkingSteps steps={steps} isActive={isStreaming ?? false} />
        )}

        {sql && <SqlViewer sql={sql} validation={validation} defaultCollapsed />}

        {visualization && results?.columns && visualization.chart_type !== "table" && (
          <ChartRenderer vizConfig={visualization} results={results} />
        )}

        {results?.columns && (!visualization || visualization.chart_type !== "metric_card") && (
          <ResultTable
            columns={results.columns}
            rows={results.rows}
            totalRows={results.total_rows}
            bytesProcessed={results.bytes_processed}
          />
        )}

        {results?.error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Query execution failed: {results.error}
          </div>
        )}

        {error && status === "error" && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {explanation && (
          <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed [&_table]:text-xs [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:bg-muted/50 [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_table]:overflow-x-auto [&_table]:block">
            <Markdown remarkPlugins={[remarkGfm]}>{explanation}</Markdown>
          </div>
        )}

        {!isStreaming && elapsedSeconds != null && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>{elapsedSeconds}s</span>
            {validation?.estimated_bytes != null && (
              <span>Scan: {formatBytes(validation.estimated_bytes)}</span>
            )}
            {validation?.estimated_cost_usd != null && (
              <span>Cost: ${validation.estimated_cost_usd.toFixed(6)}</span>
            )}
            {toolCalls.length > 0 && (
              <span>Tools: {toolCalls.join(" → ")}</span>
            )}
            {onSaveQuery && sql && userQuestion && (
              <SaveQueryButton
                question={userQuestion}
                sql={sql}
                vizConfig={visualization}
                onSave={onSaveQuery}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function formatBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}

// ---- Public component ----

interface ChatMessageProps {
  role: "user" | "assistant";
  content?: string;
  queryState?: QueryState;
  isStreaming?: boolean;
  userQuestion?: string;
  onSaveQuery?: (input: {
    name: string;
    description?: string;
    question: string;
    sql: string;
    viz_config?: VizConfig;
  }) => Promise<unknown>;
}

export function ChatMessage({
  role,
  content,
  queryState,
  isStreaming,
  userQuestion,
  onSaveQuery,
}: ChatMessageProps) {
  if (role === "user" && content) {
    return <UserMessage content={content} />;
  }
  if (role === "assistant" && queryState) {
    return (
      <AssistantMessage
        queryState={queryState}
        isStreaming={isStreaming}
        userQuestion={userQuestion}
        onSaveQuery={onSaveQuery}
      />
    );
  }
  return null;
}
