const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: [true, 'La facture est obligatoire'],
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
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      enum: {
        values: ['virement', 'cheque', 'especes', 'carte', 'autre'],
        message: 'Méthode de paiement invalide',
      },
      required: [true, 'La méthode de paiement est obligatoire'],
    },
    reference: {
      type: String,
      trim: true,
      maxlength: [100, 'La référence ne peut pas dépasser 100 caractères'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [300, 'Les notes ne peuvent pas dépasser 300 caractères'],
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index
paymentSchema.index({ invoice: 1 });
paymentSchema.index({ client: 1 });
paymentSchema.index({ paymentDate: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
