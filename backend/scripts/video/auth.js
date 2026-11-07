#!/usr/bin/env node
/**
 * Obtention UNIQUE du refresh token YouTube (OAuth 2.0, application de bureau, PKCE).
 * À lancer une fois sur la machine locale :  npm run video:auth
 *
 * 1. Lit YOUTUBE_CLIENT_ID et YOUTUBE_CLIENT_SECRET dans backend/.env.video.local ;
 * 2. ouvre la page de consentement Google (compte propriétaire de la chaîne) ;
 * 3. reçoit le code sur http://127.0.0.1:<port> et l'échange contre un refresh token ;
 * 4. affiche le refresh token, à coller dans .env.video.local (YOUTUBE_REFRESH_TOKEN=…).
 * Le jeton n'est écrit nulle part par ce script.
 */
const crypto = require('crypto');
const http = require('http');
const { execFile } = require('child_process');
const env = require('./lib/env');

const SCOPES = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'];
const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const main = async () => {
  env.assertLocalMachine();
  const { clientId, clientSecret } = env.loadOAuthClient(process.argv[2] === '--env-video' ? process.argv[3] : undefined);
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
  const state = b64url(crypto.randomBytes(16));

  const server = http.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const redirectUri = `http://127.0.0.1:${server.address().port}`;
  const url = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
    client_id: clientId, redirect_uri: redirectUri, response_type: 'code', scope: SCOPES.join(' '),
    access_type: 'offline', prompt: 'consent', code_challenge: challenge, code_challenge_method: 'S256', state,
  })}`;

  const code = await new Promise((resolve, reject) => {
    server.on('request', (req, res) => {
      const params = new URL(req.url, redirectUri).searchParams;
      if (!params.get('code') && !params.get('error')) { res.writeHead(404).end(); return; }
      const ok = params.get('state') === state && params.get('code');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        .end(ok ? '<p>Autorisation reçue. Tu peux fermer cet onglet et revenir au terminal.</p>' : '<p>Autorisation refusée.</p>');
      if (ok) resolve(params.get('code')); else reject(new Error(params.get('error') || 'état OAuth invalide'));
    });
    console.log(`Ouvre cette adresse et connecte-toi avec le compte propriétaire de la chaîne :\n\n${url}\n`);
    execFile('open', [url], () => {}); // macOS ; sinon copier l'adresse ci-dessus
  });
  server.close();

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, code_verifier: verifier, grant_type: 'authorization_code', redirect_uri: redirectUri }),
  });
  const data = await res.json();
  if (!res.ok || !data.refresh_token) throw new Error(`Échange du code refusé : ${data.error_description || data.error || res.status}`);
  console.log('Refresh token obtenu. Ajoute cette ligne à backend/.env.video.local (ne la partage pas) :\n');
  console.log(`YOUTUBE_REFRESH_TOKEN=${data.refresh_token}\n`);
  console.log('Rappel : l’écran de consentement OAuth doit être en mode « En production », sinon ce jeton expire au bout de 7 jours.');
};

main().catch((error) => { console.error(`✗ ${error.message}`); process.exitCode = 1; });
