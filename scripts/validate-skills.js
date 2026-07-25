#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function validateSkills(skillsDir) {
  let errors = 0;
  for (const category of fs.readdirSync(skillsDir)) {
    const categoryPath = path.join(skillsDir, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;
    for (const entry of fs.readdirSync(categoryPath)) {
      const skillPath = path.join(categoryPath, entry);
      if (!fs.statSync(skillPath).isDirectory()) continue;
      const skillFile = path.join(skillPath, 'SKILL.md');
      if (!fs.existsSync(skillFile)) {
        console.error(`skills/${category}/${entry}: missing SKILL.md`);
        errors++;
        continue;
      }
      const content = fs.readFileSync(skillFile, 'utf8');
      const nameMatch = content.match(/^name:\s*(.+)$/m);
      const descMatch = content.match(/^description:\s*(.+)$/m);
      if (!nameMatch || !nameMatch[1].trim()) {
        console.error(`skills/${category}/${entry}/SKILL.md: missing or empty 'name'`);
        errors++;
      }
      if (!descMatch || !descMatch[1].trim()) {
        console.error(`skills/${category}/${entry}/SKILL.md: missing or empty 'description'`);
        errors++;
      }
    }
  }
  return errors;
}

// References that several skills deliberately duplicate so each skill stays self-contained and
// installable on its own. Every copy must be byte-identical; drift between copies is the failure
// this guards against.
const SHARED_REFERENCES = ['question-format.md'];

function findSharedCopies(skillsDir, filename) {
  const copies = [];
  for (const category of fs.readdirSync(skillsDir)) {
    const categoryPath = path.join(skillsDir, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;
    for (const entry of fs.readdirSync(categoryPath)) {
      const candidate = path.join(categoryPath, entry, 'references', filename);
      if (fs.existsSync(candidate)) {
        copies.push({ rel: `skills/${category}/${entry}/references/${filename}`, abs: candidate });
      }
    }
  }
  return copies;
}

function validateSharedReferences(skillsDir, sharedReferences = SHARED_REFERENCES) {
  let errors = 0;
  for (const filename of sharedReferences) {
    const copies = findSharedCopies(skillsDir, filename);
    if (copies.length === 0) continue;
    const baseline = fs.readFileSync(copies[0].abs, 'utf8');
    for (const copy of copies.slice(1)) {
      if (fs.readFileSync(copy.abs, 'utf8') !== baseline) {
        console.error(`${copy.rel}: does not match ${copies[0].rel} (shared references must be byte-identical)`);
        errors++;
      }
    }
  }
  return errors;
}

if (require.main === module) {
  const skillsDir = path.join(__dirname, '..', 'skills');
  const errors = validateSkills(skillsDir) + validateSharedReferences(skillsDir);
  if (errors > 0) {
    console.error(`${errors} validation error(s).`);
    process.exit(1);
  }
  console.log('All skills valid.');
}

module.exports = { validateSkills, validateSharedReferences };
