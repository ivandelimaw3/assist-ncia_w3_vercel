import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  Wrench,
  CheckCircle2,
  DollarSign,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase, type OrdemServico } from "@/integrations/supabase/client";
import { useAuthContext } from "@/components/AuthProvider";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuthContext();

  const { data: ordens = [], isLoading } = useQuery({
    queryKey: ["ordens", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<OrdemServico[]> => {
      const { data, error } = await supabase
        .from("ordens_servico")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: clientesCount = 0 } = useQuery({
    queryKey: ["clientes-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("clientes")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const stats = {
    total: ordens.length,
    aguardando: ordens.filter((o) => o.status === "Aguardando" || o.status === "Diagnóstico").length,
    andamento: ordens.filter((o) => o.status === "Em andamento" || o.status === "Em Andamento")
      .length,
    concluidas: ordens.filter((o) => o.status === "Concluída" || o.status === "Concluido").length,
    urgentes: ordens.filter((o) => o.prioridade === "Alta" || o.prioridade === "Urgente").length,
    faturamento: ordens
      .filter((o) => o.status === "Concluída" || o.status === "Concluido")
      .reduce((sum, o) => sum + Number(o.valor ?? 0), 0),
  };

  const cards = [
    { label: "Total de OS", value: stats.total, icon: ClipboardList, color: "text-info" },
    { label: "Aguardando", value: stats.aguardando, icon: Clock, color: "text-warning" },
    { label: "Em andamento", value: stats.andamento, icon: Wrench, color: "text-primary" },
    { label: "Concluídas", value: stats.concluidas, icon: CheckCircle2, color: "text-success" },
    { label: "Urgentes", value: stats.urgentes, icon: AlertTriangle, color: "text-destructive" },
    {
      label: "Faturamento",
      value: stats.faturamento.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
      icon: DollarSign,
      color: "text-success",
    },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Visão geral da sua operação · {clientesCount} cliente(s) cadastrado(s)
        </p>
      </header>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {label}
              </p>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className="text-2xl font-bold">{isLoading ? "—" : value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Ordens recentes</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : ordens.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma ordem de serviço cadastrada ainda.
          </p>
        ) : (
          <div className="divide-y">
            {ordens.slice(0, 5).map((os) => (
              <div key={os.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    OS #{os.numero_os} · {os.cliente}
                  </p>
                  <p className="text-sm text-muted-foreground">{os.equipamento}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground">
                  {os.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
