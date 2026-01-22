const fs = require('fs');
const path = require('path');

const distPath = path.join(process.cwd(), 'dist', 'database', 'migrate.js');
const srcPath = path.join(process.cwd(), 'src', 'database', 'migrate.ts');

console.log('🔄 Running database migrations...');
console.log('📂 Checking for migration file...');
console.log('   Current working directory:', process.cwd());

if (fs.existsSync(distPath)) {
  // Production: use compiled file
  console.log('✅ Found compiled migration file:', distPath);
  try {
    require(distPath);
    // Если require не выбросил ошибку, миграции выполняются асинхронно
    // и завершат процесс сами через process.exit()
  } catch (error) {
    console.error('❌ Error running migrations:', error);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
} else if (fs.existsSync(srcPath)) {
  // Development: use tsx
  console.log('✅ Found source migration file:', srcPath);
  try {
    require('tsx/cjs/register');
    require(srcPath);
    // Если require не выбросил ошибку, миграции выполняются асинхронно
    // и завершат процесс сами через process.exit()
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND' && (error.message.includes('tsx') || error.message.includes("Cannot find module 'tsx"))) {
      console.error('❌ Error: tsx is not available. Please install dev dependencies or build the project first.');
      console.error('   Run: npm install (for dev) or npm run build (for production)');
    } else {
      console.error('❌ Error running migrations:', error);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
    process.exit(1);
  }
} else {
  console.error('❌ Error: Migration file not found');
  console.error('   Expected (production):', distPath);
  console.error('   Expected (development):', srcPath);
  console.error('   Current directory:', process.cwd());
  console.error('   Files in dist/database:', fs.existsSync(path.join(process.cwd(), 'dist', 'database')) 
    ? fs.readdirSync(path.join(process.cwd(), 'dist', 'database')).join(', ') 
    : 'directory does not exist');
  process.exit(1);
}
