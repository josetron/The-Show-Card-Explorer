const fs = require('fs');

// Read database
const dbContent = fs.readFileSync('data/players.js', 'utf8').replace('window.MLB_PLAYERS_DATA = ', '');
const playersData = JSON.parse(dbContent.substring(0, dbContent.length - 1));

const mockElement = () => ({
  value: '',
  textContent: '',
  appendChild: () => {},
  addEventListener: () => {},
  classList: {
    add: () => {},
    remove: () => {},
    toggle: () => {}
  },
  options: [{ value: 'All' }]
});

global.window = {
  MLB_PLAYERS_DATA: playersData,
  addEventListener: () => {}
};
global.document = {
  createElement: mockElement,
  getElementById: (id) => mockElement(),
  querySelectorAll: () => []
};

// Load app.js code and evaluate it by putting state variables in global scope
const appJsCode = fs.readFileSync('app.js', 'utf8')
  .replace('let players =', 'global.players =')
  .replace('let filteredPlayers =', 'global.filteredPlayers =')
  .replace('let comparedPlayers =', 'global.comparedPlayers =')
  .replace('let activeType =', 'global.activeType =')
  .replace('let viewMode =', 'global.viewMode =')
  .replace('let sortAscending =', 'global.sortAscending =')
  .replace('let renderLimit =', 'global.renderLimit =')
  .replace('const pitchTypeSelect =', 'global.pitchTypeSelect =')
  .replace('const filterPitchSpeed =', 'global.filterPitchSpeed =')
  .replace('const filterPitchControl =', 'global.filterPitchControl =')
  .replace('const filterPitchBreak =', 'global.filterPitchBreak =')
  .replace('const filterPitchUsage =', 'global.filterPitchUsage =');

eval(appJsCode);

function testQuery(q) {
  console.log(`\nTesting query: "${q}"`);
  const mockInput = { value: q };
  const mockSearchInput = { value: '' };
  const mockOvrMin = { value: '50' };
  const mockOvrMax = { value: '99' };
  const mockTeamSelect = { value: 'All', options: [{ value: 'All' }, { value: 'Dodgers' }, { value: 'Mets' }, { value: 'Yankees' }] };
  const mockPositionSelect = { value: 'All' };
  const mockHandSelect = { value: 'All' };
  const mockRarityCheckboxes = {
    Diamond: { checked: true },
    Gold: { checked: true },
    Silver: { checked: true },
    Bronze: { checked: true },
    Common: { checked: true }
  };
  const mockPitchFiltersSection = { classList: { toggle: () => {}, add: () => {}, remove: () => {} } };
  const mockPitchAttrSliders = { classList: { toggle: () => {}, add: () => {}, remove: () => {} } };

  // Reset sliders
  global.pitchTypeSelect.value = 'All';
  global.filterPitchSpeed.value = '60';
  global.filterPitchControl.value = '0';
  global.filterPitchBreak.value = '0';
  global.filterPitchUsage.value = '0';

  // Hitter sliders mock
  const mockContactSlider = { value: '0' };
  const mockPowerSlider = { value: '0' };
  const mockSpeedSlider = { value: '0' };
  const mockFieldingSlider = { value: '0' };

  global.document.getElementById = (id) => {
    if (id === 'nlp-prompt-input') return mockInput;
    if (id === 'search-input') return mockSearchInput;
    if (id === 'pitch-type-select') return global.pitchTypeSelect;
    if (id === 'filter-pitch-speed') return global.filterPitchSpeed;
    if (id === 'filter-pitch-control') return global.filterPitchControl;
    if (id === 'filter-pitch-break') return global.filterPitchBreak;
    if (id === 'filter-pitch-usage') return global.filterPitchUsage;
    if (id === 'filter-contact') return mockContactSlider;
    if (id === 'filter-power') return mockPowerSlider;
    if (id === 'filter-speed') return mockSpeedSlider;
    if (id === 'filter-fielding') return mockFieldingSlider;
    if (id === 'ovr-min') return mockOvrMin;
    if (id === 'ovr-max') return mockOvrMax;
    if (id === 'team-select') return mockTeamSelect;
    if (id === 'position-select') return mockPositionSelect;
    if (id === 'hand-select') return mockHandSelect;
    if (id === 'rarity-diamond') return mockRarityCheckboxes.Diamond;
    if (id === 'rarity-gold') return mockRarityCheckboxes.Gold;
    if (id === 'rarity-silver') return mockRarityCheckboxes.Silver;
    if (id === 'rarity-bronze') return mockRarityCheckboxes.Bronze;
    if (id === 'rarity-common') return mockRarityCheckboxes.Common;
    if (id === 'pitch-filters-section') return mockPitchFiltersSection;
    if (id === 'pitch-attr-sliders') return mockPitchAttrSliders;
    return mockElement();
  };

  applyNaturalLanguagePrompt();

  console.log('Results:');
  console.log(`  Active Type: ${global.activeType}`);
  if (global.activeType === 'pitcher') {
    console.log(`  Detected Pitch Type: ${global.pitchTypeSelect.value}`);
    console.log(`  Pitch Speed: ${global.filterPitchSpeed.value} MPH`);
    console.log(`  Pitch Control: ${global.filterPitchControl.value}`);
    console.log(`  Pitch Break: ${global.filterPitchBreak.value}`);
  } else {
    console.log(`  Contact: ${mockContactSlider.value}`);
    console.log(`  Power: ${mockPowerSlider.value}`);
    console.log(`  Speed: ${mockSpeedSlider.value}`);
  }
}

// Hitter combos
testQuery('hitters with power over 90 and speed over 80');
testQuery('hitters with contact over 95 and power over 90');
testQuery('hitters with vision over 95 and clutch over 90');
testQuery('hitters with fielding over 90 and speed over 90');

// Pitcher combos
testQuery('pitchers with sinker speed over 96 mph');
testQuery('pitchers with cutter control over 85');
testQuery('pitchers with slider break over 90');
testQuery('pitchers with 12-6 curve break over 85');
testQuery('pitchers with circle change break over 90');
testQuery('pitchers with splitter break over 90');
testQuery('pitchers with 4-seam speed over 98 mph');
testQuery('pitchers with sweeping curve break over 90');
