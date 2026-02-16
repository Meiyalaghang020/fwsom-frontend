import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';

const mainPath = resolve('src/main.jsx');
const content = readFileSync(mainPath, 'utf-8');

// Find all import statements
const importRegex = /import\s+.*?\s+from\s+["'](.+?)["']/g;
let match;
const issues = [];

while ((match = importRegex.exec(content)) !== null) {
  const importPath = match[1];
  
  // Skip node_modules imports
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) continue;
  
  const fullLine = match[0];
  const basePath = resolve(dirname(mainPath), importPath);
  
  // Check if file exists with various extensions
  const extensions = ['', '.jsx', '.js', '.tsx', '.ts'];
  const found = extensions.some(ext => existsSync(basePath + ext));
  
  if (!found) {
    issues.push({ line: fullLine, importPath, resolved: basePath });
  }
}

if (issues.length === 0) {
  console.log('All imports in main.jsx resolve correctly.');
} else {
  console.log('MISSING IMPORTS:');
  issues.forEach(i => {
    console.log(`  - ${i.importPath} (resolved: ${i.resolved})`);
    console.log(`    Line: ${i.line}`);
  });
}

// Also check for duplicate import identifiers
const identifiers = [];
const identRegex = /import\s+(\w+)\s+from/g;
while ((match = identRegex.exec(content)) !== null) {
  const name = match[1];
  if (identifiers.includes(name)) {
    console.log(`DUPLICATE import identifier: ${name}`);
  }
  identifiers.push(name);
}
