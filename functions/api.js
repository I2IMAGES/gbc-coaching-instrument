// GBC Coaching Instrument — Cloudflare Pages Function
// Handles: touch event logging, session code generation, dashboard reads, admin auth
// Deployed at /api on Cloudflare Pages

export async function onRequestPost(context) {
  const { request, env } = context;

  const cors = {
    'Access-Control-Allow-Origin': env.CORS_ORIGIN || 'https://gbc.inward2onward.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400, cors);
  }

  const { action } = body;

  // ── TOUCH EVENT (client pages) ──────────────────────────────────────────────
  if (action === 'log_touch') {
    const { session_code, touchpoint, committed } = body;

    if (!session_code || !touchpoint) {
      return json({ error: 'Missing session_code or touchpoint' }, 400, cors);
    }

    const validTouchpoints = ['T1_opened', 'T2_opened', 'T3_opened', 'T3_committed'];
    if (!validTouchpoints.includes(touchpoint)) {
      return json({ error: 'Invalid touchpoint' }, 400, cors);
    }

    const result = await supabaseInsert(env, 'gbc_touches', {
      session_code: session_code.trim().toUpperCase(),
      touchpoint,
      committed: committed === true,
    });

    if (result.error) {
      return json({ error: 'DB insert failed', detail: result.error }, 500, cors);
    }

    return json({ success: true }, 200, cors);
  }

  // ── ADMIN: GENERATE CODE ────────────────────────────────────────────────────
  if (action === 'generate_code') {
    const { admin_password } = body;

    if (!admin_password || admin_password !== env.ADMIN_PASSWORD) {
      return json({ error: 'Unauthorized' }, 401, cors);
    }

    const code = generateCode();

    const result = await supabaseInsert(env, 'gbc_sessions', {
      session_code: code,
      status: 'active',
    });

    if (result.error) {
      return json({ error: 'Code creation failed', detail: result.error }, 500, cors);
    }

    return json({ success: true, session_code: code }, 200, cors);
  }

  // ── ADMIN: GET DASHBOARD ────────────────────────────────────────────────────
  if (action === 'get_dashboard') {
    const { admin_password } = body;

    if (!admin_password || admin_password !== env.ADMIN_PASSWORD) {
      return json({ error: 'Unauthorized' }, 401, cors);
    }

    const sessionsRes = await supabaseSelect(
      env,
      'gbc_sessions',
      'session_code,created_at,status',
      'order=created_at.desc'
    );

    if (sessionsRes.error) {
      return json({ error: 'Dashboard fetch failed' }, 500, cors);
    }

    const touchesRes = await supabaseSelect(
      env,
      'gbc_touches',
      'session_code,touchpoint,committed,created_at'
    );

    if (touchesRes.error) {
      return json({ error: 'Touches fetch failed' }, 500, cors);
    }

    const touchMap = {};
    for (const t of touchesRes.data) {
      const code = t.session_code;
      if (!touchMap[code]) {
        touchMap[code] = {
          T1_opened: null,
          T2_opened: null,
          T3_opened: null,
          T3_committed: false,
          last_touch: null,
        };
      }
      const ts = t.created_at;
      if (t.touchpoint === 'T1_opened' && !touchMap[code].T1_opened) touchMap[code].T1_opened = ts;
      if (t.touchpoint === 'T2_opened' && !touchMap[code].T2_opened) touchMap[code].T2_opened = ts;
      if (t.touchpoint === 'T3_opened' && !touchMap[code].T3_opened) touchMap[code].T3_opened = ts;
      if (t.touchpoint === 'T3_committed') touchMap[code].T3_committed = true;
      if (!touchMap[code].last_touch || ts > touchMap[code].last_touch) {
        touchMap[code].last_touch = ts;
      }
    }

    const rows = sessionsRes.data.map(s => ({
      session_code: s.session_code,
      created_at: s.created_at,
      status: s.status,
      ...(touchMap[s.session_code] || {
        T1_opened: null,
        T2_opened: null,
        T3_opened: null,
        T3_committed: false,
        last_touch: null,
      }),
    }));

    return json({ success: true, rows }, 200, cors);
  }

  return json({ error: 'Unknown action' }, 400, cors);
}

export async function onRequestOptions(context) {
  const { env } = context;
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': env.CORS_ORIGIN || 'https://gbc.inward2onward.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// ── HELPERS ──────────────────────────────────────────────────────────────────

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function generateCode() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 90) + 10);
  return `GBC-${mm}${dd}-${rand}`;
}

async function supabaseInsert(env, table, data) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': env.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    const err = await r.text();
    return { error: err };
  }
  return { error: null };
}

async function supabaseSelect(env, table, cols, query = '') {
  const qs = query ? `&${query}` : '';
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?select=${cols}${qs}`, {
    headers: {
      'apikey': env.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
    },
  });
  if (!r.ok) {
    const err = await r.text();
    return { data: [], error: err };
  }
  const data = await r.json();
  return { data, error: null };
}
