const http = require('http');
const req = http.request({
  hostname: '127.0.0.1', port: 8000, path: '/api/login', method: 'POST', headers: { 'Content-Type': 'application/json' }
}, res => {
  let data = ''; res.on('data', c => data += c); res.on('end', () => console.log('Login:', data));
});
req.write(JSON.stringify({email: 'admin@admin.com', password: 'password'})); req.end();
