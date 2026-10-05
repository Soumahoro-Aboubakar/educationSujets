/**
 * Moyens de paiement proposés aux abonnés (même configuration que l'administration web/mobile).
 *
 *   npm run payment-methods -- list           Affiche l'état de chaque moyen
 *   npm run payment-methods -- only wave      Active uniquement « wave », désactive tous les autres
 *   npm run payment-methods -- enable mtn_money / disable mtn_money
 *
 * Seul le champ `enabled` est modifié : routage, libellés et instructions sont conservés.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const PaymentMethod = require('../models/PaymentMethod');
const { adminList } = require('../services/payments/paymentMethodService');

const show = async () => {
  for (const method of await adminList()) {
    console.log(`${method.enabled ? '✓ activé   ' : '✕ désactivé'}  ${method.code.padEnd(14)} ${method.label}`);
  }
};

const run = async () => {
  const [command, code] = process.argv.slice(2);
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    await adminList(); // initialise les moyens par défaut si besoin
    if (command === 'only' && code) {
      if (!(await PaymentMethod.exists({ code }))) throw new Error(`Moyen inconnu : ${code}`);
      await PaymentMethod.updateMany({ code: { $ne: code } }, { $set: { enabled: false } });
      await PaymentMethod.updateOne({ code }, { $set: { enabled: true } });
    } else if (['enable', 'disable'].includes(command) && code) {
      const result = await PaymentMethod.updateOne({ code }, { $set: { enabled: command === 'enable' } });
      if (!result.matchedCount) throw new Error(`Moyen inconnu : ${code}`);
    } else if (command !== 'list') {
      console.log('Commandes : list | only <code> | enable <code> | disable <code>');
      return;
    }
    await show();
  } finally {
    await mongoose.disconnect();
  }
};

run().catch((error) => {
  console.error(`Erreur : ${error.message}`);
  process.exitCode = 1;
});
