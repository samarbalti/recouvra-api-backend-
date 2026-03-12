const mongoose = require('mongoose');

const recoveryActionSchema = new mongoose.Schema(
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
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, "L'agent est obligatoire"],
    },
    type: {
      type: String,
      enum: {
        values: ['appel', 'email', 'courrier', 'visite', 'relance', 'mise_en_demeure'],
        message: "Type d'action invalide",
      },
      required: [true, "Le type d'action est obligatoire"],
    },
    status: {
      type: String,
      enum: {
        values: ['planifie', 'en_cours', 'effectue', 'echoue', 'annule'],
        message: 'Statut invalide',
      },
      default: 'planifie',
    },
    scheduledDate: {
      type: Date,
      required: [true, 'La date prévue est obligatoire'],
    },
    completedDate: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Les notes ne peuvent pas dépasser 1000 caractères'],
    },
    result: {
      type: String,
      trim: true,
      maxlength: [500, 'Le résultat ne peut pas dépasser 500 caractères'],
    },
    nextActionDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index
recoveryActionSchema.index({ invoice: 1, status: 1 });
recoveryActionSchema.index({ agent: 1, scheduledDate: 1 });
recoveryActionSchema.index({ client: 1 });

module.exports = mongoose.model('RecoveryAction', recoveryActionSchema);
