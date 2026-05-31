const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.gemini') {
        searchDir(fullPath);
      }
    } else if (file.endsWith('.js') || file.endsWith('.py') || file.endsWith('.html') || file.endsWith('.css')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('velocity') || content.includes('control') || content.includes('pitches')) {
        console.log('Found in:', fullPath);
      }
    }
  }
}

searchDir('.');
