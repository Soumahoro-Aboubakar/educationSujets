const Revision = require('./CatalogRevision');
const bump = async (result) => {
  // Une migration rejouée ou un update sans effet ne change pas la révision.
  if (result && typeof result.modifiedCount === 'number' && result.modifiedCount === 0 && !result.upsertedCount) return;
  if (result && typeof result.deletedCount === 'number' && result.deletedCount === 0) return;
  try { await Revision.updateOne({ _id: 'catalog' }, { $inc: { revision: 1 } }, { upsert: true }); }
  catch (error) { if (error.code !== 11000) throw error; await Revision.updateOne({ _id: 'catalog' }, { $inc: { revision: 1 } }); }
};
module.exports = schema => {
  schema.add({ status: { type: String, enum: ['draft', 'published', 'archived'], default: 'published', index: true } });
  for (const event of ['save', 'findOneAndUpdate', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'insertMany']) schema.post(event, bump);
};

module.exports.bump = bump;
