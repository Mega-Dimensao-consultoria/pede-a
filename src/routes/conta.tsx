import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteShell } from "@/components/site-shell";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, User, Mail, MessageCircle, LayoutDashboard, ShoppingBag } from "lucide-react";
import { maskPhone } from "@/lib/format";

export const Route = createFileRoute("/conta")({
  component: ContaPage,
});

function ContaPage() {
  const { user, profile, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <SiteShell>
        <div className="p-8 text-center text-muted-foreground">Carregando...</div>
      </SiteShell>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <SiteShell>
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="flex items-center gap-3 py-2">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{profile?.nome || "Minha conta"}</h1>
            <p className="text-xs text-muted-foreground">Gerencie seus dados</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados de acesso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {profile?.identifier_type === "whatsapp" ? (
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <span>{profile?.whatsapp ? maskPhone(profile.whatsapp) : "—"}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{profile?.email || user.email}</span>
              </div>
            )}
            {profile?.cpf && (
              <div className="text-muted-foreground">CPF: {profile.cpf}</div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-2">
          <Button asChild variant="outline" className="justify-start">
            <Link to="/carrinho">
              <ShoppingBag className="h-4 w-4 mr-2" /> Meu carrinho
            </Link>
          </Button>
          {isAdmin && (
            <Button asChild variant="outline" className="justify-start">
              <Link to="/admin/pedidos">
                <LayoutDashboard className="h-4 w-4 mr-2" /> Painel administrativo
              </Link>
            </Button>
          )}
          <Button variant="destructive" onClick={handleSignOut} className="justify-start">
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </div>
    </SiteShell>
  );
}