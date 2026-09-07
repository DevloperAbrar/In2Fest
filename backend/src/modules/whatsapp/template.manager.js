const { WhatsappTemplate } = require("../../database/models");

async function createTemplate(payload) {
  return WhatsappTemplate.create(payload);
}

async function getAllTemplates() {
  return WhatsappTemplate.findAll({ where: { is_active: true } });
}

async function getTemplateByCategory(category) {
  return WhatsappTemplate.findOne({ where: { category, is_active: true } });
}

/**
 * Replaces {{variableName}} placeholders in a template body with actual values.
 */
function renderTemplate(bodyTemplate, variables = {}) {
  let rendered = bodyTemplate;
  Object.keys(variables).forEach((key) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    rendered = rendered.replace(regex, variables[key] ?? "");
  });
  return rendered;
}

module.exports = { createTemplate, getAllTemplates, getTemplateByCategory, renderTemplate };