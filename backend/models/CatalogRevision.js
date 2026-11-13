const mongoose = require('mongoose');
const schema = new mongoose.Schema({ _id: { type: String, default: 'catalog' }, revision: { type: Number, default: 0 } }, { timestamps: true });
module.exports = mongoose.model('CatalogRevision', schema);
