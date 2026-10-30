// AkuMa accounts and private pack access.
// Players create an account (Minecraft name, e-mail, password), confirm the e-mail with a code,
// then the launcher reads the signed manifest and gets short-lived download tokens for the private B2 bucket.
// The B2 key lives only here, as Worker secrets.

const enc = new TextEncoder();
const HOUR = 3600e3, DAY = 24 * HOUR;
const SESSION_DAYS = 180, CODE_MINUTES = 15, CODE_ATTEMPTS = 5, RESEND_SECONDS = 60;
const MAX_LOGIN_FAILURES = 10, LOCK_MINUTES = 15, SIGNUPS_PER_HOUR = 5;
const DOWNLOAD_TOKEN_SECONDS = 6 * 3600;

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});
class Fail extends Error { constructor(status, message, extra = {}) { super(message); this.status = status; this.extra = extra; } }

const b64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const random = n => b64url(crypto.getRandomValues(new Uint8Array(n)));
const sha256 = async text => b64url(await crypto.subtle.digest('SHA-256', enc.encode(text)));
function same(a, b) {
  const x = enc.encode(a), y = enc.encode(b);
  return x.length === y.length && crypto.subtle.timingSafeEqual(x, y);
}
async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  // 100000 is the PBKDF2 maximum allowed by Workers.
  return b64url(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 100000 }, key, 256));
}
const newCode = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 1e6).padStart(6, '0');

function clean(body) {
  const pseudo = typeof body.pseudo === 'string' ? body.pseudo.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  return { pseudo, email, password };
}
function checkSignup({ pseudo, email, password }) {
  if (!/^[A-Za-z0-9_]{3,16}$/.test(pseudo)) throw new Fail(400, 'Pseudo Minecraft invalide : 3 à 16 caractères, lettres, chiffres ou _.');
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Fail(400, 'Adresse e-mail invalide.');
  if (password.length < 10 || password.length > 128) throw new Fail(400, 'Le mot de passe doit contenir entre 10 et 128 caractères.');
}

