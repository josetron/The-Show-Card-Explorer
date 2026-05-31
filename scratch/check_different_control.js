const fs = require('fs');
const players = JSON.parse(fs.readFileSync('data/players.json', 'utf8'));

let diffControlCount = 0;
let totalPitchers = 0;

for (const p of players) {
  if (p.is_hitter) continue;
  totalPitchers++;
  const pitches = p.pitches && p.pitches.pitches ? p.pitches.pitches : [];
  if (pitches.length > 0) {
    const controls = pitches.map(pt => pt.control).filter(c => c !== undefined && c !== null);
    const uniqueControls = new Set(controls);
    if (uniqueControls.size > 1) {
      diffControlCount++;
      if (diffControlCount <= 10) {
        console.log(`Pitcher with different control ratings: ${p.name} (OVR ${p.ovr}, ${p.series})`);
        pitches.forEach(pt => {
          console.log(`  - ${pt.name}: control=${pt.control}`);
        });
      }
    }
  }
}

console.log(`Total Pitchers: ${totalPitchers}`);
console.log(`Pitchers with different control ratings: ${diffControlCount}`);
