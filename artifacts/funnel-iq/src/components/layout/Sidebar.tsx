import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Package, ArrowLeft, FlaskConical, HeartPulse } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [location] = useLocation();

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/experiments", label: "Experiments", icon: FlaskConical },
    { href: "/customers", label: "Customers", icon: Users },
    { href: "/products", label: "Products", icon: Package },
    { href: "/health", label: "App Health", icon: HeartPulse },
  ];

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border h-screen sticky top-0 flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold text-sidebar-foreground">Funnel IQ</h1>
        <p className="text-sm text-muted-foreground mt-1">Analytics Console</p>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location === link.href || (link.href === "/dashboard" && location === "/");

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <a
          href="/"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Demo Store
        </a>
      </div>
    </div>
  );
}
