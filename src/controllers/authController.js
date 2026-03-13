//// On importe le package jsonwebtoken pour gérer les tokens JWT
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// POST /auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;   //contient toutes les données que le client envoie dans le corps de la requête HTTP (POST/PUT) fama zada req.params → paramètres de l’URL (/users/:id) .req.body → le corps de la requête (POST, PUT…)

    //  si un utilisateur avec le même email existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ //utilisé quand il y a un conflit de données
      
        success: false,
        message: 'Un compte avec cet email existe déjà',
      }); 
    }
//Si non
    const user = await User.create({ name, email, password, role });
    const token = generateToken(user._id);

    res.status(201).json({ //201 : code http -> Created
      success: true,
      message: 'Compte créé avec succès',
      data: { user, token },
    });
  } catch (error) {
    next(error);
  }
};

// POST /auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Compte désactivé. Contactez un administrateur.',
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      data: { user, token },
    });
  } catch (error) {
    next(error);
  }
};

// GET /auth/me
const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: { user: req.user },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe };
