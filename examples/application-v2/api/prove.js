//---------------------------------------------------------------------
// Endpoints -----------------------------------------------------------
const PRIMARY_PROVE_URL   = 'https://api.explorer.provable.com/v2/testnet/prove';
const FALLBACK_PROVE_URL  = 'https://accelerate.provable.com/testnet/prove';
//---------------------------------------------------------------------

// generic util --------------------------------------------------------
const delay = ms => new Promise(r => setTimeout(r, ms));

// prove API calls -----------------------------------------------------
async function proveAt(url, body) {
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Provable-API-Key': process.env.GATEWAY_API_KEY,
      },
      body: JSON.stringify(body),
    });
    const text = await resp.text();
    return { resp, text };
  } catch (e) {
    // Network / TLS / DNS errors: surface as a synthetic non-2xx so the caller can retry/fallback.
    const msg = e && e.message ? e.message : 'fetch failed';
    console.warn(`🌐  Fetch error calling ${url}: ${msg}`);
    const resp = { ok: false, status: 599, statusText: 'Network Error' };
    const text = JSON.stringify({ error: 'network-error', message: msg });
    return { resp, text };
  }
}

async function prove(body) {
  return proveAt(PRIMARY_PROVE_URL, body);
}

//---------------------------------------------------------------------
// HTTP handler --------------------------------------------------------
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  try {
    // ▶ Attempt #1 — primary endpoint
    console.log('▶ Attempt #1 → primary endpoint');
    let { resp, text } = await prove(req.body);

    switch (resp.status) {
      case 200:
      case 201: {
        console.log('✅  Prove succeeded on attempt #1 – status %d', resp.status);
        res.status(resp.status).send(text);
        return;
      }

      default: {
        if (resp.status >= 200 && resp.status < 300) {
          // (Defensive; 2xx other than 200/201)
          console.log('✅  Prove succeeded on attempt #1 – status %d', resp.status);
          res.status(resp.status).send(text);
          return;
        }

        // Non-2xx error (e.g., 5xx, 4xx) or synthetic 599 network error
        console.warn('⚠️  %d on attempt #1 → wait 2 s and retry primary', resp.status);
        await delay(2_000);

        console.log('▶ Attempt #2 → primary endpoint (retry after 2 s)');
        ({ resp, text } = await prove(req.body));

        if (resp.status === 200 || resp.status === 201) {
          console.log('✅  Prove succeeded on attempt #2 – status %d', resp.status);
          res.status(resp.status).send(text);
          return;
        }

        // If second attempt is rate limited, return without fallback.
        if (resp.status === 429) {
          console.warn('⛔  429 on attempt #2 → returning without fallback');
          res.status(resp.status).send(text);
          return;
        }

        // Third trial → fallback endpoint
        console.warn('⚠️  Still %d on attempt #2 → using fallback', resp.status);
        console.log('▶ Attempt #3 → fallback endpoint');
        ({ resp, text } = await proveAt(FALLBACK_PROVE_URL, req.body));

        console[resp.ok ? 'log' : 'warn'](
          '%s  Fallback finished – status %d',
          resp.ok ? '✅' : '⚠️',
          resp.status
        );
        res.status(resp.status).send(text);
        return;
      }
    }
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: 'internal-error', message: err.message || 'unknown' });
  }
}