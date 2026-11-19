# JornadaTEK | KREBS — Landing Page

Landing page estática de alta performance do programa itinerante **JornadaTEK (Caminhão Escola da KREBS)** com captura de leads gratuita via **Google Sheets**.

## Links de Produção

- **Landing Page (GitHub Pages):** https://sgobin.github.io/jornadatek-landing-page/

## Arquitetura (Custo US\$ 0/mês)

- **Front-end estático:** HTML5, CSS3 consolidado e JavaScript vanilla (`index.html`, `styles.css`, `app.js`, `config.js`), publicado automaticamente via GitHub Actions no **GitHub Pages**.
- **Assets otimizados:**
  - Imagens em WebP redimensionadas sob medida e sem metadados (`assets/img/`).
  - 17 ícones extraídos de base64 inline para máscaras WebP em cache (`assets/icons/`).
  - Fontes Gotham convertidas para WOFF2 (`assets/fonts/`).
  - Vídeo institucional comprimido (`assets/video/jornada-dia-zero-web.mp4`, ~19,2 MB, redução de 93% sobre o original de 295 MB) com `preload="none"` e `poster` WebP.
- **Captura de Leads (Google Sheets + Apps Script):**
  - Código pronto em [docs/google-apps-script.gs](docs/google-apps-script.gs).
  - Grava automaticamente: `Data / Hora`, `Nome completo`, `Nome da fazenda`, `Cidade | Estado`, `Telefone (WhatsApp)`, link direto `Abrir WhatsApp`, `Status` e parâmetros `UTM`.
  - Planilha privada no Google Drive (LGPD) e proteção anti-spam via honeypot.

## Como Configurar o Google Sheets (2 minutos)

1. Crie uma planilha no Google Sheets (ex.: `Leads JornadaTEK - KREBS`).
2. Clique em **Extensões → Apps Script**.
3. Apague o código inicial e cole todo o conteúdo de [docs/google-apps-script.gs](docs/google-apps-script.gs).
4. *(Opcional)* Preencha `NOTIFY_EMAIL` no topo do script para receber notificação por e-mail a cada novo lead.
5. Salve e clique em **Implantar → Nova implantação**:
   - **Tipo:** `App da Web`
   - **Executar como:** `Eu`
   - **Quem pode acessar:** `Qualquer pessoa`
6. Autorize o acesso à planilha e copie a **URL do app da Web** (termina em `/exec`).
7. Cole essa URL em `config.js` no campo `leadEndpoint` e faça commit/push na branch `main`.

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
4. Em **Settings → Pages** no repositório GitHub, marque **Enforce HTTPS**.
