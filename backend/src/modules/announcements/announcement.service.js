const { Announcement } = require("../../database/models");
const { AppError } = require("../../middleware/error.middleware");

async function listActive() {
  return Announcement.findAll({
    where: { is_active: true },
    order: [["display_order", "ASC"], ["id", "ASC"]]
  });
}

async function listAll() {
  return Announcement.findAll({
    order: [["display_order", "ASC"], ["id", "ASC"]]
  });
}

async function create(payload, imageUrl) {
  const { title, link_url, display_order, is_active } = payload;
  if (!title || !title.trim()) throw new AppError("Title is required", 400);
  return Announcement.create({
    title: title.trim(),
    image_url: imageUrl || null,
    link_url: link_url || null,
    display_order: display_order != null ? Number(display_order) : 0,
    is_active: is_active !== undefined ? !!is_active : true
  });
}

async function update(id, payload, imageUrl) {
  const ann = await Announcement.findByPk(id);
  if (!ann) throw new AppError("Announcement not found", 404);

  const updates = {};
  if (payload.title !== undefined) updates.title = payload.title.trim();
  if (payload.link_url !== undefined) updates.link_url = payload.link_url || null;
  if (payload.display_order !== undefined) updates.display_order = Number(payload.display_order);
  if (payload.is_active !== undefined)
    updates.is_active = payload.is_active === "true" || payload.is_active === true;
  if (imageUrl) updates.image_url = imageUrl;

  await ann.update(updates);
  return ann;
}

async function remove(id) {
  const ann = await Announcement.findByPk(id);
  if (!ann) throw new AppError("Announcement not found", 404);
  await ann.destroy();
  return { deleted: true };
}

module.exports = { listActive, listAll, create, update, remove };