#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');

const pkg = require('../package.json');

const AGENT_DIRS = [
  { name: 'Claude Code', rel: path.join('.claude', 'skills') },
  { name: 'Codex',       rel: path.join('.agents', 'skills') },
  { name: 'Gemini CLI',  rel: path.join('.gemini', 'skills') },
];

const PAD_WIDTH = Math.max(...AGENT_DIRS.map(a => a.name.length));

function detectAgents(homedir) {
  return AGENT_DIRS.map(a => ({ name: a.name, dir: path.join(homedir, a.rel) }));
}

function listSkills(srcDir) {
  const categories = fs.readdirSync(srcDir).filter(e =>
    fs.statSync(path.join(srcDir, e)).isDirectory()
  );
  const skills = [];
  for (const category of categories) {
    const categoryPath = path.join(srcDir, category);
    const skillNames = fs.readdirSync(categoryPath).filter(e =>
      fs.statSync(path.join(categoryPath, e)).isDirectory()
    );
    for (const name of skillNames) {
      skills.push({ name, category, srcPath: path.join(categoryPath, name) });
    }
  }
  return skills;
}

function copySkills(srcDir, destDir, filterNames) {
  const skills = listSkills(srcDir);
  let total = 0;
  for (const skill of skills) {
    if (filterNames && !filterNames.has(skill.name)) continue;
    const skillDest = path.join(destDir, skill.name);
    fs.mkdirSync(skillDest, { recursive: true });
    const files = fs.readdirSync(skill.srcPath).filter(f =>
      fs.statSync(path.join(skill.srcPath, f)).isFile()
    );
    for (const file of files) {
      fs.copyFileSync(path.join(skill.srcPath, file), path.join(skillDest, file));
    }
    total++;
  }
  return total;
}

function runInstall(skillsSrc, homedir) {
  if (!fs.existsSync(skillsSrc)) {
    console.warn(`Warning: skills source directory not found: ${skillsSrc}`);
    return 0;
  }

  const agents = detectAgents(homedir);
  let installed = 0;

  console.log(`@andrewcodesit/skills v${pkg.version}`);

  for (const agent of agents) {
    if (fs.existsSync(agent.dir)) {
      const count = copySkills(skillsSrc, agent.dir);
      console.log(`✓ ${agent.name.padEnd(PAD_WIDTH)} → ${agent.dir} (${count} skills)`);
      installed++;
    } else {
      console.log(`- ${agent.name.padEnd(PAD_WIDTH)} → not installed, skipped`);
    }
  }

  if (installed === 0) {
    console.warn('Warning: no agent directories found. Skills were not installed.');
  }

  return installed;
}

if (require.main === module) {
  // Only auto-install everything for `npm install -g`. Skip for `npx ... add`,
  // local installs, etc. — npm_config_global is only set to "true" on -g installs.
  if (process.env.npm_config_global === 'true') {
    runInstall(path.join(__dirname, '..', 'skills'), os.homedir());
  }
}

module.exports = { detectAgents, listSkills, copySkills, runInstall };
