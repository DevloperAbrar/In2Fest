const { City, Category } = require("../../database/models");
const { getChecklistForCategory } = require("../../utils/servicesChecklist");
const { SECTION_TYPES } = require("../../config/sectionLibrary");
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

async function listCategories(req, res, next) {
  try {
    const categories = await Category.findAll({
      where: { active: true },
      order: [["display_order", "ASC"]]
    });
    res.json({ success: true, data: categories });
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