const fs = require('fs');

let appJs = fs.readFileSync('app.js', 'utf8');
const combosJs = fs.readFileSync('scratch/lethal_combos_array.js', 'utf8');

// 1. Update window DOMContentLoaded listener to call renderLethalCombinations
const oldInit = `window.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadDatabase();
});`;

const newInit = `window.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadDatabase();
  renderLethalCombinations();
});`;

if (appJs.includes(oldInit)) {
  appJs = appJs.replace(oldInit, newInit);
  console.log('Successfully updated DOMContentLoaded listener.');
} else {
  console.log('Warning: could not find exact DOMContentLoaded listener pattern. Finding line manually...');
  // Fallback replacement if formatting differs slightly
  appJs = appJs.replace(/window\.addEventListener\('DOMContentLoaded',\s*\(\)\s*=>\s*\{([\s\S]*?)loadDatabase\(\);([\s\S]*?)\}\);/, (match, p1, p2) => {
    return `window.addEventListener('DOMContentLoaded', () => {${p1}loadDatabase();\n  renderLethalCombinations();${p2}});`;
  });
}

// 2. Append renderLethalCombinations function and the combos array at the end of app.js
const renderFunction = `
// Render the 100 lethal attribute combinations dynamically
function renderLethalCombinations() {
  const container = document.getElementById('more-nlp-examples');
  if (!container || typeof LETHAL_COMBOS === 'undefined') return;
  container.innerHTML = '';
  LETHAL_COMBOS.forEach(combo => {
    const el = document.createElement('span');
    el.className = 'example-pill';
    el.textContent = combo.text;
    el.onclick = () => setExamplePrompt(combo.query);
    container.appendChild(el);
  });
}
`;

appJs += '\n' + combosJs + '\n' + renderFunction;
fs.writeFileSync('app.js', appJs, 'utf8');
console.log('Successfully appended LETHAL_COMBOS array and renderLethalCombinations function to app.js');
