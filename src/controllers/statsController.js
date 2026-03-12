const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Client = require('../models/Client');
const RecoveryAction = require('../models/RecoveryAction');

// GET /stats/dashboard
const getDashboard = async (req, res, next) => {
  try {
    // Statistiques des factures
    const invoiceStats = await Invoice.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          totalPaid: { $sum: '$amountPaid' },
        },
      },
    ]);

    // Calcul des totaux globaux
    const totals = invoiceStats.reduce(
      (acc, stat) => {
        acc.totalInvoices += stat.count;
        acc.totalAmount += stat.totalAmount;
        acc.totalCollected += stat.totalPaid;
        return acc;
      },
      { totalInvoices: 0, totalAmount: 0, totalCollected: 0 }
    );

    totals.totalPending = totals.totalAmount - totals.totalCollected;
    totals.collectionRate =
      totals.totalAmount > 0
        ? Math.round((totals.totalCollected / totals.totalAmount) * 100)
        : 0;

    // Factures en retard
    const overdueCount = await Invoice.countDocuments({ status: 'en_retard' });

    // Total clients actifs
    const activeClients = await Client.countDocuments({ status: 'actif' });

    // Actions planifiées
    const pendingActions = await RecoveryAction.countDocuments({
      status: { $in: ['planifie', 'en_cours'] },
    });

    // Paiements du mois courant
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyPayments = await Payment.aggregate([
      { $match: { paymentDate: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    // Top 5 clients débiteurs
    const topDebtors = await Invoice.aggregate([
      { $match: { status: { $in: ['en_attente', 'partiel', 'en_retard'] } } },
      {
        $group: {
          _id: '$client',
          totalDebt: { $sum: { $subtract: ['$amount', '$amountPaid'] } },
          invoiceCount: { $sum: 1 },
        },
      },
      { $sort: { totalDebt: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'clients',
          localField: '_id',
          foreignField: '_id',
          as: 'client',
        },
      },
      { $unwind: '$client' },
      {
        $project: {
          clientName: '$client.name',
          clientEmail: '$client.email',
          totalDebt: 1,
          invoiceCount: 1,
        },
      },
    ]);

    // Évolution mensuelle des paiements (6 derniers mois)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrend = await Payment.aggregate([
      { $match: { paymentDate: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$paymentDate' },
            month: { $month: '$paymentDate' },
          },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          ...totals,
          overdueInvoices: overdueCount,
          activeClients,
          pendingActions,
        },
        invoicesByStatus: invoiceStats,
        currentMonth: {
          totalCollected: monthlyPayments[0]?.total || 0,
          paymentsCount: monthlyPayments[0]?.count || 0,
        },
        topDebtors,
        monthlyTrend,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /stats/invoices
const getInvoiceStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const matchFilter = {};
    if (startDate || endDate) {
      matchFilter.issueDate = {};
      if (startDate) matchFilter.issueDate.$gte = new Date(startDate);
      if (endDate) matchFilter.issueDate.$lte = new Date(endDate);
    }

    const stats = await Invoice.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' },
        },
      },
    ]);

    res.status(200).json({ success: true, data: { stats } });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboard, getInvoiceStats };
