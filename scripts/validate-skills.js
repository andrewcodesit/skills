#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function validateSkills(skillsDir) {
  let errors = 0;
  for (const entry of fs.readdirSync(skillsDir)) {
    if (!fs.statSync(path.join(skillsDir, entry)).isDirectory()) continue;
    const skillFile = path.join(skillsDir, entry, 'SKILL.md');
    if (!fs.existsSync(skillFile)) {
      console.error(`skills/${entry}: missing SKILL.md`);
      errors++;
      continue;
    }
    const content = fs.readFileSync(skillFile, 'utf8');
    const nameMatch = content.match(/^name:\s*(.+)$/m);
    const descMatch = content.match(/^description:\s*(.+)$/m);

    if (!nameMatch || !nameMatch[1].trim()) {
      console.error(`skills/${entry}/SKILL.md: missing or empty 'name'`);
      errors++;
    }
    if (!descMatch || !descMatch[1].trim()) {
      console.error(`skills/${entry}/SKILL.md: missing or empty 'description'`);
      errors++;
    }
  }
  return errors;
}

if (require.main === module) {
  const skillsDir = path.join(__dirname, '..', 'skills');
  const errors = validateSkills(skillsDir);
  if (errors > 0) {
    console.error(`${errors} validation error(s).`);
    process.exit(1);
  }
  console.log('All skills valid.');
}

module.exports = { validateSkills };
