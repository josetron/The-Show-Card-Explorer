const https = require('https');

function checkDetails(uuid) {
  https.get(`https://mlb26.theshow.com/apis/item.json?uuid=${uuid}`, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log('STATUS:', res.statusCode);
      try {
        const parsed = JSON.parse(data);
        console.log('NAME:', parsed.name);
        console.log('SERIES:', parsed.series);
        console.log('OVR:', parsed.ovr);
        console.log('PITCHES:', JSON.stringify(parsed.pitches, null, 2));
        console.log('CURRENT_ATTRIBUTES:', JSON.stringify(parsed.current_attributes, null, 2));
      } catch (err) {
        console.log('Error parsing JSON:', err.message);
      }
    });
  }).on('error', (err) => {
    console.error('Error fetching details:', err);
  });
}

checkDetails('f8982d8d977d18de3a8805203c9f0e33'); // Jose Alvarado Vintage
