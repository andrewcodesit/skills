const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  validateSkills,
  validateSharedReferences,
  validateAgents,
  validatePortability,
  validateAgentReferences,
  validateVersions,
} = require('../scripts/validate-skills.js');

function makeSkillDir(tmp, category, name, content) {
  fs.mkdirSync(path.join(tmp, category, name), { recursive: true });
  fs.writeFileSync(path.join(tmp, category, name, 'SKILL.md'), content);
}

function makeAgent(tmp, filename, content) {
  fs.mkdirSync(path.join(tmp, 'agents'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'agents', filename), content);
}

function makeReference(tmp, category, name, filename, content) {
  fs.mkdirSync(path.join(tmp, category, name, 'references'), { recursive: true });
  fs.writeFileSync(path.join(tmp, category, name, 'references', filename), content);
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

test('validateSharedReferences returns 0 when every copy is identical', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v-shared-ok-'));
  makeReference(tmp, 'context', 'a', 'question-format.md', '# Format\n');
  makeReference(tmp, 'engineering', 'b', 'question-format.md', '# Format\n');
  makeReference(tmp, 'engineering', 'c', 'question-format.md', '# Format\n');
  assert.equal(validateSharedReferences(tmp), 0);
  fs.rmSync(tmp, { recursive: true });
});

test('validateSharedReferences returns 1 per drifted copy', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v-shared-drift-'));
  makeReference(tmp, 'context', 'a', 'question-format.md', '# Format\n');
  makeReference(tmp, 'engineering', 'b', 'question-format.md', '# Format\n');
  makeReference(tmp, 'engineering', 'c', 'question-format.md', '# Format DRIFTED\n');
  assert.equal(validateSharedReferences(tmp), 1);
  fs.rmSync(tmp, { recursive: true });
});

test('validateSharedReferences catches whitespace-only drift', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v-shared-ws-'));
  makeReference(tmp, 'context', 'a', 'question-format.md', '# Format\n');
  makeReference(tmp, 'engineering', 'b', 'question-format.md', '# Format\n\n');
  assert.equal(validateSharedReferences(tmp), 1);
  fs.rmSync(tmp, { recursive: true });
});

test('validateSharedReferences returns 0 when the shared reference is absent everywhere', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v-shared-none-'));
  makeSkillDir(tmp, 'context', 'a', '---\nname: a\ndescription: Use when a\n---\n');
  assert.equal(validateSharedReferences(tmp), 0);
  fs.rmSync(tmp, { recursive: true });
});

test('validateSharedReferences ignores non-shared reference files', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v-shared-other-'));
  makeReference(tmp, 'engineering', 'a', 'type-rules.md', '# A rules\n');
  makeReference(tmp, 'engineering', 'b', 'type-rules.md', '# B rules, legitimately different\n');
  assert.equal(validateSharedReferences(tmp), 0);
  fs.rmSync(tmp, { recursive: true });
});

test('validateSharedReferences covers delegation.md copies', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v-shared-deleg-'));
  makeReference(tmp, 'engineering', 'a', 'delegation.md', '# Delegation\n');
  makeReference(tmp, 'engineering', 'b', 'delegation.md', '# Delegation DRIFTED\n');
  assert.equal(validateSharedReferences(tmp), 1);
  fs.rmSync(tmp, { recursive: true });
});

test('validateAgents accepts matching frontmatter and rejects a name/filename mismatch or missing description', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v-agents-'));
  makeAgent(tmp, 'critic.md', '---\nname: critic\ndescription: Reviews code\n---\n');
  assert.equal(validateAgents(path.join(tmp, 'agents')), 0);
  makeAgent(tmp, 'scout.md', '---\nname: searcher\n---\n');
  assert.equal(validateAgents(path.join(tmp, 'agents')), 2);
  fs.rmSync(tmp, { recursive: true });
});

test('validatePortability passes clean content', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v-port-ok-'));
  makeSkillDir(path.join(tmp, 'skills'), 'context', 'a', 'Save to `~/.agents/plans/<repo>/` - read `references/delegation.md`.\n');
  assert.equal(validatePortability(tmp, ['skills', 'agents']), 0);
  fs.rmSync(tmp, { recursive: true });
});

for (const [label, line] of [
  ['a global standards path', 'Read `~/.agents/standards/delegation.md`.'],
  ['the home AGENTS.md path', 'See `~/AGENTS.md`.'],
  ['an absolute home path', 'Run /Users/someone/bin/tool.'],
  ['an em dash', 'Stop — then ask.'],
]) {
  test(`validatePortability rejects ${label}`, () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v-port-bad-'));
    makeAgent(tmp, 'critic.md', `---\nname: critic\ndescription: x\n---\n${line}\n`);
    assert.equal(validatePortability(tmp, ['skills', 'agents']), 1);
    fs.rmSync(tmp, { recursive: true });
  });
}

test('validatePortability rejects symlinks inside a released skill', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v-port-link-'));
  makeSkillDir(path.join(tmp, 'skills'), 'context', 'a', '---\nname: a\ndescription: x\n---\n');
  fs.mkdirSync(path.join(tmp, 'skills', 'context', 'a', 'references'));
  fs.symlinkSync(path.join(tmp, 'elsewhere.md'), path.join(tmp, 'skills', 'context', 'a', 'references', 'delegation.md'));
  assert.equal(validatePortability(tmp, ['skills']), 1);
  fs.rmSync(tmp, { recursive: true });
});

test('validateAgentReferences requires every named agent to ship in agents/', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v-agent-refs-'));
  const skills = path.join(tmp, 'skills');
  makeSkillDir(skills, 'engineering', 'review', 'Launch the `critic` agent. See the architecture notes.\n');
  makeReference(skills, 'engineering', 'review', 'delegation.md', '| Role | Agent |\n| --- | --- |\n| Reviewer | `critic` | `opus` |\n| Searcher | `scout` | `haiku` |\n');
  makeAgent(tmp, 'critic.md', '---\nname: critic\ndescription: x\n---\n');
  assert.equal(validateAgentReferences(skills, path.join(tmp, 'agents')), 1);
  makeAgent(tmp, 'scout.md', '---\nname: scout\ndescription: x\n---\n');
  assert.equal(validateAgentReferences(skills, path.join(tmp, 'agents')), 0);
  fs.rmSync(tmp, { recursive: true });
});

test('validateVersions requires package.json and plugin.json versions to match', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v-versions-'));
  fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ version: '2.0.0' }));
  assert.equal(validateVersions(tmp), 0);
  fs.mkdirSync(path.join(tmp, '.claude-plugin'));
  fs.writeFileSync(path.join(tmp, '.claude-plugin', 'plugin.json'), JSON.stringify({ version: '1.9.0' }));
  assert.equal(validateVersions(tmp), 1);
  fs.rmSync(tmp, { recursive: true });
});
