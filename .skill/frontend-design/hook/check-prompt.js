/**
 * Hook: Check Prompt Before Work
 * Purpose: Ensures if a prompt is related to frontend/UI design, it is kept minimal and professional.
 * If the prompt is unrelated to frontend design, it returns immediately without issues.
 * All logs and outputs are presented in English.
 */

function checkPrompt(promptText) {
  const lowercasePrompt = promptText.toLowerCase();
  const issues = [];

  // Determine if this is a frontend/UI-related task
  const isFrontendTask = /frontend|ui|css|layout|design|popup|options/i.test(lowercasePrompt);
  if (!isFrontendTask) {
    return { isValid: true, isFrontend: false, issues: [] };
  }

  // If it is a frontend task, check for overly flashy/colorful requests
  const flashyKeywords = ["neon", "cyberpunk", "glowing", "flashy", "gradient explosion", "colorful", "bright"];
  flashyKeywords.forEach(keyword => {
    if (lowercasePrompt.includes(keyword)) {
      issues.push(`[WARNING] Prompt requests flashy styling ("${keyword}"). Keep developer tool designs professional, clean, and flat.`);
    }
  });

  return {
    isValid: issues.length === 0,
    isFrontend: true,
    issues: issues
  };
}

if (typeof process !== "undefined" && require.main === module) {
  const args = process.argv.slice(2);
  const promptToCheck = args.join(" ") || "Backend api integration";
  console.log(JSON.stringify(checkPrompt(promptToCheck), null, 2));
}

module.exports = { checkPrompt };
