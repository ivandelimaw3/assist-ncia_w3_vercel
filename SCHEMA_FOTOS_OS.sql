-- ============================================================
-- AssistTech — Habilitar fotos nas Ordens de Serviço
-- Rode este script no SQL Editor do seu Supabase self-hosted
-- (https://supabase.w3controle.com.br)
-- ============================================================

-- 1) Coluna `fotos` (array de URLs públicas) na tabela ordens_servico
ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS fotos TEXT[] NOT NULL DEFAULT '{}';

-- 2) Bucket público de armazenamento das fotos
INSERT INTO storage.buckets (id, name, public)
VALUES ('os-fotos', 'os-fotos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3) Policies do bucket os-fotos
-- Leitura pública (para exibir as imagens no app/PDF)
DROP POLICY IF EXISTS "OS fotos públicas para leitura" ON storage.objects;
CREATE POLICY "OS fotos públicas para leitura"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'os-fotos');

-- Upload: apenas usuários autenticados, dentro de uma pasta com seu próprio user_id
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload em os-fotos" ON storage.objects;
CREATE POLICY "Usuários autenticados podem fazer upload em os-fotos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'os-fotos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Update: apenas dono do arquivo
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias fotos" ON storage.objects;
CREATE POLICY "Usuários podem atualizar suas próprias fotos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'os-fotos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Delete: apenas dono do arquivo
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias fotos" ON storage.objects;
CREATE POLICY "Usuários podem deletar suas próprias fotos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'os-fotos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4) Verificação rápida
-- SELECT column_name, data_type FROM information_schema.columns
--  WHERE table_schema='public' AND table_name='ordens_servico' AND column_name='fotos';
-- SELECT id, public FROM storage.buckets WHERE id='os-fotos';
