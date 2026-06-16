const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const { copySkills, detectAgents, listSkills, runInstall } = require('../scripts/install.js');

test('copySkills copies skills from category subfolders and returns total count', () => {
  const src = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-src-'));
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-dest-'));

  fs.mkdirSync(path.join(src, 'context', 'my-skill'), { recursive: true });
  fs.writeFileSync(path.join(src, 'context', 'my-skill', 'SKILL.md'), '---\nname: my-skill\n---\n');

  const count = copySkills(src, dest);

  assert.equal(count, 1);
  // installed flat into dest — no category subdir
  assert.ok(fs.existsSync(path.join(dest, 'my-skill', 'SKILL.md')));

  fs.rmSync(src, { recursive: true });
  fs.rmSync(dest, { recursive: true });
});

test('copySkills counts skills across multiple categories', () => {
  const src = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-src-'));
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-dest-'));

  fs.mkdirSync(path.join(src, 'context', 'skill-a'), { recursive: true });
  fs.writeFileSync(path.join(src, 'context', 'skill-a', 'SKILL.md'), '---\nname: skill-a\n---\n');
  fs.mkdirSync(path.join(src, 'engineering', 'skill-b'), { recursive: true });
  fs.writeFileSync(path.join(src, 'engineering', 'skill-b', 'SKILL.md'), '---\nname: skill-b\n---\n');

  const count = copySkills(src, dest);

  assert.equal(count, 2);
  assert.ok(fs.existsSync(path.join(dest, 'skill-a', 'SKILL.md')));
  assert.ok(fs.existsSync(path.join(dest, 'skill-b', 'SKILL.md')));

  fs.rmSync(src, { recursive: true });
  fs.rmSync(dest, { recursive: true });
});

test('copySkills overwrites existing files', () => {
  const src = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-src-'));
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-dest-'));

  fs.mkdirSync(path.join(src, 'context', 'my-skill'), { recursive: true });
  fs.writeFileSync(path.join(src, 'context', 'my-skill', 'SKILL.md'), 'new content');
  fs.mkdirSync(path.join(dest, 'my-skill'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'my-skill', 'SKILL.md'), 'old content');

  copySkills(src, dest);

  const written = fs.readFileSync(path.join(dest, 'my-skill', 'SKILL.md'), 'utf8');
  assert.equal(written, 'new content');

  fs.rmSync(src, { recursive: true });
  fs.rmSync(dest, { recursive: true });
});

test('listSkills returns name, category and srcPath for every skill', () => {
  const src = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-src-'));
  fs.mkdirSync(path.join(src, 'context', 'skill-a'), { recursive: true });
  fs.mkdirSync(path.join(src, 'engineering', 'skill-b'), { recursive: true });

  const skills = listSkills(src).sort((a, b) => a.name.localeCompare(b.name));

  assert.equal(skills.length, 2);
  assert.deepEqual(skills.map(s => s.name), ['skill-a', 'skill-b']);
  assert.equal(skills[0].category, 'context');
  assert.equal(skills[1].category, 'engineering');

  fs.rmSync(src, { recursive: true });
});

test('copySkills only installs skills in the provided filter set', () => {
  const src = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-src-'));
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-dest-'));

  fs.mkdirSync(path.join(src, 'context', 'skill-a'), { recursive: true });
  fs.writeFileSync(path.join(src, 'context', 'skill-a', 'SKILL.md'), 'a');
  fs.mkdirSync(path.join(src, 'engineering', 'skill-b'), { recursive: true });
  fs.writeFileSync(path.join(src, 'engineering', 'skill-b', 'SKILL.md'), 'b');

  const count = copySkills(src, dest, new Set(['skill-b']));

  assert.equal(count, 1);
  assert.ok(!fs.existsSync(path.join(dest, 'skill-a')));
  assert.ok(fs.existsSync(path.join(dest, 'skill-b', 'SKILL.md')));

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

test('install.js entrypoint only auto-installs when npm_config_global is true', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'home-'));
  fs.mkdirSync(path.join(home, '.claude', 'skills'), { recursive: true });
  const installScript = path.join(__dirname, '..', 'scripts', 'install.js');

  execFileSync(process.execPath, [installScript], {
    env: { ...process.env, HOME: home, npm_config_global: undefined },
  });
  assert.equal(fs.readdirSync(path.join(home, '.claude', 'skills')).length, 0);

  execFileSync(process.execPath, [installScript], {
    env: { ...process.env, HOME: home, npm_config_global: 'true' },
  });
  assert.ok(fs.readdirSync(path.join(home, '.claude', 'skills')).length > 0);

  fs.rmSync(home, { recursive: true });
});

test('runInstall does not throw when no agent dirs exist', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'empty-home-'));
  const skillsSrc = path.join(home, 'skills');
  fs.mkdirSync(path.join(skillsSrc, 'context'), { recursive: true });

  assert.doesNotThrow(() => runInstall(skillsSrc, home));

  fs.rmSync(home, { recursive: true });
});
