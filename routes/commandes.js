const express = require('express');
const router = express.Router();
const { Etudiant } = require('../model');

router.get('/', async (req, res) => {
    try {
        const result = await Etudiant.getAllCommandesEnrollement();

        if (!result.success) {
            return res.status(result.code || 500).json(result);
        }

        const totalImpression = await Etudiant.getAllCommandesEnrollementByStatut();
        const totalImpressionData = totalImpression.success ? totalImpression.data.length : [].length;
        const totalCommandes = await Etudiant.getAllCommandesEnrollementByStatut('PENDING');
        const totalCommandesData = totalCommandes.success ? totalCommandes.data.length : [].length; 

        return res.status(200).json({
            success: true,
            message: 'Commandes récupérées avec succès',
            data: result.data,
            totalImpression: totalImpressionData,
            totalCommandes: totalCommandesData,
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
        const result = await Etudiant.getSoldeCommandesEnrollementByAnnee(id);

        if (!result.success) {
            return res.status(result.code || 500).json(result);
        }

        return res.status(200).json({
            success: true,
            message: 'Commandes récupérées avec succès',
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