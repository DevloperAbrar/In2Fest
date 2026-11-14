import * as Aurora from "./aurora/index.jsx";
import * as Bloom from "./bloom/index.jsx";
import * as Slate from "./slate/index.jsx";
import * as Forge from "./forge/index.jsx";
import * as Pulse from "./pulse/index.jsx";
import * as Ember from "./ember/index.jsx";
import * as Sunrise from "./sunrise/index.jsx";
import * as Monolith from "./monolith/index.jsx";
import * as Vertex from "./vertex/index.jsx";

export const TEMPLATES = {
  "aurora": Aurora,
  "bloom": Bloom,
  "slate": Slate,
  "forge": Forge,
  "pulse": Pulse,
  "ember": Ember,
  "sunrise": Sunrise,
  "monolith": Monolith,
  "vertex": Vertex,
};

export function getTemplateSections(templateId, defaultSections) {
  return TEMPLATES[templateId] || defaultSections;
}