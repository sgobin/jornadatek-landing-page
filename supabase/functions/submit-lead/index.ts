import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
  'Content-Type': 'application/json; charset=utf-8',
};

function cleanText(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLen);
}

function cleanOptional(value: unknown, maxLen: number): string | null {
  const cleaned = cleanText(value, maxLen);
  return cleaned.length > 0 ? cleaned : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ ok: false, error: 'Método não permitido.' }),
      { status: 405, headers: corsHeaders },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: 'Payload JSON inválido.' }),
      { status: 400, headers: corsHeaders },
    );
  }

  // Honeypot anti-spam: bots preenchem este campo invisível.
  // Responde 200 silenciosamente sem gravar no banco.
  const honeypot = cleanText(body.company_website, 120);
  if (honeypot.length > 0) {
    return new Response(
      JSON.stringify({ ok: true, ignored: true }),
      { status: 200, headers: corsHeaders },
    );
  }

  const name = cleanText(body.name, 120);
  const city = cleanText(body.city, 120);
  const phoneDigits = cleanText(body.phone, 24).replace(/\D/g, '');
  const source = cleanText(body.source, 60) || 'jornadatek';

  if (!/^\S+\s+\S+/.test(name)) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Informe seu nome completo.' }),
      { status: 400, headers: corsHeaders },
    );
  }

  if (city.length < 3) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Informe sua cidade e estado.' }),
      { status: 400, headers: corsHeaders },
    );
  }

  if (!/^[1-9]{2}\d{8,9}$/.test(phoneDigits)) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Informe um telefone com DDD válido.' }),
      { status: 400, headers: corsHeaders },
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return new Response(
      JSON.stringify({ ok: false, error: 'Serviço temporariamente indisponível.' }),
      { status: 500, headers: corsHeaders },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from('jornadatek_leads')
    .insert({
      name,
      city,
      phone: phoneDigits,
      source,
      utm_source: cleanOptional(body.utm_source, 100),
      utm_medium: cleanOptional(body.utm_medium, 100),
      utm_campaign: cleanOptional(body.utm_campaign, 120),
      utm_content: cleanOptional(body.utm_content, 120),
      utm_term: cleanOptional(body.utm_term, 120),
      page_url: cleanOptional(body.page_url, 500),
      referrer: cleanOptional(body.referrer, 500),
    })
    .select('id, created_at')
    .single();

  if (error) {
    console.error('Insert error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: 'Não foi possível registrar a solicitação.' }),
      { status: 500, headers: corsHeaders },
    );
  }

  return new Response(
    JSON.stringify({ ok: true, id: data.id, created_at: data.created_at }),
    { status: 201, headers: corsHeaders },
  );
});
