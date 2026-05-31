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

// Mock global window/document objects
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

// Now test applyNaturalLanguagePrompt by mocking document input value
function testQuery(q) {
  console.log(`\nTesting query: "${q}"`);
  // Mock elements
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

  // Make sure global variables get new mock elements for each test run if needed
  global.pitchTypeSelect.value = 'All';
  global.filterPitchSpeed.value = '60';
  global.filterPitchControl.value = '0';
  global.filterPitchBreak.value = '0';
  global.filterPitchUsage.value = '0';

  global.document.getElementById = (id) => {
    if (id === 'nlp-prompt-input') return mockInput;
    if (id === 'search-input') return mockSearchInput;
    if (id === 'pitch-type-select') return global.pitchTypeSelect;
    if (id === 'filter-pitch-speed') return global.filterPitchSpeed;
    if (id === 'filter-pitch-control') return global.filterPitchControl;
    if (id === 'filter-pitch-break') return global.filterPitchBreak;
    if (id === 'filter-pitch-usage') return global.filterPitchUsage;
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

  global.document.querySelectorAll = (selector) => {
    if (selector === '.filter-section input[type="range"]') return [];
    if (selector === '.slider-header span:last-child') return [];
    if (selector === '.weight-slider') return [];
    return [];
  };

  // Run the parser
  applyNaturalLanguagePrompt();

  console.log('Results:');
  console.log(`  Active Type: ${global.activeType}`);
  console.log(`  Detected Pitch Type: ${global.pitchTypeSelect.value}`);
  console.log(`  Pitch Speed: ${global.filterPitchSpeed.value} MPH`);
  console.log(`  Pitch Control: ${global.filterPitchControl.value}`);
  console.log(`  Pitch Break: ${global.filterPitchBreak.value}`);
  console.log(`  Pitch Usage: ${global.filterPitchUsage.value}%`);
}

testQuery('pitchers with a sinker over 95 mph');
testQuery('dodgers pitchers with slider break over 90');
testQuery('pitchers with cutter control over 85');
