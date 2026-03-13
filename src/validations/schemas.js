const Joi = require('joi');

//  Auth 
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Le nom doit contenir au moins 2 caractères',
    'any.required': 'Le nom est obligatoire',
  }),
  email: Joi.string().email().required().messages({
    'string.email': "Format d'email invalide",
    'any.required': "L'email est obligatoire",
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Le mot de passe doit contenir au moins 6 caractères',
    'any.required': 'Le mot de passe est obligatoire',
  }),
  role: Joi.string().valid('agent', 'manager', 'admin').default('agent'),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// User 
const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  email: Joi.string().email(),
  role: Joi.string().valid('agent', 'manager', 'admin'),
  isActive: Joi.boolean(),
  password: Joi.string().min(6),
}).min(1);

// Client 
const clientSchema = Joi.object({
  name: Joi.string().min(2).max(150).required(),
  email: Joi.string().email().required(),
  phone: Joi.string()
    .pattern(/^[+\d\s\-()]{6,20}$/)
    .optional()
    .allow(''),
  address: Joi.object({
    street: Joi.string().allow(''),
    city: Joi.string().allow(''),
    postalCode: Joi.string().allow(''),
    country: Joi.string().default('Tunisie'),
  }).optional(),
  company: Joi.string().max(150).optional().allow(''),
  status: Joi.string().valid('actif', 'inactif', 'bloque').default('actif'),
  assignedAgent: Joi.string().optional(),
  notes: Joi.string().max(500).optional().allow(''),
});

const updateClientSchema = clientSchema.fork(
  ['name', 'email'],
  (field) => field.optional()
);

// Invoice 
const invoiceSchema = Joi.object({
  invoiceNumber: Joi.string().uppercase().trim().required(),
  client: Joi.string().required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().uppercase().default('TND'),
  dueDate: Joi.date().iso().required(),
  issueDate: Joi.date().iso().optional(),
  description: Joi.string().max(500).optional().allow(''),
});

const updateInvoiceSchema = Joi.object({
  description: Joi.string().max(500).allow(''),
  dueDate: Joi.date().iso(),
  status: Joi.string().valid('annule'),
}).min(1);

//  Payment 
const paymentSchema = Joi.object({
  invoice: Joi.string().required(),
  amount: Joi.number().positive().required(),
  paymentDate: Joi.date().iso().optional(),
  paymentMethod: Joi.string()
    .valid('virement', 'cheque', 'especes', 'carte', 'autre')
    .required(),
  reference: Joi.string().max(100).optional().allow(''),
  notes: Joi.string().max(300).optional().allow(''),
});

//  Recovery Action  
const recoveryActionSchema = Joi.object({
  invoice: Joi.string().required(),
  type: Joi.string()
    .valid('appel', 'email', 'courrier', 'visite', 'relance', 'mise_en_demeure')
    .required(),
  scheduledDate: Joi.date().iso().required(),
  notes: Joi.string().max(1000).optional().allow(''),
  nextActionDate: Joi.date().iso().optional(),
});

const updateRecoveryActionSchema = Joi.object({
  status: Joi.string().valid('planifie', 'en_cours', 'effectue', 'echoue', 'annule'),
  completedDate: Joi.date().iso(),
  result: Joi.string().max(500).allow(''),
  notes: Joi.string().max(1000).allow(''),
  nextActionDate: Joi.date().iso(),
}).min(1);

module.exports = {
  registerSchema,
  loginSchema,
  updateUserSchema,
  clientSchema,
  updateClientSchema,
  invoiceSchema,
  updateInvoiceSchema,
  paymentSchema,
  recoveryActionSchema,
  updateRecoveryActionSchema,
};
//Joi → sert à valider et filtrer les rôles acceptés.