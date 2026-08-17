const http = require('http');

const options = {
  hostname: 'localhost',
  port: 8000,
  path: '/api/unidades/listar/urbanuss',
  method: 'GET',
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data.substring(0, 1000)));
});
req.end();
