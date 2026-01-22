const fs = require('fs');
const path = require('path');

const distPath = path.join(process.cwd(), 'dist', 'database', 'migrate.js');
const srcPath = path.join(process.cwd(), 'src', 'database', 'migrate.ts');

if (fs.existsSync(distPath)) {
  // Production: use compiled file
  require(distPath);
} else if (fs.existsSync(srcPath)) {
  // Development: use tsx
  try {
    require('tsx/cjs/register');
    require(srcPath);
  } catch (error) {
    console.error('Error: tsx is not available. Please install dev dependencies or build the project first.');
    console.error('Run: npm install (for dev) or npm run build (for production)');
    process.exit(1);
  }
} else {
  console.error('Error: Migration file not found');
  console.error('Expected:', distPath);
  console.error('Or:', srcPath);
  process.exit(1);
}
