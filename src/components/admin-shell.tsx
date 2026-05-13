import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ClipboardList, Package, Tag, MapPin, Settings, ArrowLeft, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const items = [
  { to: "/admin/pedidos", label: "Pedidos", icon: ClipboardList },
  { to: "/admin/produtos", label: "Produtos", icon: Package },
  { to: "/admin/categorias", label: "Categorias", icon: Tag },
  { to: "/admin/bairros", label: "Bairros", icon: MapPin },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading, signOut } = useAuth();
  const nav = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!user) nav({ to: "/auth" });
    else if (!isAdmin) nav({ to: "/" });
  }, [user, isAdmin, loading, nav]);

  if (loading || !isAdmin) return <div className="p-8 text-center text-muted-foreground">Verificando acesso...</div>;

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-60 bg-sidebar text-sidebar-foreground flex-col">
        <div className="p-4 border-b border-sidebar-border">
          <div className="font-bold text-lg">Pede Aí</div>
          <div className="text-xs opacity-70">Painel Admin</div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {items.map((it) => {
            const active = path === it.to;
            return (
              <Link key={it.to} to={it.to} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent"}`}>
                <it.icon className="h-4 w-4" /> {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-2 border-t border-sidebar-border space-y-1">
          <Link to="/" className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-sidebar-accent"><ArrowLeft className="h-4 w-4" /> Ver loja</Link>
          <button onClick={async () => { await signOut(); nav({ to: "/" }); }} className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-sidebar-accent w-full"><LogOut className="h-4 w-4" /> Sair</button>
        </div>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden bg-sidebar text-sidebar-foreground p-3 flex gap-2 overflow-x-auto">
          {items.map((it) => {
            const active = path === it.to;
            return (
              <Link key={it.to} to={it.to} className={`shrink-0 px-3 py-1.5 rounded-md text-xs ${active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "bg-sidebar-accent"}`}>{it.label}</Link>
            );
          })}
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}