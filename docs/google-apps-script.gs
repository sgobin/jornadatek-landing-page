/**
 * JornadaTEK | KREBS — Receptor de Leads para Google Sheets
 *
 * COMO INSTALAR (2 minutos):
 * 1. Crie uma planilha no Google Sheets (ex.: "Leads JornadaTEK - KREBS").
 * 2. No menu superior, clique em: Extensões → Apps Script.
 * 3. Apague o código padrão e cole TODO este arquivo.
 * 4. (Opcional) Preencha NOTIFY_EMAIL abaixo se quiser receber aviso por e-mail a cada lead.
 * 5. Salve (Cmd+S / Ctrl+S) e clique em: Implantar → Nova implantação.
 * 6. Tipo: "App da Web"
 *    - Executar como: "Eu"
 *    - Quem pode acessar: "Qualquer pessoa"
 * 7. Clique em "Implantar", autorize o acesso à planilha e copie a "URL do app da Web" (termina em /exec).
 * 8. Cole essa URL em config.js → leadEndpoint (ou envie para atualizarmos automaticamente).
 */

const SHEET_NAME = 'Leads';
// Opcional: informe um ou mais e-mails separados por vírgula para aviso automático (ex.: 'comercial@krebs.com.br')
const NOTIFY_EMAIL = '';

const HEADERS = [
  'Data / Hora',
  'Nome completo',
  'Nome da fazenda',
  'Cidade | Estado',
  'Telefone (WhatsApp)',
  'Link WhatsApp',
  'Status',
  'Origem',
  'UTM Source',
  'UTM Medium',
  'UTM Campaign',
  'Página',
];

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function cleanText(value, maxLen) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLen);
}

function formatBrPhone(digits) {
  if (digits.length === 11) {
    return '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 7) + '-' + digits.slice(7);
  }
  if (digits.length === 10) {
    return '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 6) + '-' + digits.slice(6);
  }
  return digits;
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.getSheets()[0];
    sheet.setName(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange
      .setBackground('#00583f')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setHorizontalAlignment('left');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, 1, 155);
    sheet.setColumnWidths(2, 3, 210);
    sheet.setColumnWidths(5, 2, 165);
    sheet.setColumnWidths(7, 1, 130);
  }

  return sheet;
}

function doGet() {
  return jsonResponse({ ok: true, service: 'JornadaTEK Leads (Google Sheets)' });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);

    const raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    let body;
    try {
      body = JSON.parse(raw);
    } catch (err) {
      return jsonResponse({ ok: false, error: 'Payload JSON inválido.' });
    }

    // Honeypot anti-spam: descarta silenciosamente envios de bots.
    if (cleanText(body.company_website, 120).length > 0) {
      return jsonResponse({ ok: true, ignored: true });
    }

    const name = cleanText(body.name, 120);
    const farm = cleanText(body.farm, 120);
    const city = cleanText(body.city, 120);
    const phoneDigits = cleanText(body.phone, 24).replace(/\D/g, '');
    const source = cleanText(body.source, 60) || 'jornadatek';

    if (!/^\S+\s+\S+/.test(name)) {
      return jsonResponse({ ok: false, error: 'Informe seu nome completo.' });
    }
    if (farm.length < 2) {
      return jsonResponse({ ok: false, error: 'Informe o nome da sua fazenda.' });
    }
    if (city.length < 3) {
      return jsonResponse({ ok: false, error: 'Informe sua cidade e estado.' });
    }
    if (!/^[1-9]{2}\d{8,9}$/.test(phoneDigits)) {
      return jsonResponse({ ok: false, error: 'Informe um telefone com DDD válido.' });
    }

    const sheet = getOrCreateSheet();
    const now = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss');
    const phoneFormatted = formatBrPhone(phoneDigits);
    const waText = encodeURIComponent(
      'Olá ' + name.split(' ')[0] + '! Recebemos sua solicitação do JornadaTEK para a fazenda ' + farm + '.'
    );
    const waFormula = '=HYPERLINK("https://wa.me/55' + phoneDigits + '?text=' + waText + '", "Abrir WhatsApp")';

    sheet.appendRow([
      now,
      name,
      farm,
      city,
      phoneFormatted,
      waFormula,
      'Novo',
      source,
      cleanText(body.utm_source, 100),
      cleanText(body.utm_medium, 100),
      cleanText(body.utm_campaign, 120),
      cleanText(body.page_url, 300),
    ]);

    if (NOTIFY_EMAIL) {
      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        subject: '[JornadaTEK] Nova solicitação — ' + farm + ' (' + city + ')',
        body: [
          'Nova solicitação recebida pela Landing Page JornadaTEK:',
          '',
          'Data/Hora: ' + now,
          'Nome: ' + name,
          'Fazenda: ' + farm,
          'Cidade | Estado: ' + city,
          'Telefone: ' + phoneFormatted,
          'WhatsApp: https://wa.me/55' + phoneDigits,
        ].join('\n'),
      });
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: 'Erro interno ao registrar solicitação.' });
  } finally {
    lock.releaseLock();
  }
}