async function sendCode(env, email, pseudo, code) {
  if (!env.BREVO_API_KEY) {
    if (env.DEV === '1') { console.log(`[DEV] code for ${email}: ${code}`); return; }
    throw new Error('BREVO_API_KEY missing');
  }
  const text = `Bonjour ${pseudo},\n\nTon code de confirmation AkuMa : ${code}\nIl est valable ${CODE_MINUTES} minutes.\n\nSi tu n’as pas créé de compte AkuMa, ignore ce message.`;
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: 'AkuMa', email: env.MAIL_FROM }, to: [{ email, name: pseudo }],
      subject: `Ton code AkuMa : ${code}`, textContent: text,
      htmlContent: `<p>Bonjour ${pseudo},</p><p>Ton code de confirmation AkuMa :</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>Il est valable ${CODE_MINUTES} minutes. Si tu n’as pas créé de compte AkuMa, ignore ce message.</p>`,
    }),
  });
  if (!r.ok) throw new Error(`Brevo ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

async function issueCode(env, user) {
  const code = newCode(), now = Date.now();
  await env.DB.prepare('UPDATE users SET code_hash=?, code_expires=?, code_attempts=0, code_sent=? WHERE id=?')
    .bind(await sha256(`${user.id}:${code}`), now + CODE_MINUTES * 60e3, now, user.id).run();
  await sendCode(env, user.email, user.pseudo, code);
}

async function createSession(env, user) {
  const token = random(32);
  await env.DB.prepare('INSERT INTO sessions(token_hash,user_id,expires) VALUES(?,?,?)')
    .bind(await sha256(token), user.id, Date.now() + SESSION_DAYS * DAY).run();
  return { token, pseudo: user.pseudo, email: user.email };
}

async function sessionUser(request, env) {
  const m = /^Bearer ([A-Za-z0-9_-]{20,100})$/.exec(request.headers.get('authorization') || '');
  if (!m) throw new Fail(401, 'Connexion AkuMa requise.');
  const user = await env.DB.prepare('SELECT users.*, sessions.token_hash FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires>?')
    .bind(await sha256(m[1]), Date.now()).first();
  if (!user) throw new Fail(401, 'Session AkuMa expirée : reconnecte-toi.');
  return user;
}

async function signup(request, env, body) {
  const input = clean(body); checkSignup(input);
  const now = Date.now(), ip = request.headers.get('cf-connecting-ip') || 'local';
  await env.DB.prepare('DELETE FROM signups WHERE at<?').bind(now - HOUR).run();
  const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM signups WHERE ip=?').bind(ip).first();
  if (n >= SIGNUPS_PER_HOUR) throw new Fail(429, 'Trop de créations de compte depuis cette connexion. Réessaie dans une heure.');

  const byEmail = await env.DB.prepare('SELECT * FROM users WHERE email=?').bind(input.email).first();
  if (byEmail?.verified) throw new Fail(409, 'Cette adresse e-mail a déjà un compte AkuMa. Connecte-toi.');
  const byPseudo = await env.DB.prepare('SELECT * FROM users WHERE pseudo_key=?').bind(input.pseudo.toLowerCase()).first();
  if (byPseudo && byPseudo.id !== byEmail?.id) {
    // An unconfirmed account cannot hold a name for more than a day.
    if (byPseudo.verified || byPseudo.created > now - DAY) throw new Fail(409, 'Ce pseudo est déjà utilisé.');
    await env.DB.prepare('DELETE FROM users WHERE id=?').bind(byPseudo.id).run();
  }
  const salt = random(16), password = await hashPassword(input.password, salt);
  let user;
  if (byEmail) {
    if (byEmail.code_sent > now - RESEND_SECONDS * 1e3) throw new Fail(429, 'Patiente une minute avant de demander un nouveau code.');
    await env.DB.prepare('UPDATE users SET pseudo=?, pseudo_key=?, salt=?, password=?, created=? WHERE id=?')
      .bind(input.pseudo, input.pseudo.toLowerCase(), salt, password, now, byEmail.id).run();
    user = { ...byEmail, pseudo: input.pseudo };
  } else {
    user = await env.DB.prepare('INSERT INTO users(pseudo,pseudo_key,email,salt,password,created) VALUES(?,?,?,?,?,?) RETURNING *')
      .bind(input.pseudo, input.pseudo.toLowerCase(), input.email, salt, password, now).first();
  }
  await env.DB.prepare('INSERT INTO signups(ip,at) VALUES(?,?)').bind(ip, now).run();
  await issueCode(env, user);
  return { email: user.email };
}

async function verify(env, body) {
  const email = clean(body).email, code = typeof body.code === 'string' ? body.code.trim() : '';
  const user = await env.DB.prepare('SELECT * FROM users WHERE email=?').bind(email).first();
  if (!user || user.verified || !user.code_hash) throw new Fail(400, 'Aucune confirmation en attente pour cette adresse.');
  if (user.code_expires < Date.now() || user.code_attempts >= CODE_ATTEMPTS) throw new Fail(400, 'Code expiré : demande un nouveau code.');
  if (!/^\d{6}$/.test(code) || !same(await sha256(`${user.id}:${code}`), user.code_hash)) {
    await env.DB.prepare('UPDATE users SET code_attempts=code_attempts+1 WHERE id=?').bind(user.id).run();
    throw new Fail(400, 'Code incorrect.');
  }
  await env.DB.prepare('UPDATE users SET verified=1, code_hash=NULL, code_expires=NULL WHERE id=?').bind(user.id).run();
  return createSession(env, user);
}

async function resend(env, body) {
  const user = await env.DB.prepare('SELECT * FROM users WHERE email=?').bind(clean(body).email).first();
  if (!user || user.verified) return { ok: true };
  if (user.code_sent > Date.now() - RESEND_SECONDS * 1e3) throw new Fail(429, 'Patiente une minute avant de demander un nouveau code.');
  await issueCode(env, user);
  return { ok: true };
}

async function login(env, body) {
  const id = typeof body.login === 'string' ? body.login.trim().toLowerCase() : '', password = clean(body).password;
  const user = await env.DB.prepare('SELECT * FROM users WHERE email=? OR pseudo_key=?').bind(id, id).first();
  const now = Date.now();
  if (user?.locked_until > now) throw new Fail(429, 'Trop d’essais. Réessaie dans quelques minutes.');
  if (!user || !same(await hashPassword(password, user.salt), user.password)) {
    if (user) {
      const failures = user.failed_logins + 1;
      await env.DB.prepare('UPDATE users SET failed_logins=?, locked_until=? WHERE id=?')
        .bind(failures >= MAX_LOGIN_FAILURES ? 0 : failures, failures >= MAX_LOGIN_FAILURES ? now + LOCK_MINUTES * 60e3 : null, user.id).run();
    }
    throw new Fail(401, 'Identifiant ou mot de passe incorrect.');
  }
  await env.DB.prepare('UPDATE users SET failed_logins=0, locked_until=NULL WHERE id=?').bind(user.id).run();
  if (!user.verified) {
    if (!(user.code_sent > now - RESEND_SECONDS * 1e3)) await issueCode(env, user);
    throw new Fail(403, 'Adresse e-mail pas encore confirmée : saisis le code reçu par e-mail.', { needsVerification: true, email: user.email });
  }
  return createSession(env, user);
}

// --- Backblaze B2 (private bucket) ---
let b2cache = null;
async function b2(env, fresh = false) {
  if (!fresh && b2cache && b2cache.until > Date.now()) return b2cache;
  const r = await fetch('https://api.backblazeb2.com/b2api/v3/b2_authorize_account', {
    headers: { authorization: 'Basic ' + btoa(`${env.B2_KEY_ID}:${env.B2_APP_KEY}`) },
  });
  if (!r.ok) throw new Error(`B2 authorize ${r.status}`);
  const a = await r.json(), s = a.apiInfo.storageApi;
  return b2cache = { api: s.apiUrl, download: s.downloadUrl, token: a.authorizationToken, until: Date.now() + 20 * HOUR };
}
async function withB2(env, fn) {
  let r = await fn(await b2(env));
  if (r.status === 401) r = await fn(await b2(env, true));
  return r;
}

async function latest(env) {
  const r = await withB2(env, a => fetch(`${a.download}/file/${env.B2_BUCKET}/${env.PACK_PREFIX}latest.json`, { headers: { authorization: a.token } }));
  if (r.status === 404) throw new Fail(404, 'Aucune version du modpack publiée.');
  if (!r.ok) throw new Error(`B2 latest ${r.status}`);
  return new Response(r.body, { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}

async function downloadToken(env) {
  let a;
  const r = await withB2(env, async auth => {
    a = auth;
    return fetch(`${auth.api}/b2api/v3/b2_get_download_authorization`, {
      method: 'POST', headers: { authorization: auth.token },
      body: JSON.stringify({ bucketId: env.B2_BUCKET_ID, fileNamePrefix: `${env.PACK_PREFIX}objects/`, validDurationInSeconds: DOWNLOAD_TOKEN_SECONDS }),
    });
  });
  if (!r.ok) throw new Error(`B2 download authorization ${r.status}`);
  return { host: new URL(a.download).hostname, token: (await r.json()).authorizationToken, expires: Date.now() + DOWNLOAD_TOKEN_SECONDS * 1e3 };
}

async function route(request, env) {
  const { pathname } = new URL(request.url), method = request.method;
  let body = {};
  if (method === 'POST') {
    if (Number(request.headers.get('content-length') || 0) > 4096) throw new Fail(413, 'Requête trop volumineuse.');
    try { body = await request.json(); } catch { throw new Fail(400, 'Requête invalide.'); }
    if (!body || typeof body !== 'object') throw new Fail(400, 'Requête invalide.');
  }
  if (method === 'POST' && pathname === '/api/signup') return json(await signup(request, env, body));
  if (method === 'POST' && pathname === '/api/verify') return json(await verify(env, body));
  if (method === 'POST' && pathname === '/api/resend') return json(await resend(env, body));
  if (method === 'POST' && pathname === '/api/login') return json(await login(env, body));

  const user = await sessionUser(request, env);
  if (method === 'GET' && pathname === '/api/me') return json({ pseudo: user.pseudo, email: user.email });
  if (method === 'POST' && pathname === '/api/logout') {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(user.token_hash).run();
    return json({ ok: true });
  }
  if (method === 'POST' && pathname === '/api/delete') {
    if (!same(await hashPassword(clean(body).password, user.salt), user.password)) throw new Fail(401, 'Mot de passe incorrect.');
    await env.DB.batch([
      env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(user.id),
      env.DB.prepare('DELETE FROM users WHERE id=?').bind(user.id),
    ]);
    return json({ ok: true });
  }
  if (method === 'GET' && pathname === '/api/pack/latest') return latest(env);
  if (method === 'GET' && pathname === '/api/pack/token') return json(await downloadToken(env));
  throw new Fail(404, 'Introuvable.');
}

export default {
  async fetch(request, env) {
    try { return await route(request, env); }
    catch (e) {
      if (e instanceof Fail) return json({ error: e.message, ...e.extra }, e.status);
      console.error(e.stack || e);
      return json({ error: 'Service AkuMa momentanément indisponible.' }, 500);
    }
  },
};
