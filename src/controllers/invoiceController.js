const Invoice = require('../models/Invoice');
const Client = require('../models/Client');

// GET /invoices
const getAllInvoices = async (req, res, next) => {
  try {
    const { status, client, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (client) filter.client = client;

    // Agent : filtrer par ses clients
    if (req.user.role === 'agent') {
      const agentClients = await Client.find({ assignedAgent: req.user._id }).select('_id');
      filter.client = { $in: agentClients.map((c) => c._id) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Invoice.countDocuments(filter);
    const invoices = await Invoice.find(filter)
      .populate('client', 'name email company')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        invoices,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /invoices/:id
const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('client', 'name email company phone')
      .populate('createdBy', 'name email');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Facture introuvable' });
    }

    res.status(200).json({ success: true, data: { invoice } });
  } catch (error) {
    next(error);
  }
};

// POST /invoices
const createInvoice = async (req, res, next) => {
  try {
    const client = await Client.findById(req.body.client);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client introuvable' });
    }

    req.body.createdBy = req.user._id;
    const invoice = await Invoice.create(req.body);
    await invoice.populate('client', 'name email company');

    res.status(201).json({ success: true, message: 'Facture créée avec succès', data: { invoice } });
  } catch (error) {
    next(error);
  }
};

// PUT /invoices/:id
const updateInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Facture introuvable' });
    }

    if (invoice.status === 'paye') {
      return res.status(400).json({ success: false, message: 'Impossible de modifier une facture payée' });
    }

    const updated = await Invoice.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('client', 'name email company');

    res.status(200).json({ success: true, message: 'Facture mise à jour', data: { invoice: updated } });
  } catch (error) {
    next(error);
  }
};

// DELETE /invoices/:id  (admin/manager)
const deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Facture introuvable' });
    }

    if (invoice.status === 'paye') {
      return res.status(400).json({ success: false, message: 'Impossible de supprimer une facture payée' });
    }

    await Invoice.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Facture supprimée avec succès' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllInvoices, getInvoiceById, createInvoice, updateInvoice, deleteInvoice };
