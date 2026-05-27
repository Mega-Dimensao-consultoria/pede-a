import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ShoppingBag, User, LayoutDashboard } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { FloatingCart } from "@/components/floating-cart";
import type { ReactNode } from "react";

export function SiteShell({ children }: { children: ReactNode }) {
  const { count } = useCart();
  const { isAdmin, user } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const NavItem = ({ to, icon: Icon, label, badge }: any) => {
    const active = path === to;
    return (
      <Link
        to={to}
        className={`flex flex-col items-center justify-center flex-1 py-2 gap-0.5 text-xs ${active ? "text-primary" : "text-muted-foreground"}`}
      >
        <div className="relative">
          <Icon className="h-5 w-5" />
          {badge ? (
            <Badge className="absolute -top-2 -right-3 h-4 min-w-4 px-1 text-[10px]" variant="destructive">{badge}</Badge>
          ) : null}
        </div>
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 pb-20">{children}</main>
      <FloatingCart />
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t bg-card flex max-w-2xl mx-auto">
        <NavItem to="/" icon={Home} label="Início" />
        <NavItem to="/carrinho" icon={ShoppingBag} label="Cesto" badge={count || undefined} />
        <NavItem to={user ? "/conta" : "/auth"} icon={User} label="Conta" />
        {isAdmin && <NavItem to="/admin/pedidos" icon={LayoutDashboard} label="Admin" />}
      </nav>
    </div>
  );
}