import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { maskPhone, onlyDigits } from "@/lib/format";
import { Mail, MessageCircle, Loader2, UserPlus } from "lucide-react";
import { useCart } from "@/hooks/useCart";

const wppEmail = (wpp: string) => `${onlyDigits(wpp)}@whatsapp.pedeai.local`;

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.7 2.9l5.7-5.7C33.7 6.3 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.7 2.9l5.7-5.7C33.7 6.3 29.1 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 43.5c5 0 9.6-1.9 13-5l-6-5.1c-2 1.4-4.4 2.2-7 2.2-5.2 0-9.6-3.1-11.3-7.5l-6.5 5C9.6 39 16.3 43.5 24 43.5z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6 5.1c-.4.4 6.5-4.7 6.5-14.8 0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.42 2.21-1.13 3-.78.87-2.05 1.55-3.06 1.47-.13-1.1.45-2.27 1.16-3.04.79-.86 2.13-1.5 3.03-1.43zM20.5 17.07c-.55 1.27-.81 1.84-1.51 2.96-.99 1.56-2.39 3.51-4.13 3.52-1.55.02-1.95-1-4.06-1-2.11.01-2.54 1.02-4.09 1-1.74-.01-3.07-1.77-4.06-3.33C.27 16.36-.27 11.34 1.4 8.66c1.18-1.9 3.05-3.02 4.81-3.02 1.79 0 2.92 1 4.4 1 1.44 0 2.32-1 4.39-1 1.57 0 3.23.86 4.41 2.34-3.88 2.13-3.25 7.66 1.09 9.09z"/>
    </svg>
  );
}

export function AuthModal({ open, onOpenChange, onSuccess, allowGuest = true }: { open: boolean; onOpenChange: (v: boolean) => void; onSuccess?: () => void; allowGuest?: boolean }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [identifier, setIdentifier] = useState<"email" | "whatsapp">("email");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<"google" | "apple" | null>(null);
  const [guestMode, setGuestMode] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");
  const { setGuest } = useCart();

  const submitGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await setGuest(guestEmail);
      toast.success("Tudo certo! Você já pode continuar comprando.");
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "E-mail inválido");
    } finally {
      setBusy(false);
    }
  };

  const signInOAuth = async (provider: "google" | "apple") => {
    setOauthBusy(provider);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.message || `Erro ao entrar com ${provider}`);
    } finally {
      setOauthBusy(null);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const loginEmail = identifier === "email" ? email.trim() : wppEmail(whatsapp);
      if (identifier === "whatsapp" && onlyDigits(whatsapp).length < 10) {
        toast.error("WhatsApp inválido");
        return;
      }
      if (mode === "signup") {
        if (!nome.trim()) {
          toast.error("Informe seu nome");
          return;
        }
        if (senha.length < 6) {
          toast.error("Senha precisa ter ao menos 6 caracteres");
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: loginEmail,
          password: senha,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              nome,
              identifier_type: identifier,
              whatsapp: identifier === "whatsapp" ? onlyDigits(whatsapp) : null,
            },
          },
        });
        if (error) throw error;
        toast.success("Conta criada!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: senha });
        if (error) throw error;
        toast.success("Bem-vindo!");
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Erro de autenticação");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Entre para continuar</DialogTitle>
          <DialogDescription>
            {allowGuest ? "Crie uma conta, entre ou continue só com o seu e-mail." : "Acesse sua conta para finalizar o pedido."}
          </DialogDescription>
        </DialogHeader>
        {allowGuest && guestMode ? (
          <form onSubmit={submitGuest} className="space-y-3">
            <div>
              <Label htmlFor="guest-email">Seu e-mail</Label>
              <Input id="guest-email" type="email" required value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="voce@exemplo.com" />
              <p className="text-xs text-muted-foreground mt-1">
                Usamos seu e-mail apenas para enviar o link do seu pedido caso você esqueça itens no cesto.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Continuar comprando
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setGuestMode(false)}>
              Voltar
            </Button>
          </form>
        ) : (
          <>
        <div className="space-y-2">
          <Button type="button" variant="outline" className="w-full gap-2" onClick={() => signInOAuth("google")} disabled={!!oauthBusy}>
            {oauthBusy === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon className="h-4 w-4" />}
            Continuar com Google
          </Button>
          <Button type="button" variant="outline" className="w-full gap-2" onClick={() => signInOAuth("apple")} disabled={!!oauthBusy}>
            {oauthBusy === "apple" ? <Loader2 className="h-4 w-4 animate-spin" /> : <AppleIcon className="h-4 w-4" />}
            Continuar com Apple
          </Button>
          {allowGuest && (
            <Button type="button" variant="secondary" className="w-full gap-2" onClick={() => setGuestMode(true)}>
              <UserPlus className="h-4 w-4" /> Continuar sem cadastro
            </Button>
          )}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-background px-2 text-muted-foreground">ou</span></div>
          </div>
        </div>
        <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Cadastrar</TabsTrigger>
          </TabsList>
          <TabsContent value={mode} className="mt-4">
            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={identifier === "email" ? "default" : "outline"} onClick={() => setIdentifier("email")} className="gap-2">
                  <Mail className="h-4 w-4" /> E-mail
                </Button>
                <Button type="button" variant={identifier === "whatsapp" ? "default" : "outline"} onClick={() => setIdentifier("whatsapp")} className="gap-2">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </Button>
              </div>
              {mode === "signup" && (
                <div>
                  <Label htmlFor="nome">Nome</Label>
                  <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
                </div>
              )}
              {identifier === "email" ? (
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              ) : (
                <div>
                  <Label htmlFor="wpp">WhatsApp</Label>
                  <Input id="wpp" inputMode="numeric" value={whatsapp} onChange={(e) => setWhatsapp(maskPhone(e.target.value))} placeholder="(11) 99999-9999" required />
                </div>
              )}
              <div>
                <Label htmlFor="senha">Senha</Label>
                <Input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {mode === "login" ? "Entrar" : "Criar conta"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}