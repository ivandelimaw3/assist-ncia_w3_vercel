import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://supabase.w3controle.com.br";
const SUPABASE_ANON_KEY =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3NzA1NTIyMCwiZXhwIjo0OTMyNzI4ODIwLCJyb2xlIjoiYW5vbiJ9.-ivRiy2ZRGG93xArs50Ksb9UYtPj7QyvB9C-kJL1md8";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});

export type OrdemServico = {
  id: string;
  user_id: string;
  numero_os: number;
  cliente: string;
  equipamento: string;
  numero_serie: string | null;
  defeito_informado: string | null;
  defeito_constatado: string | null;
  observacoes: string | null;
  prioridade: string | null;
  status: string | null;
  data_entrada: string | null;
  data_saida: string | null;
  tipo_transporte: string | null;
  valor: number | null;
  fotos: string[] | null;
  created_at: string;
  updated_at: string;
};

export type Cliente = {
  id: string;
  user_id: string;
  nome: string;
  endereco: string | null;
  cidade: string | null;
  cep: string | null;
  telefone: string | null;
  email: string | null;
  estado: string | null;
  cpf: string | null;
  created_at: string;
  updated_at: string;
};

export type Produto = {
  id: string;
  user_id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  quantidade: number | null;
  quantidade_minima: number | null;
  preco: number | null;
  created_at: string;
  updated_at: string;
};
