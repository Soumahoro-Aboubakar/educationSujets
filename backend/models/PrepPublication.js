const mongoose = require('mongoose');
// Un seul registre actif. Le CAS et l'historique sont écrits dans le même document,
// y compris sur MongoDB standalone. Les payloads restent dans PrepContent.
const schema = new mongoose.Schema({
  _id: { type: String, default: 'active' },
  generation: { type: Number, default: 0 },
  schemaVersion: { type: Number, default: 1 },
  entries: { type: [mongoose.Schema.Types.Mixed], default: [] },
  tombstones: { type: [mongoose.Schema.Types.Mixed], default: [] },
  history: { type: [mongoose.Schema.Types.Mixed], default: [] },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });
module.exports = mongoose.model('PrepPublication', schema);
