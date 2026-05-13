const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { copySkills, detectAgents, runInstall } = require('../scripts/install.js');

test('copySkills copies all skill folders and returns count', () => {
  const src = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-src-'));
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-dest-'));

  fs.mkdirSync(path.join(src, 'my-skill'));
  fs.writeFileSync(path.join(src, 'my-skill', 'SKILL.md'), '---\nname: my-skill\n---\n');

  const count = copySkills(src, dest);

  assert.equal(count, 1);
  assert.ok(fs.existsSync(path.join(dest, 'my-skill', 'SKILL.md')));

  fs.rmSync(src, { recursive: true });
  fs.rmSync(dest, { recursive: true });
});

test('copySkills overwrites existing files', () => {
  const src = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-src-'));
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-dest-'));

  fs.mkdirSync(path.join(src, 'my-skill'));
  fs.writeFileSync(path.join(src, 'my-skill', 'SKILL.md'), 'new content');
  fs.mkdirSync(path.join(dest, 'my-skill'));
  fs.writeFileSync(path.join(dest, 'my-skill', 'SKILL.md'), 'old content');

  copySkills(src, dest);

  const written = fs.readFileSync(path.join(dest, 'my-skill', 'SKILL.md'), 'utf8');
  assert.equal(written, 'new content');

  fs.rmSync(src, { recursive: true });
  fs.rmSync(dest, { recursive: true });
});

test('detectAgents returns dirs resolved against provided homedir', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'homedir-'));
  fs.mkdirSync(path.join(home, '.claude', 'skills'), { recursive: true });

  const agents = detectAgents(home);
  const existing = agents.filter(a => fs.existsSync(a.dir));

  assert.equal(existing.length, 1);
  assert.equal(existing[0].name, 'Claude Code');

  fs.rmSync(home, { recursive: true });
});

test('runInstall does not throw when no agent dirs exist', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'empty-home-'));
  const skillsSrc = path.join(home, 'skills');
  fs.mkdirSync(skillsSrc);

  assert.doesNotThrow(() => runInstall(skillsSrc, home));

  fs.rmSync(home, { recursive: true });
});
