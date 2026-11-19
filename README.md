# JornadaTEK | KREBS — Landing Page

Landing page estática de alta performance do programa itinerante **JornadaTEK (Caminhão Escola da KREBS)** com captura de leads automatizada.

## Links de Produção

- **Landing Page (GitHub Pages):** https://sgobin.github.io/jornadatek-landing-page/
- **Painel de Leads (Supabase):** https://supabase.com/dashboard/project/xotrllwlhtsbbhgbowbz/editor
- **Endpoint do Formulário:** `https://xotrllwlhtsbbhgbowbz.supabase.co/functions/v1/submit-lead`

## Arquitetura

- **Front-end estático:** HTML5, CSS3 consolidado e JavaScript vanilla (`index.html`, `styles.css`, `app.js`, `config.js`), publicado automaticamente via GitHub Actions no **GitHub Pages**.
- **Assets otimizados:**
  - Imagens em WebP redimensionadas sob medida e sem metadados (`assets/img/`).
  - 17 ícones extraídos de base64 inline para máscaras WebP em cache (`assets/icons/`).
  - Fontes Gotham convertidas para WOFF2 (`assets/fonts/`).
  - Vídeo otimizado (`H.264 720p 30fps +faststart`, ~19,6 MB, redução de 93% sobre o original de 295 MB) servido via **Supabase Storage CDN** com `preload="none"` e `poster` WebP.
- **Backend de Leads (LGPD):**
  - Tabela `public.jornadatek_leads` no Supabase (`sa-east-1` São Paulo) com **Row Level Security (RLS)** habilitado bloqueando leitura pública.
  - Edge Function `submit-lead` (`supabase/functions/submit-lead/index.ts`) com CORS, validação de dados, honeypot anti-spam e captura automática de parâmetros UTM.

## Como Visualizar e Exportar Leads

1. Acesse o [Table Editor do Supabase](https://supabase.com/dashboard/project/xotrllwlhtsbbhgbowbz/editor).
2. Abra a tabela `jornadatek_leads`.
3. Use o botão **Export** no topo para baixar todos os cadastros em CSV.

## Como Apontar o Domínio `jornadatek.krebs.com.br`

1. No painel de DNS do domínio `krebs.com.br`, crie o registro:
   - **Tipo:** `CNAME`
   - **Nome/Host:** `jornadatek`
   - **Valor/Destino:** `sgobin.github.io`
2. Crie um arquivo `CNAME` na raiz deste repositório contendo apenas:
   ```text
   jornadatek.krebs.com.br
   ```
3. Faça commit e push na branch `main` (o GitHub Actions fará deploy automático).
4. Em **Settings → Pages** no repositório GitHub, marque **Enforce HTTPS** assim que o certificado SSL for emitido automaticamente.
