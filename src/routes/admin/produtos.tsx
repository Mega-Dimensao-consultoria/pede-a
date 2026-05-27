import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtBRL } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Upload, ImagePlus, X } from "lucide-react";
import { resizeImage } from "@/lib/image-resize";

export const Route = createFileRoute("/admin/produtos")({ component: ProdutosAdmin });

type Form = {
  id?: string;
  nome: string;
  descricao: string;
  preco_base: number;
  category_id: string | null;
  imagens: string[];
  ativo: boolean;
  sizes: { label: string; price_delta: number }[];
  addons: { nome: string; preco: number; imagem_url?: string | null }[];
};

const empty: Form = { nome: "", descricao: "", preco_base: 0, category_id: null, imagens: [], ativo: true, sizes: [], addons: [] };

function ProdutosAdmin() {
  const qc = useQueryClient();
  const { data: products = [] } = useQuery({
    queryKey: ["admin_products"],
    queryFn: async () => (await supabase.from("products").select("*").order("nome")).data ?? [],
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["admin_categories_select"],
    queryFn: async () => (await supabase.from("categories").select("*").order("ordem")).data ?? [],
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty);
  const [uploading, setUploading] = useState(false);
  const [addonUploadIdx, setAddonUploadIdx] = useState<number | null>(null);

  const startNew = () => { setForm(empty); setOpen(true); };
  const startEdit = (p: any) => {
    const imgs: string[] = Array.isArray(p.imagens) && p.imagens.length
      ? p.imagens
      : p.imagem_url ? [p.imagem_url] : [];
    setForm({
      id: p.id, nome: p.nome, descricao: p.descricao || "", preco_base: p.preco_base,
      category_id: p.category_id, imagens: imgs, ativo: p.ativo,
      sizes: Array.isArray(p.sizes) ? p.sizes : [], addons: Array.isArray(p.addons) ? p.addons : [],
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.nome.trim()) return toast.error("Nome obrigatório");
    const payload = {
      nome: form.nome.trim(), descricao: form.descricao || null, preco_base: form.preco_base,
      category_id: form.category_id,
      imagem_url: form.imagens[0] ?? null,
      imagens: form.imagens,
      ativo: form.ativo,
      sizes: form.sizes as any, addons: form.addons as any,
    };
    const { error } = form.id
      ? await supabase.from("products").update(payload).eq("id", form.id)
      : await supabase.from("products").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Salvo"); setOpen(false); qc.invalidateQueries({ queryKey: ["admin_products"] });
  };

  const del = async (id: string) => {
    if (!confirm("Excluir produto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["admin_products"] });
  };

  const uploadOne = async (file: File): Promise<string> => {
    const blob = await resizeImage(file);
    const path = `${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage
      .from("products")
      .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (error) throw error;
    return supabase.storage.from("products").getPublicUrl(path).data.publicUrl;
  };

  const uploadProductImages = async (files: FileList) => {
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) urls.push(await uploadOne(f));
      setForm((f) => ({ ...f, imagens: [...f.imagens, ...urls] }));
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  };

  const uploadAddonImage = async (idx: number, file: File) => {
    setAddonUploadIdx(idx);
    try {
      const url = await uploadOne(file);
      setForm((f) => {
        const arr = [...f.addons];
        arr[idx] = { ...arr[idx], imagem_url: url };
        return { ...f, addons: arr };
      });
    } catch (e: any) { toast.error(e.message); }
    finally { setAddonUploadIdx(null); }
  };

  return (
    <AdminShell>
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Produtos</h1>
          <Button onClick={startNew}><Plus className="h-4 w-4 mr-1" /> Novo produto</Button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map((p: any) => (
            <div key={p.id} className="bg-card border rounded-xl overflow-hidden">
              {(p.imagens?.[0] ?? p.imagem_url) ? <img src={p.imagens?.[0] ?? p.imagem_url} alt={p.nome} className="w-full h-32 object-cover" /> : <div className="w-full h-32 bg-muted" />}
              <div className="p-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="font-semibold">{p.nome}</div>
                    <div className="text-sm text-muted-foreground">{fmtBRL(p.preco_base)}</div>
                  </div>
                  {!p.ativo && <span className="text-xs bg-muted px-2 py-0.5 rounded">inativo</span>}
                </div>
                <div className="flex gap-1 mt-2">
                  <Button size="sm" variant="outline" onClick={() => startEdit(p)}><Pencil className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" onClick={() => del(p.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>
              </div>
            </div>
          ))}
          {products.length === 0 && <div className="text-muted-foreground text-sm col-span-full text-center py-12">Nenhum produto.</div>}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Preço base</Label><Input type="number" step="0.01" value={form.preco_base} onChange={(e) => setForm({ ...form, preco_base: Number(e.target.value) })} /></div>
              <div><Label>Categoria</Label>
                <Select value={form.category_id ?? "none"} onValueChange={(v) => setForm({ ...form, category_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Imagens do produto</Label>
              <p className="text-xs text-muted-foreground mb-2">A primeira imagem aparece como capa no cardápio. Você pode adicionar várias.</p>
              <div className="flex flex-wrap gap-2">
                {form.imagens.map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} alt="" className="w-20 h-20 object-cover rounded border" />
                    {i === 0 && <span className="absolute top-0 left-0 bg-primary text-primary-foreground text-[10px] px-1 rounded-br">capa</span>}
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, imagens: form.imagens.filter((_, j) => j !== i) })}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow"
                      aria-label="Remover imagem"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <label className="cursor-pointer w-20 h-20 border-2 border-dashed rounded flex flex-col items-center justify-center text-muted-foreground hover:bg-accent">
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && e.target.files.length && uploadProductImages(e.target.files)} />
                  <Upload className="h-4 w-4" />
                  <span className="text-[10px] mt-1">{uploading ? "..." : "Adicionar"}</span>
                </label>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1"><Label>Tamanhos</Label>
                <Button size="sm" variant="outline" onClick={() => setForm({ ...form, sizes: [...form.sizes, { label: "", price_delta: 0 }] })}><Plus className="h-3 w-3" /></Button>
              </div>
              {form.sizes.map((s, i) => (
                <div key={i} className="flex gap-2 mb-1">
                  <Input placeholder="Ex: Grande" value={s.label} onChange={(e) => { const arr = [...form.sizes]; arr[i] = { ...arr[i], label: e.target.value }; setForm({ ...form, sizes: arr }); }} />
                  <Input type="number" step="0.01" placeholder="+R$" className="w-28" value={s.price_delta} onChange={(e) => { const arr = [...form.sizes]; arr[i] = { ...arr[i], price_delta: Number(e.target.value) }; setForm({ ...form, sizes: arr }); }} />
                  <Button size="icon" variant="ghost" onClick={() => setForm({ ...form, sizes: form.sizes.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1"><Label>Adicionais</Label>
                <Button size="sm" variant="outline" onClick={() => setForm({ ...form, addons: [...form.addons, { nome: "", preco: 0, imagem_url: null }] })}><Plus className="h-3 w-3" /></Button>
              </div>
              {form.addons.map((a, i) => (
                <div key={i} className="flex gap-2 mb-2 items-center">
                  <label className="relative w-12 h-12 shrink-0 border rounded cursor-pointer overflow-hidden bg-muted flex items-center justify-center text-muted-foreground hover:bg-accent">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAddonImage(i, e.target.files[0])} />
                    {a.imagem_url ? (
                      <img src={a.imagem_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImagePlus className="h-4 w-4" />
                    )}
                    {addonUploadIdx === i && <div className="absolute inset-0 bg-background/60 flex items-center justify-center text-[10px]">...</div>}
                  </label>
                  <Input placeholder="Ex: Bacon" value={a.nome} onChange={(e) => { const arr = [...form.addons]; arr[i] = { ...arr[i], nome: e.target.value }; setForm({ ...form, addons: arr }); }} />
                  <Input type="number" step="0.01" placeholder="R$" className="w-28" value={a.preco} onChange={(e) => { const arr = [...form.addons]; arr[i] = { ...arr[i], preco: Number(e.target.value) }; setForm({ ...form, addons: arr }); }} />
                  {a.imagem_url && (
                    <Button size="icon" variant="ghost" onClick={() => { const arr = [...form.addons]; arr[i] = { ...arr[i], imagem_url: null }; setForm({ ...form, addons: arr }); }} title="Remover imagem"><X className="h-4 w-4" /></Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => setForm({ ...form, addons: form.addons.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>

            <label className="flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} /> Ativo</label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}