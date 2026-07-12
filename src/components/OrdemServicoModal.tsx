import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase, type OrdemServico, type Cliente } from "@/integrations/supabase/client";
import { useAuthContext } from "@/components/AuthProvider";
import { FotosUpload } from "@/components/FotosUpload";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: OrdemServico | null;
  nextNumero: number;
};

const empty = {
  cliente: "",
  equipamento: "",
  numero_serie: "",
  defeito_informado: "",
  defeito_constatado: "",
  observacoes: "",
  prioridade: "Normal",
  status: "Aguardando",
  data_entrada: new Date().toISOString().slice(0, 10),
  data_saida: "",
  valor: 0,
  fotos: [] as string[],
};

export function OrdemServicoModal({ open, onOpenChange, editing, nextNumero }: Props) {
  const { user } = useAuthContext();
  const qc = useQueryClient();
  const [form, setForm] = useState(empty);

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-list", user?.id],
    enabled: !!user && open,
    queryFn: async (): Promise<Cliente[]> => {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (editing) {
      setForm({
        cliente: editing.cliente,
        equipamento: editing.equipamento,
        numero_serie: editing.numero_serie ?? "",
        defeito_informado: editing.defeito_informado ?? "",
        defeito_constatado: editing.defeito_constatado ?? "",
        observacoes: editing.observacoes ?? "",
        prioridade: editing.prioridade ?? "Normal",
        status: editing.status ?? "Aguardando",
        data_entrada: editing.data_entrada ?? new Date().toISOString().slice(0, 10),
        data_saida: editing.data_saida ?? "",
        valor: Number(editing.valor ?? 0),
        fotos: editing.fotos ?? [],
      });
    } else {
      setForm(empty);
    }
  }, [editing, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");
      const payload = {
        cliente: form.cliente,
        equipamento: form.equipamento,
        numero_serie: form.numero_serie || null,
        defeito_informado: form.defeito_informado || null,
        defeito_constatado: form.defeito_constatado || null,
        observacoes: form.observacoes || null,
        prioridade: form.prioridade,
        status: form.status,
        data_entrada: form.data_entrada || null,
        data_saida: form.data_saida || null,
        valor: form.valor,
        fotos: form.fotos,
        user_id: user.id,
      };
      if (editing) {
        const { error } = await supabase
          .from("ordens_servico")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("ordens_servico")
          .insert({ ...payload, numero_os: nextNumero });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "OS atualizada" : "OS criada");
      qc.invalidateQueries({ queryKey: ["ordens"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing
              ? `Editar OS #${String(editing.numero_os).padStart(4, "0")}`
              : `Nova OS #${String(nextNumero).padStart(4, "0")}`}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Cliente *</Label>
              {clientes.length > 0 ? (
                <Select
                  value={form.cliente}
                  onValueChange={(v) => setForm({ ...form, cliente: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.nome}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={form.cliente}
                  onChange={(e) => setForm({ ...form, cliente: e.target.value })}
                  required
                  placeholder="Nome do cliente"
                />
              )}
            </div>

            <div>
              <Label>Equipamento *</Label>
              <Input
                value={form.equipamento}
                onChange={(e) => setForm({ ...form, equipamento: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Número de série</Label>
              <Input
                value={form.numero_serie}
                onChange={(e) => setForm({ ...form, numero_serie: e.target.value })}
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aguardando">Aguardando</SelectItem>
                  <SelectItem value="Diagnóstico">Diagnóstico</SelectItem>
                  <SelectItem value="Em andamento">Em andamento</SelectItem>
                  <SelectItem value="Concluída">Concluída</SelectItem>
                  <SelectItem value="Cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select
                value={form.prioridade}
                onValueChange={(v) => setForm({ ...form, prioridade: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Baixa">Baixa</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Alta">Alta</SelectItem>
                  <SelectItem value="Urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Data de entrada</Label>
              <Input
                type="date"
                value={form.data_entrada}
                onChange={(e) => setForm({ ...form, data_entrada: e.target.value })}
              />
            </div>
            <div>
              <Label>Data de saída</Label>
              <Input
                type="date"
                value={form.data_saida}
                onChange={(e) => setForm({ ...form, data_saida: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <Label>Defeito informado</Label>
              <Textarea
                value={form.defeito_informado}
                onChange={(e) => setForm({ ...form, defeito_informado: e.target.value })}
                rows={2}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Defeito constatado</Label>
              <Textarea
                value={form.defeito_constatado}
                onChange={(e) => setForm({ ...form, defeito_constatado: e.target.value })}
                rows={2}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Observações</Label>
              <Textarea
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                rows={2}
              />
            </div>

            <div>
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })}
              />
            </div>

            <div className="md:col-span-2">
              <Label>Fotos do equipamento (até 3)</Label>
              <div className="mt-2">
                <FotosUpload
                  fotos={form.fotos}
                  onChange={(fotos) => setForm({ ...form, fotos })}
                  max={3}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
