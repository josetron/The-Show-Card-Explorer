const fs = require('fs');
const players = JSON.parse(fs.readFileSync('data/players.json', 'utf8'));

const cole = players.find(p => p.name.toLowerCase().replace(/é/g, 'e').includes('gerrit cole'));
if (cole) {
  console.log('Cole full entry in JSON:');
  console.log(JSON.stringify(cole, null, 2));
} else {
  console.log('Cole not found in JSON');
}
