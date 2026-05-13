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

function copySkills(srcDir, destDir) {
  const categories = fs.readdirSync(srcDir).filter(e =>
    fs.statSync(path.join(srcDir, e)).isDirectory()
  );
  let total = 0;
  for (const category of categories) {
    const categoryPath = path.join(srcDir, category);
    const skills = fs.readdirSync(categoryPath).filter(e =>
      fs.statSync(path.join(categoryPath, e)).isDirectory()
    );
    for (const skill of skills) {
      const skillSrc = path.join(categoryPath, skill);
      const skillDest = path.join(destDir, skill);
      fs.mkdirSync(skillDest, { recursive: true });
      const files = fs.readdirSync(skillSrc).filter(f =>
        fs.statSync(path.join(skillSrc, f)).isFile()
      );
      for (const file of files) {
        fs.copyFileSync(path.join(skillSrc, file), path.join(skillDest, file));
      }
      total++;
    }
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
  runInstall(path.join(__dirname, '..', 'skills'), os.homedir());
}

module.exports = { detectAgents, copySkills, runInstall };
