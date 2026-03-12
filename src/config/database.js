const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/recouvraplusdb';
    console.log('Tentative de connexion à MongoDB...');
    await mongoose.connect(uri);
    console.log(' MongoDB connecté avec succès');
  } catch (error) {
    console.error(' Erreur de connexion MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;