/*
 * E-mail contenant un code à 6 chiffres. Mise en page sobre, compatible avec les messageries
 * (tableaux, styles en ligne), aux couleurs du site : papier, encre, or pour le code.
 */
const escape = (value = '') => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const PURPOSES = {
  verify: {
    subject: (code) => `${code} est votre code de vérification Fatafalta`,
    title: 'Vérifiez votre adresse e-mail',
    intro: 'Voici le code pour confirmer votre adresse e-mail sur Fatafalta :',
    outro: 'Si vous n’avez pas créé de compte Fatafalta, ignorez simplement cet e-mail.',
  },
  reset: {
    subject: (code) => `${code} est votre code pour changer de mot de passe`,
    title: 'Mot de passe oublié',
    intro: 'Voici le code pour choisir un nouveau mot de passe sur Fatafalta :',
    outro: 'Si vous n’avez rien demandé, ignorez cet e-mail : votre mot de passe actuel reste valable.',
  },
};

const otpEmail = ({ purpose, code, name, minutes }) => {
  const copy = PURPOSES[purpose];
  const hello = name ? `Bonjour ${escape(name)},` : 'Bonjour,';
  const text = [
    name ? `Bonjour ${name},` : 'Bonjour,',
    '',
    copy.intro,
    '',
    `    ${code}`,
    '',
    `Ce code est valable ${minutes} minutes. Ne le communiquez à personne : Fatafalta ne vous le demandera jamais.`,
    '',
    copy.outro,
    '',
    '— Fatafalta · fatafalta.com',
  ].join('\n');
  const html = `<!doctype html><html lang="fr"><body style="margin:0;padding:0;background:#FCFAF5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FCFAF5;padding:32px 16px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#0D1B32;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border:1px solid #E4DED2;border-radius:20px;">
<tr><td style="padding:28px 28px 0;font-size:18px;font-weight:700;letter-spacing:-0.3px;">Fatafalta</td></tr>
<tr><td style="padding:20px 28px 0;">
<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;letter-spacing:-0.4px;">${copy.title}</h1>
<p style="margin:0 0 6px;font-size:15px;line-height:1.6;color:#4F5E72;">${hello}</p>
<p style="margin:0;font-size:15px;line-height:1.6;color:#4F5E72;">${copy.intro}</p>
</td></tr>
<tr><td align="center" style="padding:24px 28px;">
<div style="display:inline-block;padding:14px 22px;border-radius:14px;background:#F6EEDF;border:1px solid #E4C997;font-size:32px;font-weight:700;letter-spacing:8px;color:#0D1B32;font-variant-numeric:tabular-nums;">${escape(code)}</div>
</td></tr>
<tr><td style="padding:0 28px 28px;">
<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#4F5E72;">Ce code est valable <strong style="color:#0D1B32;">${minutes} minutes</strong>. Ne le communiquez à personne : Fatafalta ne vous le demandera jamais.</p>
<p style="margin:0;font-size:13px;line-height:1.6;color:#7A8697;">${copy.outro}</p>
</td></tr>
</table>
<p style="margin:16px 0 0;font-size:12px;color:#7A8697;">Fatafalta · fatafalta.com</p>
</td></tr></table></body></html>`;
  return { subject: copy.subject(code), html, text };
};

module.exports = { otpEmail };
