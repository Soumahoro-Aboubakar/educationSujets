require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const University = require('../models/University');
const Document = require('../models/Document');
const Institution = require('../models/Institution');
const TaxonomyNode = require('../models/TaxonomyNode');

const ARCHIVE_YEAR = 'Archives importees';
const ARCHIVE_YEAR_NORMALIZED = ARCHIVE_YEAR.toLowerCase();

const getOrCreateNode = async (institution, parent, type, name) => {
  const normalizedName = String(name || '').trim().toLowerCase();
  return TaxonomyNode.findOneAndUpdate(
    { institution, parent, type, normalizedName },
    {
      $setOnInsert: {
        name: String(name || '').trim(),
        institution,
        parent,
        type,
        normalizedName,
      },
    },
    { upsert: true, new: true }
  );
};

const findOrCreateInstitution = async (university) => {
  const normalizedName = university.normalizedName || university.name.trim().toLowerCase();
  const existing = await Institution.findOne({ normalizedName });

  if (existing) {
    if (existing.navigationStructure.join('|') !== 'year|subject') {
      throw new Error(`L institution ${existing.name} utilise deja une structure incompatible`);
    }
    return existing;
  }

  return Institution.create({
    name: university.name,
    normalizedName,
    abbreviation: university.abbreviation || '',
    navigationStructure: ['year', 'subject'],
  });
};

const migrate = async () => {
  await connectDB();
  const universities = await University.find().lean();
  let migrated = 0;
  let skipped = 0;

  for (const university of universities) {
    let institution;
    try {
      institution = await findOrCreateInstitution(university);
    } catch (error) {
      skipped += await Document.countDocuments({
        university: university._id,
        documentType: { $ne: 'corrige' },
        $or: [{ taxonomyNodes: { $exists: false } }, { taxonomyNodes: { $size: 0 } }],
      });
      console.warn(`[SKIP] ${university.name}: ${error.message}`);
      continue;
    }

    const archiveYear = await getOrCreateNode(
      institution._id,
      null,
      'year',
      ARCHIVE_YEAR
    );
    const documents = await Document.find({
      university: university._id,
      documentType: { $ne: 'corrige' },
      $or: [{ taxonomyNodes: { $exists: false } }, { taxonomyNodes: { $size: 0 } }],
    }).populate('category', 'name');

    for (const document of documents) {
      const subjectName = document.category?.name || document.title || 'Documents importes';
      const subject = await getOrCreateNode(institution._id, archiveYear._id, 'subject', subjectName);
      document.institution = institution._id;
      document.taxonomyNodes = [archiveYear._id, subject._id];
      await document.save();
      migrated += 1;
    }
  }

  console.log(`Migration terminee: ${migrated} document(s) rattache(s), ${skipped} ignore(s).`);
  await mongoose.disconnect();
};

migrate().catch(async (error) => {
  console.error('Migration echouee:', error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
