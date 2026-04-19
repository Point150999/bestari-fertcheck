require('dotenv').config();
const app = require('./app');
const path = require('path');
const fs = require('fs');
const express = require('express');

const PORT = process.env.PORT || 4000;

// Serve frontend build in production (local only)
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    const indexFile = path.join(distPath, 'index.html');
    if (fs.existsSync(indexFile)) res.sendFile(indexFile);
    else res.status(404).send('Build not found');
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌿 Bestari FertCheck API running on port ${PORT}`);
});
