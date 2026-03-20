import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SavedQuery, VizConfig } from "@/types/api";

async function fetchSavedQueries(): Promise<SavedQuery[]> {
  const res = await fetch("/api/v1/saved-queries");
  if (!res.ok) throw new Error("Failed to fetch saved queries");
  return res.json();
}

interface CreateSavedQueryInput {
  name: string;
  description?: string;
  question: string;
  sql: string;
  viz_config?: VizConfig;
}

async function createSavedQuery(input: CreateSavedQueryInput): Promise<SavedQuery> {
  const res = await fetch("/api/v1/saved-queries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to save query");
  return res.json();
}

async function deleteSavedQuery(id: string): Promise<void> {
  const res = await fetch(`/api/v1/saved-queries/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete saved query");
}

export function useSavedQueries() {
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ["saved-queries"],
    queryFn: fetchSavedQueries,
  });

  const create = useMutation({
    mutationFn: createSavedQuery,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-queries"] });
    },
  });

  const remove = useMutation({
    mutationFn: deleteSavedQuery,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-queries"] });
    },
  });

  return {
    savedQueries: list.data ?? [],
    isLoading: list.isLoading,
    saveQuery: create.mutateAsync,
    deleteQuery: remove.mutateAsync,
  } as const;
}
