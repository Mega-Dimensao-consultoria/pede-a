import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { maskPhone, onlyDigits } from "@/lib/format";
import { Mail, MessageCircle, Loader2 } from "lucide-react";

const wppEmail = (wpp: string) => `${onlyDigits(wpp)}@whatsapp.pedeai.local`;

export function AuthModal({ open, onOpenChange, onSuccess }: { open: boolean; onOpenChange: (v: boolean) => void; onSuccess?: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [identifier, setIdentifier] = useState<"email" | "whatsapp">("email");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [busy, setBusy] = useState(false);

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
          <DialogDescription>Acesse sua conta para salvar o carrinho.</DialogDescription>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  );
}