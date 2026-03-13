const Client = require('../models/Client');

// GET /clients (Récupérer tous les clients)
const getAllClients = async (req, res, next) => {
  try { 
    const { status, search, page = 1, limit = 10 } = req.query; //req.query  contient les paramètres envoyés dans l’URL
    const filter = {};

    if (status) filter.status = status;
    if (search) filter.$text = { $search: search };

    // Agent ne voit que ses clients
    if (req.user.role === 'agent') {
      filter.assignedAgent = req.user._id;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);//Calculer le nombre de clients à ignorer pour la pagination
    const total = await Client.countDocuments(filter); //Compter le nombre total de clients selon le filtre
    const clients = await Client.find(filter) //cherche les clients selon le filtre
      .populate('assignedAgent', 'name email role')
      .sort({ createdAt: -1 }) //trier les clients par date de création (du plus récent au plus ancien)
      .skip(skip) // ignorer les clients des pages précédentes
      .limit(parseInt(limit));  //limiter le nombre de clients retournés par page

    res.status(200).json({
      success: true,
      data: {
        clients,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }, 
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /clients/:id
const getClientById = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id).populate('assignedAgent', 'name email role');
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client introuvable' });
    }

    // Agent : vérifier que le client lui appartient
    if (req.user.role === 'agent' && client.assignedAgent?._id.toString() !== req.user._id.toString()) { //toString() pour comparer les ObjectId de MongoDB
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }

    res.status(200).json({ success: true, data: { client } });
  } catch (error) {
    next(error);
  }
};

// POST /clients
const createClient = async (req, res, next) => {
  try {
    if (!req.body.assignedAgent) { 
      req.body.assignedAgent = req.user._id;
    }

    const client = await Client.create(req.body);
    await client.populate('assignedAgent', 'name email role');

    res.status(201).json({ success: true, message: 'Client créé avec succès', data: { client } });
  } catch (error) {
    next(error);
  }
};

// PUT /clients/:id
const updateClient = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client introuvable' });
    }

    if (req.user.role === 'agent' && client.assignedAgent?.toString() !== req.user._id.toString()) { 
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }
// Mettre à jour un client dans MongoDB
const updatedClient = await Client.findByIdAndUpdate(
  req.params.id, // l'id du client à modifier (depuis l'URL)
  req.body,      // les nouvelles données envoyées depuis le frontend
  {
    new: true,          
    runValidators: true 
  }
)
.populate('assignedAgent', 'name email role'); // remplacer l'id de l'agent par ses infos (nom, email, rôle)
    res.status(200).json({ success: true, message: 'Client mis à jour', data: { client: updatedClient } });
  } catch (error) {
    next(error);
  }
};

// DELETE /clients/:id
const deleteClient = async (req, res, next) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client introuvable' });
    }
    res.status(200).json({ success: true, message: 'Client supprimé avec succès' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllClients, getClientById, createClient, updateClient, deleteClient };
