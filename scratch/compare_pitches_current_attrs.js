const https = require('https');
const fs = require('fs');

// Fetch a few pitchers from the API and compare their pitches array against current_attributes
const uuids = [
  'd88407b8918523b461fd7956b731ca8b', // Jose Alvarado Live
  '021745d6f71ce39dadfe9050385cb2e4', // A.J. Minter Live
  'f8982d8d977d18de3a8805203c9f0e33', // Jose Alvarado Vintage
  'f3d0852f54f308de12b0648755d5a987'  // Gerrit Cole Vintage
];

function fetchNext(index) {
  if (index >= uuids.length) return;
  const uuid = uuids[index];
  https.get(`https://mlb26.theshow.com/apis/item.json?uuid=${uuid}`, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      try {
        const p = JSON.parse(data);
        console.log(`\n================== ${p.name} (${p.series}, OVR ${p.ovr}) ==================`);
        const pitches = p.pitches && p.pitches.pitches ? p.pitches.pitches : [];
        const attrs = p.current_attributes || {};
        
        pitches.forEach((pt, i) => {
          const attrVel = attrs[`pitch_${i}_velocity`];
          const attrMvt = attrs[`pitch_${i}_movement`];
          const attrUsage = attrs[`pitch_${i}_usage`];
          console.log(`Pitch ${i} (${pt.name}):`);
          console.log(`  Pitches Object:  velocity=${pt.velocity}, movement=${pt.movement}, usage=${pt.usage}`);
          console.log(`  Current Attrs:   velocity=${attrVel}, movement=${attrMvt}, usage=${attrUsage}`);
        });
      } catch (err) {
        console.error('Error:', err.message);
      }
      fetchNext(index + 1);
    });
  });
}

fetchNext(0);
