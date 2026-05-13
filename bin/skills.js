#!/usr/bin/env node
const https = require('https');
const { execFileSync } = require('child_process');

const PKG = require('../package.json');
const PACKAGE_NAME = PKG.name;

function needsUpdate(current, latest) {
  const parse = v => v.split('.').map(Number);
  const [ma, mi, pa] = parse(current);
  const [la, li, lp] = parse(latest);
  return la > ma || (la === ma && li > mi) || (la === ma && li === mi && lp > pa);
}

function formatUpToDateMessage(name, version) {
  return `${name} is up to date (v${version})`;
}

function formatUpdateMessage(name, current, latest) {
  return `Updating ${name} v${current} → v${latest}...`;
}

function fetchLatestVersion(name) {
  return new Promise((resolve, reject) => {
    https.get(`https://registry.npmjs.org/${name}/latest`, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data).version); }
        catch { reject(new Error('Failed to parse registry response')); }
      });
    }).on('error', reject);
  });
}

async function update() {
  const current = PKG.version;
  let latest;
  try {
    latest = await fetchLatestVersion(PACKAGE_NAME);
  } catch (e) {
    console.error('Failed to fetch latest version:', e.message);
    process.exit(1);
  }

  if (!needsUpdate(current, latest)) {
    console.log(formatUpToDateMessage(PACKAGE_NAME, current));
    return;
  }

  console.log(formatUpdateMessage(PACKAGE_NAME, current, latest));
  // execFileSync avoids shell injection — args passed as array
  execFileSync('npm', ['install', '-g', `${PACKAGE_NAME}@latest`], { stdio: 'inherit' });
  console.log('Done.');
}

if (require.main === module) {
  const [,, command] = process.argv;
  if (command === 'update') {
    update();
  } else {
    console.log('Usage: skills update');
    process.exit(1);
  }
}

module.exports = { needsUpdate, formatUpToDateMessage, formatUpdateMessage };
