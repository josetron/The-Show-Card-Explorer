const fs = require('fs');
const players = JSON.parse(fs.readFileSync('data/players.json', 'utf8'));

let diffVelCount = 0;
let totalPitchers = 0;
let copyPasteVelCount = 0;

for (const p of players) {
  if (p.is_hitter) continue;
  totalPitchers++;
  const pitches = p.pitches && p.pitches.pitches ? p.pitches.pitches : [];
  if (pitches.length > 0) {
    const velocities = pitches.map(pt => pt.velocity).filter(v => v !== undefined && v !== null);
    const uniqueVels = new Set(velocities);
    if (uniqueVels.size > 1) {
      diffVelCount++;
    } else {
      copyPasteVelCount++;
      if (copyPasteVelCount <= 5) {
        console.log(`Pitcher with identical velocity ratings: ${p.name} (OVR ${p.ovr}, ${p.series})`);
        console.log(`  Overall velocity: ${p.pitch_velocity}`);
        pitches.forEach(pt => {
          console.log(`  - ${pt.name}: velocity=${pt.velocity}`);
        });
      }
    }
  }
}

console.log(`Total Pitchers: ${totalPitchers}`);
console.log(`Pitchers with different velocity ratings: ${diffVelCount}`);
console.log(`Pitchers with identical velocity ratings: ${copyPasteVelCount}`);
