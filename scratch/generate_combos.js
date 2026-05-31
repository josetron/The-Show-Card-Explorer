const fs = require('fs');

const pitches = ['Sinker', 'Cutter', 'Slider', '12-6 Curve', 'Circle Change', 'Sweeper', 'Knuckle-curve', 'Sweeping Curve', 'Splitter', 'Changeup', 'Curveball', 'Forkball', 'Screwball'];
const teams = ['Yankees', 'Dodgers', 'Red Sox', 'Cubs', 'Mets', 'Braves', 'Giants', 'Phillies', 'Padres', 'Mariners', 'Orioles', 'Astros'];

const combos = [];

// Helper to push and check size
function addCombo(text, query) {
  combos.push({ text, query });
}

// Generate 100 combos
let pitchIdx = 0;
let teamIdx = 0;

for (let i = 1; i <= 50; i++) {
  // --- HITTER COMBOS ---
  if (i % 7 === 1) {
    const con = 90 + (i % 6);
    const spd = 85 + (i % 11);
    addCombo(`contact over ${con} & speed over ${spd} (elite speedster)`, `hitters with contact over ${con} and speed over ${spd}`);
  } else if (i % 7 === 2) {
    const pow = 90 + (i % 6);
    const spd = 80 + (i % 11);
    addCombo(`power over ${pow} & speed over ${spd} (power-speed threat)`, `hitters with power over ${pow} and speed over ${spd}`);
  } else if (i % 7 === 3) {
    const con = 95 + (i % 4);
    const pow = 85 + (i % 8);
    addCombo(`contact over ${con} & power over ${pow} (ultimate bat)`, `hitters with contact over ${con} and power over ${pow}`);
  } else if (i % 7 === 4) {
    const vis = 92 + (i % 6);
    const clu = 90 + (i % 8);
    addCombo(`vision over ${vis} & clutch over ${clu} (clutch contact)`, `hitters with vision over ${vis} and clutch over ${clu}`);
  } else if (i % 7 === 5) {
    const fld = 90 + (i % 6);
    const spd = 85 + (i % 11);
    addCombo(`fielding over ${fld} & speed over ${spd} (elite defense)`, `hitters with fielding over ${fld} and speed over ${spd}`);
  } else if (i % 7 === 6) {
    const team = teams[teamIdx % teams.length];
    teamIdx++;
    const pow = 85 + (i % 11);
    addCombo(`diamond hitters from ${team} (power over ${pow})`, `diamond hitters from ${team} with power over ${pow}`);
  } else {
    const team = teams[teamIdx % teams.length];
    teamIdx++;
    const spd = 85 + (i % 11);
    addCombo(`gold hitters from ${team} (speed over ${spd})`, `gold hitters from ${team} with speed over ${spd}`);
  }

  // --- PITCHER COMBOS ---
  if (i % 8 === 1) {
    const pitch = pitches[pitchIdx % pitches.length];
    pitchIdx++;
    const spd = 94 + (i % 6);
    addCombo(`${pitch.toLowerCase()} speed over ${spd} mph (hard velocity)`, `pitchers with ${pitch} speed over ${spd} mph`);
  } else if (i % 8 === 2) {
    const pitch = pitches[pitchIdx % pitches.length];
    pitchIdx++;
    const brk = 88 + (i % 8);
    addCombo(`${pitch.toLowerCase()} break over ${brk} (heavy movement)`, `pitchers with ${pitch} break over ${brk}`);
  } else if (i % 8 === 3) {
    const pitch = pitches[pitchIdx % pitches.length];
    pitchIdx++;
    const ctrl = 85 + (i % 11);
    addCombo(`${pitch.toLowerCase()} control over ${ctrl} (precise locator)`, `pitchers with ${pitch} control over ${ctrl}`);
  } else if (i % 8 === 4) {
    const k9 = 85 + (i % 11);
    const sta = 75 + (i % 16);
    addCombo(`k/9 over ${k9} & stamina over ${sta} (workhorse K-machine)`, `pitchers with k/9 over ${k9} and stamina over ${sta}`);
  } else if (i % 8 === 5) {
    const h9 = 85 + (i % 11);
    const bb9 = 80 + (i % 16);
    addCombo(`h/9 over ${h9} & bb/9 over ${bb9} (stingy control)`, `pitchers with h/9 over ${h9} and bb/9 over ${bb9}`);
  } else if (i % 8 === 6) {
    const pitch = pitches[pitchIdx % pitches.length];
    pitchIdx++;
    const spd = 94 + (i % 5);
    const brk = 85 + (i % 10);
    addCombo(`${pitch.toLowerCase()} speed over ${spd} & slider break over ${brk}`, `pitchers with ${pitch} speed over ${spd} mph and slider break over ${brk}`);
  } else if (i % 8 === 7) {
    const pitch = pitches[pitchIdx % pitches.length];
    pitchIdx++;
    const ctrl = 85 + (i % 10);
    const brk = 85 + (i % 10);
    addCombo(`${pitch.toLowerCase()} control over ${ctrl} & break over ${brk}`, `pitchers with ${pitch} control over ${ctrl} and break over ${brk}`);
  } else {
    const team = teams[teamIdx % teams.length];
    teamIdx++;
    const h9 = 80 + (i % 16);
    addCombo(`pitchers from ${team} (h/9 over ${h9})`, `pitchers from ${team} with h/9 over ${h9}`);
  }
}

// Slice to exactly 100 combos just in case
const finalCombos = combos.slice(0, 100);

console.log(`Generated ${finalCombos.length} combos.`);
fs.writeFileSync('scratch/lethal_combos_array.js', 'const LETHAL_COMBOS = ' + JSON.stringify(finalCombos, null, 2) + ';');
console.log('Saved to scratch/lethal_combos_array.js');
