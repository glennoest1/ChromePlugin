/**
 * Hook: Check Frontend After Work
 * Purpose: Inspects the generated HTML/CSS files to verify they strictly align
 * with the professional design instructions in SKILL.md.
 */

const fs = require('fs');
const path = require('path');

function verifyCssFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { ok: false, errors: [`File not found: ${filePath}`] };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const errors = [];
  const warnings = [];

  // Rule 1: No flashy neon colors or excessive glowing shadows
  if (/box-shadow:.*(0\s+0\s+(?:1\d|2\d|[3-9]\d)px|neon)/gi.test(content)) {
    warnings.push("Detected potentially flashy, glowing box-shadows. Keep shadows subtle and flat.");
  }

  // Rule 2: Check for appropriate variables usage
  if (!content.includes('--bg-app') && !content.includes('--bg-panel')) {
    warnings.push("CSS variables like --bg-app or --bg-panel not detected. Ensure standard tokens are used.");
  }

  // Rule 3: Dimensions for popup
  if (filePath.includes('popup.css')) {
    const bodyWidthMatch = content.match(/width:\s*(\d+)px/i);
    if (bodyWidthMatch) {
      const width = parseInt(bodyWidthMatch[1], 10);
      if (width > 420 || width < 320) {
        errors.push(`Popup width (${width}px) is outside the standard 320px-420px range.`);
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

// Example invocation if run directly via Node
if (typeof process !== "undefined" && require.main === module) {
  const popupCssPath = path.resolve(__dirname, '../../../bug-black-box/popup/popup.css');
  console.log(`Auditing popup.css: ${popupCssPath}`);
  const result = verifyCssFile(popupCssPath);
  console.log(JSON.stringify(result, null, 2));
}

module.exports = { verifyCssFile };
