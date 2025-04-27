const express = require('express');
const router = express.Router();
const { Agent } = require('../model');

router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Agent.getAgentById(id);

        if (!result.success) {
            return res.status(result.code || 500).json(result);
        }

        return res.status(200).json({
            success: true,
            message: 'Agent récupéré avec succès',
            data: result.data,
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'agent :', error);
        res.status(500).json({ 
            success: false,
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
});

module.exports = router;