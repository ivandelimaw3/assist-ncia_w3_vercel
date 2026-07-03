# ---------- Stage 1: Build ----------
FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lockb* bunfig.toml* ./
RUN bun install --frozen-lockfile || bun install

COPY . .

# Variáveis públicas (VITE_*) precisam estar no build.
# Passe via --build-arg ou nos "Build Args" do Coolify.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID

RUN bun run build

# Garante que existe um index.html na raiz (SPA shell).
# O TanStack Start prerenderer gera _shell.html — usamos como fallback.
RUN if [ ! -f dist/client/index.html ]; then \
      cp dist/client/_shell.html dist/client/index.html; \
    fi

# Remove arquivos específicos do Cloudflare que não servem ao Nginx
RUN rm -f dist/client/wrangler.json dist/client/.assetsignore

# ---------- Stage 2: Nginx ----------
FROM nginx:alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/client /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz > /dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
