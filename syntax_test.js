// Simple syntax validation test
try {
  require('./src/Content/ContentWebPages.jsx');
//  console.log('✅ Syntax is valid - no errors found');
} catch (error) {
  console.error('❌ Syntax error found:', error.message);
}
