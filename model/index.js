const AgentModel = require('./AgentModel');
const OrigineModel = require('./OrigineModel');
const SectionModel = require('./SectionModel');
const PromotionModel = require('./PromotionModel');
const EtudiantModel = require('./EtudiantModel');
const CotesModel = require('./CotesModel');

/**
 * Exporte tous les modèles dans un objet unique
 * Permet d'importer les modèles de cette manière:
 * const { AgentModel, EtudiantModel, ... } = require('./model');
 */
module.exports = {
    Agent: new AgentModel(),
    Origine: new OrigineModel(),
    Section: new SectionModel(),
    Promotion: new PromotionModel(),
    Etudiant: new EtudiantModel(),
    Cotes: new CotesModel()
};

/**
 * On peut également accéder aux modèles individuellement:
 * const AgentModel = require('./model/AgentModel');
 */