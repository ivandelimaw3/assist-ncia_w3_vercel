-- ============================================================
-- AssistTech — Schema completo para Supabase self-hosted
-- Rode tudo de uma vez no SQL Editor do seu painel Supabase
-- (https://supabase.w3controle.com.br)
-- ============================================================

-- 1) Função utilitária para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2) Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 3) Roles
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Admins can manage user roles"
  ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 4) Clientes
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  endereco TEXT,
  cidade TEXT,
  cep TEXT,
  telefone TEXT,
  email TEXT,
  estado TEXT,
  cpf TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own clients" ON public.clientes;
CREATE POLICY "Users can manage their own clients"
  ON public.clientes FOR ALL USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_clientes_updated_at ON public.clientes;
CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_clientes_user_id ON public.clientes(user_id);
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON public.clientes(nome);

-- 5) Produtos / Peças
CREATE TABLE IF NOT EXISTS public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT,
  quantidade INTEGER DEFAULT 0,
  quantidade_minima INTEGER DEFAULT 0,
  preco NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own products" ON public.produtos;
CREATE POLICY "Users can manage their own products"
  ON public.produtos FOR ALL USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_produtos_updated_at ON public.produtos;
CREATE TRIGGER update_produtos_updated_at
  BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_produtos_user_id ON public.produtos(user_id);

-- 6) Ordens de Serviço
CREATE TABLE IF NOT EXISTS public.ordens_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  numero_os INTEGER NOT NULL,
  cliente TEXT NOT NULL,
  equipamento TEXT NOT NULL,
  numero_serie TEXT,
  defeito_informado TEXT,
  defeito_constatado TEXT,
  observacoes TEXT,
  prioridade TEXT DEFAULT 'Normal',
  status TEXT DEFAULT 'Aguardando',
  data_entrada DATE,
  data_saida DATE,
  tipo_transporte TEXT,
  valor NUMERIC(10,2) DEFAULT 0,
  fotos TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, numero_os)
);

-- Caso a tabela já exista sem a coluna fotos
ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS fotos TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own service orders" ON public.ordens_servico;
CREATE POLICY "Users can manage their own service orders"
  ON public.ordens_servico FOR ALL USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_ordens_servico_updated_at ON public.ordens_servico;
CREATE TRIGGER update_ordens_servico_updated_at
  BEFORE UPDATE ON public.ordens_servico
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_ordens_servico_user_id ON public.ordens_servico(user_id);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_status ON public.ordens_servico(status);

-- 7) Trigger para criar profile + role 'user' ao cadastrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.email)
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'user');
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8) Storage bucket para fotos das OS (público para leitura)
INSERT INTO storage.buckets (id, name, public)
VALUES ('os-fotos', 'os-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies do bucket os-fotos
DROP POLICY IF EXISTS "OS fotos públicas para leitura" ON storage.objects;
CREATE POLICY "OS fotos públicas para leitura"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'os-fotos');

DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload em os-fotos" ON storage.objects;
CREATE POLICY "Usuários autenticados podem fazer upload em os-fotos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'os-fotos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias fotos" ON storage.objects;
CREATE POLICY "Usuários podem atualizar suas próprias fotos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'os-fotos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Usuários podem deletar suas próprias fotos" ON storage.objects;
CREATE POLICY "Usuários podem deletar suas próprias fotos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'os-fotos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
