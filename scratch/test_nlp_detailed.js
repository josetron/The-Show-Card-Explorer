const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Mock HTML DOM elements and globals
const domElements = {};
function mockElement(id, tagName = 'input') {
  if (domElements[id]) return domElements[id];
  domElements[id] = {
    id: id,
    value: '',
    textContent: '',
    checked: false,
    options: [{ value: 'All' }],
    addEventListener: () => {},
    appendChild: (child) => {
      if (domElements[id].options) {
        domElements[id].options.push(child);
      }
    },
    classList: {
      toggle: (className, active) => {},
      add: (className) => {},
      remove: (className) => {}
    },
    children: []
  };
  return domElements[id];
}

const mockDocument = {
  getElementById: (id) => {
    if (domElements[id]) return domElements[id];
    return mockElement(id);
  },
  querySelectorAll: (selector) => {
    if (selector.includes('input[type="range"]')) {
      // Return all range input elements mocked
      return Object.values(domElements).filter(el => el.id.startsWith('filter-') || el.id.startsWith('w-') || el.id.startsWith('ovr-'));
    }
    if (selector.includes('.slider-header span')) {
      return Object.values(domElements).filter(el => el.id.endsWith('-val'));
    }
    return [];
  },
  createElement: (tagName) => {
    return {
      className: '',
      setAttribute: () => {},
      innerHTML: '',
      appendChild: () => {}
    };
  }
};

const mockWindow = {
  addEventListener: () => {},
  DOMContentLoaded: () => {}
};

// Create a sandbox context
const context = {
  window: mockWindow,
  document: mockDocument,
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  IntersectionObserver: class {
    observe() {}
  },
  alert: (msg) => console.log("[Alert]", msg)
};

// Read players.js code (which defines window.MLB_PLAYERS_DATA)
const playersJsPath = path.join(__dirname, '..', 'data', 'players.js');
let playersJsContent = fs.readFileSync(playersJsPath, 'utf8');
// players.js starts with window.MLB_PLAYERS_DATA = ... or similar
// Let's run it in our context
vm.createContext(context);
try {
  vm.runInContext(playersJsContent, context);
  console.log("Real players database loaded successfully inside sandbox. Player count:", context.window.MLB_PLAYERS_DATA.length);
} catch (e) {
  console.error("Error loading players.js:", e);
  process.exit(1);
}

// Read app.js code
const appCode = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

// Run app.js in sandbox
try {
  vm.runInContext(appCode, context);
  console.log("Successfully loaded app.js in sandbox context.");
} catch (e) {
  console.error("Error loading app.js:", e);
  process.exit(1);
}

// Manually trigger the DOMContentLoaded callback to initialize variables
// Since players database is in context.window.MLB_PLAYERS_DATA, we simulate loadDatabase()
// We need to initialize the slider elements in our mocked DOM so they have default values
const rangeSliders = [
  'ovr-min', 'ovr-max',
  'filter-contact', 'filter-power', 'filter-speed', 'filter-fielding', 'filter-vision', 'filter-clutch',
  'filter-stamina', 'filter-h9', 'filter-k9', 'filter-bb9', 'filter-pclutch', 'filter-velocity',
  'w-contact-l', 'w-contact-r', 'w-power-l', 'w-power-r', 'w-vision', 'w-clutch', 'w-fielding', 'w-speed', 'w-stealing',
  'w-stamina', 'w-h9-l', 'w-h9-r', 'w-k9-l', 'w-k9-r', 'w-bb9', 'w-pclutch', 'w-velocity', 'w-movement'
];
rangeSliders.forEach(id => {
  const el = mockElement(id);
  if (id === 'ovr-min') el.value = '50';
  else if (id === 'ovr-max') el.value = '99';
  else if (id.startsWith('w-')) el.value = '5';
  else el.value = '0';
});

// Setup activeRarities checkboxes to true
const rarities = ['Diamond', 'Gold', 'Silver', 'Bronze', 'Common'];
rarities.forEach(r => {
  const cb = mockElement('rarity-' + r.toLowerCase());
  cb.checked = true;
});

// Initialize other UI fields
mockElement('search-input').value = '';
mockElement('team-select').value = 'All';
mockElement('series-select').value = 'All';
mockElement('position-select').value = 'All';
mockElement('hand-select').value = 'All';
mockElement('enable-custom-formula').checked = false;
mockElement('sort-by').value = 'ovr';

// Call loadDatabase to load real data into sandbox 'players'
try {
  context.loadDatabase();
  console.log("App state initialized successfully.");
} catch (e) {
  console.error("Error running loadDatabase:", e);
}

// Test Queries
const queries = [
  "players with 99 speed",
  "pitchers with 99 speed",
  "find players with 99 speed",
  "show me pitchers with 99 speed",
  "players with 99 speed.",
  '"players with 99 speed"',
  "pitchers witn 99 pitch",
  "pitchers with 99 velocity"
];

queries.forEach(testQuery => {
  console.log(`\n--- Running natural language query: "${testQuery}" ---`);
  context.document.getElementById('nlp-prompt-input').value = testQuery;

  try {
    context.applyNaturalLanguagePrompt();
    
    console.log("Results:");
    const filteredCount = context.document.getElementById('filtered-card-count').textContent;
    console.log("  Filtered Players Count:", filteredCount);
    console.log("  Speed Threshold:", context.document.getElementById('filter-speed').value);
    console.log("  Velocity Threshold:", context.document.getElementById('filter-velocity').value);
    console.log("  OVR range:", context.document.getElementById('ovr-min').value, "-", context.document.getElementById('ovr-max').value);
    console.log("  Search Name input value:", context.document.getElementById('search-input').value);
    
    const feedbackText = context.document.getElementById('nlp-feedback').textContent;
    if (feedbackText) {
      console.log("  Feedback Message:", feedbackText);
    }
  } catch (e) {
    console.error("Error executing query parser:", e);
  }
});
