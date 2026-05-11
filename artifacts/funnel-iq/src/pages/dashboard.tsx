import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  useGetFunnelSummary,
  getGetFunnelSummaryQueryKey,
  useGetDropOffAnalysis,
  getGetDropOffAnalysisQueryKey,
  useGetCustomerTrends,
  getGetCustomerTrendsQueryKey,
  useAnalyzeDropOff,
  useGetSheetInfo,
  getGetSheetInfoQueryKey,
  useSyncToGSheet,
  useSyncConversionRatesToGSheet,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, MousePointerClick, ShoppingCart, Target, BrainCircuit, RefreshCw, Heart, HeartOff, TrendingDown, TrendingUp, FileSpreadsheet, ExternalLink, Check, Lightbulb, FlaskConical, Sparkles, AlertTriangle } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FunnelExplainer } from "@/components/FunnelExplainer";

export default function DashboardPage() {
  const { toast } = useToast();
  const { data: summary, isLoading: summaryLoading } = useGetFunnelSummary({
    query: { queryKey: getGetFunnelSummaryQueryKey() }
  });

  const { data: dropOff, isLoading: dropOffLoading } = useGetDropOffAnalysis({
    query: { queryKey: getGetDropOffAnalysisQueryKey() }
  });

  const { data: customerTrends, isLoading: trendsLoading } = useGetCustomerTrends({
    query: { queryKey: getGetCustomerTrendsQueryKey() }
  });

  const analyzeDropOff = useAnalyzeDropOff();

  const queryClient = useQueryClient();
  const { data: sheetInfo } = useGetSheetInfo({
    query: { queryKey: getGetSheetInfoQueryKey() }
  });
  const syncSheet = useSyncToGSheet({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getGetSheetInfoQueryKey() });
        toast({ title: "Synced to Google Sheets", description: `${data.rowsWritten} rows written.` });
      },
      onError: () => {
        toast({ title: "Sync Failed", description: "Could not sync to Google Sheets.", variant: "destructive" });
      },
    },
  });

  const syncConversionRates = useSyncConversionRatesToGSheet({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Conversion Rates synced", description: `${data.rowsWritten} rows written to "Conversion Rates" tab.` });
      },
      onError: () => {
        toast({ title: "Sync Failed", description: "Could not sync conversion rates.", variant: "destructive" });
      },
    },
  });

  // Auto-sync to Google Sheets every 30 minutes
  useEffect(() => {
    const id = setInterval(() => {
      syncSheet.mutate({});
    }, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Funnel IQ Console</h1>
          <p className="text-muted-foreground">Mother's Day Campaign Analytics & AI Diagnosis</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard
            title="Total Visitors"
            value={summary?.totalVisitors}
            loading={summaryLoading}
            icon={<Users className="h-4 w-4 text-blue-500" />}
          />
          <MetricCard
            title="Banner CTR"
            value={summary ? `${(summary.bannerCTR * 100).toFixed(1)}%` : undefined}
            loading={summaryLoading}
            icon={<MousePointerClick className="h-4 w-4 text-purple-500" />}
          />
          <MetricCard
            title="Conversion Rate"
            value={summary ? `${(summary.conversionRate * 100).toFixed(1)}%` : undefined}
            loading={summaryLoading}
            icon={<Target className="h-4 w-4 text-green-500" />}
          />
          <MetricCard
            title="Cart Abandon Rate"
            value={summary?.cartAbandonRate !== undefined ? `${(summary.cartAbandonRate * 100).toFixed(1)}%` : undefined}
            loading={summaryLoading}
            icon={<TrendingDown className="h-4 w-4 text-orange-500" />}
          />
          <MetricCard
            title="Repeat Rate"
            value={summary ? `${(summary.repeatCustomerRate * 100).toFixed(1)}%` : undefined}
            loading={summaryLoading}
            icon={<RefreshCw className="h-4 w-4 text-orange-500" />}
          />
          <MetricCard
            title="Total Customers"
            value={customerTrends?.totalCustomers}
            loading={trendsLoading}
            icon={<Users className="h-4 w-4 text-indigo-500" />}
          />
          <MetricCard
            title="Active Subscribers"
            value={customerTrends?.activeSubscriptions}
            loading={trendsLoading}
            icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
          />
        </div>

        <div className="space-y-8">
            <FunnelExplainer />

            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>Funnel Drop-off Analysis</CardTitle>
                    <CardDescription>User progression through the Mother's Day campaign</CardDescription>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => syncSheet.mutate({})}
                      disabled={syncSheet.isPending}
                      title="Sync to Google Sheets"
                      data-testid="button-sync-gsheet"
                      className="p-1.5 rounded-md text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors disabled:opacity-40"
                    >
                      {syncSheet.isPending
                        ? <RefreshCw className="h-4 w-4 animate-spin" />
                        : <RefreshCw className="h-4 w-4" />}
                    </button>
                    {sheetInfo?.sheetUrl && (
                      <a
                        href={sheetInfo.sheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open Google Sheet"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Auto-syncs to Google Sheets every 30 min
                  {sheetInfo?.lastSyncedAt && (
                    <span className="ml-1">· Last synced: {new Date(sheetInfo.lastSyncedAt).toLocaleString()}</span>
                  )}
                </p>
              </CardHeader>
              <CardContent>
                {dropOffLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : dropOff ? (() => {
                  const top = dropOff.stages[0]?.users ?? 1;
                  const barColors = [
                    "bg-blue-500", "bg-blue-400", "bg-indigo-500", "bg-indigo-400",
                    "bg-violet-500", "bg-violet-400", "bg-purple-500",
                    "bg-green-500", "bg-emerald-400",
                  ];
                  return (
                    <div className="space-y-0.5">
                      {dropOff.stages.map((stage, i) => {
                        const next = dropOff.stages[i + 1];
                        const isLast = i === dropOff.stages.length - 1;
                        const hasUsers = stage.users > 0;
                        const pct = top > 0 ? (stage.users / top) * 100 : 0;
                        const dropped = stage.dropOff ?? 0;
                        const droppedPct = stage.dropOffRate ?? 0;
                        const skipped = next && hasUsers && next.users > stage.users;
                        return (
                          <div key={stage.stage}>
                            <div className="py-2">
                              <div className="flex justify-between items-baseline text-sm mb-1.5">
                                <span className={`font-medium ${!hasUsers ? "text-muted-foreground" : ""}`}>
                                  {stage.stage}
                                </span>
                                <span className={`text-xs ${hasUsers ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                                  {hasUsers
                                    ? `${stage.users} session${stage.users !== 1 ? "s" : ""} · ${pct.toFixed(0)}% of visitors`
                                    : "0 sessions"}
                                </span>
                              </div>
                              <div className="h-3 bg-secondary rounded-full overflow-hidden">
                                {hasUsers ? (
                                  <div
                                    className={`${barColors[i] ?? "bg-primary"} h-full rounded-full transition-all duration-500`}
                                    style={{ width: `${Math.max(pct, 1.5)}%` }}
                                  />
                                ) : (
                                  <div className="h-full bg-muted/40 rounded-full w-full" />
                                )}
                              </div>
                              {!hasUsers && (
                                <p className="text-xs text-muted-foreground mt-1 italic">No sessions reached this stage</p>
                              )}
                            </div>
                            {!isLast && hasUsers && !skipped && dropped > 0 && (
                              <div className="flex items-center gap-2 pl-1 py-0.5">
                                <div className="w-px h-4 bg-destructive/40 rounded ml-1" />
                                <span className="text-xs text-destructive">
                                  ▼ {dropped} dropped off ({droppedPct.toFixed(0)}% lost here)
                                </span>
                              </div>
                            )}
                            {!isLast && skipped && (
                              <div className="flex items-center gap-2 pl-1 py-0.5">
                                <div className="w-px h-4 bg-amber-400/40 rounded ml-1" />
                                <span className="text-xs text-amber-600 dark:text-amber-400">
                                  ↑ next stage has more sessions — users skipped this step
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })() : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Drop-off Analysis */}
            <Card className="border-violet-200/60 bg-violet-50/20 dark:bg-violet-950/10">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="h-5 w-5 text-violet-500" />
                    <div>
                      <CardTitle className="text-base">AI Drop-off Analysis</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        AI scans real funnel data to surface likely reasons, testable hypotheses, and an experiment
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={analyzeDropOff.data ? "outline" : "default"}
                    className={analyzeDropOff.data ? "" : "bg-violet-600 hover:bg-violet-700 text-white"}
                    onClick={() => analyzeDropOff.mutate({}, {
                      onError: () => toast({ title: "Analysis Failed", description: "Could not run AI analysis. Please try again.", variant: "destructive" }),
                    })}
                    disabled={analyzeDropOff.isPending}
                  >
                    {analyzeDropOff.isPending ? (
                      <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />Analysing…</>
                    ) : analyzeDropOff.data ? (
                      <><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Re-analyse</>
                    ) : (
                      <><Sparkles className="h-3.5 w-3.5 mr-1.5" />Analyse with AI</>
                    )}
                  </Button>
                </div>
              </CardHeader>

              {analyzeDropOff.isPending && (
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-20 w-full mt-4" />
                </CardContent>
              )}

              {analyzeDropOff.data && !analyzeDropOff.isPending && (() => {
                const ai = analyzeDropOff.data;
                const likelihoodColor: Record<string, string> = {
                  high: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
                  medium: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
                  low: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700",
                };
                const effortColor: Record<string, string> = {
                  low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
                  medium: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
                  high: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
                };
                return (
                  <CardContent className="space-y-6 pt-0">
                    {/* Top drop-off callout */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 rounded-lg border border-destructive/20">
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                      <p className="text-sm text-destructive font-medium">
                        Highest drop-off: <span className="font-bold">{ai.topDropOffStage}</span>
                      </p>
                    </div>

                    {/* Likely reasons */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-3">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <h4 className="text-sm font-semibold">Likely Drop-off Reasons</h4>
                      </div>
                      <div className="space-y-2">
                        {ai.dropOffReasons.map((r, i) => (
                          <div key={i} className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border text-xs ${likelihoodColor[r.likelihood] ?? likelihoodColor.low}`}>
                            <span className="font-bold uppercase tracking-wide mt-0.5 shrink-0">{r.likelihood}</span>
                            <div className="min-w-0">
                              <p className="font-medium leading-snug">{r.reason}</p>
                              <p className="opacity-70 mt-0.5">{r.stage}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Hypotheses */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-3">
                        <Lightbulb className="h-4 w-4 text-blue-500" />
                        <h4 className="text-sm font-semibold">Testable Hypotheses</h4>
                      </div>
                      <div className="space-y-3">
                        {ai.hypotheses.map((h, i) => (
                          <div key={i} className="px-3 py-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-lg">
                            <div className="flex items-start gap-2">
                              <span className="mt-0.5 text-xs font-bold text-blue-500 shrink-0">H{i + 1}</span>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-blue-900 dark:text-blue-200 leading-snug">{h.hypothesis}</p>
                                <p className="text-xs text-muted-foreground mt-1 leading-snug">{h.rationale}</p>
                                <Badge variant="outline" className="mt-1.5 text-[10px] px-1.5 py-0 h-4 border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400">{h.stage}</Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Suggested experiment */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-3">
                        <FlaskConical className="h-4 w-4 text-violet-500" />
                        <h4 className="text-sm font-semibold">Suggested Experiment</h4>
                      </div>
                      <div className="px-4 py-4 bg-violet-50/80 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-lg space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold text-violet-900 dark:text-violet-200">{ai.suggestedExperiment.title}</p>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0 ${effortColor[ai.suggestedExperiment.effort] ?? effortColor.medium}`}>
                            {ai.suggestedExperiment.effort.toUpperCase()} EFFORT
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed italic">
                          "{ai.suggestedExperiment.hypothesis}"
                        </p>
                        <div className="flex items-center gap-1.5 pt-1">
                          <Target className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                          <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">{ai.suggestedExperiment.expectedImpact}</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-[10px] text-muted-foreground text-right">
                      Generated {new Date(ai.generatedAt).toLocaleTimeString()}
                    </p>
                  </CardContent>
                );
              })()}

              {!analyzeDropOff.data && !analyzeDropOff.isPending && (
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <BrainCircuit className="h-10 w-10 text-violet-200 dark:text-violet-800 mb-3" />
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Click "Analyse with AI" to get AI-powered drop-off reasons, hypotheses, and an experiment suggestion based on real funnel data.
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>Conversion Rates</CardTitle>
                    <CardDescription>How efficiently each stage of the funnel converts to the next</CardDescription>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => syncConversionRates.mutate({})}
                      disabled={syncConversionRates.isPending}
                      title="Sync to Google Sheets"
                      className="p-1.5 rounded-md text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors disabled:opacity-40"
                    >
                      {syncConversionRates.isPending
                        ? <RefreshCw className="h-4 w-4 animate-spin" />
                        : <RefreshCw className="h-4 w-4" />}
                    </button>
                    {sheetInfo?.sheetUrl && (
                      <a
                        href={sheetInfo.sheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open Google Sheet"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Exports to "Conversion Rates" tab in the same Google Sheet
                </p>
              </CardHeader>
              <CardContent>
                {summaryLoading ? (
                  <Skeleton className="h-[220px] w-full" />
                ) : summary ? (() => {
                  const pct = (num: number, den: number) =>
                    den > 0 ? Math.min(100, Math.round((num / den) * 100)) : null;

                  const metrics = [
                    {
                      label: "Product → Cart Rate",
                      definition: "Of all product-view events, how many led to an add-to-cart",
                      value: pct(summary.addToCart, summary.productViews),
                      fraction: `${summary.addToCart} of ${summary.productViews} product views`,
                      higherIsBetter: true,
                      good: 8, warn: 4,
                    },
                    {
                      label: "Cart → Purchase Rate",
                      definition: "Of sessions that added to cart, how many completed a purchase",
                      value: pct(summary.purchases, summary.addToCart),
                      fraction: `${summary.purchases} of ${summary.addToCart} cart sessions`,
                      higherIsBetter: true,
                      good: 60, warn: 40,
                    },
                    {
                      label: "Wishlist Utilisation",
                      definition: "Of items saved to wishlist, how many were later moved to cart",
                      value: pct(summary.wishlistToCart, summary.addToWishlist),
                      fraction: `${summary.wishlistToCart} of ${summary.addToWishlist} wishlist adds`,
                      higherIsBetter: true,
                      good: 50, warn: 20,
                    },
                    {
                      label: "Cart Abandon Rate",
                      definition: "Of sessions with items in cart, how many left without buying",
                      value: pct(summary.cartAbandons, summary.addToCart),
                      fraction: `${summary.cartAbandons} of ${summary.addToCart} cart sessions`,
                      higherIsBetter: false,
                      good: 30, warn: 60,
                    },
                    {
                      label: "Subscription Conversion",
                      definition: "Of sessions that showed subscription intent, how many subscribed",
                      value: pct(summary.subscriptions, summary.intendedSubscriptions),
                      fraction: `${summary.subscriptions} of ${summary.intendedSubscriptions} intent sessions`,
                      higherIsBetter: true,
                      good: 50, warn: 25,
                    },
                    {
                      label: "Browse-only Rate",
                      definition: "Sessions that viewed products but never added to cart or showed subscription intent",
                      value: pct(summary.browseOnlyCount, summary.totalVisitors),
                      fraction: `${summary.browseOnlyCount} of ${summary.totalVisitors} sessions`,
                      higherIsBetter: false,
                      good: 30, warn: 60,
                    },
                  ];

                  const colorClass = (v: number | null, higherIsBetter: boolean, good: number, warn: number) => {
                    if (v === null) return "text-slate-400";
                    if (higherIsBetter) {
                      if (v >= good) return "text-emerald-600 dark:text-emerald-400";
                      if (v >= warn) return "text-amber-500";
                      return "text-red-500";
                    } else {
                      if (v < good) return "text-emerald-600 dark:text-emerald-400";
                      if (v < warn) return "text-amber-500";
                      return "text-red-500";
                    }
                  };

                  const badgeClass = (v: number | null, higherIsBetter: boolean, good: number, warn: number) => {
                    if (v === null) return "bg-slate-100 text-slate-500 dark:bg-slate-800";
                    if (higherIsBetter) {
                      if (v >= good) return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
                      if (v >= warn) return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
                      return "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400";
                    } else {
                      if (v < good) return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
                      if (v < warn) return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
                      return "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400";
                    }
                  };

                  const badgeLabel = (v: number | null, higherIsBetter: boolean, good: number, warn: number) => {
                    if (v === null) return "No data";
                    if (higherIsBetter) {
                      if (v >= good) return "Healthy";
                      if (v >= warn) return "Watch";
                      return "Needs attention";
                    } else {
                      if (v < good) return "Healthy";
                      if (v < warn) return "Watch";
                      return "Needs attention";
                    }
                  };

                  const benchmarks = [
                    { label: "Product → Cart Rate",    healthy: "≥ 8%",  watch: "4–7%",   poor: "< 4%",   note: "higher is better" },
                    { label: "Cart → Purchase Rate",   healthy: "≥ 60%", watch: "40–59%", poor: "< 40%",  note: "higher is better" },
                    { label: "Wishlist Utilisation",   healthy: "≥ 50%", watch: "20–49%", poor: "< 20%",  note: "higher is better" },
                    { label: "Cart Abandon Rate",      healthy: "< 30%", watch: "30–59%", poor: "≥ 60%",  note: "lower is better" },
                    { label: "Subscription Conversion",healthy: "≥ 50%", watch: "25–49%", poor: "< 25%",  note: "higher is better" },
                    { label: "Browse-only Rate",       healthy: "< 30%", watch: "30–59%", poor: "≥ 60%",  note: "lower is better" },
                  ];

                  return (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {metrics.map((m) => (
                          <div key={m.label} className="p-4 rounded-xl border bg-card space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-1.5">
                                {m.higherIsBetter
                                  ? <TrendingUp className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" />
                                  : <TrendingDown className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" />}
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide leading-tight">
                                  {m.label}
                                </p>
                              </div>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0 ${badgeClass(m.value, m.higherIsBetter, m.good, m.warn)}`}>
                                {badgeLabel(m.value, m.higherIsBetter, m.good, m.warn)}
                              </span>
                            </div>
                            <p className={`text-3xl font-bold tabular-nums ${colorClass(m.value, m.higherIsBetter, m.good, m.warn)}`}>
                              {m.value !== null ? `${m.value}%` : "—"}
                            </p>
                            <p className="text-xs text-muted-foreground leading-snug">{m.definition}</p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">{m.fraction}</p>
                          </div>
                        ))}
                      </div>

                      {/* Benchmark legend */}
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4 space-y-3">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          Status thresholds — based on e-commerce industry benchmarks
                        </p>
                        <div className="flex flex-wrap gap-x-6 gap-y-1 mb-3">
                          {[
                            { color: "bg-emerald-500", label: "Healthy" },
                            { color: "bg-amber-400",   label: "Watch" },
                            { color: "bg-red-500",     label: "Needs attention" },
                          ].map(({ color, label }) => (
                            <span key={label} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                              <span className={`h-2 w-2 rounded-full ${color}`} />
                              {label}
                            </span>
                          ))}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
                          {benchmarks.map((b) => (
                            <div key={b.label} className="flex flex-col gap-0.5">
                              <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{b.label}</p>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />{b.healthy}</span>
                                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" />{b.watch}</span>
                                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-500 inline-block" />{b.poor}</span>
                              </div>
                              <p className="text-[11px] text-slate-400 italic">({b.note})</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })() : null}
              </CardContent>
            </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

function MetricCard({ title, value, loading, icon }: { title: string, value?: number | string, loading: boolean, icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-3xl font-bold">{value !== undefined ? value : '—'}</p>
            )}
          </div>
          <div className="p-2 bg-secondary rounded-lg">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
