import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ClipboardList,
  Wrench,
  CheckCircle2,
  DollarSign,
  Clock,
  AlertTriangle,
  LogOut,
  CalendarDays,
  KeyRound,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase, type OrdemServico } from "@/integrations/supabase/client";
import { useAuthContext } from "@/components/AuthProvider";
import { OrdemServicoDetalheModal } from "@/components/OrdemServicoDetalheModal";
import { AlterarSenhaDialog } from "@/components/AlterarSenhaDialog";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

function Dashboard() {
  const { user, signOut } = useAuthContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  const hoje = new Date();
  const [mesSelecionado, setMesSelecionado] = useState(hoje.getMonth());
  const [anoSelecionado, setAnoSelecionado] = useState(hoje.getFullYear());
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [detalheOS, setDetalheOS] = useState<OrdemServico | null>(null);
  const [detalheOpen, setDetalheOpen] = useState(false);
  const [senhaOpen, setSenhaOpen] = useState(false);

  const isMesSelecionado = (dataStr: string | null) => {
    if (!dataStr) return false;
    const data = new Date(dataStr + "T00:00:00");
    return data.getMonth() === mesSelecionado && data.getFullYear() === anoSelecionado;
  };

  const isAnoCorrente = (dataStr: string | null) => {
    if (!dataStr) return false;
    const data = new Date(dataStr + "T00:00:00");
    return data.getFullYear() === hoje.getFullYear();
  };

  const ordensDoPeriodo = mostrarTodos
    ? ordens.filter((o) => isAnoCorrente(o.data_entrada))
    : ordens.filter((o) => isMesSelecionado(o.data_entrada));

  const stats = {
    total: ordensDoPeriodo.length,
    aguardando: ordensDoPeriodo.filter((o) => o.status === "Aguardando" || o.status === "Diagnóstico").length,
    andamento: ordensDoPeriodo.filter((o) => o.status === "Em andamento" || o.status === "Em Andamento")
      .length,
    concluidas: ordensDoPeriodo.filter((o) => o.status === "Concluída" || o.status === "Concluido").length,
    urgentes: ordensDoPeriodo.filter((o) => o.prioridade === "Alta" || o.prioridade === "Urgente").length,
    faturamento: ordensDoPeriodo
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
      label: mostrarTodos ? "Faturamento Anual" : "Faturamento do mês",
      value: stats.faturamento.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
      icon: DollarSign,
      color: "text-success",
    },
  ];

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    navigate({ to: "/login", replace: true });
  };

  const handleHoje = () => {
    setMostrarTodos(false);
    setMesSelecionado(hoje.getMonth());
    setAnoSelecionado(hoje.getFullYear());
  };

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  const anos = Array.from({ length: hoje.getFullYear() - 2020 + 2 }, (_, i) => 2020 + i);

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ordens de Serviços</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral da sua operação · {clientesCount} cliente(s) cadastrado(s)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground hidden sm:block truncate max-w-[200px]">
            {user?.email}
          </p>
          <Button variant="outline" size="sm" onClick={() => setSenhaOpen(true)}>
            <KeyRound className="h-4 w-4 mr-2" />
            Alterar senha
          </Button>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Período:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={String(mesSelecionado)}
            onValueChange={(v) => setMesSelecionado(Number(v))}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              {meses.map((m, i) => (
                <SelectItem key={i} value={String(i)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(anoSelecionado)}
            onValueChange={(v) => setAnoSelecionado(Number(v))}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {anos.map((a) => (
                <SelectItem key={a} value={String(a)}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={handleHoje}>
            Hoje
          </Button>
          <Button
            variant={mostrarTodos ? "default" : "outline"}
            size="sm"
            onClick={() => setMostrarTodos((v) => !v)}
          >
            Todos
          </Button>
        </div>
      </div>


      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-3">
            <div className="flex items-start justify-between mb-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                {label}
              </p>
              <Icon className={`h-3.5 w-3.5 ${color}`} />
            </div>
            <p className="text-lg font-bold">{isLoading ? "—" : value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">
          Ordens recentes · {mostrarTodos ? `Todas as ordens do ano ${hoje.getFullYear()}` : `${meses[mesSelecionado]} ${anoSelecionado}`}
        </h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : ordensDoPeriodo.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma ordem de serviço neste período.
          </p>
        ) : (
          <div className="divide-y">
            {ordensDoPeriodo.map((os) => (
              <button
                key={os.id}
                type="button"
                onClick={() => {
                  setDetalheOS(os);
                  setDetalheOpen(true);
                }}
                className="w-full text-left py-3 flex items-center justify-between hover:bg-accent/50 rounded-md px-2 -mx-2 transition-colors"
              >
                <div>
                  <p className="font-medium">
                    OS #{String(os.numero_os).padStart(4, "0")} · {os.cliente}
                  </p>
                  <p className="text-sm text-muted-foreground">{os.equipamento}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground">
                  {os.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </Card>

      <OrdemServicoDetalheModal
        open={detalheOpen}
        onOpenChange={setDetalheOpen}
        os={detalheOS}
      />

      <AlterarSenhaDialog open={senhaOpen} onOpenChange={setSenhaOpen} />
    </div>
  );
}

