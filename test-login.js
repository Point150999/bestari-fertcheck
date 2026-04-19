require('dotenv').config();
const http = require('http');

const data = JSON.stringify({ email: 'admin@fertcheck.com', password: 'admin123' });

const options = {
  hostname: '127.0.0.1',
  port: 3002,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      const json = JSON.parse(body);
      console.log('User:', json.user?.nama, json.user?.email, json.user?.role);
      console.log('Token:', json.token ? 'YES (length: ' + json.token.length + ')' : 'NO');
    } catch(e) {
      console.log('Raw body:', body.substring(0, 500));
    }
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(data);
req.end();
