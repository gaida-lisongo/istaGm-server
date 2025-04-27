const express = require('express');
const router = express.Router();
const { Promotion, Section } = require('../model');

router.get('/', async (req, res) => {
    try {
        const result = await Promotion.getPromotionStructure();

        if (!result.success) {
            return res.status(result.code || 500).json(result);
        }

        return res.status(200).json({
            success: true,
            message: 'Promotions récupérées avec succès',
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

router.get('/:id', async (req, res) => {
    try {
        const result = await Section.getSectionById(req.params.id);

        if (!result.success) {
            return res.status(result.code || 500).json(result);
        }

        return res.status(200).json({
            success: true,
            message: 'Promotion récupérée avec succès',
            data: result.data,
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de la promotion :', error);
        res.status(500).json({ 
            success: false,
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
});

module.exports = router;