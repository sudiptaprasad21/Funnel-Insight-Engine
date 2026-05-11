import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  useGetFunnelSummary,
  getGetFunnelSummaryQueryKey,
  useGetDropOffAnalysis,
  getGetDropOffAnalysisQueryKey,
  useGetCustomerTrends,
  getGetCustomerTrendsQueryKey,
  useDiagnoseFunnel,
  useGetSheetInfo,
  getGetSheetInfoQueryKey,
  useSyncToGSheet,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, MousePointerClick, ShoppingCart, Target, BrainCircuit, RefreshCw, Heart, HeartOff, TrendingDown, TrendingUp, FileSpreadsheet, ExternalLink, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
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

  const diagnose = useDiagnoseFunnel();
  const [diagnosisStage, setDiagnosisStage] = useState<string>("checkout");

  const handleDiagnose = () => {
    diagnose.mutate({ data: { funnelStage: diagnosisStage } }, {
      onSuccess: () => {
        toast({
          title: "Diagnosis Complete",
          description: "AI has generated insights for the selected funnel stage.",
        });
      },
      onError: () => {
        toast({
          title: "Diagnosis Failed",
          description: "Could not generate AI insights.",
          variant: "destructive"
        });
      }
    });
  };

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="col-span-1 lg:col-span-2 space-y-8">
            <FunnelExplainer />

            <Card>
              <CardHeader>
                <CardTitle>Funnel Drop-off Analysis</CardTitle>
                <CardDescription>User progression through the Mother's Day campaign</CardDescription>
              </CardHeader>
              <CardContent>
                {dropOffLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : dropOff ? (() => {
                  const top = dropOff.stages[0]?.users ?? 1;
                  const barColors = [
                    "bg-blue-500", "bg-blue-400", "bg-indigo-500", "bg-indigo-400",
                    "bg-violet-500", "bg-violet-400", "bg-purple-500", "bg-amber-500",
                    "bg-orange-500", "bg-emerald-500",
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

            <Card>
              <CardHeader>
                <CardTitle>Funnel Summary</CardTitle>
                <CardDescription>Key event counts across the campaign funnel</CardDescription>
              </CardHeader>
              <CardContent>
                {summaryLoading ? (
                  <Skeleton className="h-[180px] w-full" />
                ) : summary ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { label: "Product Views", value: summary.productViews, icon: <Users className="h-4 w-4 text-blue-400" /> },
                      { label: "Detail Views", value: summary.productDetailViews, icon: <MousePointerClick className="h-4 w-4 text-sky-500" /> },
                      { label: "Sub Intents", value: summary.intendedSubscriptions, icon: <RefreshCw className="h-4 w-4 text-amber-500" /> },
                      { label: "Subscribed", value: summary.subscriptions, icon: <RefreshCw className="h-4 w-4 text-green-500" /> },
                      { label: "Total Customers", value: customerTrends?.totalCustomers, icon: <Users className="h-4 w-4 text-indigo-400" /> },
                      { label: "Active Subscribers", value: customerTrends?.activeSubscriptions, icon: <TrendingUp className="h-4 w-4 text-emerald-500" /> },
                      { label: "Banner Clicks", value: summary.bannerClicks, icon: <MousePointerClick className="h-4 w-4 text-red-400" /> },
                      { label: "Wishlist Adds", value: summary.addToWishlist, icon: <Heart className="h-4 w-4 text-pink-400" /> },
                      { label: "Wishlist → Cart", value: summary.wishlistToCart, icon: <ShoppingCart className="h-4 w-4 text-indigo-400" /> },
                      { label: "Add to Cart", value: summary.addToCart, icon: <ShoppingCart className="h-4 w-4 text-purple-400" /> },
                      { label: "Cart Abandons", value: summary.cartAbandons, icon: <TrendingDown className="h-4 w-4 text-orange-400" /> },
                      { label: "Checkout Starts", value: summary.checkoutStarts, icon: <Target className="h-4 w-4 text-yellow-500" /> },
                      { label: "Purchases", value: summary.purchases, icon: <Target className="h-4 w-4 text-green-500" /> },
                      { label: "Wishlist Removes", value: summary.removeFromWishlist, icon: <HeartOff className="h-4 w-4 text-slate-400" /> },
                    ].map(({ label, value, icon }) => (
                      <div key={label} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                        {icon}
                        <div>
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="font-bold">{value ?? 0}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="col-span-1 space-y-6">
            {/* Google Sheets Export */}
            <Card className="border-emerald-200/60 bg-emerald-50/30 dark:bg-emerald-950/10">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                  <CardTitle className="text-base">Google Sheets Export</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Sync live funnel stage data to a Google Sheet for offline analysis or sharing.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => syncSheet.mutate({})}
                  disabled={syncSheet.isPending}
                  data-testid="button-sync-gsheet"
                >
                  {syncSheet.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                  )}
                  {syncSheet.isPending ? "Syncing…" : "Sync to Sheets"}
                </Button>
                {sheetInfo?.lastSyncedAt && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                    Last synced: {new Date(sheetInfo.lastSyncedAt).toLocaleString()}
                  </div>
                )}
                {sheetInfo?.sheetUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
                    asChild
                  >
                    <a href={sheetInfo.sheetUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Open Sheet
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="border-primary/20 shadow-sm bg-primary/5">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <BrainCircuit className="h-5 w-5 text-primary" />
                  <CardTitle>AI Diagnostician</CardTitle>
                </div>
                <CardDescription>Analyze drop-off points to generate hypotheses and experiment ideas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select stage to diagnose:</label>
                  <select
                    className="w-full p-2 rounded-md border bg-background text-sm"
                    value={diagnosisStage}
                    onChange={(e) => setDiagnosisStage(e.target.value)}
                  >
                    <option value="checkout">Checkout Flow</option>
                    <option value="product_view">Product Views</option>
                    <option value="add_to_cart">Cart Adds</option>
                  </select>
                </div>

                <Button
                  className="w-full"
                  onClick={handleDiagnose}
                  disabled={diagnose.isPending}
                  data-testid="button-diagnose"
                >
                  {diagnose.isPending ? "Analyzing..." : "Diagnose Funnel"}
                </Button>

                {diagnose.data && (
                  <div className="pt-6 mt-6 border-t border-primary/10 space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-2 text-primary">Summary</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {diagnose.data.summary}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-primary">Top Insights</h4>
                      {diagnose.data.topInsights.map((insight, i) => (
                        <div key={i} className="bg-background p-3 rounded-lg border text-sm space-y-1 shadow-sm">
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-medium leading-tight">{insight.title}</span>
                            <Badge variant="outline" className={
                              insight.severity === 'critical' ? 'bg-red-50 text-red-700 border-red-200' :
                              insight.severity === 'high' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              insight.severity === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                              'bg-blue-50 text-blue-700 border-blue-200'
                            }>
                              {insight.severity}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-xs">{insight.description}</p>
                        </div>
                      ))}
                    </div>

                    {diagnose.data.experiments.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm text-primary">Suggested Experiments</h4>
                        {diagnose.data.experiments.map((exp, i) => (
                          <div key={i} className="bg-background p-3 rounded-lg border text-sm space-y-1 shadow-sm">
                            <p className="font-medium">{exp.title}</p>
                            <p className="text-muted-foreground text-xs">{exp.hypothesis}</p>
                            <Badge variant="outline" className="text-xs">{exp.effort} effort · {exp.funnelStage}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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
