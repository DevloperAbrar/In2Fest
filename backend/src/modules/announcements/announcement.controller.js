const service = require("./announcement.service");
const { uploadToR2 } = require("../../middleware/upload.middleware");

const wrap = (fn) => async (req, res, next) => {
  try { await fn(req, res, next); } catch (err) { next(err); }
};

module.exports = {
  // Public - used by discovery frontend on first visit
  getActive: wrap(async (req, res) => {
    const data = await service.listActive();
    res.json({ success: true, data });
  }),

  // Admin - GET all (including inactive)
  getAll: wrap(async (req, res) => {
    const data = await service.listAll();
    res.json({ success: true, data });
  }),

  // Admin - POST create with optional image upload
  create: wrap(async (req, res) => {
    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadToR2(
        req.file.buffer,
        req.file.originalname,
        "announcements",
        req.file.mimetype
      );
    }
    const ann = await service.create(req.body, imageUrl);
    res.status(201).json({ success: true, data: ann });
  }),

  // Admin - PUT update
  update: wrap(async (req, res) => {
    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadToR2(
        req.file.buffer,
        req.file.originalname,
        "announcements",
        req.file.mimetype
      );
    }
    const ann = await service.update(req.params.id, req.body, imageUrl);
    res.json({ success: true, data: ann });
  }),

  // Admin - DELETE
  remove: wrap(async (req, res) => {
    const result = await service.remove(req.params.id);
    res.json({ success: true, data: result });
  })
};