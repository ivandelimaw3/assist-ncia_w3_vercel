import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase, type OrdemServico } from "@/integrations/supabase/client";
import { useAuthContext } from "@/components/AuthProvider";
import { OrdemServicoModal } from "@/components/OrdemServicoModal";
import { OrdemServicoDetalheModal } from "@/components/OrdemServicoDetalheModal";

export const Route = createFileRoute("/_authenticated/ordens-servico")({
  component: OrdensServicoPage,
});

const STATUS_COLORS: Record<string, string> = {
  Aguardando: "bg-warning/15 text-warning-foreground border border-warning/30",
  Diagnóstico: "bg-info/15 text-info border border-info/30",
  "Em andamento": "bg-primary/15 text-primary border border-primary/30",
  "Em Andamento": "bg-primary/15 text-primary border border-primary/30",
  Concluída: "bg-success/15 text-success border border-success/30",
  Concluido: "bg-success/15 text-success border border-success/30",
  Cancelada: "bg-destructive/15 text-destructive border border-destructive/30",
};

function OrdensServicoPage() {
  const { user } = useAuthContext();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<OrdemServico | null>(null);
  const [detalheOpen, setDetalheOpen] = useState(false);
  const [detalheOS, setDetalheOS] = useState<OrdemServico | null>(null);

  const { data: ordens = [], isLoading } = useQuery({
    queryKey: ["ordens", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<OrdemServico[]> => {
      const { data, error } = await supabase
        .from("ordens_servico")
        .select("*")
        .order("data_entrada", { ascending: false })
        .order("numero_os", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ordens_servico").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("OS excluída");
      qc.invalidateQueries({ queryKey: ["ordens"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

    const filtered = ordens.filter((o) => {
    const matchesSearch =
      !search ||
      o.cliente.toLowerCase().includes(search.toLowerCase()) ||
      o.equipamento.toLowerCase().includes(search.toLowerCase()) ||
      String(o.numero_os).includes(search);
    const matchesStatus = statusFilter === "todos" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

 const sortedFiltered = [...filtered].sort((a, b) => Number(b.numero_os) - Number(a.numero_os));
    return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ordens de Serviço</h1>
          <p className="text-muted-foreground mt-1">
            {ordens.length} ordem(ns) cadastrada(s)
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> Nova OS
        </Button>
      </header>

      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, equipamento ou nº OS"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="Aguardando">Aguardando</SelectItem>
              <SelectItem value="Diagnóstico">Diagnóstico</SelectItem>
              <SelectItem value="Em andamento">Em andamento</SelectItem>
              <SelectItem value="Concluída">Concluída</SelectItem>
              <SelectItem value="Cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº OS</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Equipamento</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : sortedFiltered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhuma OS encontrada.
                </TableCell>
              </TableRow>
            ) : (
              sortedFiltered.map((os) => (
                <TableRow key={os.id}>
                  <TableCell className="font-medium">#{String(os.numero_os).padStart(4, "0")}</TableCell>
                  <TableCell>{os.cliente}</TableCell>
                  <TableCell>{os.equipamento}</TableCell>
                  <TableCell>
                    {os.data_entrada ? format(new Date(os.data_entrada), "dd/MM/yyyy") : "—"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs px-2 py-1 rounded-md ${
                        STATUS_COLORS[os.status ?? ""] ?? "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {os.status ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {Number(os.valor ?? 0).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Visualizar"
                      onClick={() => {
                        setDetalheOS(os);
                        setDetalheOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Editar"
                      onClick={() => {
                        setEditing(os);
                        setModalOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Excluir"
                      onClick={() => {
                        if (confirm(`Excluir OS #${String(os.numero_os).padStart(4, "0")}?`))
                          deleteMutation.mutate(os.id);
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

      <OrdemServicoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editing={editing}
        nextNumero={
          ordens.length > 0 ? Math.max(...ordens.map((o) => o.numero_os)) + 1 : 1
        }
      />

      <OrdemServicoDetalheModal
        open={detalheOpen}
        onOpenChange={setDetalheOpen}
        os={detalheOS}
      />
    </div>
  );
}
