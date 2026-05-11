import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  useGetHealthReport,
  getGetHealthReportQueryKey,
  useRunHealthAudit,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Database,
  ShieldCheck,
  Clock,
  Plug,
  Brain,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Calendar,
} from "lucide-react";
import { useState } from "react";

type CheckStatus = "pass" | "warn" | "fail";

interface HealthCheck {
  name: string;
  status: CheckStatus;
  value: string | number;
  detail: string;
}

interface HealthCategory {
  name: string;
  icon: string;
  score: number;
  checks: HealthCheck[];
}

interface HealthReport {
  generatedAt: string;
  overallScore: number;
  overallGrade: string;
  categories: HealthCategory[];
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  database: <Database className="h-5 w-5" />,
  "shield-check": <ShieldCheck className="h-5 w-5" />,
  clock: <Clock className="h-5 w-5" />,
  plug: <Plug className="h-5 w-5" />,
  brain: <Brain className="h-5 w-5" />,
};

const STATUS_CONFIG: Record<CheckStatus, { icon: React.ReactNode; color: string; bg: string; badge: string }> = {
  pass: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  },
  warn: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  },
  fail: {
    icon: <XCircle className="h-4 w-4" />,
    color: "text-red-600",
    bg: "bg-red-50 dark:bg-red-950/30",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  },
};

function scoreColor(score: number): string {
  if (score >= 90) return "text-emerald-600";
  if (score >= 75) return "text-blue-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
}

function scoreBg(score: number): string {
  if (score >= 90) return "bg-emerald-500";
  if (score >= 75) return "bg-blue-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-500";
}

function gradeColor(grade: string): string {
  if (grade === "A") return "text-emerald-600";
  if (grade === "B") return "text-blue-600";
  if (grade === "C") return "text-amber-600";
  return "text-red-600";
}

