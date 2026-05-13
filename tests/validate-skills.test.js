const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { validateSkills } = require('../scripts/validate-skills.js');

function makeSkillDir(tmp, name, content) {
  fs.mkdirSync(path.join(tmp, name));
  fs.writeFileSync(path.join(tmp, name, 'SKILL.md'), content);
}

test('validateSkills returns 0 for valid skill', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v-valid-'));
  makeSkillDir(tmp, 'good', '---\nname: good\ndescription: Use when testing\n---\n\n# Content');
  assert.equal(validateSkills(tmp), 0);
  fs.rmSync(tmp, { recursive: true });
});

test('validateSkills returns 1 when name is missing', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v-noname-'));
  makeSkillDir(tmp, 'bad', '---\ndescription: Use when testing\n---\n\n# Content');
  assert.equal(validateSkills(tmp), 1);
  fs.rmSync(tmp, { recursive: true });
});

test('validateSkills returns 1 when description is missing', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v-nodesc-'));
  makeSkillDir(tmp, 'bad', '---\nname: bad\n---\n\n# Content');
  assert.equal(validateSkills(tmp), 1);
  fs.rmSync(tmp, { recursive: true });
});

test('validateSkills returns 2 when both fields are missing', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v-both-'));
  makeSkillDir(tmp, 'bad', '---\n---\n\n# Content');
  assert.equal(validateSkills(tmp), 2);
  fs.rmSync(tmp, { recursive: true });
});

test('validateSkills returns 1 when SKILL.md file is absent', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v-missing-'));
  fs.mkdirSync(path.join(tmp, 'no-file-skill'));
  assert.equal(validateSkills(tmp), 1);
  fs.rmSync(tmp, { recursive: true });
});
