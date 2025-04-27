const express = require('express');
const router = express.Router();
const { Cotes } = require('../model');

router.get('/', async (req, res) => {
    try {
        const result = await Cotes.getAllInsertions();

        if (!result.success) {
            return res.status(result.code || 500).json(result);
        }
        return res.status(200).json({
            success: true,
            message: 'Cotes récupérées avec succès',
            data: result.data,
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

router.get('/annee/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await Cotes.getInsertionsByAnnee(parseInt(id));
        
        // if (!result.success) {
        //     return res.status(result.code || 500).json(result);
        // }
        return res.status(200).json({
            success: true,
            message: 'Cotes récupérées avec succès',
            data: result.data,
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