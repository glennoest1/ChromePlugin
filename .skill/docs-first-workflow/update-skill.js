const fs = require('fs');
const path = require('path');

const SKILL_PATH = path.resolve(__dirname, 'SKILL.md');
const HOOKS_DIR = path.resolve(__dirname, '../../.github/hooks');

function updateSkill() {
  if (!fs.existsSync(SKILL_PATH)) {
    console.error(`Skill file not found at ${SKILL_PATH}`);
    return;
  }

  let skillContent = fs.readFileSync(SKILL_PATH, 'utf8');

  // Scan and build Hooks list
  const hooksList = [];
  if (fs.existsSync(HOOKS_DIR)) {
    // Top-level hooks files
    fs.readdirSync(HOOKS_DIR).forEach(file => {
      const filePath = path.join(HOOKS_DIR, file);
      if (fs.statSync(filePath).isFile() && file !== 'README.md') {
        hooksList.push(`.github/hooks/${file}`);
      }
    });

    // Scripts folder
    const scriptsDir = path.join(HOOKS_DIR, 'scripts');
    if (fs.existsSync(scriptsDir)) {
      fs.readdirSync(scriptsDir).forEach(file => {
        hooksList.push(`.github/hooks/scripts/${file}`);
      });
    }
  }

  // Replace Hooks block in SKILL.md
  const hooksStartMarker = '## Hook Locations\n\n```text\n';
  const hooksEndMarker = '\n```\n\n## Hook Maintenance';
  const hooksStartIndex = skillContent.indexOf(hooksStartMarker);
  const hooksEndIndex = skillContent.indexOf(hooksEndMarker);

  if (hooksStartIndex !== -1 && hooksEndIndex !== -1 && hooksEndIndex > hooksStartIndex) {
    const beforeHooks = skillContent.substring(0, hooksStartIndex + hooksStartMarker.length);
    const afterHooks = skillContent.substring(hooksEndIndex);
    const newHooksBlock = hooksList.join('\n');
    skillContent = beforeHooks + newHooksBlock + afterHooks;
  }

  // Write changes back
  fs.writeFileSync(SKILL_PATH, skillContent, 'utf8');
  console.log('SKILL.md hooks updated successfully!');
}

if (require.main === module) {
  updateSkill();
}

module.exports = { updateSkill };
