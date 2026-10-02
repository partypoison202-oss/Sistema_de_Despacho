const http = require('http');

const authOpts = {
  hostname: '127.0.0.1',
  port: 8000,
  path: '/api/login',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
};

const authReq = http.request(authOpts, res => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => { 
    const token = JSON.parse(data).token;
    
    const getOpts = {
      hostname: '127.0.0.1',
      port: 8000,
      path: '/api/historial-operativo/combustible/2026-10-02',
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    };
    const getReq = http.request(getOpts, res2 => {
        let data2 = '';
        res2.on('data', chunk => { data2 += chunk; });
        res2.on('end', () => { console.log(data2.substring(0, 500)); });
    });
    getReq.end();
  });
});
authReq.write(JSON.stringify({usuario: 'administrador', contrasena: 'admin123'}));
authReq.end();
