const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: [true, 'Le numéro de facture est obligatoire'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Le client est obligatoire'],
    },
    amount: {
      type: Number,
      required: [true, 'Le montant est obligatoire'],
      min: [0.01, 'Le montant doit être positif'],
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: [0, 'Le montant payé ne peut pas être négatif'],
    },
    currency: {
      type: String,
      default: 'TND',
      uppercase: true,
      trim: true,
    },
    dueDate: {
      type: Date,
      required: [true, "La date d'échéance est obligatoire"],
    },
    issueDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: {
        values: ['en_attente', 'partiel', 'paye', 'en_retard', 'annule'],
        message: 'Statut invalide',
      },
      default: 'en_attente',
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'La description ne peut pas dépasser 500 caractères'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual : montant restant
invoiceSchema.virtual('remainingAmount').get(function () {
  return Math.max(0, this.amount - this.amountPaid);
});

// Virtual : pourcentage payé
invoiceSchema.virtual('paymentPercentage').get(function () {
  return this.amount > 0 ? Math.round((this.amountPaid / this.amount) * 100) : 0;
});

// Middleware : mise à jour auto du statut
invoiceSchema.pre('save', function (next) {
  if (this.status === 'annule') return next();

  const now = new Date();
  if (this.amountPaid <= 0) {
    this.status = this.dueDate < now ? 'en_retard' : 'en_attente';
  } else if (this.amountPaid >= this.amount) {
    this.status = 'paye';
  } else {
    this.status = 'partiel';
  }
  next();
});

// Index
invoiceSchema.index({ client: 1, status: 1 });
invoiceSchema.index({ dueDate: 1 });
invoiceSchema.index({ invoiceNumber: 'text' });

module.exports = mongoose.model('Invoice', invoiceSchema);
