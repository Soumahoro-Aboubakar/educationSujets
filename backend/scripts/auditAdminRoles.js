/**
 * Audit des rôles administrateurs.
 *
 * Jusqu'ici, toute inscription publique créait un compte 'admin' (valeur par défaut du modèle).
 * Ce script liste les comptes privilégiés et, sur demande explicite, rétrograde en 'user'
 * tous ceux qui ne figurent pas dans la liste des vrais administrateurs.
 *
 *   node scripts/auditAdminRoles.js                                   # liste seulement
 *   node scripts/auditAdminRoles.js --keep a@x.com,b@y.com            # simulation
 *   node scripts/auditAdminRoles.js --keep a@x.com,b@y.com --apply    # applique
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

const readArg = (name) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
};

const run = async () => {
  await connectDB();

  const keep = (readArg('--keep') || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const apply = process.argv.includes('--apply');

  const privileged = await User.find({ role: { $in: ['admin', 'sub-admin'] } })
    .select('name email role createdAt')
    .sort({ createdAt: 1 })
    .lean();

  console.table(privileged.map((user) => ({
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt?.toISOString().slice(0, 10),
    keep: keep.includes(user.email),
  })));

  if (!keep.length) {
    console.log('\nAucune modification. Passez --keep <emails> pour préparer la rétrogradation.');
    return;
  }

  const toDemote = privileged.filter((user) => !keep.includes(user.email));
  console.log(`\n${toDemote.length} compte(s) seraient rétrogradés en 'user'.`);

  if (!apply) {
    console.log('Simulation uniquement. Ajoutez --apply pour appliquer.');
    return;
  }

  const result = await User.updateMany(
    { _id: { $in: toDemote.map((user) => user._id) } },
    { $set: { role: 'user', isSuperAdmin: false } }
  );
  console.log(`${result.modifiedCount} compte(s) rétrogradé(s).`);
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
