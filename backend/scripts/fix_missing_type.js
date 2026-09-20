require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Document = require('../models/Document');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fatafalta');
    console.log('Connecté à la base de données.');
    
    // Trouver les documents qui ont été créés via la méthode brouillon incomplet (ont noeudId mais pas de type)
    const filter = {
      noeudId: { $ne: null },
      type: { $exists: false }
    };
    
    const count = await Document.countDocuments(filter);
    console.log(`${count} documents trouvés à corriger.`);
    
    if (count > 0) {
      const result = await Document.updateMany(filter, {
        $set: { type: 'sujet' }
      });
      console.log(`Mise à jour terminée: ${result.modifiedCount} documents modifiés.`);
    }
  } catch (err) {
    console.error('Erreur:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Déconnecté.');
  }
}

run();
