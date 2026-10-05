#!/usr/bin/env node
// Copies the maintainer's local skills and agents into the repo, then validates the result.
//
// Local skills are the source of truth and reach shared standards through `references/` symlinks.
// The release replaces each listed skill and agent with a dereferenced copy, so published skills stay
// self-contained, and removes repo skills that are no longer in the manifest.
//
// Usage: node scripts/release.js [--skills-dir <dir>] [--agents-dir <dir>]
const fs = require('fs');
const os = require('os');
const path = require('path');
const { validateRepo } = require('./validate-skills.js');

const SKILLS = {
  context: ['setup-context', 'update-context'],
  engineering: [
    'cleanup',
    'code-review',
    'execute',
    'git-merge',
    'git-publish',
    'tests-audit',
    'verify-ts',
    'verify-ui',
  ],
  'project-management': [
    'breakdown-tasks',
    'close-task',
    'define-spec',
    'handoff',
    'plan',
    'plan-review',
    'start-task',
  ],
};

const AGENTS = ['architect', 'critic', 'devil', 'foreman', 'gatekeeper', 'pilot', 'scout', 'smith'];

function parseArgs(argv) {
  const options = {
    skillsDir: path.join(os.homedir(), '.agents', 'skills'),
    agentsDir: path.join(os.homedir(), '.agents', 'agents'),
  };
  for (let i = 0; i < argv.length; i += 2) {
    const [flag, value] = [argv[i], argv[i + 1]];
    if (!value) throw new Error(`${flag} needs a value`);
    if (flag === '--skills-dir') options.skillsDir = path.resolve(value);
    else if (flag === '--agents-dir') options.agentsDir = path.resolve(value);
    else throw new Error(`unknown option ${flag}`);
  }
  return options;
}

// Copies a skill directory, following symlinks to files. A symlink to a directory is skipped: inside a
// skill it is never content, and following it can recurse into the skill itself.
function copySkill(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const from = path.join(src, entry);
    const to = path.join(dest, entry);
    const link = fs.lstatSync(from);
    if (link.isSymbolicLink()) {
      let target;
      try {
        target = fs.statSync(from);
      } catch {
        throw new Error(`${from}: broken symlink`);
      }
      if (target.isDirectory()) continue;
      fs.copyFileSync(fs.realpathSync(from), to);
      fs.chmodSync(to, target.mode);
    } else if (link.isDirectory()) {
      copySkill(from, to);
    } else {
      fs.copyFileSync(from, to);
      fs.chmodSync(to, link.mode);
    }
  }
}

function release({ skillsDir, agentsDir }, rootDir) {
  const repoSkills = path.join(rootDir, 'skills');
  const repoAgents = path.join(rootDir, 'agents');

  for (const names of Object.values(SKILLS)) {
    for (const name of names) {
      const src = path.join(skillsDir, name);
      if (!fs.existsSync(path.join(src, 'SKILL.md'))) throw new Error(`${src}: missing SKILL.md`);
    }
  }
  for (const name of AGENTS) {
    const src = path.join(agentsDir, `${name}.md`);
    if (!fs.existsSync(src)) throw new Error(`${src}: missing agent`);
  }

  fs.rmSync(repoSkills, { recursive: true, force: true });
  for (const [category, names] of Object.entries(SKILLS)) {
    for (const name of names) copySkill(path.join(skillsDir, name), path.join(repoSkills, category, name));
  }

  fs.rmSync(repoAgents, { recursive: true, force: true });
  fs.mkdirSync(repoAgents);
  for (const name of AGENTS) {
    fs.copyFileSync(fs.realpathSync(path.join(agentsDir, `${name}.md`)), path.join(repoAgents, `${name}.md`));
  }

  return validateRepo(rootDir);
}

if (require.main === module) {
  try {
    const errors = release(parseArgs(process.argv.slice(2)), path.join(__dirname, '..'));
    if (errors > 0) {
      console.error(`${errors} validation error(s). Fix them in the local source and release again.`);
      process.exit(1);
    }
    console.log('Release copied and validated. Review the diff with git before committing.');
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = { release, SKILLS, AGENTS };
