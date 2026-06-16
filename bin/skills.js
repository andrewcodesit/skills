#!/usr/bin/env node
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const PKG = require('../package.json');
const PACKAGE_NAME = PKG.name;
const { detectAgents, listSkills, copySkills } = require('../scripts/install.js');
const { checkbox } = require('../scripts/checkbox-prompt.js');

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

function list() {
  const skillsSrc = path.join(__dirname, '..', 'skills');
  const skills = listSkills(skillsSrc);
  for (const skill of skills) {
    console.log(`${skill.name} (${skill.category})`);
  }
}

async function add(names) {
  const skillsSrc = path.join(__dirname, '..', 'skills');
  const skills = listSkills(skillsSrc);

  let selected;
  if (names.length > 0) {
    const valid = new Set(skills.map(s => s.name));
    const unknown = names.filter(n => !valid.has(n));
    if (unknown.length > 0) {
      console.error(`Unknown skill(s): ${unknown.join(', ')}`);
      process.exit(1);
    }
    selected = names;
  } else if (process.stdin.isTTY) {
    try {
      selected = await checkbox(
        'Select skills to install:',
        skills.map(s => ({ label: `${s.name} (${s.category})`, value: s.name }))
      );
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
    if (selected.length === 0) {
      console.log('No skills selected.');
      return;
    }
  } else {
    console.error('Usage: skills add <skill-name> [skill-name...]');
    process.exit(1);
  }

  const filter = new Set(selected);
  const agents = detectAgents(os.homedir());
  let installedAny = false;
  for (const agent of agents) {
    if (fs.existsSync(agent.dir)) {
      const count = copySkills(skillsSrc, agent.dir, filter);
      console.log(`✓ ${agent.name} → ${agent.dir} (${count} skills)`);
      installedAny = true;
    }
  }
  if (!installedAny) {
    console.warn('Warning: no agent directories found. Skills were not installed.');
  }
}

if (require.main === module) {
  const [,, command, ...rest] = process.argv;
  if (command === 'update') {
    update();
  } else if (command === 'list') {
    list();
  } else if (command === 'add') {
    add(rest);
  } else {
    console.log('Usage: skills update | skills list | skills add [skill-name...]');
    process.exit(1);
  }
}

module.exports = { needsUpdate, formatUpToDateMessage, formatUpdateMessage };
