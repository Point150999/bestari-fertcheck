require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/fertilization', require('./routes/fertilization'));
app.use('/api/import', require('./routes/import'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'Bestari FertCheck' }));

module.exports = app;
