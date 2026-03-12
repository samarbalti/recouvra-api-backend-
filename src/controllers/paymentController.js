const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');

// GET /payments
const getAllPayments = async (req, res, next) => {
  try {
    const { invoice, client, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (invoice) filter.invoice = invoice;
    if (client) filter.client = client;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Payment.countDocuments(filter);
    const payments = await Payment.find(filter)
      .populate('invoice', 'invoiceNumber amount')
      .populate('client', 'name email')
      .populate('recordedBy', 'name email')
      .sort({ paymentDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        payments,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /payments/:id
const getPaymentById = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('invoice', 'invoiceNumber amount status')
      .populate('client', 'name email')
      .populate('recordedBy', 'name email');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Paiement introuvable' });
    }
    res.status(200).json({ success: true, data: { payment } });
  } catch (error) {
    next(error);
  }
};

// POST /payments
const createPayment = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.body.invoice).populate('client');
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Facture introuvable' });
    }

    if (invoice.status === 'annule') {
      return res.status(400).json({ success: false, message: 'Impossible de payer une facture annulée' });
    }

    if (invoice.status === 'paye') {
      return res.status(400).json({ success: false, message: 'Cette facture est déjà payée intégralement' });
    }

    const remaining = invoice.amount - invoice.amountPaid;
    if (req.body.amount > remaining) {
      return res.status(400).json({
        success: false,
        message: `Le montant dépasse le restant dû (${remaining} ${invoice.currency})`,
      });
    }

    // Enregistrer le paiement
    req.body.client = invoice.client._id;
    req.body.recordedBy = req.user._id;
    const payment = await Payment.create(req.body);

    // Mettre à jour la facture
    invoice.amountPaid += req.body.amount;
    await invoice.save();

    await payment.populate([
      { path: 'invoice', select: 'invoiceNumber amount amountPaid status' },
      { path: 'client', select: 'name email' },
      { path: 'recordedBy', select: 'name email' },
    ]);

    res.status(201).json({
      success: true,
      message: 'Paiement enregistré avec succès',
      data: { payment },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllPayments, getPaymentById, createPayment };
