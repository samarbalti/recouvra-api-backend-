const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,// Valider tous les champs et retourner tous les messages d'erreur
      stripUnknown: true,// Supprimer les champs non définis dans le schéma
    });

    if (error) {
      const errors = error.details.map((detail) => ({// Joi fournit un tableau de détails d'erreur
        field: detail.path.join('.'),// Le chemin du champ en erreur (ex: 'email' ou 'address.street')
        message: detail.message,// Le message d'erreur généré par Joi
      }));

      return res.status(422).json({
        success: false,
        message: 'Données invalides',
        errors,
      });
    }

    req.body = value;
    next();
  };
};

module.exports = validate;
