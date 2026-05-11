import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  useListCustomers,
  getListCustomersQueryKey,
  useGetCustomerTrends,
  getGetCustomerTrendsQueryKey,
  useSyncCustomersToGSheet,
  useGetSheetInfo,
  getGetSheetInfoQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, RefreshCw, Repeat2, ExternalLink, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function CustomersPage() {
  const { toast } = useToast();

  const { data: customers, isLoading: customersLoading } = useListCustomers(
    undefined,
    { query: { queryKey: getListCustomersQueryKey() } }
  );

  const { data: trends, isLoading: trendsLoading } = useGetCustomerTrends({
    query: { queryKey: getGetCustomerTrendsQueryKey() },
  });

  const { data: sheetInfo } = useGetSheetInfo({
    query: { queryKey: getGetSheetInfoQueryKey() },
  });

  const [lastCustomerSynced, setLastCustomerSynced] = useState<string | null>(null);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [activeFilters, setActiveFilters] = useState<Set<"new" | "repeat" | "subscribed">>(new Set());

  function toggleFilter(f: "new" | "repeat" | "subscribed") {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f); else next.add(f);
      return next;
    });
  }
  const [sortField, setSortField] = useState<"name" | "orders" | "spend" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function toggleSort(field: "name" | "orders" | "spend") {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const chartData = useMemo(() => {
    if (!customers) return [];
    const now = new Date();

    if (period === "monthly") {
      return Array.from({ length: 5 }, (_, i) => {
        const offsetMonths = 4 - i;
        const d = new Date(now.getFullYear(), now.getMonth() - offsetMonths, 1);
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
        const label = monthStart.toLocaleDateString("en-US", { month: "short" });
        const inPeriod = customers.filter((c) => {
          const t = new Date(c.createdAt).getTime();
          return t >= monthStart.getTime() && t <= monthEnd.getTime();
        });
        return {
          label,
          newCustomers: inPeriod.filter((c) => !c.isRepeat).length,
          repeatCustomers: inPeriod.filter((c) => c.isRepeat).length,
          subscriptions: inPeriod.filter((c) => c.isSubscribed).length,
        };
      });
    }

    if (period === "weekly") {
      return Array.from({ length: 8 }, (_, i) => {
        const offsetDays = now.getDay() === 0 ? 6 : now.getDay() - 1; // days since Mon
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - offsetDays - 7 * (7 - i));
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        const label = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const inPeriod = customers.filter((c) => {
          const t = new Date(c.createdAt).getTime();
          return t >= weekStart.getTime() && t <= weekEnd.getTime();
        });
        return {
          label,
          newCustomers: inPeriod.filter((c) => !c.isRepeat).length,
          repeatCustomers: inPeriod.filter((c) => c.isRepeat).length,
          subscriptions: inPeriod.filter((c) => c.isSubscribed).length,
        };
      });
    }

    // daily — last 7 days
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (6 - i));
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const inPeriod = customers.filter((c) => {
        const t = new Date(c.createdAt).getTime();
        return t >= dayStart.getTime() && t <= dayEnd.getTime();
      });
      return {
        label,
        newCustomers: inPeriod.filter((c) => !c.isRepeat).length,
        repeatCustomers: inPeriod.filter((c) => c.isRepeat).length,
        subscriptions: inPeriod.filter((c) => c.isSubscribed).length,
      };
    });
  }, [period, customers]);

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    let list = [...customers];
    if (activeFilters.size > 0) {
      list = list.filter((c) => {
        if (activeFilters.has("new") && !c.isRepeat && !c.isSubscribed) return true;
        if (activeFilters.has("repeat") && c.isRepeat) return true;
        if (activeFilters.has("subscribed") && c.isSubscribed) return true;
        return false;
      });
    }
    if (sortField) {
      list.sort((a, b) => {
        let aVal: number | string = 0;
        let bVal: number | string = 0;
        if (sortField === "name") { aVal = a.name?.toLowerCase() ?? ""; bVal = b.name?.toLowerCase() ?? ""; }
        else if (sortField === "orders") { aVal = a.totalOrders ?? 0; bVal = b.totalOrders ?? 0; }
        else if (sortField === "spend") { aVal = Number(a.totalSpend ?? 0); bVal = Number(b.totalSpend ?? 0); }
        if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [customers, activeFilters, sortField, sortDir]);

  const syncCustomers = useSyncCustomersToGSheet({
    mutation: {
      onSuccess: (data) => {
        setLastCustomerSynced(data.syncedAt);
        toast({
          title: "Customer List synced",
          description: `${data.rowsWritten} rows written to "Customer List" tab.`,
        });
      },
      onError: () => {
        toast({
          title: "Sync Failed",
          description: "Could not sync customer list.",
          variant: "destructive",
        });
      },
    },
  });

  // Auto-sync every 30 minutes
  useEffect(() => {
    const id = setInterval(() => {
      syncCustomers.mutate({});
    }, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Customers</h1>
          <p className="text-muted-foreground">Campaign audience overview and subscription health</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            title="Total Customers"
            value={trendsLoading ? undefined : trends?.totalCustomers}
            icon={<Users className="h-4 w-4 text-blue-500" />}
            loading={trendsLoading}
          />
          <StatCard
            title="Repeat Customers"
            value={trendsLoading ? undefined : trends?.repeatCustomers}
            sub={trends ? `${trends.repeatRate}% repeat rate` : undefined}
            icon={<Repeat2 className="h-4 w-4 text-purple-500" />}
            loading={trendsLoading}
          />
          <StatCard
            title="Active Subscriptions"
            value={trendsLoading ? undefined : trends?.activeSubscriptions}
            icon={<RefreshCw className="h-4 w-4 text-green-500" />}
            loading={trendsLoading}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Customer Trends</CardTitle>
                  <CardDescription>
                    New customers, repeat buyers, and subscriptions
                  </CardDescription>
                </div>
                <div className="flex items-center rounded-lg border border-border overflow-hidden shrink-0 text-xs font-medium">
                  {(["daily", "weekly", "monthly"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`px-3 py-1.5 capitalize transition-colors ${
                        period === p
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {p === "daily" ? "Daily" : p === "weekly" ? "Weekly" : "Monthly"}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {customersLoading ? (
                <Skeleton className="h-[280px] w-full" />
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 13,
                      }}
                    />
                    <Bar dataKey="newCustomers" name="New Customers" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="repeatCustomers" name="Repeat Customers" fill="#a855f7" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="subscriptions" name="Subscriptions" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground">No trend data</div>
              )}
              <div className="flex items-center justify-center gap-5 mt-2">
                {[
                  { color: "#3b82f6", label: "New" },
                  { color: "#a855f7", label: "Repeat" },
                  { color: "#22c55e", label: "Subscriptions" },
                ].map(({ color, label }) => (
                  <span key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                    {label}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order Distribution</CardTitle>
              <CardDescription>Customers grouped by number of purchases</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {customersLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (() => {
                const total = customers?.length ?? 0;
                const buckets = [
                  { label: "0 orders", description: "Browsed, never bought", color: "bg-slate-400", hex: "#94a3b8", count: customers?.filter(c => (c.totalOrders ?? 0) === 0).length ?? 0 },
                  { label: "1 order", description: "One-time buyer", color: "bg-blue-500", hex: "#3b82f6", count: customers?.filter(c => (c.totalOrders ?? 0) === 1).length ?? 0 },
                  { label: "2 orders", description: "Returning buyer", color: "bg-purple-500", hex: "#a855f7", count: customers?.filter(c => (c.totalOrders ?? 0) === 2).length ?? 0 },
                  { label: "3+ orders", description: "Loyal customer", color: "bg-green-500", hex: "#22c55e", count: customers?.filter(c => (c.totalOrders ?? 0) >= 3).length ?? 0 },
                ];
                return (
                  <div className="space-y-4">
                    {buckets.map(b => {
                      const pct = total > 0 ? Math.round((b.count / total) * 100) : 0;
                      return (
                        <div key={b.label} className="space-y-1">
                          <div className="flex justify-between items-baseline text-sm">
                            <div>
                              <span className="font-medium">{b.label}</span>
                              <span className="text-xs text-muted-foreground ml-2">{b.description}</span>
                            </div>
                            <span className="font-semibold tabular-nums">
                              {b.count} <span className="font-normal text-muted-foreground text-xs">({pct}%)</span>
                            </span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div className={`h-full ${b.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-[11px] text-muted-foreground pt-1 border-t border-border">
                      {customers?.filter(c => (c.totalOrders ?? 0) >= 2).length ?? 0} of {total} customers have purchased more than once
                    </p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Customer List</CardTitle>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => syncCustomers.mutate({})}
                  disabled={syncCustomers.isPending}
                  title="Sync to Google Sheets"
                  className="p-1.5 rounded-md text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors disabled:opacity-40"
                >
                  {syncCustomers.isPending
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
              Auto-syncs to Google Sheets every 30 min — "Customer List" tab
              {lastCustomerSynced && (
                <span className="ml-1">· Last synced: {new Date(lastCustomerSynced).toLocaleString()}</span>
              )}
            </p>
          </CardHeader>
          <CardContent>
            {/* Filter pills */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <button
                onClick={() => setActiveFilters(new Set())}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  activeFilters.size === 0
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                All
              </button>
              {(["new", "repeat", "subscribed"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => toggleFilter(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    activeFilters.has(s)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  {s === "new" ? "New" : s === "repeat" ? "Repeat" : "Subscribed"}
                </button>
              ))}
              <span className="ml-auto text-xs text-muted-foreground">
                {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? "s" : ""}
              </span>
            </div>

            {customersLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                        <button
                          onClick={() => toggleSort("name")}
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          Name
                          {sortField === "name" ? (
                            sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronsUpDown className="h-3 w-3 opacity-40" />
                          )}
                        </button>
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Email</th>
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Source</th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground">
                        <button
                          onClick={() => toggleSort("orders")}
                          className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors"
                        >
                          Orders
                          {sortField === "orders" ? (
                            sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronsUpDown className="h-3 w-3 opacity-40" />
                          )}
                        </button>
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground">
                        <button
                          onClick={() => toggleSort("spend")}
                          className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors"
                        >
                          Spend
                          {sortField === "spend" ? (
                            sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronsUpDown className="h-3 w-3 opacity-40" />
                          )}
                        </button>
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-muted-foreground text-sm">
                          No customers match this filter
                        </td>
                      </tr>
                    ) : filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-medium">{customer.name}</td>
                        <td className="py-3 px-4 text-muted-foreground">{customer.email}</td>
                        <td className="py-3 px-4 text-muted-foreground">{customer.source ?? "—"}</td>
                        <td className="py-3 px-4 text-right">{customer.totalOrders ?? 0}</td>
                        <td className="py-3 px-4 text-right">
                          {customer.totalSpend ? `₹${Math.round(Number(customer.totalSpend))}` : "₹0"}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2 flex-wrap">
                            {customer.isRepeat && (
                              <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                Repeat
                              </Badge>
                            )}
                            {customer.isSubscribed && (
                              <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                                Subscribed
                              </Badge>
                            )}
                            {!customer.isRepeat && !customer.isSubscribed && (
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                New
                              </Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function StatCard({
  title,
  value,
  sub,
  icon,
  loading,
}: {
  title: string;
  value?: number | string;
  sub?: string;
  icon: React.ReactNode;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <p className="text-3xl font-bold">{value !== undefined ? value : "—"}</p>
                {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
              </>
            )}
          </div>
          <div className="p-2 bg-secondary rounded-lg">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function HealthRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">
          {value} <span className="font-normal text-muted-foreground">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
