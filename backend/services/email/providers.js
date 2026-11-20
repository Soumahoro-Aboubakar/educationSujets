/*
 * Fournisseurs d'envoi, appelés directement par leur API HTTP (aucune bibliothèque).
 * Chacun reçoit { to: { email, name }, subject, html, text } et lève une erreur si l'envoi n'est
 * pas accepté (statut HTTP hors 2xx, délai dépassé, réseau) : le suivant prend alors le relais.
 */
const post = async (url, { headers, body, timeoutMs }) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response;
};

const brevo = ({ key, from, timeoutMs }) => (message) => post('https://api.brevo.com/v3/smtp/email', {
  timeoutMs,
  headers: { 'api-key': key },
  body: {
    sender: { email: from.address, name: from.name },
    to: [{ email: message.to.email, ...(message.to.name ? { name: message.to.name } : {}) }],
    subject: message.subject,
    htmlContent: message.html,
    textContent: message.text,
    tags: ['otp'],
  },
});

const mailjet = ({ key, from, timeoutMs }) => (message) => post('https://api.mailjet.com/v3.1/send', {
  timeoutMs,
  headers: { Authorization: `Basic ${Buffer.from(`${key.key}:${key.secret}`).toString('base64')}` },
  body: {
    Messages: [{
      From: { Email: from.address, Name: from.name },
      To: [{ Email: message.to.email, ...(message.to.name ? { Name: message.to.name } : {}) }],
      Subject: message.subject,
      TextPart: message.text,
      HTMLPart: message.html,
    }],
  },
});

const resend = ({ key, from, timeoutMs }) => (message) => post('https://api.resend.com/emails', {
  timeoutMs,
  headers: { Authorization: `Bearer ${key}` },
  body: {
    from: `${from.name} <${from.address}>`,
    to: [message.to.email],
    subject: message.subject,
    html: message.html,
    text: message.text,
  },
});

module.exports = { brevo, mailjet, resend };
