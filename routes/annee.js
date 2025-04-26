const express = require('express');
const router = express.Router();
const { Etudiant } = require('../model');

router.get('/current', async (req, res) => {
    try {
        const result = await Etudiant.getLastAnnee();

        if (!result.success) {
            return res.status(result.code || 500).json(result);
        }
        return res.status(200).json({
            success: true,
            message: 'Année académique courante',
            data: result.data
        });


    } catch (error) {
        console.error('Erreur lors de la récupération des étudiants :', error);
        res.status(500).json({ 
            success: false,
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
});

module.exports = router;