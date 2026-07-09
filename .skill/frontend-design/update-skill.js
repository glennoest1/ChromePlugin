const fs = require('fs');
const path = require('path');

const SKILL_PATH = path.resolve(__dirname, 'SKILL.md');
const SPECS_DIR = path.resolve(__dirname, 'specs');

function extractMarkdownTitle(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const firstHeader = content.split('\n').find(line => line.startsWith('#'));
    if (firstHeader) {
      return firstHeader.replace(/^#+\s*/, '').trim();
    }
  } catch (err) {
    // Ignore
  }
  return path.basename(filePath, '.md');
}

function updateSkill() {
  if (!fs.existsSync(SKILL_PATH)) {
    console.error(`Skill file not found at ${SKILL_PATH}`);
    return;
  }

  let skillContent = fs.readFileSync(SKILL_PATH, 'utf8');

  // Build specifications list using relative paths from the SKILL.md file
  const specLinks = [];
  if (fs.existsSync(SPECS_DIR)) {
    fs.readdirSync(SPECS_DIR)
      .filter(file => file.endsWith('.md'))
      .forEach(file => {
        const title = extractMarkdownTitle(path.join(SPECS_DIR, file));
        // Relative path from SKILL.md to specs/file.md is specs/file.md
        specLinks.push(`- **[${title}](specs/${file})**`);
      });
  }

  // Locating list in SKILL.md under: ## 📐 Layout & Visual Hierarchy
  const specStartMarker = '## 📦 Design Specifications\n\n';
  const specEndMarker = '\n\n## 🔗 Workflow Hooks';
  const startIndex = skillContent.indexOf(specStartMarker);
  const endIndex = skillContent.indexOf(specEndMarker);

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const beforeBlock = skillContent.substring(0, startIndex + specStartMarker.length);
    const afterBlock = skillContent.substring(endIndex);
    skillContent = beforeBlock + specLinks.join('\n') + afterBlock;
  }

  fs.writeFileSync(SKILL_PATH, skillContent, 'utf8');
  console.log('Frontend Design SKILL.md updated successfully with relative paths!');
}

if (require.main === module) {
  updateSkill();
}

module.exports = { updateSkill };
