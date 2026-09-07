const { Invoice, Venue, Client } = require("../../database/models");

async function verifyInvoice(req, res) {
  try {
    const invoice = await Invoice.findOne({
      where: { id: req.params.invoiceId },
      include: [
        { model: Venue, as: undefined, attributes: ["hall_name", "city"] },
        { model: Client, as: "client", attributes: ["name"] }
      ]
    });

    if (!invoice) {
      return res.status(404).json({ success: false, valid: false, message: "No invoice found with this ID." });
    }

    const venue = await Venue.findByPk(invoice.venue_id, { attributes: ["hall_name", "city"] });

    // Only first name shown publicly, for client privacy
    const clientFirstName = invoice.client?.name ? invoice.client.name.split(" ")[0] : null;

    res.json({
      success: true,
      valid: true,
      data: {
        invoice_number: invoice.invoice_number,
        type: invoice.type,
        status: invoice.status,
        total: invoice.total,
        gst_enabled: invoice.gst_enabled,
        created_at: invoice.created_at,
        venue_name: venue?.hall_name || null,
        venue_city: venue?.city || null,
        client_first_name: clientFirstName
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, valid: false, message: "Verification failed. Please try again." });
  }
}

module.exports = { verifyInvoice };