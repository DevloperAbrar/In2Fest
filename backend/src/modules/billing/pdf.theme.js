// Shared look for every billing PDF (invoice, quotation, gym receipt, store bill).
// Navy wave header, bordered item table, navy total bar - one consistent professional style.

const PAL = {
    navy: "#0b2e6f",
    navy2: "#1450b8",
    navySoft: "#e8eef9",
    ink: "#111827",
    text: "#374151",
    muted: "#6b7280",
    line: "#d1d5db",
    grid: "#9ca3af",
    soft: "#f3f6fb",
    white: "#ffffff",
    green: "#15803d",
    greenSoft: "#dcfce7",
    red: "#b91c1c",
    redSoft: "#fee2e2"
  };
  
  // Draws ONE line of text. Alignment is done by hand so pdfkit never wraps or moves the cursor to a new page.
  function put(doc, str, x, y, { font = "Helvetica", size = 10, color = PAL.text, width = 0, align = "left", spacing = 0 } = {}) {
    const s = String(str == null ? "" : str);
    doc.font(font).fontSize(size).fillColor(color);
    let xx = x;
    if (width && align !== "left") {
      const w = doc.widthOfString(s, spacing ? { characterSpacing: spacing } : undefined);
      xx = align === "right" ? x + width - w : x + (width - w) / 2;
    }
    doc.text(s, xx, y, { lineBreak: false, characterSpacing: spacing });
  }
  
  // Shrinks the font until the text fits (down to minSize), then cuts it with "...".
  function fitText(doc, str, maxW, font, size, minSize = 6.5) {
    let s = String(str == null ? "" : str).replace(/\s+/g, " ").trim();
    let fs = size;
    doc.font(font).fontSize(fs);
    while (fs > minSize && doc.widthOfString(s) > maxW) {
      fs = Math.max(minSize, fs - 0.25);
      doc.fontSize(fs);
    }
    if (doc.widthOfString(s) > maxW) {
      while (s.length > 1 && doc.widthOfString(`${s}...`) > maxW) s = s.slice(0, -1);
      s = `${s.trim()}...`;
    }
    return { text: s, size: fs };
  }
  
  function putFit(doc, str, x, y, maxW, { font = "Helvetica", size = 10, minSize = 6.5, color = PAL.text, align = "left" } = {}) {
    const f = fitText(doc, str, maxW, font, size, minSize);
    put(doc, f.text, x, y, { font, size: f.size, color, width: maxW, align });
    return f.size;
  }
  
  // Wrapped paragraph. Returns its height.
  function para(doc, str, x, y, width, { font = "Helvetica", size = 9.5, color = PAL.text, align = "left", lineGap = 2 } = {}) {
    const s = String(str == null ? "" : str);
    doc.font(font).fontSize(size).fillColor(color);
    const h = doc.heightOfString(s, { width, lineGap });
    doc.text(s, x, y, { width, align, lineGap });
    return h;
  }
  
  function paraH(doc, str, width, font = "Helvetica", size = 9.5, lineGap = 2) {
    doc.font(font).fontSize(size);
    return doc.heightOfString(String(str == null ? "" : str), { width, lineGap });
  }
  
  function hline(doc, x1, x2, y, color = PAL.line, w = 0.75) {
    doc.moveTo(x1, y).lineTo(x2, y).lineWidth(w).strokeColor(color).stroke();
  }
  
  function vline(doc, x, y1, y2, color = PAL.grid, w = 0.6) {
    doc.moveTo(x, y1).lineTo(x, y2).lineWidth(w).strokeColor(color).stroke();
  }
  
  // The blue wave banner at the top of the first page.
  function drawWave(doc, h = 120) {
    const W = doc.page.width;
    doc.save();
    const g = doc.linearGradient(0, 0, W, h);
    g.stop(0, PAL.navy).stop(1, PAL.navy2);
    doc
      .moveTo(0, 0)
      .lineTo(W, 0)
      .lineTo(W, h - 34)
      .bezierCurveTo(W * 0.8, h + 8, W * 0.52, h - 70, W * 0.3, h - 26)
      .bezierCurveTo(W * 0.18, h - 2, W * 0.07, h - 6, 0, h - 18)
      .closePath()
      .fill(g);
    doc.restore();
  
    doc.save();
    doc.fillOpacity(0.13).fillColor("#ffffff");
    doc
      .moveTo(0, 0)
      .lineTo(W * 0.58, 0)
      .bezierCurveTo(W * 0.44, h * 0.3, W * 0.2, h * 0.05, 0, h * 0.46)
      .closePath()
      .fill();
    doc.restore();
  }
  
  // Thin navy strip used on continuation pages.
  function drawTopStrip(doc) {
    doc.rect(0, 0, doc.page.width, 8).fill(PAL.navy);
  }
  
  // Full-width navy bar with a label on the left and an amount on the right (the "Sub Total" bar).
  function navyBar(doc, x, y, w, h, label, value, { size = 11, bg = PAL.navy, fg = PAL.white } = {}) {
    doc.rect(x, y, w, h).fill(bg);
    const ty = y + (h - size) / 2 + 0.5;
    put(doc, label, x + 14, ty, { font: "Helvetica-Bold", size, color: fg });
    put(doc, value, x + 110, ty, { font: "Helvetica-Bold", size, color: fg, width: w - 124, align: "right" });
  }
  
  module.exports = { PAL, put, fitText, putFit, para, paraH, hline, vline, drawWave, drawTopStrip, navyBar };