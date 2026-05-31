const fs = require('fs');
const players = JSON.parse(fs.readFileSync('data/players.json', 'utf8'));

console.log('Pitchers with Curveball or 12-6 Curve:');
let count = 0;
for (const p of players) {
  if (p.is_hitter) continue;
  const pitches = p.pitches && p.pitches.pitches ? p.pitches.pitches : [];
  const curve = pitches.find(pt => pt.name.toLowerCase().includes('curve'));
  if (curve) {
    console.log(`- ${p.name} (OVR ${p.ovr}, ${p.series}):`);
    console.log(`  Curve: speed=${curve.speed}, velocity=${curve.velocity}, control=${curve.control}, movement=${curve.movement}, rating=${curve.rating}`);
    console.log(`  Overall: vel=${p.pitch_velocity}, ctrl=${p.pitch_control}, mvt=${p.pitch_movement}`);
    count++;
    if (count >= 15) break;
  }
}
