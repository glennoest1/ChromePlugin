const fs = require('fs');
const path = require('path');

const SKILL_PATH = path.resolve(__dirname, 'SKILL.md');
const DOCS_DIR = path.resolve(__dirname, '../../docs');
const HOOKS_DIR = path.resolve(__dirname, '../../.github/hooks');

function extractMarkdownTitle(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const firstHeader = content.split('\n').find(line => line.startsWith('#'));
    if (firstHeader) {
      return firstHeader.replace(/^#+\s*/, '').trim();
    }
  } catch (err) {
    // Ignore error
  }
  return path.basename(filePath, '.md');
}

function updateSkill() {
  if (!fs.existsSync(SKILL_PATH)) {
    console.error(`Skill file not found at ${SKILL_PATH}`);
    return;
  }

  let skillContent = fs.readFileSync(SKILL_PATH, 'utf8');

  // 1. Scan and build Docs list
  const docsList = [];
  if (fs.existsSync(DOCS_DIR)) {
    const files = fs.readdirSync(DOCS_DIR)
      .filter(file => file.endsWith('.md') && file !== 'README.md');

    // Parse existing descriptions from SKILL.md to preserve them
    const existingMappings = {};
    // Regex matches either old code block style: - description: `docs/file.md`
    // or new markdown link style: - [description](../../docs/file.md)
    const docsBlockRegex = /-\s*(?:\[(.*?)]\(\.\.\/\.\.\/docs\/(.*?)\)|(.*?):\s*`docs\/(.*?)`)/g;
    let match;
    while ((match = docsBlockRegex.exec(skillContent)) !== null) {
      const desc = match[1] || match[3];
      const filename = match[2] || match[4];
      if (desc && filename) {
        existingMappings[filename.trim()] = desc.trim();
      }
    }

    files.forEach(file => {
      let desc = existingMappings[file];
      if (!desc) {
        // Fallback: extract title or format name
        desc = extractMarkdownTitle(path.join(DOCS_DIR, file)).toLowerCase();
      }
      // Relative path from SKILL.md is ../../docs/filename.md
      docsList.push(`   - [${desc}](../../docs/${file})`);
    });
  }

  // 2. Scan and build Hooks list using relative paths from the root / repository
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

  // 3. Replace Docs block in SKILL.md
  const docsStartMarker = '2. Read the docs file most relevant to the requested task:\n';
  const docsEndMarker = '\n3. Only then inspect source';
  const docsStartIndex = skillContent.indexOf(docsStartMarker);
  const docsEndIndex = skillContent.indexOf(docsEndMarker);

  if (docsStartIndex !== -1 && docsEndIndex !== -1 && docsEndIndex > docsStartIndex) {
    const beforeDocs = skillContent.substring(0, docsStartIndex + docsStartMarker.length);
    const afterDocs = skillContent.substring(docsEndIndex);
    const newDocsBlock = docsList.join('\n');
    skillContent = beforeDocs + newDocsBlock + afterDocs;
  }

  // 4. Replace Hooks block in SKILL.md
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
  console.log('SKILL.md has been successfully synchronized with relative links!');
}

if (require.main === module) {
  updateSkill();
}

module.exports = { updateSkill };
