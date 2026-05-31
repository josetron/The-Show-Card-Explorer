const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Mock a JSDOM-like environment for the diagnose.html script
const domElements = {};
function mockElement(id, tagName = 'div') {
  if (domElements[id]) return domElements[id];
  
  domElements[id] = {
    id: id,
    tagName: tagName.toUpperCase(),
    value: '',
    textContent: '',
    checked: false,
    options: [{ value: 'All' }],
    children: [],
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
    }
  };
  return domElements[id];
}

const mockDocument = {
  getElementById: (id) => {
    // If it's a known element in our HTML, return it
    return mockElement(id);
  },
  querySelectorAll: (selector) => {
    if (selector.includes('input[type="range"]')) {
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

vm.createContext(context);

// Load data/players.js
const playersJs = fs.readFileSync(path.join(__dirname, '..', 'data', 'players.js'), 'utf8');
vm.runInContext(playersJs, context);

// Load app.js
const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
vm.runInContext(appJs, context);

// Initialize elements with default values
const rangeSliders = [
  'ovr-min', 'ovr-max',
  'filter-contact', 'filter-power', 'filter-speed', 'filter-fielding', 'filter-vision', 'filter-clutch',
  'filter-stamina', 'filter-h9', 'filter-k9', 'filter-bb9', 'filter-pclutch', 'filter-velocity',
  'w-contact-l', 'w-contact-r', 'w-power-l', 'w-power-r', 'w-vision', 'w-clutch', 'w-fielding', 'w-speed', 'w-stealing',
  'w-stamina', 'w-h9-l', 'w-h9-r', 'w-k9-l', 'w-k9-r', 'w-bb9', 'w-pclutch', 'w-velocity', 'w-movement'
];
rangeSliders.forEach(id => {
  const el = mockElement(id, 'input');
  if (id === 'ovr-min') el.value = '50';
  else if (id === 'ovr-max') el.value = '99';
  else if (id.startsWith('w-')) el.value = '5';
  else el.value = '0';
});

// Setup activeRarities checkboxes to true
const rarities = ['Diamond', 'Gold', 'Silver', 'Bronze', 'Common'];
rarities.forEach(r => {
  const cb = mockElement('rarity-' + r.toLowerCase(), 'input');
  cb.checked = true;
});

// Set up globals that diagnose.html script reads
context.players = context.window.MLB_PLAYERS_DATA;
context.activeType = 'hitter';

// Call loadDatabase to load real data into internal players array
try {
  context.loadDatabase();
} catch (e) {
  console.error("Error loading database:", e);
}

// Read the diagnostic script from diagnose.html
const diagnoseHtml = fs.readFileSync(path.join(__dirname, '..', 'diagnose.html'), 'utf8');
const scriptMatch = diagnoseHtml.match(/<script>([\s\S]*?)<\/script>/g);
// The third script block in diagnose.html contains the runDiagnostics function (index 0 because it's the only one without src attribute matched by the regex)
const diagnosticScript = scriptMatch[0].replace('<script>', '').replace('</script>', '');

// Run the diagnostic script in the context
try {
  vm.runInContext(diagnosticScript, context);
  console.log("Successfully ran diagnose.html diagnostic script.");
  
  // Call runDiagnostics
  context.runDiagnostics();
  
  // Print log output
  const loggerText = context.document.getElementById('console-log').textContent;
  console.log("\n--- Diagnose.html Console Output ---");
  console.log(loggerText);
  
} catch (e) {
  console.error("Error executing diagnostic script:", e);
}
