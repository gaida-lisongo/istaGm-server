const express = require('express');
const router = express.Router();
const { Promotion } = require('../model');

router.get('/', async (req, res) => {
    try {
        const result = await Promotion.getAllPromotions();

        if (!result.success) {
            return res.status(result.code || 500).json(result);
        }
        return res.status(200).json({
            success: true,
            message: 'Toutes les promotions',
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

router.get('/stats', async (req, res) => {
    try {
        const { id } = req.params;
        const { promotion } = req.query;

        if (!promotion) {
            return res.status(400).json({
                success: false,
                message: 'Le paramètre "promotion" est requis',
            });
        }

        const request = {
            annee: parseInt(id),
            promotion: parseInt(promotion),
        }

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