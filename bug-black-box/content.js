(() => {
  if (window.__bugBlackBoxContentInstalled) return;
  window.__bugBlackBoxContentInstalled = true;

  const MAX_TEXT_LENGTH = 80;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.action === "bugBlackBoxPing") {
      sendResponse({ ok: true });
    }
    return false;
  });

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (!event.data || !event.data.__bugBlackBox) return;

    chrome.runtime.sendMessage({
      action: "recordEvent",
      payload: event.data
    }).catch(() => {
      // The extension may have been reloaded while the page is still open.
    });
  });

  document.addEventListener("click", (event) => {
    const element = getClickableElement(event.target);
    if (!element) return;

    chrome.runtime.sendMessage({
      action: "recordEvent",
      payload: {
        type: "click",
        selector: buildSimpleSelector(element),
        text: getSafeElementText(element),
        timestamp: Date.now()
      }
    }).catch(() => {});
  }, true);

  document.addEventListener("submit", (event) => {
    const form = event.target instanceof HTMLFormElement ? event.target : null;
    if (!form) return;

    chrome.runtime.sendMessage({
      action: "recordEvent",
      payload: {
        type: "submit",
        selector: buildSimpleSelector(form),
        text: "Form submitted",
        timestamp: Date.now()
      }
    }).catch(() => {});
  }, true);

  function getClickableElement(target) {
    const element = target instanceof Element ? target : target?.parentElement;
    if (!element) return null;

    return element.closest(
      "button, a, input, textarea, select, label, summary, [role='button'], [role='link'], [role='menuitem'], [tabindex]"
    ) || element;
  }

  function getSafeElementText(element) {
    const tagName = element.tagName.toLowerCase();

    if (element.isContentEditable || element.closest("[contenteditable='true'], [contenteditable='']")) {
      return `${tagName}[contenteditable]`;
    }

    if (tagName === "input") {
      const type = (element.getAttribute("type") || "text").toLowerCase();
      return `input[type=${type}]`;
    }

    if (tagName === "textarea" || tagName === "select") {
      return tagName;
    }

    const explicitLabel = cleanText(
      element.getAttribute("aria-label") ||
      element.getAttribute("title") ||
      ""
    );
    if (explicitLabel) return explicitLabel.slice(0, MAX_TEXT_LENGTH);

    const text = cleanText(element.innerText || element.textContent || "");
    return text.slice(0, MAX_TEXT_LENGTH);
  }

  function cleanText(text) {
    return String(text).replace(/\s+/g, " ").trim();
  }

  function buildSimpleSelector(element) {
    const tagName = element.tagName.toLowerCase();

    if (element.id) return `#${cssEscape(element.id)}`;

    const className = typeof element.className === "string"
      ? element.className.trim()
      : "";
    if (className) {
      const classes = className.split(/\s+/).slice(0, 3).map(cssEscape).join(".");
      return `${tagName}.${classes}`;
    }

    if (tagName === "input") {
      const type = element.getAttribute("type") || "text";
      return `${tagName}[type="${cssEscape(type)}"]`;
    }

    if (element.getAttribute("role")) {
      return `${tagName}[role="${cssEscape(element.getAttribute("role"))}"]`;
    }

    return tagName;
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return CSS.escape(String(value));
    return String(value).replace(/["\\#.:,[\]\s]/g, "\\$&");
  }
})();
