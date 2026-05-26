const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const message = process.argv[2];
if (!message) {
  console.error('Error: Please provide an update message. Example:\nnode scripts/publish-update.js "Fix layout bugs"');
  process.exit(1);
}

const appJsonPath = path.join(__dirname, '../app.json');
const versionJsonPath = path.join(__dirname, '../version.json');

if (!fs.existsSync(appJsonPath) || !fs.existsSync(versionJsonPath)) {
  console.error('Error: app.json or version.json not found.');
  process.exit(1);
}

// Read files
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const versionJson = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));

// Parse current version
const currentVersion = versionJson.version;
const versionParts = currentVersion.split('.').map(Number);
if (versionParts.some(isNaN)) {
  console.error('Error: Invalid version format in version.json.');
  process.exit(1);
}
versionParts[2] += 1; // Increment patch version
const newVersion = versionParts.join('.');

console.log(`Bumping version: ${currentVersion} ➔ ${newVersion}`);

// Update version in app.json
appJson.expo.version = newVersion;
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');

// Update version in version.json
versionJson.version = newVersion;
fs.writeFileSync(versionJsonPath, JSON.stringify(versionJson, null, 2) + '\n', 'utf8');

console.log(`Publishing EAS update with message: "${message}"...`);

try {
  execSync(`eas update --channel internal --message "${message}"`, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  });
  console.log(`\n✅ Successfully published OTA update version ${newVersion}`);
} catch (error) {
  console.error('\n❌ Failed to publish EAS update:', error.message);
  process.exit(1);
}
