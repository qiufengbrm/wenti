/** 项目导读：教程富文本安检口：允许排版，拒绝脚本；字体可以花，安全底线不能花。 */
import sanitizeHtml from "sanitize-html";

export const MAX_TUTORIAL_CONTENT_LENGTH = 60_000;
export const MAX_TUTORIAL_INLINE_IMAGES = 30;

const imageSourcePattern = /^\/api\/tutorial-images\/([A-Za-z0-9_-]{8,64})$/;
const tutorialTextColors = new Set(["default", "blue", "green", "orange", "red", "purple"]);

export function sanitizeTutorialHtml(value: string) {
  return sanitizeHtml(value, {
    allowedTags: [
      "p", "div", "br", "span", "strong", "b", "em", "i", "u", "s", "strike", "font",
      "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "img"
    ],
    allowedAttributes: {
      font: ["face", "size"],
      span: ["data-tutorial-color"],
      img: ["src", "alt", "title", "data-image-id"]
    },
    allowedSchemes: [],
    allowedSchemesByTag: { img: [] },
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    transformTags: {
      span(tagName, attribs) {
        const color = attribs["data-tutorial-color"];
        const safeAttributes: Record<string, string> = color && tutorialTextColors.has(color) ? { "data-tutorial-color": color } : {};
        return { tagName, attribs: safeAttributes };
      }
    },
    exclusiveFilter(frame) {
      if (frame.tag !== "img") return false;
      const match = frame.attribs.src?.match(imageSourcePattern);
      return !match || frame.attribs["data-image-id"] !== match[1];
    }
  }).trim();
}

export function extractTutorialInlineImageIds(html: string) {
  const ids: string[] = [];
  const pattern = /<img\b[^>]*\bdata-image-id="([A-Za-z0-9_-]{8,64})"[^>]*>/g;
  for (const match of html.matchAll(pattern)) {
    if (!ids.includes(match[1])) ids.push(match[1]);
  }
  return ids;
}

export function isTutorialContentEmpty(html: string) {
  if (extractTutorialInlineImageIds(html).length) return false;
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/\u00a0/g, " ").trim().length === 0;
}

export function plainTutorialContentToHtml(value: string) {
  return value.split(/\r?\n/).map((line) => `<p>${escapeHtml(line) || "<br>"}</p>`).join("");
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
