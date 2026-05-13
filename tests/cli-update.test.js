const { test } = require('node:test');
const assert = require('node:assert/strict');

const { needsUpdate, formatUpToDateMessage, formatUpdateMessage } = require('../bin/skills.js');

test('needsUpdate returns false when versions are equal', () => {
  assert.equal(needsUpdate('1.0.0', '1.0.0'), false);
});

test('needsUpdate returns true when minor version is newer', () => {
  assert.equal(needsUpdate('1.0.0', '1.1.0'), true);
});

test('needsUpdate returns true when patch version is newer', () => {
  assert.equal(needsUpdate('1.0.0', '1.0.1'), true);
});

test('formatUpToDateMessage contains the version', () => {
  const msg = formatUpToDateMessage('@andrewcodesit/skills', '1.2.0');
  assert.ok(msg.includes('1.2.0'), `Got: ${msg}`);
});

test('formatUpdateMessage contains both versions', () => {
  const msg = formatUpdateMessage('@andrewcodesit/skills', '1.1.0', '1.2.0');
  assert.ok(msg.includes('1.1.0') && msg.includes('1.2.0'), `Got: ${msg}`);
});
