const path = require('path');
const dotenv = require('dotenv');

process.on('uncaughtException', err => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: path.join(__dirname, 'config.env'), quiet: true });

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error(
    '\nJWT_SECRET is missing or too short. Set a random string of at least 32 characters in config.env.\n'
  );
  process.exit(1);
}

const app = require('./app');
const { connectDB } = require('./utils/connectDB');

const port = process.env.PORT || 3000;

const start = async () => {
  await connectDB();

  const server = app.listen(port, () => {
    console.log(`App running on http://localhost:${port} ...`);
  });

  process.on('unhandledRejection', err => {
    console.log('UNHANDLED REJECTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    server.close(() => {
      process.exit(1);
    });
  });

  process.on('SIGTERM', () => {
    console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
    server.close(() => {
      console.log('💥 Process terminated!');
    });
  });
};

start();
