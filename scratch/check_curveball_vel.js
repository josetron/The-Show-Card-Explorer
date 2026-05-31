const fs = require('fs');
const players = JSON.parse(fs.readFileSync('data/players.json', 'utf8'));

let matchingCurveballsCount = 0;
let totalCurvesCount = 0;

for (const p of players) {
  if (p.is_hitter) continue;
  const pitches = p.pitches && p.pitches.pitches ? p.pitches.pitches : [];
  for (const pt of pitches) {
    if (pt.name.toLowerCase().includes('curve')) {
      totalCurvesCount++;
      if (pt.velocity === p.pitch_velocity && p.pitch_velocity > 80) {
        matchingCurveballsCount++;
        if (matchingCurveballsCount <= 10) {
          console.log(`- ${p.name} (${p.series}, OVR ${p.ovr}): Curve speed=${pt.speed}, Curve vel=${pt.velocity}, Card vel=${p.pitch_velocity}`);
        }
      }
    }
  }
}

console.log(`Total Curveballs: ${totalCurvesCount}`);
console.log(`Curveballs matching card overall velocity (>80): ${matchingCurveballsCount}`);
