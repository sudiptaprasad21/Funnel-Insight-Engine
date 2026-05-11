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
import { Users, RefreshCw, Repeat2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
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
              <CardTitle>Monthly Customer Trends</CardTitle>
              <CardDescription>New customers, repeat buyers, and subscriptions over time</CardDescription>
            </CardHeader>
            <CardContent>
              {trendsLoading ? (
                <Skeleton className="h-[280px] w-full" />
              ) : trends?.monthlyTrend ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={trends.monthlyTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 13,
                      }}
                    />
                    <Legend />
                    <Bar dataKey="newCustomers" name="New Customers" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="repeatCustomers" name="Repeat Customers" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="subscriptions" name="Subscriptions" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground">No trend data</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subscription Health</CardTitle>
              <CardDescription>Nappy monthly subscription KPIs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {trendsLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (
                <>
                  <HealthRow label="Active Subs" value={trends?.activeSubscriptions ?? 0} total={trends?.totalCustomers ?? 1} color="bg-green-500" />
                  <HealthRow label="Repeat Buyers" value={trends?.repeatCustomers ?? 0} total={trends?.totalCustomers ?? 1} color="bg-blue-500" />
                  <HealthRow label="New This Month" value={trends?.newThisMonth ?? 0} total={trends?.totalCustomers ?? 1} color="bg-purple-500" />
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Customer List</CardTitle>
                <CardDescription>All campaign customers from the Mother's Day demo</CardDescription>
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
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Email</th>
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Source</th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Orders</th>
                      <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Spend</th>
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers?.map((customer) => (
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
