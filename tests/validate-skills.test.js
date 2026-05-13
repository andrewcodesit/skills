const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { validateSkills } = require('../scripts/validate-skills.js');

function makeSkillDir(tmp, category, name, content) {
  fs.mkdirSync(path.join(tmp, category, name), { recursive: true });
  fs.writeFileSync(path.join(tmp, category, name, 'SKILL.md'), content);
}

test('validateSkills returns 0 for valid skill', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v-valid-'));
  makeSkillDir(tmp, 'context', 'good', '---\nname: good\ndescription: Use when testing\n---\n\n# Content');
  assert.equal(validateSkills(tmp), 0);
  fs.rmSync(tmp, { recursive: true });
});

test('validateSkills returns 0 for valid skills across multiple categories', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v-multi-'));
  makeSkillDir(tmp, 'context', 'skill-a', '---\nname: skill-a\ndescription: Use when a\n---\n');
  makeSkillDir(tmp, 'engineering', 'skill-b', '---\nname: skill-b\ndescription: Use when b\n---\n');
  assert.equal(validateSkills(tmp), 0);
  fs.rmSync(tmp, { recursive: true });
});

test('validateSkills returns 1 when name is missing', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v-noname-'));
  makeSkillDir(tmp, 'context', 'bad', '---\ndescription: Use when testing\n---\n\n# Content');
  assert.equal(validateSkills(tmp), 1);
  fs.rmSync(tmp, { recursive: true });
});

test('validateSkills returns 1 when description is missing', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v-nodesc-'));
  makeSkillDir(tmp, 'context', 'bad', '---\nname: bad\n---\n\n# Content');
  assert.equal(validateSkills(tmp), 1);
  fs.rmSync(tmp, { recursive: true });
});

test('validateSkills returns 2 when both fields are missing', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v-both-'));
  makeSkillDir(tmp, 'context', 'bad', '---\n---\n\n# Content');
  assert.equal(validateSkills(tmp), 2);
  fs.rmSync(tmp, { recursive: true });
});

test('validateSkills returns 1 when SKILL.md is absent', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v-missing-'));
  fs.mkdirSync(path.join(tmp, 'context', 'no-file-skill'), { recursive: true });
  assert.equal(validateSkills(tmp), 1);
  fs.rmSync(tmp, { recursive: true });
});
