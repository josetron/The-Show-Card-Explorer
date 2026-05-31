const fs = require('fs');

// Mock helper functions from app.js
function isSlowPitch(pitchName) {
  const slowTypes = ['curve', 'change', 'palm', 'vulcan', 'knuckle', 'screw', 'slurve', 'sweeper', 'slider', 'fork', 'splitter', 'split'];
  const lowerName = pitchName.toLowerCase();
  return slowTypes.some(type => lowerName.includes(type));
}

function getCorrectedPitchVelocity(pitchName, speed, velocity, overallVelocity) {
  if (isSlowPitch(pitchName)) {
    if ((velocity === overallVelocity && overallVelocity > 80) || velocity === 0) {
      return Math.min(85, Math.max(30, Math.round(30 + (speed - 70) * 3)));
    }
  }
  return velocity;
}

// Load database
const players = JSON.parse(fs.readFileSync('data/players.json', 'utf8'));

// Find Alvarado Live card
const alvarado = players.find(p => p.name === 'José Alvarado' && p.series === 'Live');
if (!alvarado) {
  console.error('Failed to find José Alvarado (Live) in the database!');
  process.exit(1);
}

console.log(`Checking pitches for ${alvarado.name} (${alvarado.series}, OVR ${alvarado.ovr})`);
console.log(`Card Overall Velocity: ${alvarado.pitch_velocity}`);

const pitches = alvarado.pitches && alvarado.pitches.pitches ? alvarado.pitches.pitches : [];
let allPassed = true;

pitches.forEach(pt => {
  const correctedVel = getCorrectedPitchVelocity(pt.name, pt.speed || 0, pt.velocity || 0, alvarado.pitch_velocity || 0);
  console.log(`Pitch: ${pt.name}`);
  console.log(`  Speed:        ${pt.speed} MPH`);
  console.log(`  Original Vel: ${pt.velocity}`);
  console.log(`  Corrected Vel:${correctedVel}`);
  console.log(`  Pitch Quality:${pt.rating}`);

  if (pt.name === '12-6 Curve') {
    if (correctedVel === 72 && pt.rating === 70) {
      console.log('  -> PASS: 12-6 Curve corrected velocity is 72, quality is 70.');
    } else {
      console.log(`  -> FAIL: Expected corrected velocity 72 (got ${correctedVel}) and quality 70 (got ${pt.rating})`);
      allPassed = false;
    }
  } else if (pt.name === 'Sinker') {
    if (correctedVel === 99) {
      console.log('  -> PASS: Sinker velocity remained 99.');
    } else {
      console.log(`  -> FAIL: Sinker velocity changed to ${correctedVel}`);
      allPassed = false;
    }
  } else if (pt.name === 'Cutter') {
    if (correctedVel === 76) {
      console.log('  -> PASS: Cutter velocity remained 76.');
    } else {
      console.log(`  -> FAIL: Cutter velocity changed to ${correctedVel}`);
      allPassed = false;
    }
  }
});

if (allPassed) {
  console.log('\nAll test cases PASSED!');
} else {
  console.log('\nSome test cases FAILED.');
  process.exit(1);
}
