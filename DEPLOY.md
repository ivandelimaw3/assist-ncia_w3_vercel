# Deploy via Coolify / Docker (Nginx)

Este projeto roda como **SPA estático** (TanStack Router em modo client-only com prerender), servido por Nginx em um container.

## Como o build funciona

- `bun run build` gera os assets em `dist/client/`
- O TanStack Start prerenderer cria `_shell.html` (a casca SPA) + um `index.html` por rota (`/clientes/`, `/produtos/`, `/ordens-servico/`)
- O Dockerfile copia `_shell.html` como `index.html` raiz para servir a rota `/`
- O Nginx faz fallback para `index.html` em qualquer rota desconhecida — o TanStack Router resolve no cliente

## Variáveis de ambiente (build time)

Como Vite injeta os `VITE_*` no bundle no momento do build, você precisa passá-los como **build args** (não runtime envs):

```bash
docker build \
  --build-arg VITE_SUPABASE_URL=https://xxx.supabase.co \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=eyJ... \
  --build-arg VITE_SUPABASE_PROJECT_ID=xxx \
  -t assist-tech .
```

No **Coolify**: vá em *Build → Build Arguments* e cadastre as três variáveis com os mesmos nomes.

## Rodando localmente

```bash
docker build -t assist-tech \
  --build-arg VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
  --build-arg VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID \
  .
docker run -p 8080:80 assist-tech
# abra http://localhost:8080
```

## Healthcheck

O Nginx expõe `/healthz` retornando `200 OK`. Use no Coolify como health endpoint.

## Importante

- Mudou a UI ou rotas? → rebuilde a imagem (assets têm hash, então cache do navegador atualiza sozinho)
- Mudou variável `VITE_*`? → rebuilde a imagem (estão embutidas no JS)
- O bundle do Cloudflare Worker (`dist/server/`) **não é usado**; só o `dist/client/` vai pro Nginx
