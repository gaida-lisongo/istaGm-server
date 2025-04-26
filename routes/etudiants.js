const express = require('express');
const router = express.Router();
const { Etudiant } = require('../model')


/**
 * @route   GET /api/etudiants
 * @desc    Récupère tous les étudiants avec pagination et tri
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    // Extraire les paramètres de requête pour la pagination et le tri
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'nom', 
      sortDir = 'ASC',
      search = null
    } = req.query;
    
    // Calculer l'offset pour la pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Options pour la requête
    const options = { 
      limit: parseInt(limit), 
      offset, 
      sortBy, 
      sortDir 
    };
    
    // Exécuter la requête appropriée selon si une recherche est demandée
    let result;
    if (search) {
      result = await Etudiant.searchEtudiants(search, options);
    } else {
      result = await Etudiant.getAllEtudiants(options);
    }
    
    // Gérer le cas où la requête échoue
    if (!result.success) {
      return res.status(result.code || 500).json(result);
    }

    // Si la requête réussit, récupérer le nombre total d'étudiants pour la pagination
    const totalResult = await Etudiant.query('SELECT COUNT(*) as total FROM etudiant');
    const totalCount = totalResult.success ? totalResult.data[0].total : 0;

    // Total des étudiants par sexe
    const totalBySexe = await Etudiant.query('SELECT sexe, COUNT(*) as total FROM etudiant GROUP BY sexe');
    const totalBySexeData = totalBySexe.success ? totalBySexe.data : [];

    const totalBySexeMap = totalBySexeData.reduce((acc, curr) => {
        acc[curr.sexe] = curr.total;
        return acc;
        }, {});

    const totalBySexeResponse = {
        totalHomme: totalBySexeMap['M'] || 0,
        totalFemme: totalBySexeMap['F'] || 0,
        totalAutre: totalBySexeMap[''] || 0
    };
    
    // Renvoyer les données avec les informations de pagination
    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalCount / parseInt(limit)),
        sexeCounts: totalBySexeResponse
      }
    });
  } catch (error) {
    // Journaliser l'erreur et renvoyer une réponse d'erreur
    console.error('Error in GET /api/etudiants:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const response = await Etudiant.getStatistiques();
    
    if (!response.success) {
      return res.status(response.code || 500).json(response);
    }

    return res.status(200).json({
      success: true,
      message: 'Statistiques des étudiants',
      data: response.data
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération des étudiants :', error);
    res.status(500).json({ 
        success: false,
        message: 'Erreur interne du serveur',
        error: error.message
    });
    
  }
})

module.exports = router;