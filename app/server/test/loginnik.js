const https = require('https');
// https://node-template-knik.c9users.io
var options = {
  hostname: 'node-template-knik.c9users.io',
  port: 443,
  path: '/',
  method: 'POST'
};

var postData = JSON.stringify({
  user : 'nik',
  pass : 'niknik9'
});

var req = https.request(options, (res) => {
  console.log('statusCode: ', res.statusCode);
  console.log('headers: ', res.headers);

  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.write(postData);

req.end();

req.on('error', (e) => {
  console.error(e);
});

