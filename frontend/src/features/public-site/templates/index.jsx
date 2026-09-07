import * as Aurora from "./aurora/index.jsx";
import * as Bloom from "./bloom/index.jsx";
import * as Slate from "./slate/index.jsx";

export const TEMPLATES = {
  "aurora": Aurora,
  "bloom": Bloom,
  "slate": Slate,
};

export function getTemplateSections(templateId, defaultSections) {
  return TEMPLATES[templateId] || defaultSections;
}