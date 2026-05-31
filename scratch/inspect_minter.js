const fs = require('fs');
const players = JSON.parse(fs.readFileSync('data/players.json', 'utf8'));

const minter = players.find(p => p.name.toLowerCase().includes('minter'));
if (minter) {
  console.log('Minter entry in JSON:');
  console.log(JSON.stringify(minter, null, 2));
} else {
  console.log('Minter not found');
}
