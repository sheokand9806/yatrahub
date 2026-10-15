const mongoose = require('mongoose');

exports.getDbUrl = () => {
  const url = process.env.DATABASE || 'mongodb://127.0.0.1:27017/yatrahub';
  return url.replace('<PASSWORD>', process.env.DATABASE_PASSWORD || '');
};

exports.connectDB = async () => {
  try {
    await mongoose.connect(exports.getDbUrl(), {
      serverSelectionTimeoutMS: 8000
    });
    console.log('DB connection successful!');
  } catch (err) {
    console.error(`\nCould not connect to MongoDB: ${err.message}`);
    console.error(
      'Is MongoDB running? Start one with "docker compose up -d" or set DATABASE in config.env.\n'
    );
    process.exit(1);
  }
};
