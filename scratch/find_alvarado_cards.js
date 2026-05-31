const fs = require('fs');
const players = JSON.parse(fs.readFileSync('data/players.json', 'utf8'));
const alvarados = players.filter(p => p.name.toLowerCase().replace(/é/g, 'e').includes('jose alvarado'));
console.log('Found', alvarados.length, 'Alvarado cards:');
alvarados.forEach(p => {
  console.log(`- ${p.name} (${p.series}, OVR ${p.ovr}, UUID ${p.uuid})`);
  console.log('  pitches:', JSON.stringify(p.pitches, null, 2));
});
