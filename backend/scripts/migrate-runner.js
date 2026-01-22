const fs = require('fs');
const path = require('path');

const distPath = path.join(process.cwd(), 'dist', 'database', 'migrate.js');
const srcPath = path.join(process.cwd(), 'src', 'database', 'migrate.ts');

console.log('Running migrations...');
console.log('Checking for migration file...');

if (fs.existsSync(distPath)) {
  // Production: use compiled file
  console.log('Using compiled migration file:', distPath);
  try {
    require(distPath);
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
} else if (fs.existsSync(srcPath)) {
  // Development: use tsx
  console.log('Using source migration file:', srcPath);
  try {
    require('tsx/cjs/register');
    require(srcPath);
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('tsx')) {
      console.error('Error: tsx is not available. Please install dev dependencies or build the project first.');
      console.error('Run: npm install (for dev) or npm run build (for production)');
    } else {
      console.error('Error running migrations:', error);
    }
    process.exit(1);
  }
} else {
  console.error('Error: Migration file not found');
  console.error('Expected:', distPath);
  console.error('Or:', srcPath);
  process.exit(1);
}