function nextScheduledAudit(): string {
  const now = new Date();
  const next = new Date(now);
  next.setHours(3, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CategoryCard({ cat }: { cat: HealthCategory }) {
  const [expanded, setExpanded] = useState(true);
  const passes = cat.checks.filter((c) => c.status === "pass").length;
  const warns = cat.checks.filter((c) => c.status === "warn").length;
  const fails = cat.checks.filter((c) => c.status === "fail").length;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${scoreColor(cat.score)} bg-muted`}>
              {CATEGORY_ICONS[cat.icon] ?? <ShieldCheck className="h-5 w-5" />}
            </div>
            <div>
              <CardTitle className="text-base">{cat.name}</CardTitle>
              <CardDescription className="mt-0.5 text-xs">
                {passes > 0 && <span className="text-emerald-600 font-medium">{passes} passed</span>}
                {warns > 0 && <span className="text-amber-600 font-medium ml-2">{warns} warnings</span>}
                {fails > 0 && <span className="text-red-600 font-medium ml-2">{fails} failed</span>}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className={`text-2xl font-bold tabular-nums ${scoreColor(cat.score)}`}>{cat.score}</div>
              <div className="text-[10px] text-muted-foreground">/ 100</div>
            </div>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="p-1 rounded text-muted-foreground hover:text-foreground"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className={`h-full rounded-full transition-all ${scoreBg(cat.score)}`} style={{ width: `${cat.score}%` }} />
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-2">
          {cat.checks.map((check, i) => {
            const cfg = STATUS_CONFIG[check.status];
            return (
              <div key={i} className={`rounded-lg p-3 ${cfg.bg}`}>
                <div className="flex items-start gap-2.5">
                  <div className={`mt-0.5 shrink-0 ${cfg.color}`}>{cfg.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-sm font-medium">{check.name}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                        {String(check.value)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{check.detail}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}

function downloadReport(report: HealthReport) {
  const lines: string[] = [
    "═══════════════════════════════════════════════════════",
    "          NEXPOINT FUNNEL IQ — APP HEALTH REPORT",
    "═══════════════════════════════════════════════════════",
    `Generated:     ${new Date(report.generatedAt).toLocaleString()}`,
    `Overall Score: ${report.overallScore}/100`,
    `Overall Grade: ${report.overallGrade}`,
    "",
  ];

  for (const cat of report.categories) {
    lines.push(`── ${cat.name.toUpperCase()} (${cat.score}/100) ──`);
    for (const check of cat.checks) {
      const symbol = check.status === "pass" ? "✓" : check.status === "warn" ? "⚠" : "✗";
      lines.push(`  ${symbol} ${check.name}: ${check.value}`);
      lines.push(`      ${check.detail}`);
    }
    lines.push("");
  }

  lines.push("═══════════════════════════════════════════════════════");

  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `health-report-${new Date(report.generatedAt).toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadReportJson(report: HealthReport) {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `health-report-${new Date(report.generatedAt).toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function HealthPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);

  const { data: report, isLoading } = useGetHealthReport({
    query: { queryKey: getGetHealthReportQueryKey() },
  });

  const runAudit = useRunHealthAudit({
    mutation: {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetHealthReportQueryKey(), data);
        toast({ title: "Audit complete", description: `Overall score: ${data.overallScore}/100 (Grade ${data.overallGrade})` });
      },
      onError: () => {
        toast({ title: "Audit failed", description: "Could not run the health check.", variant: "destructive" });
      },
    },
  });

  const typedReport = report as HealthReport | undefined;

  const totalChecks = typedReport?.categories.reduce((s, c) => s + c.checks.length, 0) ?? 0;
  const passedChecks = typedReport?.categories.reduce(
    (s, c) => s + c.checks.filter((ch) => ch.status === "pass").length,
    0,
  ) ?? 0;
  const failedChecks = typedReport?.categories.reduce(
    (s, c) => s + c.checks.filter((ch) => ch.status === "fail").length,
    0,
  ) ?? 0;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">App Health</h1>
            <p className="text-muted-foreground">Full-stack diagnostics — database, data quality, APIs, and AI</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => runAudit.mutate()}
              disabled={runAudit.isPending}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${runAudit.isPending ? "animate-spin" : ""}`} />
              {runAudit.isPending ? "Running audit…" : "Run Audit Now"}
            </Button>

            {typedReport && (
              <div className="relative">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setDownloadMenuOpen((v) => !v)}
                >
                  <Download className="h-4 w-4" />
                  Download
                  <ChevronDown className="h-3 w-3" />
                </Button>
                {downloadMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 z-10 bg-card border rounded-lg shadow-lg py-1 min-w-[160px]">
                    <button
                      className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors"
                      onClick={() => { downloadReport(typedReport); setDownloadMenuOpen(false); }}
                    >
                      Text Report (.txt)
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors"
                      onClick={() => { downloadReportJson(typedReport); setDownloadMenuOpen(false); }}
                    >
                      JSON Data (.json)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Schedule info */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Auto-audit runs daily at 3:00 AM · Next run: <strong className="text-foreground">{nextScheduledAudit()}</strong></span>
          {typedReport && (
            <span className="ml-2">· Last run: <strong className="text-foreground">{new Date(typedReport.generatedAt).toLocaleString()}</strong></span>
          )}
        </div>

        {/* Overall score */}
        {isLoading ? (
          <Skeleton className="h-36 w-full rounded-xl" />
        ) : typedReport ? (
          <Card className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center gap-8 flex-wrap">
                <div className="text-center">
                  <div className={`text-7xl font-black tabular-nums ${gradeColor(typedReport.overallGrade)}`}>
                    {typedReport.overallGrade}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wide">Grade</div>
                </div>

                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-end justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Overall Health Score</span>
                    <span className={`text-2xl font-bold tabular-nums ${scoreColor(typedReport.overallScore)}`}>
                      {typedReport.overallScore}<span className="text-base font-normal text-muted-foreground">/100</span>
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${scoreBg(typedReport.overallScore)}`}
                      style={{ width: `${typedReport.overallScore}%` }}
                    />
                  </div>
                  <div className="flex gap-4 mt-3 text-sm">
                    <span className="flex items-center gap-1.5 text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <strong>{passedChecks}</strong> passed
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-600">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <strong>{totalChecks - passedChecks - failedChecks}</strong> warnings
                    </span>
                    <span className="flex items-center gap-1.5 text-red-600">
                      <XCircle className="h-3.5 w-3.5" />
                      <strong>{failedChecks}</strong> failed
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {typedReport.categories.map((cat) => (
                    <div key={cat.name} className="text-center">
                      <div className={`text-xl font-bold tabular-nums ${scoreColor(cat.score)}`}>{cat.score}</div>
                      <div className="text-[10px] text-muted-foreground leading-tight mt-0.5 max-w-[64px]">{cat.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No audit data yet</p>
              <p className="text-sm mt-1">Click "Run Audit Now" to generate your first health report.</p>
            </CardContent>
          </Card>
        )}

        {/* Category cards */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-4">
            {typedReport?.categories.map((cat) => (
              <CategoryCard key={cat.name} cat={cat} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
