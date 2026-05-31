const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Mock HTML DOM elements and globals
const domElements = {};
function mockElement(id, tagName = 'input') {
  domElements[id] = {
    id: id,
    value: '',
    textContent: '',
    checked: false,
    options: [{ value: 'All' }, { value: 'Yankees' }, { value: 'Mets' }, { value: 'Dodgers' }, { value: 'Red Sox' }],
    addEventListener: () => {},
    appendChild: (child) => {
      // Mock append child to options array if it's a select element
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
    if (domElements[id]) return domElements[id];
    return mockElement(id);
  },
  querySelectorAll: (selector) => {
    // Return empty array or mock nodes for class queries
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
  DOMContentLoaded: () => {},
  MLB_PLAYERS_DATA: [
    { name: "Shohei Ohtani", is_hitter: true, ovr: 99, speed: 85, contact_left: 99, contact_right: 99 },
    { name: "Justin Verlander", is_hitter: false, ovr: 90, stamina: 85, pitch_velocity: 95 },
    { name: "Nolan Ryan", is_hitter: false, ovr: 95, stamina: 99, pitch_velocity: 99 }
  ]
};

// Create a sandbox context
const context = {
  window: mockWindow,
  document: mockDocument,
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  // Helper classes
  IntersectionObserver: class {
    observe() {}
  },
  alert: (msg) => console.log("[Alert]", msg)
};

// Define DOM objects in context
context.document = mockDocument;
context.window = mockWindow;

// Read app.js code
const appCode = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

// Run the app.js script in our sandbox context
try {
  vm.createContext(context);
  vm.runInContext(appCode, context);
  console.log("Successfully loaded app.js in sandbox context.");
} catch (e) {
  console.error("Error loading app.js:", e);
  process.exit(1);
}

// Test cases
function runTestCase(query) {
  console.log(`\n--- Query: "${query}" ---`);
  // Set the prompt input
  context.document.getElementById('nlp-prompt-input').value = query;
  
  // Reset outputs
  context.document.getElementById('filter-speed').value = 0;
  context.document.getElementById('filter-velocity').value = 0;
  context.document.getElementById('filter-stamina').value = 0;
  context.document.getElementById('search-input').value = '';
  context.document.getElementById('team-select').value = 'All';
  
  // Call the function
  try {
    context.applyNaturalLanguagePrompt();
    
    // Read from sandbox context variables
    const activeType = context.activeType;
    const speed = context.document.getElementById('filter-speed').value;
    const velocity = context.document.getElementById('filter-velocity').value;
    const stamina = context.document.getElementById('filter-stamina').value;
    const searchName = context.document.getElementById('search-input').value;
    const team = context.document.getElementById('team-select').value;
    
    console.log(`Active Type: ${activeType}`);
    console.log(`Name Search: "${searchName}"`);
    console.log(`Speed Filter: ${speed}`);
    console.log(`Velocity Filter: ${velocity}`);
    console.log(`Stamina Filter: ${stamina}`);
    console.log(`Team Selected: ${team}`);
  } catch (e) {
    console.error("Error running query:", e);
  }
}

// Run test queries
runTestCase("pitcher with 99 speed");
runTestCase("players with 99 speed");
runTestCase("90 speed hitter");
runTestCase("Justin Verlander with 95 velocity");
runTestCase("diamond pitchers from Mets with stamina over 80");
