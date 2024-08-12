const mongoose=require('mongoose')
const express = require('express');
const dotenv = require('dotenv');
const userRoutes = require('./routes/userRoutes');

dotenv.config();

// Initialize the app
const app = express();

// Middleware
app.use(express.json());

// Initialize Sequelize
const DB = process.env.DATABASE.replace(
    '<password>',
    process.env.DATABASE_PASSWORD,
  );

// Routes
app.use('/api/users', userRoutes);

// Error handling
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});

mongoose
.connect(DB)
.then(() => {
  console.log('Database is connected');
});

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
console.log(`App running on ${port}`);
});
process.on('unhandledRejection', (err) => {
console.log(err.name, err.message);
server.close(() => {
  process.exit(1);
})})
