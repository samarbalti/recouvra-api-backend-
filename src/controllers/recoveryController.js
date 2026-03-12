const RecoveryAction = require('../models/RecoveryAction');
const Invoice = require('../models/Invoice');

// GET /recovery-actions
const getAllActions = async (req, res, next) => {
  try {
    const { status, invoice, type, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (invoice) filter.invoice = invoice;
    if (type) filter.type = type;

    // Agent ne voit que ses actions
    if (req.user.role === 'agent') filter.agent = req.user._id;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await RecoveryAction.countDocuments(filter);
    const actions = await RecoveryAction.find(filter)
      .populate('invoice', 'invoiceNumber amount status')
      .populate('client', 'name email')
      .populate('agent', 'name email')
      .sort({ scheduledDate: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        actions,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /recovery-actions/:id
const getActionById = async (req, res, next) => {
  try {
    const action = await RecoveryAction.findById(req.params.id)
      .populate('invoice', 'invoiceNumber amount status')
      .populate('client', 'name email')
      .populate('agent', 'name email');

    if (!action) {
      return res.status(404).json({ success: false, message: 'Action introuvable' });
    }
    res.status(200).json({ success: true, data: { action } });
  } catch (error) {
    next(error);
  }
};

// POST /recovery-actions
const createAction = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.body.invoice).populate('client');
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Facture introuvable' });
    }

    if (invoice.status === 'paye' || invoice.status === 'annule') {
      return res.status(400).json({
        success: false,
        message: 'Impossible de créer une action pour une facture payée ou annulée',
      });
    }

    req.body.client = invoice.client._id;
    req.body.agent = req.user._id;

    const action = await RecoveryAction.create(req.body);
    await action.populate([
      { path: 'invoice', select: 'invoiceNumber amount status' },
      { path: 'client', select: 'name email' },
      { path: 'agent', select: 'name email' },
    ]);

    res.status(201).json({ success: true, message: 'Action de recouvrement créée', data: { action } });
  } catch (error) {
    next(error);
  }
};

// PUT /recovery-actions/:id
const updateAction = async (req, res, next) => {
  try {
    const action = await RecoveryAction.findById(req.params.id);
    if (!action) {
      return res.status(404).json({ success: false, message: 'Action introuvable' });
    }

    // Agent ne peut modifier que ses propres actions
    if (req.user.role === 'agent' && action.agent.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }

    if (req.body.status === 'effectue' && !req.body.completedDate) {
      req.body.completedDate = new Date();
    }

    const updated = await RecoveryAction.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate([
      { path: 'invoice', select: 'invoiceNumber amount status' },
      { path: 'client', select: 'name email' },
      { path: 'agent', select: 'name email' },
    ]);

    res.status(200).json({ success: true, message: 'Action mise à jour', data: { action: updated } });
  } catch (error) {
    next(error);
  }
};

// DELETE /recovery-actions/:id
const deleteAction = async (req, res, next) => {
  try {
    const action = await RecoveryAction.findByIdAndDelete(req.params.id);
    if (!action) {
      return res.status(404).json({ success: false, message: 'Action introuvable' });
    }
    res.status(200).json({ success: true, message: 'Action supprimée avec succès' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllActions, getActionById, createAction, updateAction, deleteAction };
