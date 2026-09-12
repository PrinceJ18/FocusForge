const fs = require('fs');
const path = require('path');

const replacements = [
  // Text colors
  { regex: /\btext-white\b/g, replace: 'text-text-primary' },
  { regex: /\btext-slate-200\b/g, replace: 'text-text-primary' },
  { regex: /\btext-slate-300\b/g, replace: 'text-text-secondary' },
  { regex: /\btext-slate-400\b/g, replace: 'text-text-muted' },
  { regex: /\btext-slate-500\b/g, replace: 'text-text-muted' },
  { regex: /\btext-gray-300\b/g, replace: 'text-text-secondary' },
  { regex: /\btext-gray-400\b/g, replace: 'text-text-muted' },
  { regex: /\btext-gray-500\b/g, replace: 'text-text-muted' },
  
  // Backgrounds
  { regex: /\bbg-white\/2\b/g, replace: 'bg-background-card' },
  { regex: /\bbg-white\/5\b/g, replace: 'bg-background-card-hover' },
  { regex: /\bbg-white\/10\b/g, replace: 'bg-background-card-hover' },
  
  // Borders
  { regex: /\bborder-white\/5\b/g, replace: 'border-border' },
  { regex: /\bborder-white\/10\b/g, replace: 'border-border' },
  { regex: /\bborder-slate-700\b/g, replace: 'border-border' },
  { regex: /\bborder-slate-800\b/g, replace: 'border-border' },

  // Inline styles
  { regex: /color:\s*['"]white['"]/g, replace: "color: 'var(--text-primary)'" },
  { regex: /background:\s*['"]rgba\(255,255,255,0\.05\)['"]/g, replace: "background: 'var(--bg-card-hover)'" },
  { regex: /border:\s*['"]1px solid rgba\(255,255,255,0\.08\)['"]/g, replace: "border: '1px solid var(--border-color)'" },
];

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
      callback(dirPath);
    }
  });
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let changed = false;
  
  for (const { regex, replace } of replacements) {
    if (regex.test(content)) {
      content = content.replace(regex, replace);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

walkDir(path.join(__dirname, 'src'), processFile);
console.log('Done refactoring theme colors.');
