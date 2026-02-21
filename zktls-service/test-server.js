// Simple test to check if server can start
require('dotenv').config();
const express = require('express');

const app = express();
app.use(express.json());

app.get('/test', (req, res) => {
  res.json({ status: 'ok', env: {
    PORT: process.env.PORT,
    RECLAIM_APP_ID: process.env.RECLAIM_APP_ID ? 'set' : 'not set',
    RECLAIM_APP_SECRET: process.env.RECLAIM_APP_SECRET ? 'set' : 'not set',
  }});
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Test server running on port ${PORT}`);
  console.log(`Test: http://localhost:${PORT}/test`);
});
