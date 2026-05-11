import { Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Info, ShoppingCart, RefreshCw, ChevronRight, TrendingDown } from "lucide-react";

const PURCHASE_STAGES = [
  "Landing",
  "Banner Click",
  "Product View",
  "Wishlist",
  "Add to Cart",
  "Checkout / Purchased",
];

const SUBSCRIPTION_STAGES = [
  "Landing",
  "Product View",
  "Product Detail",
  "Subscription Intent",
  "Subscribed",
];

function StageChip({ label, color }: { label: string; color: "blue" | "emerald" }) {
  const cls =
    color === "blue"
      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

export function FunnelExplainer() {
  return (
    <Card className="bg-gradient-to-br from-slate-50 to-blue-50/40 dark:from-slate-900 dark:to-blue-950/30 border-blue-200/60">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-blue-500 shrink-0" />
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
            How to Read "Funnel Drop-off Analysis"?
          </p>
        </div>
        <CardDescription className="text-xs leading-relaxed">
          Every visitor's session is tracked across two conversion paths. A{" "}
          <span className="font-semibold text-destructive">drop-off</span> is a session that reached
          a stage but didn't advance — the bar chart below shows exactly where and how many were lost.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <ShoppingCart className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
              Purchase Path
            </span>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {PURCHASE_STAGES.map((stage, i) => (
              <Fragment key={stage}>
                <StageChip label={stage} color="blue" />
                {i < PURCHASE_STAGES.length - 1 && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                )}
              </Fragment>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <RefreshCw className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
              Subscription Path
            </span>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {SUBSCRIPTION_STAGES.map((stage, i) => (
              <Fragment key={stage}>
                <StageChip label={stage} color="emerald" />
                {i < SUBSCRIPTION_STAGES.length - 1 && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                )}
              </Fragment>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-2 p-2.5 rounded-md bg-destructive/5 border border-destructive/15">
          <TrendingDown className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-destructive">Drop-off rate</span> = sessions lost
            at a stage ÷ sessions that reached it. Each bar width shows what % of all visitors made
            it that far. Stages with 0 sessions are part of a path the user didn't take.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
