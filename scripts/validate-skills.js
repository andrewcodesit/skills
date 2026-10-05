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
const SHARED_REFERENCES = ['question-format.md', 'delegation.md'];

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

function frontmatterField(content, field) {
  const match = content.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
  return match ? match[1].trim() : '';
}

function validateAgents(agentsDir) {
  if (!fs.existsSync(agentsDir)) return 0;
  let errors = 0;
  for (const entry of fs.readdirSync(agentsDir)) {
    if (!entry.endsWith('.md')) continue;
    const content = fs.readFileSync(path.join(agentsDir, entry), 'utf8');
    const expected = entry.slice(0, -'.md'.length);
    const name = frontmatterField(content, 'name');
    if (name !== expected) {
      console.error(`agents/${entry}: 'name' must be '${expected}', found '${name}'`);
      errors++;
    }
    if (!frontmatterField(content, 'description')) {
      console.error(`agents/${entry}: missing or empty 'description'`);
      errors++;
    }
  }
  return errors;
}

// Content that only works on the maintainer's machine, or that breaks the repo's prose rules. Local
// skills reach shared standards through `references/` symlinks; a release must copy real files.
const FORBIDDEN_CONTENT = [
  { pattern: /~\/\.agents\/standards/, reason: 'machine-specific standards path; use a references/ copy' },
  { pattern: /~\/AGENTS\.md/, reason: "machine-specific path; say 'the global AGENTS.md'" },
  { pattern: /\/(Users|home)\/[^/\s]+\//, reason: 'absolute home-directory path' },
  { pattern: /—/, reason: 'em dash; use a standard hyphen' },
];

function walk(dir, visit) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.lstatSync(full);
    if (stat.isDirectory()) walk(full, visit);
    else visit(full, stat);
  }
}

function validatePortability(rootDir, dirs) {
  let errors = 0;
  for (const dir of dirs) {
    const abs = path.join(rootDir, dir);
    if (!fs.existsSync(abs)) continue;
    walk(abs, (file, stat) => {
      const rel = path.relative(rootDir, file);
      if (stat.isSymbolicLink()) {
        console.error(`${rel}: symlinks are not allowed; release real files`);
        errors++;
        return;
      }
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        for (const { pattern, reason } of FORBIDDEN_CONTENT) {
          if (pattern.test(line)) {
            console.error(`${rel}:${i + 1}: ${reason}`);
            errors++;
          }
        }
      });
    });
  }
  return errors;
}

// A skill may name a fleet agent only if the repo ships it in agents/. Two places name agents: prose
// such as "launch the `critic` agent", and the role binding table in references/delegation.md.
function referencedAgents(content) {
  const names = new Set();
  for (const match of content.matchAll(/`([a-z][a-z0-9-]*)` agents?\b/g)) names.add(match[1]);
  for (const match of content.matchAll(/^\| [A-Z][A-Za-z ]+ \| `([a-z][a-z0-9-]*)` \|/gm)) names.add(match[1]);
  return names;
}

function validateAgentReferences(skillsDir, agentsDir) {
  const shipped = fs.existsSync(agentsDir)
    ? new Set(fs.readdirSync(agentsDir).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)))
    : new Set();
  let errors = 0;
  walk(skillsDir, (file, stat) => {
    if (stat.isSymbolicLink() || !file.endsWith('.md')) return;
    for (const name of referencedAgents(fs.readFileSync(file, 'utf8'))) {
      if (!shipped.has(name)) {
        console.error(`${path.relative(path.dirname(skillsDir), file)}: names agent '${name}', which is not in agents/`);
        errors++;
      }
    }
  });
  return errors;
}

function validateVersions(rootDir) {
  const manifest = path.join(rootDir, '.claude-plugin', 'plugin.json');
  if (!fs.existsSync(manifest)) return 0;
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')).version;
  const plugin = JSON.parse(fs.readFileSync(manifest, 'utf8')).version;
  if (pkg !== plugin) {
    console.error(`.claude-plugin/plugin.json: version '${plugin}' does not match package.json '${pkg}'`);
    return 1;
  }
  return 0;
}

function validateRepo(rootDir) {
  const skillsDir = path.join(rootDir, 'skills');
  const agentsDir = path.join(rootDir, 'agents');
  return (
    validateSkills(skillsDir) +
    validateSharedReferences(skillsDir) +
    validateAgents(agentsDir) +
    validatePortability(rootDir, ['skills', 'agents']) +
    validateAgentReferences(skillsDir, agentsDir) +
    validateVersions(rootDir)
  );
}

if (require.main === module) {
  const errors = validateRepo(path.join(__dirname, '..'));
  if (errors > 0) {
    console.error(`${errors} validation error(s).`);
    process.exit(1);
  }
  console.log('All skills and agents valid.');
}

module.exports = {
  validateSkills,
  validateSharedReferences,
  validateAgents,
  validatePortability,
  validateAgentReferences,
  validateVersions,
  validateRepo,
};
