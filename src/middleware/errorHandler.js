const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Erreur interne du serveur';

  // Erreur de duplication MongoDB (code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `La valeur '${err.keyValue[field]}' pour le champ '${field}' existe déjà.`;
  }

  // Erreur de validation Mongoose
  if (err.name === 'ValidationError') {
    statusCode = 422;// Unprocessable Entity mta3 données invalides
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(statusCode).json({ success: false, message: 'Données invalides', errors });
  }

  // CastError (ObjectId invalide)
  if (err.name === 'CastError') {// ex: GET /invoices/123 (123 n'est pas un ObjectId valide)
    statusCode = 400;// Bad Request mta3 ObjectId invalide
    message = `Identifiant invalide : ${err.value}`;
  }

  if (process.env.NODE_ENV === 'development') {// Afficher les détails de l'erreur en développement
    console.error(' Erreur:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// Middleware 404 Ressource introuvable  
const notFound = (req, res) => {
  res.status(404).json({// 404 : Not Found
    success: false,
    message: `Route introuvable : ${req.method} ${req.originalUrl}`,
  });
};

module.exports = { errorHandler, notFound };
