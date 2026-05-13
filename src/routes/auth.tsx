import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthModal } from "@/components/auth-modal";
import { useAuth } from "@/hooks/useAuth";
import { SiteShell } from "@/components/site-shell";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [user, loading, navigate]);

  return (
    <SiteShell>
      <div className="p-8 text-center text-muted-foreground">Entre na sua conta para continuar.</div>
      <AuthModal open={open} onOpenChange={(v) => { setOpen(v); if (!v) navigate({ to: "/" }); }} />
    </SiteShell>
  );
}