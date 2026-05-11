import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  useListExperiments,
  getListExperimentsQueryKey,
  useUpdateExperiment,
  useSyncExperimentsToGSheet,
  useGetSheetInfo,
  getGetSheetInfoQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardList, RefreshCw, ExternalLink,
  FlaskConical, Play, CheckCircle2, Archive,
  Clock, ChevronDown, ChevronUp, GitMerge,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

type StatusFilter = "all" | "proposed" | "running" | "completed" | "archived";

const STATUS_CONFIG: Record<string, { label: string; icon: ReactNode; color: string; activeColor: string }> = {
  proposed:  { label: "Proposed",  icon: <FlaskConical className="h-3 w-3" />, color: "text-slate-600 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",         activeColor: "bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300" },
  running:   { label: "Running",   icon: <Play className="h-3 w-3" />,          color: "text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",             activeColor: "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/40 dark:border-blue-700 dark:text-blue-400" },
  completed: { label: "Completed", icon: <CheckCircle2 className="h-3 w-3" />,  color: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800", activeColor: "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-400" },
  archived:  { label: "Archived",  icon: <Archive className="h-3 w-3" />,       color: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",       activeColor: "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-400" },
};

const EFFORT_COLOR: Record<string, string> = {
  low:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  high:   "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
};

export default function ExperimentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedMergeNotes, setExpandedMergeNotes] = useState<Set<number>>(new Set());
  const [lastExpSynced, setLastExpSynced] = useState<string | null>(null);

  const { data: experiments, isLoading } = useListExperiments({
    query: { queryKey: getListExperimentsQueryKey(), refetchInterval: 5000 },
  });

  const { data: sheetInfo } = useGetSheetInfo({
    query: { queryKey: getGetSheetInfoQueryKey() },
  });

  const updateExpStatus = useUpdateExperiment({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListExperimentsQueryKey() }),
      onError: () => toast({ title: "Update failed", description: "Could not update experiment status.", variant: "destructive" }),
    },
  });

  const syncExperiments = useSyncExperimentsToGSheet({
    mutation: {
      onSuccess: (data) => {
        setLastExpSynced(data.syncedAt);
        toast({ title: "Experiments synced", description: `${data.rowsWritten} rows written to "Experiments" tab.` });
      },
      onError: () => {
        toast({ title: "Sync Failed", description: "Could not sync experiments to Google Sheets.", variant: "destructive" });
      },
    },
  });

  const all = experiments ?? [];
  const filtered = statusFilter === "all" ? all : all.filter(e => (e.status ?? "proposed") === statusFilter);

  const counts: Record<string, number> = { proposed: 0, running: 0, completed: 0, archived: 0 };
  for (const e of all) counts[e.status ?? "proposed"] = (counts[e.status ?? "proposed"] ?? 0) + 1;

  const toggleMergeNote = (id: number) => {
    setExpandedMergeNotes(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-6">

        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">Experiments Log</h1>
            <p className="text-muted-foreground text-sm">Track AI-suggested A/B experiments through their full lifecycle</p>
          </div>
          <div className="flex items-center gap-1 shrink-0 mt-1">
            <button
              onClick={() => syncExperiments.mutate({})}
              disabled={syncExperiments.isPending}
              title="Sync to Google Sheets"
              className="p-2 rounded-md text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`h-4 w-4 ${syncExperiments.isPending ? "animate-spin" : ""}`} />
            </button>
            {sheetInfo?.sheetUrl && (
              <a
                href={sheetInfo.sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open Google Sheet"
                className="p-2 rounded-md text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>

        {lastExpSynced && (
          <p className="text-[11px] text-muted-foreground -mt-4">
            Auto-syncs to Google Sheets every 30 min · Last synced: {new Date(lastExpSynced).toLocaleString()}
          </p>
        )}

        {/* Status summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(["proposed", "running", "completed", "archived"] as const).map((s) => {
            const cfg = STATUS_CONFIG[s];
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(prev => prev === s ? "all" : s)}
                className={`text-left px-4 py-3 rounded-xl border transition-all ${
                  statusFilter === s
                    ? cfg.activeColor + " ring-2 ring-offset-1 ring-current/30"
                    : "bg-card border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={statusFilter === s ? "" : "text-muted-foreground"}>{cfg.icon}</span>
                  <span className="text-xs font-medium text-muted-foreground">{cfg.label}</span>
                </div>
                <p className="text-2xl font-bold">{isLoading ? "—" : (counts[s] ?? 0)}</p>
              </button>
            );
          })}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {(["all", "proposed", "running", "completed", "archived"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                statusFilter === f
                  ? "bg-foreground text-background border-foreground"
                  : "text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              {f === "all" ? `All (${all.length})` : `${STATUS_CONFIG[f].label} (${counts[f] ?? 0})`}
            </button>
          ))}
        </div>

        {/* Experiments list */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-violet-500" />
              <CardTitle className="text-sm font-semibold">
                {statusFilter === "all" ? `All experiments` : `${STATUS_CONFIG[statusFilter].label} experiments`}
              </CardTitle>
              {statusFilter !== "all" && (
                <CardDescription className="text-xs">
                  Showing {filtered.length} of {all.length}
                </CardDescription>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-2">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : !filtered.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ClipboardList className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {all.length === 0
                    ? "No experiments yet — run an AI analysis from the Dashboard to generate suggestions."
                    : `No ${STATUS_CONFIG[statusFilter]?.label.toLowerCase()} experiments.`}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((exp) => {
                  const lastActivity = exp.updatedAt ?? exp.createdAt;
                  const daysSince = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
                  const isStale = daysSince > 14 && (exp.status === "proposed" || exp.status === "running");
                  const hasMergeNote = !!exp.mergeNote;
                  const mergeExpanded = expandedMergeNotes.has(exp.id);

                  return (
                    <div key={exp.id} className="rounded-lg border border-border bg-muted/20 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start gap-3 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-sm font-medium leading-snug">{exp.title}</span>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${EFFORT_COLOR[exp.effort] ?? EFFORT_COLOR.medium}`}>
                              {exp.effort.toUpperCase()}
                            </span>
                            {isStale && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 shrink-0">
                                <Clock className="h-2.5 w-2.5" />
                                Stale ({daysSince}d)
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground leading-snug">
                            <span className="font-medium text-foreground/70">{exp.funnelStage}</span>
                            {" · "}
                            {exp.expectedImpact}
                          </p>
                          {exp.hypothesis && (
                            <p className="text-xs text-muted-foreground/70 italic mt-1 leading-snug line-clamp-2">
                              "{exp.hypothesis}"
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end pt-0.5">
                          {hasMergeNote && (
                            <button
                              onClick={() => toggleMergeNote(exp.id)}
                              title="View merge history"
                              className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded border border-transparent text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950/30 transition-colors"
                            >
                              <GitMerge className="h-3 w-3" />
                              {mergeExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                          )}
                          {(["proposed","running","completed","archived"] as const).map((s) => {
                            const cfg = STATUS_CONFIG[s];
                            const active = (exp.status ?? "proposed") === s;
                            return (
                              <button
                                key={s}
                                onClick={() => !active && updateExpStatus.mutate({ id: exp.id, data: { status: s } })}
                                disabled={active || updateExpStatus.isPending}
                                title={cfg.label}
                                className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded border transition-colors ${
                                  active ? cfg.color + " cursor-default" : "text-muted-foreground border-transparent hover:bg-muted"
                                }`}
                              >
                                {cfg.icon}
                                {cfg.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {hasMergeNote && mergeExpanded && (
                        <div className="px-4 pb-3 pt-0">
                          <div className="flex items-start gap-2 rounded-md bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/40 px-3 py-2">
                            <GitMerge className="h-3.5 w-3.5 text-violet-500 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-[10px] font-semibold text-violet-700 dark:text-violet-400 uppercase tracking-wide mb-0.5">Merge Note</p>
                              <p className="text-xs text-violet-800 dark:text-violet-300">{exp.mergeNote}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
