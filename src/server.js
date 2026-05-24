import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  process.stderr.write('MONGODB_URI is required\n');
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => {
      process.stdout.write(`SecureCollab API running on port ${PORT}\n`);
    });
  })
  .catch((err) => {
    process.stderr.write(`MongoDB connection failed: ${err.message}\n`);
    process.exit(1);
  });
