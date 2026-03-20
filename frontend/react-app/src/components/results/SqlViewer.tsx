import { Copy, Check, ChevronDown, ChevronRight } from "lucide-react";
import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ValidationResult } from "@/types/api";

interface SqlViewerProps {
  sql: string;
  validation?: ValidationResult | null;
  defaultCollapsed?: boolean;
}

export function SqlViewer({
  sql,
  validation,
  defaultCollapsed = false,
}: SqlViewerProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [sql]);

  return (
    <div className="rounded-lg border border-border bg-card text-sm">
      {/* Header */}
      <div
        className="flex cursor-pointer items-center gap-2 px-3 py-2"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="font-medium">SQL Query</span>
        {validation?.is_valid && (
          <Badge variant="secondary" className="ml-auto text-xs font-normal">
            {formatBytes(validation.estimated_bytes)} · $
            {validation.estimated_cost_usd.toFixed(6)}
          </Badge>
        )}
        {validation && !validation.is_valid && (
          <Badge variant="destructive" className="ml-auto text-xs font-normal">
            Validation failed
          </Badge>
        )}
      </div>

      {/* SQL body */}
      {!collapsed && (
        <div className="relative border-t border-border">
          <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed">
            <code>{sql}</code>
          </pre>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-7 w-7"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function formatBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}
