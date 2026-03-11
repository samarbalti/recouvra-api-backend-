const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = require('./app');
const connectDB = require('./config/database');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`\n🚀 Recouvra+ API démarrée sur http://localhost:${3000}`);
      console.log(`📚 Swagger : http://localhost:${3000}/api-docs`);
      console.log(`🌍 Environnement : ${process.env.NODE_ENV || 'development'}\n`);
    });
  } catch (error) {
    console.error('❌ Erreur au démarrage :', error.message);
    process.exit(1);
  }
};

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection :', err.message);
  process.exit(1);
});

startServer();