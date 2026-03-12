const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Le nom du client est obligatoire'],
      trim: true,
      minlength: [2, 'Le nom doit contenir au moins 2 caractères'],
      maxlength: [150, 'Le nom ne peut pas dépasser 150 caractères'],
    },
    email: {
      type: String,
      required: [true, "L'email est obligatoire"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Format email invalide'],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[+\d\s\-()]{6,20}$/, 'Format téléphone invalide'],
    },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      postalCode: { type: String, trim: true },
      country: { type: String, trim: true, default: 'Tunisie' },
    },
    company: {
      type: String,
      trim: true,
      maxlength: [150, "Le nom de l'entreprise ne peut pas dépasser 150 caractères"],
    },
    status: {
      type: String,
      enum: {
        values: ['actif', 'inactif', 'bloque'],
        message: 'Le statut doit être actif, inactif ou bloque',
      },
      default: 'actif',
    },
    assignedAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
      maxlength: [500, 'Les notes ne peuvent pas dépasser 500 caractères'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual : nombre de factures
clientSchema.virtual('invoices', {
  ref: 'Invoice',
  localField: '_id',
  foreignField: 'client',
  justOne: false,
});

// Index pour la recherche
clientSchema.index({ name: 'text', email: 'text', company: 'text' });

module.exports = mongoose.model('Client', clientSchema);
