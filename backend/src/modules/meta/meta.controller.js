const { City, Category } = require("../../database/models");
const { getChecklistForCategory } = require("../../utils/servicesChecklist");
const { SECTION_TYPES } = require("../../config/sectionLibrary");
const { BUSINESS_TYPES, isValidBusinessType, getBusinessTypeKey } = require("../../config/businessTypes");
const { buildDefaultSections } = require("../../utils/pageSections");
const pincodeService = require("./pincode.service");
const cscService = require("./csc.service");

async function listCities(req, res, next) {
  try {
    const cities = await City.findAll({
      where: { active: true },
      order: [["name", "ASC"]]
    });
    res.json({ success: true, data: cities });
  } catch (error) {
    next(error);
  }
}

// Public. Each category carries its business type so the UI can group the dropdown
// (Events, Education, Retail ...) without a second request.
async function listCategories(req, res, next) {
  try {
    const rows = await Category.findAll({
      where: { active: true },
      order: [["display_order", "ASC"], ["name", "ASC"]]
    });

    const typeKeys = Object.keys(BUSINESS_TYPES);

    const data = rows.map((row) => {
      const category = row.toJSON();
      // Trust the row we just read; fall back to the registry/static map when it is empty.
      const typeKey = isValidBusinessType(category.business_type)
        ? category.business_type
        : getBusinessTypeKey(category.slug);
      const type = BUSINESS_TYPES[typeKey] || BUSINESS_TYPES.general;

      return {
        ...category,
        business_type: typeKey,
        business_type_label: type.label,
        business_type_order: Math.max(typeKeys.indexOf(typeKey), 0)
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function getServicesChecklist(req, res, next) {
  try {
    const checklist = getChecklistForCategory(req.params.categorySlug);
    res.json({ success: true, data: checklist });
  } catch (error) {
    next(error);
  }
}

async function lookupPincode(req, res, next) {
  try {
    const data = await pincodeService.lookupPincode(req.params.pincode);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function listStates(req, res, next) {
  try {
    const states = await cscService.getIndianStates();
    res.json({ success: true, data: states });
  } catch (error) {
    next(error);
  }
}

async function listCitiesForState(req, res, next) {
  try {
    const cities = await cscService.getCitiesForState(req.params.stateCode);
    res.json({ success: true, data: cities });
  } catch (error) {
    next(error);
  }
}

async function listSectionTypes(req, res, next) {
  try {
    res.json({ success: true, data: SECTION_TYPES });
  } catch (error) {
    next(error);
  }
}

async function getSectionDefaults(req, res, next) {
  try {
    const sections = buildDefaultSections(req.params.categorySlug);
    res.json({ success: true, data: sections });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listCities,
  listCategories,
  getServicesChecklist,
  lookupPincode,
  listStates,
  listCitiesForState,
  listSectionTypes,
  getSectionDefaults
};