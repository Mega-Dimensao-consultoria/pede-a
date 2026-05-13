import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { SiteShell } from "@/components/site-shell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BR_STATES } from "@/lib/br-states";
import { LogOut, User, Mail, MessageCircle, LayoutDashboard, ShoppingBag, Plus, MapPin, Pencil, Trash2, Star, Loader2 } from "lucide-react";
import { maskPhone, maskCPF, maskCEP, onlyDigits, isValidCPF } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/conta")({
  component: ContaPage,
});

type Address = {
  id: string;
  user_id: string;
  rotulo: string | null;
  cep: string | null;
  rua: string;
  numero: string;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  referencia: string | null;
  is_default: boolean;
};

const emptyAddress = (): Omit<Address, "id" | "user_id"> => ({
  rotulo: "Casa",
  cep: "",
  rua: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  referencia: "",
  is_default: false,
});

function ContaPage() {
  const { user, profile, isAdmin, loading, signOut, refresh } = useAuth();
  const navigate = useNavigate();

  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [cpf, setCpf] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddr, setLoadingAddr] = useState(false);
  const [addrModal, setAddrModal] = useState<{ open: boolean; data: Partial<Address> }>({ open: false, data: emptyAddress() });
  const [savingAddr, setSavingAddr] = useState(false);
  const [cepBusy, setCepBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile) {
      const full = (profile.nome || "").trim();
      const idx = full.indexOf(" ");
      setNome(idx === -1 ? full : full.slice(0, idx));
      setSobrenome(idx === -1 ? "" : full.slice(idx + 1));
      setCpf(profile.cpf ? maskCPF(profile.cpf) : "");
    }
  }, [profile]);

  const loadAddresses = useCallback(async () => {
    if (!user) return;
    setLoadingAddr(true);
    const { data, error } = await supabase
      .from("user_addresses" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });
    if (!error) setAddresses((data as any) ?? []);
    setLoadingAddr(false);
  }, [user]);

  useEffect(() => { loadAddresses(); }, [loadAddresses]);

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

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cpfDigits = onlyDigits(cpf);
    if (!nome.trim()) return toast.error("Informe seu nome");
    if (cpfDigits && !isValidCPF(cpfDigits)) return toast.error("CPF inválido");
    setSavingProfile(true);
    const fullName = [nome.trim(), sobrenome.trim()].filter(Boolean).join(" ");
    const { error } = await supabase
      .from("profiles")
      .update({ nome: fullName, cpf: cpfDigits || null })
      .eq("id", user.id);
    setSavingProfile(false);
    if (error) return toast.error("Erro ao salvar");
    toast.success("Dados atualizados");
    refresh();
  };

  const fetchCep = async (cepRaw: string) => {
    const c = onlyDigits(cepRaw);
    if (c.length !== 8) return;
    setCepBusy(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${c}/json/`);
      const json = await res.json();
      if (json.erro) return toast.error("CEP não encontrado");
      setAddrModal((m) => ({
        open: true,
        data: {
          ...m.data,
          rua: json.logradouro || m.data.rua,
          bairro: json.bairro || m.data.bairro,
          cidade: json.localidade || m.data.cidade,
          estado: json.uf || m.data.estado,
        },
      }));
    } catch {
      toast.error("Erro ao buscar CEP");
    } finally {
      setCepBusy(false);
    }
  };

  const openNewAddr = () => setAddrModal({ open: true, data: emptyAddress() });
  const openEditAddr = (a: Address) => setAddrModal({ open: true, data: { ...a, cep: a.cep ? maskCEP(a.cep) : "" } });

  const saveAddress = async () => {
    const d = addrModal.data;
    if (!d.rua?.trim() || !d.numero?.trim()) return toast.error("Rua e número são obrigatórios");
    setSavingAddr(true);
    const payload = {
      user_id: user.id,
      rotulo: d.rotulo?.trim() || null,
      cep: d.cep ? onlyDigits(d.cep) : null,
      rua: d.rua.trim(),
      numero: d.numero.trim(),
      complemento: d.complemento?.trim() || null,
      bairro: d.bairro?.trim() || null,
      cidade: d.cidade?.trim() || null,
      estado: d.estado?.trim() || null,
      referencia: d.referencia?.trim() || null,
      is_default: !!d.is_default,
    };
    let error;
    if ((d as Address).id) {
      ({ error } = await supabase.from("user_addresses" as any).update(payload).eq("id", (d as Address).id));
    } else {
      ({ error } = await supabase.from("user_addresses" as any).insert(payload));
    }
    if (!error && payload.is_default) {
      await supabase
        .from("user_addresses" as any)
        .update({ is_default: false })
        .eq("user_id", user.id)
        .neq("id", (d as Address).id ?? "00000000-0000-0000-0000-000000000000");
    }
    setSavingAddr(false);
    if (error) return toast.error("Erro ao salvar endereço");
    toast.success("Endereço salvo");
    setAddrModal({ open: false, data: emptyAddress() });
    loadAddresses();
  };

  const deleteAddress = async (id: string) => {
    if (!confirm("Excluir este endereço?")) return;
    const { error } = await supabase.from("user_addresses" as any).delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir");
    toast.success("Endereço excluído");
    loadAddresses();
  };

  const setDefault = async (id: string) => {
    await supabase.from("user_addresses" as any).update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("user_addresses" as any).update({ is_default: true }).eq("id", id);
    loadAddresses();
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
          <CardContent className="space-y-2 text-sm">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados pessoais</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="nome">Nome</Label>
                  <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={50} />
                </div>
                <div>
                  <Label htmlFor="sobrenome">Sobrenome</Label>
                  <Input id="sobrenome" value={sobrenome} onChange={(e) => setSobrenome(e.target.value)} maxLength={80} />
                </div>
              </div>
              <div>
                <Label htmlFor="cpf">CPF</Label>
                <Input id="cpf" value={cpf} onChange={(e) => setCpf(maskCPF(e.target.value))} placeholder="000.000.000-00" inputMode="numeric" />
              </div>
              <Button type="submit" disabled={savingProfile} className="w-full">
                {savingProfile && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar alterações
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Endereços salvos</CardTitle>
            <Button size="sm" variant="outline" onClick={openNewAddr}>
              <Plus className="h-4 w-4 mr-1" /> Novo
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {loadingAddr ? (
              <div className="text-sm text-muted-foreground">Carregando...</div>
            ) : addresses.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">Nenhum endereço cadastrado</div>
            ) : (
              addresses.map((a) => (
                <div key={a.id} className="flex items-start gap-3 border rounded-lg p-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{a.rotulo || "Endereço"}</span>
                      {a.is_default && <Badge variant="secondary" className="text-[10px]">Padrão</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {a.rua}, {a.numero}{a.complemento ? ` - ${a.complemento}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[a.bairro, a.cidade, a.estado].filter(Boolean).join(" - ")}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    {!a.is_default && (
                      <Button size="icon" variant="ghost" onClick={() => setDefault(a.id)} title="Definir como padrão">
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => openEditAddr(a)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteAddress(a.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
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

      <Dialog open={addrModal.open} onOpenChange={(v) => setAddrModal((m) => ({ ...m, open: v }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{(addrModal.data as Address).id ? "Editar endereço" : "Novo endereço"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Rótulo</Label>
              <Input
                value={addrModal.data.rotulo ?? ""}
                onChange={(e) => setAddrModal((m) => ({ ...m, data: { ...m.data, rotulo: e.target.value } }))}
                placeholder="Casa, Trabalho..."
                maxLength={30}
              />
            </div>
            <div>
              <Label>CEP</Label>
              <div className="flex gap-2">
                <Input
                  value={addrModal.data.cep ?? ""}
                  onChange={(e) => setAddrModal((m) => ({ ...m, data: { ...m.data, cep: maskCEP(e.target.value) } }))}
                  onBlur={(e) => fetchCep(e.target.value)}
                  placeholder="00000-000"
                  inputMode="numeric"
                />
                {cepBusy && <Loader2 className="h-5 w-5 animate-spin self-center" />}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label>Rua</Label>
                <Input
                  value={addrModal.data.rua ?? ""}
                  onChange={(e) => setAddrModal((m) => ({ ...m, data: { ...m.data, rua: e.target.value } }))}
                  maxLength={120}
                />
              </div>
              <div>
                <Label>Número</Label>
                <Input
                  value={addrModal.data.numero ?? ""}
                  onChange={(e) => setAddrModal((m) => ({ ...m, data: { ...m.data, numero: e.target.value } }))}
                  maxLength={10}
                />
              </div>
            </div>
            <div>
              <Label>Complemento</Label>
              <Input
                value={addrModal.data.complemento ?? ""}
                onChange={(e) => setAddrModal((m) => ({ ...m, data: { ...m.data, complemento: e.target.value } }))}
                maxLength={60}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Bairro</Label>
                <Input
                  value={addrModal.data.bairro ?? ""}
                  onChange={(e) => setAddrModal((m) => ({ ...m, data: { ...m.data, bairro: e.target.value } }))}
                  maxLength={80}
                />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input
                  value={addrModal.data.cidade ?? ""}
                  onChange={(e) => setAddrModal((m) => ({ ...m, data: { ...m.data, cidade: e.target.value } }))}
                  maxLength={80}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>UF</Label>
                <Select
                  value={addrModal.data.estado ?? ""}
                  onValueChange={(v) => setAddrModal((m) => ({ ...m, data: { ...m.data, estado: v } }))}
                >
                  <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>
                    {BR_STATES.map((s) => (
                      <SelectItem key={s.uf} value={s.uf}>{s.uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Referência</Label>
                <Input
                  value={addrModal.data.referencia ?? ""}
                  onChange={(e) => setAddrModal((m) => ({ ...m, data: { ...m.data, referencia: e.target.value } }))}
                  maxLength={120}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!addrModal.data.is_default}
                onChange={(e) => setAddrModal((m) => ({ ...m, data: { ...m.data, is_default: e.target.checked } }))}
              />
              Definir como endereço padrão
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddrModal({ open: false, data: emptyAddress() })}>Cancelar</Button>
            <Button onClick={saveAddress} disabled={savingAddr}>
              {savingAddr && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SiteShell>
  );
}