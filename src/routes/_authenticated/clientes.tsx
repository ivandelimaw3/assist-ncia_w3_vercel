import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase, type Cliente } from "@/integrations/supabase/client";
import { useAuthContext } from "@/components/AuthProvider";
import { maskCPFCNPJ, maskCEP, maskTelefone } from "@/lib/masks";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated/clientes")({
  component: ClientesPage,
  validateSearch: z.object({
    search: z.string().optional(),
  }),
});

const empty = {
  nome: "",
  email: "",
  telefone: "",
  cpf: "",
  endereco: "",
  cidade: "",
  estado: "",
  cep: "",
};

function ClientesPage() {
  const { user } = useAuthContext();
  const qc = useQueryClient();
  const { search: initialSearch } = Route.useSearch();
  const [search, setSearch] = useState(initialSearch ?? "");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [form, setForm] = useState(empty);

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ["clientes", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Cliente[]> => {
      const { data, error } = await supabase.from("clientes").select("*").order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (editing) {
      setForm({
        nome: editing.nome,
        email: editing.email ?? "",
        telefone: editing.telefone ?? "",
        cpf: editing.cpf ?? "",
        endereco: editing.endereco ?? "",
        cidade: editing.cidade ?? "",
        estado: editing.estado ?? "",
        cep: editing.cep ?? "",
      });
    } else {
      setForm(empty);
    }
  }, [editing, open]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");
      const payload = {
        nome: form.nome,
        email: form.email || null,
        telefone: form.telefone || null,
        cpf: form.cpf || null,
        endereco: form.endereco || null,
        cidade: form.cidade || null,
        estado: form.estado || null,
        cep: form.cep || null,
        user_id: user.id,
      };
      if (editing) {
        const { error } = await supabase.from("clientes").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clientes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Cliente atualizado" : "Cliente cadastrado");
      qc.invalidateQueries({ queryKey: ["clientes"] });
      qc.invalidateQueries({ queryKey: ["clientes-count"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente excluído");
      qc.invalidateQueries({ queryKey: ["clientes"] });
      qc.invalidateQueries({ queryKey: ["clientes-count"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = clientes.filter(
    (c) =>
      !search ||
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.telefone ?? "").includes(search),
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground mt-1">{clientes.length} cliente(s)</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> Novo cliente
        </Button>
      </header>

      <Card className="p-4">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou telefone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Cidade/UF</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhum cliente encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell>{c.email ?? "—"}</TableCell>
                  <TableCell>{c.telefone ?? "—"}</TableCell>
                  <TableCell>
                    {[c.cidade, c.estado].filter(Boolean).join(" / ") || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditing(c);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Excluir ${c.nome}?`)) deleteMutation.mutate(c.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            className="space-y-3"
          >
            <div>
              <Label>Nome *</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: maskTelefone(e.target.value) })}
                  placeholder="(00) 00000-0000"
                  inputMode="numeric"
                />
              </div>
              <div>
                <Label>CPF/CNPJ</Label>
                <Input
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: maskCPFCNPJ(e.target.value) })}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                />
              </div>
              <div>
                <Label>CEP</Label>
                <Input
                  value={form.cep}
                  onChange={(e) => setForm({ ...form, cep: maskCEP(e.target.value) })}
                  onBlur={async (e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    if (digits.length !== 8) return;
                    try {
                      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
                      const data = await res.json();
                      if (data.erro) {
                        toast.error("CEP não encontrado");
                        return;
                      }
                      setForm((f) => ({
                        ...f,
                        endereco:
                          [data.logradouro, data.bairro].filter(Boolean).join(", ") || f.endereco,
                        cidade: data.localidade || f.cidade,
                        estado: data.uf || f.estado,
                      }));
                    } catch {
                      toast.error("Erro ao buscar CEP");
                    }
                  }}
                  placeholder="00000-000"
                  inputMode="numeric"
                />
              </div>
              <div className="col-span-2">
                <Label>Endereço</Label>
                <Input
                  value={form.endereco}
                  onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input
                  value={form.cidade}
                  onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                />
              </div>
              <div>
                <Label>Estado</Label>
                <Input
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value })}
                  maxLength={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
