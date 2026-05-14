const http = require('http');
http.get('http://127.0.0.1:3000/api/songs?pageSize=3', (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.data && json.data.list) {
        json.data.list.forEach(s => console.log(s.id + ' | ' + s.title + ' | ' + s.audio_url));
      } else {
        console.log('Unexpected response:', data.substring(0, 300));
      }
    } catch(e) {
      console.log('Parse error:', data.substring(0, 300));
    }
  });
}).on('error', e => console.error('Connection error:', e.message));
