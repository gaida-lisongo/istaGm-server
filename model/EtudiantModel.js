const PromotionModel = require('./PromotionModel');

/**
 * Modèle pour la gestion des étudiants
 * Structure de la table principale:
 * - etudiant(id, nom, post_nom, prenom, matricule, sexe, mdp, vision, date_naiss, telephone, adresse, e_mail, avatar)
 * 
 * Tables associées:
 * - administratif_etudiant(id, id_etudiant, section, option, annee, pourcentage_exetat)
 * - commande_enrollement(id, id_enrollement, id_etudiant, montant, statut, reference, orderNumber)
 * - fiche_cotation(id, id_etudiant, id_matiere, id_annee, tp, td, examen, rattrapage)
 * - promotion_etudiant(id, id_adminEtudiant, date_inscription, id_annee_acad, id_promotion)
 * - annee(id, debut, fin)
 */
class EtudiantModel extends PromotionModel {
  /**
   * ------------ MÉTHODES POUR LA GESTION DES ÉTUDIANTS ------------
   */
  
  /**
   * Récupère tous les étudiants
   * @param {Object} options - Options de pagination et de tri
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getAllEtudiants(options = {}) {
    const { limit = null, offset = 0, sortBy = 'nom', sortDir = 'ASC' } = options;
    
    let sql = 'SELECT * FROM etudiant';
    const params = [];
    
    // Ajouter le tri
    sql += ` ORDER BY ${sortBy} ${sortDir}`;
    
    // Ajouter la pagination
    if (limit !== null) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(parseInt(limit, 10), parseInt(offset, 10));
    }
    
    return this.query(sql, params);
  }

  /**
   * Récupère un étudiant par son ID
   * @param {number} id - ID de l'étudiant
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getEtudiantById(id) {
    const result = await this.query('SELECT * FROM etudiant WHERE id = ?', [id]);
    
    if (result.success && (Array.isArray(result.data) && result.data.length === 0)) {
      return this.errorResponse('Etudiant not found', 404);
    }
    
    return result;
  }

  /**
   * Récupère un étudiant par son matricule
   * @param {string} matricule - Matricule de l'étudiant
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getEtudiantByMatricule(matricule) {
    const result = await this.query('SELECT * FROM etudiant WHERE matricule = ?', [matricule]);
    
    if (result.success && (Array.isArray(result.data) && result.data.length === 0)) {
      return this.errorResponse('Etudiant not found', 404);
    }
    
    return result;
  }

  /**
   * Recherche des étudiants par nom, post-nom ou prénom
   * @param {string} searchTerm - Terme de recherche
   * @param {Object} options - Options de pagination et de tri
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async searchEtudiants(searchTerm, options = {}) {
    const { limit = null, offset = 0, sortBy = 'nom', sortDir = 'ASC' } = options;
    
    let sql = `
      SELECT * FROM etudiant 
      WHERE nom LIKE ? OR post_nom LIKE ? OR prenom LIKE ? OR matricule LIKE ?
    `;
    
    const searchParam = `%${searchTerm}%`;
    let params = [searchParam, searchParam, searchParam, searchParam];
    
    // Ajouter le tri
    sql += ` ORDER BY ${sortBy} ${sortDir}`;
    
    // Ajouter la pagination
    if (limit !== null) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(parseInt(limit, 10), parseInt(offset, 10));
    }
    
    return this.query(sql, params);
  }

  /**
   * Crée un nouvel étudiant
   * @param {Object} etudiantData - Données de l'étudiant
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async createEtudiant(etudiantData) {
    // Vérifier les champs obligatoires
    if (!etudiantData.nom || etudiantData.nom.trim() === '') {
      return this.errorResponse('Le nom est obligatoire', 400);
    }
    
    if (!etudiantData.post_nom || etudiantData.post_nom.trim() === '') {
      return this.errorResponse('Le post-nom est obligatoire', 400);
    }
    
    if (!etudiantData.prenom || etudiantData.prenom.trim() === '') {
      return this.errorResponse('Le prénom est obligatoire', 400);
    }
    
    if (!etudiantData.sexe) {
      return this.errorResponse('Le sexe est obligatoire', 400);
    }
    
    // Vérifier si le matricule existe déjà
    if (etudiantData.matricule) {
      const matriculeExists = await this.query(
        'SELECT id FROM etudiant WHERE matricule = ?',
        [etudiantData.matricule]
      );
      
      if (matriculeExists.success && Array.isArray(matriculeExists.data) && matriculeExists.data.length > 0) {
        return this.errorResponse('Ce matricule existe déjà', 409);
      }
    } else {
      // Générer un matricule si non fourni
      etudiantData.matricule = await this.generateMatricule();
    }
    
    // Vérifier si l'email existe déjà (s'il est fourni)
    if (etudiantData.e_mail) {
      const emailExists = await this.query(
        'SELECT id FROM etudiant WHERE e_mail = ?',
        [etudiantData.e_mail]
      );
      
      if (emailExists.success && Array.isArray(emailExists.data) && emailExists.data.length > 0) {
        return this.errorResponse('Cet e-mail existe déjà', 409);
      }
    }
    
    // Préparer les champs et valeurs pour l'insertion
    const fields = Object.keys(etudiantData);
    const values = fields.map(field => etudiantData[field]);
    const placeholders = fields.map(() => '?').join(', ');
    
    return this.query(
      `INSERT INTO etudiant (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    );
  }

  /**
   * Met à jour un étudiant existant
   * @param {number} id - ID de l'étudiant
   * @param {Object} etudiantData - Données à mettre à jour
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async updateEtudiant(id, etudiantData) {
    // Vérifier si l'étudiant existe
    const etudiantExists = await this.getEtudiantById(id);
    if (!etudiantExists.success) {
      return etudiantExists;
    }
    
    // Vérifier si les données sont fournies
    if (!etudiantData || Object.keys(etudiantData).length === 0) {
      return this.errorResponse('Aucune donnée fournie pour la mise à jour', 400);
    }
    
    // Vérifier si le matricule existe déjà pour un autre étudiant
    if (etudiantData.matricule) {
      const matriculeExists = await this.query(
        'SELECT id FROM etudiant WHERE matricule = ? AND id != ?',
        [etudiantData.matricule, id]
      );
      
      if (matriculeExists.success && Array.isArray(matriculeExists.data) && matriculeExists.data.length > 0) {
        return this.errorResponse('Ce matricule existe déjà', 409);
      }
    }
    
    // Vérifier si l'email existe déjà pour un autre étudiant
    if (etudiantData.e_mail) {
      const emailExists = await this.query(
        'SELECT id FROM etudiant WHERE e_mail = ? AND id != ?',
        [etudiantData.e_mail, id]
      );
      
      if (emailExists.success && Array.isArray(emailExists.data) && emailExists.data.length > 0) {
        return this.errorResponse('Cet e-mail existe déjà', 409);
      }
    }
    
    // Construire la requête SQL dynamiquement
    const fields = Object.keys(etudiantData);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => etudiantData[field]);
    values.push(id);
    
    return this.query(`UPDATE etudiant SET ${setClause} WHERE id = ?`, values);
  }

  /**
   * Supprime un étudiant
   * @param {number} id - ID de l'étudiant
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async deleteEtudiant(id) {
    // Vérifier si l'étudiant existe
    const etudiantExists = await this.getEtudiantById(id);
    if (!etudiantExists.success) {
      return etudiantExists;
    }
    
    // Vérifier les dépendances (administratif_etudiant, commande_enrollement, fiche_cotation)
    // Nous allons vérifier si l'étudiant a des données associées dans les tables liées
    const tables = [
      { name: 'administratif_etudiant', field: 'id_etudiant' },
      { name: 'commande_enrollement', field: 'id_etudiant' },
      { name: 'fiche_cotation', field: 'id_etudiant' },
      { name: 'origine_etudiant', field: 'id_etudiant' }
    ];
    
    for (const table of tables) {
      const checkResult = await this.query(
        `SELECT id FROM ${table.name} WHERE ${table.field} = ? LIMIT 1`,
        [id]
      );
      
      if (checkResult.success && Array.isArray(checkResult.data) && checkResult.data.length > 0) {
        return this.errorResponse(
          `Impossible de supprimer cet étudiant car il possède des données dans la table ${table.name}`,
          400
        );
      }
    }
    
    return this.query('DELETE FROM etudiant WHERE id = ?', [id]);
  }

  /**
   * Génère un nouveau matricule pour un étudiant
   * @returns {Promise<string>} - Nouveau matricule unique
   */
  async generateMatricule() {
    const year = new Date().getFullYear().toString().substr(-2);
    const prefix = `E${year}`;
    
    // Récupérer le dernier matricule pour construire le suivant
    const result = await this.query(
      "SELECT matricule FROM etudiant WHERE matricule LIKE ? ORDER BY matricule DESC LIMIT 1",
      [`${prefix}%`]
    );
    
    let number = 1;
    
    if (result.success && Array.isArray(result.data) && result.data.length > 0) {
      const lastMatricule = result.data[0].matricule;
      const lastNumber = parseInt(lastMatricule.replace(prefix, ''), 10);
      if (!isNaN(lastNumber)) {
        number = lastNumber + 1;
      }
    }
    
    return `${prefix}${number.toString().padStart(4, '0')}`;
  }

  /**
   * ------------ MÉTHODES POUR LA GESTION DES INFORMATIONS ADMINISTRATIVES ------------
   */
  
  /**
   * Récupère les informations administratives d'un étudiant
   * @param {number} etudiantId - ID de l'étudiant
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getAdministratifEtudiant(etudiantId) {
    const result = await this.query(
      'SELECT * FROM administratif_etudiant WHERE id_etudiant = ?',
      [etudiantId]
    );
    
    if (result.success && (Array.isArray(result.data) && result.data.length === 0)) {
      return this.errorResponse('Informations administratives non trouvées pour cet étudiant', 404);
    }
    
    return result;
  }

  /**
   * Crée ou met à jour les informations administratives d'un étudiant
   * @param {number} etudiantId - ID de l'étudiant
   * @param {Object} adminData - Données administratives
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async setAdministratifEtudiant(etudiantId, adminData) {
    // Vérifier si l'étudiant existe
    const etudiantExists = await this.getEtudiantById(etudiantId);
    if (!etudiantExists.success) {
      return etudiantExists;
    }
    
    // Préparer les données
    const data = {
      id_etudiant: etudiantId,
      section: adminData.section || null,
      option: adminData.option || null,
      annee: adminData.annee || null,
      pourcentage_exetat: adminData.pourcentage_exetat || null
    };
    
    // Vérifier si l'étudiant a déjà des informations administratives
    const adminExists = await this.query(
      'SELECT id FROM administratif_etudiant WHERE id_etudiant = ?',
      [etudiantId]
    );
    
    if (adminExists.success && Array.isArray(adminExists.data) && adminExists.data.length > 0) {
      // Mettre à jour les informations existantes
      const adminId = adminExists.data[0].id;
      
      const fields = Object.keys(data).filter(key => key !== 'id_etudiant');
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => data[field]);
      values.push(adminId);
      
      return this.query(
        `UPDATE administratif_etudiant SET ${setClause} WHERE id = ?`,
        values
      );
    } else {
      // Créer de nouvelles informations administratives
      const fields = Object.keys(data);
      const values = fields.map(field => data[field]);
      const placeholders = fields.map(() => '?').join(', ');
      
      return this.query(
        `INSERT INTO administratif_etudiant (${fields.join(', ')}) VALUES (${placeholders})`,
        values
      );
    }
  }

  /**
   * Supprime les informations administratives d'un étudiant
   * @param {number} etudiantId - ID de l'étudiant
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async deleteAdministratifEtudiant(etudiantId) {
    // Vérifier si l'étudiant existe
    const etudiantExists = await this.getEtudiantById(etudiantId);
    if (!etudiantExists.success) {
      return etudiantExists;
    }
    
    // Vérifier si l'étudiant a des informations administratives
    const adminExists = await this.getAdministratifEtudiant(etudiantId);
    if (!adminExists.success) {
      return adminExists;
    }
    
    // Vérifier si l'étudiant a des parcours académiques
    const parcoursExists = await this.query(
      'SELECT id FROM promotion_etudiant WHERE id_adminEtudiant = ? LIMIT 1',
      [adminExists.data[0].id]
    );
    
    if (parcoursExists.success && Array.isArray(parcoursExists.data) && parcoursExists.data.length > 0) {
      return this.errorResponse(
        'Impossible de supprimer les informations administratives car elles sont liées à un parcours académique',
        400
      );
    }
    
    return this.query('DELETE FROM administratif_etudiant WHERE id_etudiant = ?', [etudiantId]);
  }

  /**
   * ------------ MÉTHODES POUR LA GESTION DES COMMANDES D'ENROLLEMENT ------------
   */

  /**
   * Récupère toutes les commandes 
   */
  async getAllCommandesEnrollement() {
    const sql = `
      SELECT ce.*, 
             e.designation as enrollement_designation,
             e.session as enrollement_session,
             p.id as promotion_id,
             p.orientation as promotion_orientation,
             s.designation as section_designation,
             n.intitule as niveau_intitule
      FROM commande_enrollement ce
      JOIN enrollements e ON ce.id_enrollement = e.id
      JOIN promotion p ON e.id_promotion = p.id
      JOIN section s ON p.id_section = s.id
      JOIN niveau n ON p.id_niveau = n.id
      ORDER BY ce.id DESC
    `;
    
    return this.query(sql);
  }

  /**
   * Récupère toutes les commandes dont le statut est "OK"
   */

  async getAllCommandesEnrollementByStatut(statut = 'OK') {
    const sql = `
      SELECT ce.*, 
             e.designation as enrollement_designation,
             e.session as enrollement_session,
             p.id as promotion_id,
             p.orientation as promotion_orientation,
             s.designation as section_designation,
             n.intitule as niveau_intitule
      FROM commande_enrollement ce
      JOIN enrollements e ON ce.id_enrollement = e.id
      JOIN promotion p ON e.id_promotion = p.id
      JOIN section s ON p.id_section = s.id
      JOIN niveau n ON p.id_niveau = n.id
      WHERE ce.statut = ?
      ORDER BY ce.id DESC
    `;
    
    return this.query(sql, [statut]);
  }

  /**
   * Recupère les soldes des commandes par statut 
   */
  async getSoldeCommandesEnrollementByAnnee(anneeId){
    const sql = `
      SELECT SUM(commande_enrollement.montant) as total_montant, statut
      FROM commande_enrollement
      INNER JOIN enrollements ON enrollements.id = commande_enrollement.id_enrollement
      WHERE enrollements.id_annee = ?
      GROUP BY statut

    `;
    
    return this.query(sql, [anneeId]);
  }

  /**
   * Récupère toutes les commandes d'enrollement d'un étudiant
   * @param {number} etudiantId - ID de l'étudiant
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getCommandesEnrollementByEtudiant(etudiantId) {
    // Vérifier si l'étudiant existe
    const etudiantExists = await this.getEtudiantById(etudiantId);
    if (!etudiantExists.success) {
      return etudiantExists;
    }
    
    const sql = `
      SELECT ce.*, 
             e.designation as enrollement_designation,
             e.session as enrollement_session,
             p.id as promotion_id,
             p.orientation as promotion_orientation,
             s.designation as section_designation,
             n.intitule as niveau_intitule
      FROM commande_enrollement ce
      JOIN enrollements e ON ce.id_enrollement = e.id
      JOIN promotion p ON e.id_promotion = p.id
      JOIN section s ON p.id_section = s.id
      JOIN niveau n ON p.id_niveau = n.id
      WHERE ce.id_etudiant = ?
      ORDER BY ce.id DESC
    `;
    
    return this.query(sql, [etudiantId]);
  }

  /**
   * Récupère une commande d'enrollement par son ID
   * @param {number} id - ID de la commande
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getCommandeEnrollementById(id) {
    const sql = `
      SELECT ce.*, 
             e.designation as enrollement_designation,
             e.session as enrollement_session,
             e.id_promotion as promotion_id,
             e.montant as enrollement_montant,
             et.nom, et.post_nom, et.prenom, et.matricule
      FROM commande_enrollement ce
      JOIN enrollements e ON ce.id_enrollement = e.id
      JOIN etudiant et ON ce.id_etudiant = et.id
      WHERE ce.id = ?
    `;
    
    const result = await this.query(sql, [id]);
    
    if (result.success && (Array.isArray(result.data) && result.data.length === 0)) {
      return this.errorResponse('Commande d\'enrollement non trouvée', 404);
    }
    
    return result;
  }

  /**
   * Crée une nouvelle commande d'enrollement
   * @param {number} etudiantId - ID de l'étudiant
   * @param {number} enrollementId - ID de l'enrollement
   * @param {Object} commandeData - Données de la commande
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async createCommandeEnrollement(etudiantId, enrollementId, commandeData) {
    // Vérifier si l'étudiant existe
    const etudiantExists = await this.getEtudiantById(etudiantId);
    if (!etudiantExists.success) {
      return etudiantExists;
    }
    
    // Vérifier si l'enrollement existe
    const enrollementResult = await this.query('SELECT * FROM enrollements WHERE id = ?', [enrollementId]);
    if (enrollementResult.success && (Array.isArray(enrollementResult.data) && enrollementResult.data.length === 0)) {
      return this.errorResponse('Enrollement non trouvé', 404);
    }
    
    // Préparer les données
    const data = {
      id_etudiant: etudiantId,
      id_enrollement: enrollementId,
      montant: commandeData.montant || enrollementResult.data[0].montant,
      statut: commandeData.statut || 'En attente',
      reference: commandeData.reference || this.generateReference(),
      orderNumber: commandeData.orderNumber || this.generateOrderNumber()
    };
    
    // Vérifier si une commande existe déjà pour cet étudiant et cet enrollement
    const commandeExists = await this.query(
      'SELECT id FROM commande_enrollement WHERE id_etudiant = ? AND id_enrollement = ? AND statut != "Annulé"',
      [etudiantId, enrollementId]
    );
    
    if (commandeExists.success && Array.isArray(commandeExists.data) && commandeExists.data.length > 0) {
      return this.errorResponse('Une commande existe déjà pour cet étudiant et cet enrollement', 409);
    }
    
    // Insérer la commande
    const fields = Object.keys(data);
    const values = fields.map(field => data[field]);
    const placeholders = fields.map(() => '?').join(', ');
    
    return this.query(
      `INSERT INTO commande_enrollement (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    );
  }

  /**
   * Met à jour le statut d'une commande d'enrollement
   * @param {number} id - ID de la commande
   * @param {string} statut - Nouveau statut
   * @param {string} reference - Nouvelle référence (optionnel)
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async updateCommandeEnrollementStatus(id, statut, reference = null) {
    // Vérifier si la commande existe
    const commandeExists = await this.getCommandeEnrollementById(id);
    if (!commandeExists.success) {
      return commandeExists;
    }
    
    // Statuts valides
    const validStatuts = ['En attente', 'Payé', 'Annulé', 'En cours'];
    if (!validStatuts.includes(statut)) {
      return this.errorResponse('Statut invalide', 400);
    }
    
    // Préparer la requête
    const updateData = { statut };
    if (reference) {
      updateData.reference = reference;
    }
    
    const fields = Object.keys(updateData);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updateData[field]);
    values.push(id);
    
    return this.query(`UPDATE commande_enrollement SET ${setClause} WHERE id = ?`, values);
  }

  /**
   * Annule une commande d'enrollement
   * @param {number} id - ID de la commande
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async cancelCommandeEnrollement(id) {
    return this.updateCommandeEnrollementStatus(id, 'Annulé');
  }

  /**
   * Génère une référence aléatoire pour une commande
   * @returns {string} - Référence unique
   */
  generateReference() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let reference = '';
    for (let i = 0; i < 8; i++) {
      reference += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `REF-${reference}`;
  }

  /**
   * Génère un numéro de commande
   * @returns {string} - Numéro de commande unique
   */
  generateOrderNumber() {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${timestamp.substring(timestamp.length - 6)}${random}`;
  }

  /**
   * ------------ MÉTHODES POUR LA GESTION DES FICHES DE COTATION ------------
   */
  
  /**
   * Récupère les fiches de cotation d'un étudiant
   * @param {number} etudiantId - ID de l'étudiant
   * @param {number} anneeId - ID de l'année académique (optionnel)
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getFichesCotationByEtudiant(etudiantId, anneeId = null) {
    // Vérifier si l'étudiant existe
    const etudiantExists = await this.getEtudiantById(etudiantId);
    if (!etudiantExists.success) {
      return etudiantExists;
    }
    
    let sql = `
      SELECT fc.*, 
             m.designation as matiere_designation,
             m.credit as matiere_credit,
             m.semestre as matiere_semestre,
             u.designation as unite_designation,
             a.debut as annee_debut,
             a.fin as annee_fin,
             (fc.tp + fc.td + fc.examen) as total,
             CASE
                WHEN (fc.tp + fc.td + fc.examen) >= 10 THEN 'Réussi'
                WHEN fc.rattrapage IS NOT NULL AND fc.rattrapage >= 10 THEN 'Réussi via rattrapage'
                WHEN fc.rattrapage IS NOT NULL AND fc.rattrapage < 10 THEN 'Échoué après rattrapage'
                ELSE 'Échoué'
             END as resultat
      FROM fiche_cotation fc
      JOIN matiere m ON fc.id_matiere = m.id
      JOIN unite u ON m.id_unite = u.id
      JOIN annee a ON fc.id_annee = a.id
      WHERE fc.id_etudiant = ?
    `;
    
    const params = [etudiantId];
    
    if (anneeId) {
      sql += ' AND fc.id_annee = ?';
      params.push(anneeId);
    }
    
    sql += ' ORDER BY a.debut DESC, m.semestre, u.designation, m.designation';
    
    return this.query(sql, params);
  }

  /**
   * Récupère les fiches de cotation par matière
   * @param {number} matiereId - ID de la matière
   * @param {number} anneeId - ID de l'année académique
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getFichesCotationByMatiere(matiereId, anneeId) {
    const sql = `
      SELECT fc.*, 
             e.nom, e.post_nom, e.prenom, e.matricule,
             (fc.tp + fc.td + fc.examen) as total,
             CASE
                WHEN (fc.tp + fc.td + fc.examen) >= 10 THEN 'Réussi'
                WHEN fc.rattrapage IS NOT NULL AND fc.rattrapage >= 10 THEN 'Réussi via rattrapage'
                WHEN fc.rattrapage IS NOT NULL AND fc.rattrapage < 10 THEN 'Échoué après rattrapage'
                ELSE 'Échoué'
             END as resultat
      FROM fiche_cotation fc
      JOIN etudiant e ON fc.id_etudiant = e.id
      WHERE fc.id_matiere = ? AND fc.id_annee = ?
      ORDER BY e.nom, e.post_nom
    `;
    
    return this.query(sql, [matiereId, anneeId]);
  }

  /**
   * Crée ou met à jour une fiche de cotation
   * @param {number} etudiantId - ID de l'étudiant
   * @param {number} matiereId - ID de la matière
   * @param {number} anneeId - ID de l'année académique
   * @param {Object} cotationData - Données de cotation
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async setFicheCotation(etudiantId, matiereId, anneeId, cotationData) {
    // Vérifier si l'étudiant existe
    const etudiantExists = await this.getEtudiantById(etudiantId);
    if (!etudiantExists.success) {
      return etudiantExists;
    }
    
    // Vérifier si la matière existe
    const matiereResult = await this.query('SELECT * FROM matiere WHERE id = ?', [matiereId]);
    if (matiereResult.success && (Array.isArray(matiereResult.data) && matiereResult.data.length === 0)) {
      return this.errorResponse('Matière non trouvée', 404);
    }
    
    // Vérifier si l'année existe
    const anneeResult = await this.query('SELECT * FROM annee WHERE id = ?', [anneeId]);
    if (anneeResult.success && (Array.isArray(anneeResult.data) && anneeResult.data.length === 0)) {
      return this.errorResponse('Année académique non trouvée', 404);
    }
    
    // Valider les notes
    const tp = cotationData.tp !== undefined ? parseFloat(cotationData.tp) : 0;
    const td = cotationData.td !== undefined ? parseFloat(cotationData.td) : 0;
    const examen = cotationData.examen !== undefined ? parseFloat(cotationData.examen) : 0;
    const rattrapage = cotationData.rattrapage !== undefined ? parseFloat(cotationData.rattrapage) : null;
    
    // Valider que les notes sont dans la plage valide
    const notes = [tp, td, examen];
    if (rattrapage !== null) notes.push(rattrapage);
    
    for (const note of notes) {
      if (note < 0 || note > 20) {
        return this.errorResponse('Les notes doivent être comprises entre 0 et 20', 400);
      }
    }
    
    // Vérifier si une fiche de cotation existe déjà pour cet étudiant, cette matière et cette année
    const ficheExists = await this.query(
      'SELECT id FROM fiche_cotation WHERE id_etudiant = ? AND id_matiere = ? AND id_annee = ?',
      [etudiantId, matiereId, anneeId]
    );
    
    if (ficheExists.success && Array.isArray(ficheExists.data) && ficheExists.data.length > 0) {
      // Mettre à jour la fiche existante
      const ficheId = ficheExists.data[0].id;
      
      return this.query(
        'UPDATE fiche_cotation SET tp = ?, td = ?, examen = ?, rattrapage = ? WHERE id = ?',
        [tp, td, examen, rattrapage, ficheId]
      );
    } else {
      // Créer une nouvelle fiche
      return this.query(
        'INSERT INTO fiche_cotation (id_etudiant, id_matiere, id_annee, tp, td, examen, rattrapage) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [etudiantId, matiereId, anneeId, tp, td, examen, rattrapage]
      );
    }
  }

  /**
   * Supprime une fiche de cotation
   * @param {number} id - ID de la fiche de cotation
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async deleteFicheCotation(id) {
    // Vérifier si la fiche existe
    const ficheResult = await this.query('SELECT * FROM fiche_cotation WHERE id = ?', [id]);
    if (ficheResult.success && (Array.isArray(ficheResult.data) && ficheResult.data.length === 0)) {
      return this.errorResponse('Fiche de cotation non trouvée', 404);
    }
    
    return this.query('DELETE FROM fiche_cotation WHERE id = ?', [id]);
  }

  /**
   * Calcule la moyenne d'un étudiant pour une année académique
   * @param {number} etudiantId - ID de l'étudiant
   * @param {number} anneeId - ID de l'année académique
   * @returns {Promise<Object>} - Résultat avec moyenne, crédits, etc.
   */
  async calculateMoyenne(etudiantId, anneeId) {
    // Vérifier si l'étudiant existe
    const etudiantExists = await this.getEtudiantById(etudiantId);
    if (!etudiantExists.success) {
      return etudiantExists;
    }
    
    // Vérifier si l'année existe
    const anneeResult = await this.query('SELECT * FROM annee WHERE id = ?', [anneeId]);
    if (anneeResult.success && (Array.isArray(anneeResult.data) && anneeResult.data.length === 0)) {
      return this.errorResponse('Année académique non trouvée', 404);
    }
    
    // Récupérer les fiches de cotation de l'étudiant pour cette année
    const ficheResult = await this.getFichesCotationByEtudiant(etudiantId, anneeId);
    if (!ficheResult.success) {
      return ficheResult;
    }
    
    const fiches = ficheResult.data;
    if (fiches.length === 0) {
      return this.errorResponse('Aucune note trouvée pour cet étudiant dans cette année académique', 404);
    }
    
    // Calculer la moyenne pondérée
    let totalPoints = 0;
    let totalCredits = 0;
    let reussites = 0;
    let echecs = 0;
    
    for (const fiche of fiches) {
      const credit = fiche.matiere_credit || 1;
      let note = fiche.tp + fiche.td + fiche.examen;
      
      // Si l'étudiant a une note de rattrapage et qu'elle est meilleure, on la prend
      if (fiche.rattrapage !== null && fiche.rattrapage > note) {
        note = fiche.rattrapage;
      }
      
      totalPoints += note * credit;
      totalCredits += credit;
      
      if (note >= 10) {
        reussites++;
      } else {
        echecs++;
      }
    }
    
    const moyenne = totalCredits > 0 ? totalPoints / totalCredits : 0;
    
    return this.successResponse({
      etudiantId,
      anneeId,
      annee_academique: `${anneeResult.data[0].debut}-${anneeResult.data[0].fin}`,
      nombre_matieres: fiches.length,
      credits_total: totalCredits,
      moyenne: parseFloat(moyenne.toFixed(2)),
      reussites,
      echecs,
      pourcentage_reussite: parseFloat((reussites * 100 / fiches.length).toFixed(2))
    });
  }

  /**
   * ------------ MÉTHODES POUR LA GESTION DU PARCOURS ACADÉMIQUE ------------
   */
  
  /**
   * Récupère le parcours académique d'un étudiant
   * @param {number} etudiantId - ID de l'étudiant
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getParcoursByEtudiant(etudiantId) {
    // Vérifier si l'étudiant existe
    const etudiantExists = await this.getEtudiantById(etudiantId);
    if (!etudiantExists.success) {
      return etudiantExists;
    }
    
    // Récupérer d'abord les informations administratives
    const adminResult = await this.getAdministratifEtudiant(etudiantId);
    if (!adminResult.success) {
      return adminResult;
    }
    
    const adminId = adminResult.data[0].id;
    
    const sql = `
      SELECT pe.*,
             a.debut as annee_debut,
             a.fin as annee_fin,
             p.orientation as promotion_orientation,
             s.designation as section_designation,
             n.intitule as niveau_intitule
      FROM promotion_etudiant pe
      JOIN annee a ON pe.id_annee_acad = a.id
      JOIN promotion p ON pe.id_promotion = p.id
      JOIN section s ON p.id_section = s.id
      JOIN niveau n ON p.id_niveau = n.id
      WHERE pe.id_adminEtudiant = ?
      ORDER BY a.debut DESC
    `;
    
    return this.query(sql, [adminId]);
  }

  /**
   * Ajoute un parcours académique pour un étudiant
   * @param {number} etudiantId - ID de l'étudiant
   * @param {number} promotionId - ID de la promotion
   * @param {number} anneeId - ID de l'année académique
   * @param {string} dateInscription - Date d'inscription (YYYY-MM-DD)
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async ajouterParcours(etudiantId, promotionId, anneeId, dateInscription = null) {
    // Vérifier si l'étudiant existe
    const etudiantExists = await this.getEtudiantById(etudiantId);
    if (!etudiantExists.success) {
      return etudiantExists;
    }
    
    // Vérifier si l'étudiant a des informations administratives
    const adminResult = await this.getAdministratifEtudiant(etudiantId);
    if (!adminResult.success) {
      return this.errorResponse(
        'L\'étudiant doit avoir des informations administratives avant d\'ajouter un parcours',
        400
      );
    }
    
    const adminId = adminResult.data[0].id;
    
    // Vérifier si la promotion existe
    const promotionResult = await this.query('SELECT * FROM promotion WHERE id = ?', [promotionId]);
    if (promotionResult.success && (Array.isArray(promotionResult.data) && promotionResult.data.length === 0)) {
      return this.errorResponse('Promotion non trouvée', 404);
    }
    
    // Vérifier si l'année académique existe
    const anneeResult = await this.query('SELECT * FROM annee WHERE id = ?', [anneeId]);
    if (anneeResult.success && (Array.isArray(anneeResult.data) && anneeResult.data.length === 0)) {
      return this.errorResponse('Année académique non trouvée', 404);
    }
    
    // Vérifier si l'étudiant est déjà inscrit dans cette promotion pour cette année
    const parcoursExists = await this.query(
      'SELECT id FROM promotion_etudiant WHERE id_adminEtudiant = ? AND id_promotion = ? AND id_annee_acad = ?',
      [adminId, promotionId, anneeId]
    );
    
    if (parcoursExists.success && Array.isArray(parcoursExists.data) && parcoursExists.data.length > 0) {
      return this.errorResponse('L\'étudiant est déjà inscrit dans cette promotion pour cette année académique', 409);
    }
    
    // Définir la date d'inscription si elle n'est pas fournie
    if (!dateInscription) {
      dateInscription = new Date().toISOString().slice(0, 10);
    }
    
    return this.query(
      'INSERT INTO promotion_etudiant (id_adminEtudiant, date_inscription, id_annee_acad, id_promotion) VALUES (?, ?, ?, ?)',
      [adminId, dateInscription, anneeId, promotionId]
    );
  }

  /**
   * Supprime un parcours académique
   * @param {number} parcoursId - ID du parcours
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async supprimerParcours(parcoursId) {
    // Vérifier si le parcours existe
    const parcoursResult = await this.query('SELECT * FROM promotion_etudiant WHERE id = ?', [parcoursId]);
    if (parcoursResult.success && (Array.isArray(parcoursResult.data) && parcoursResult.data.length === 0)) {
      return this.errorResponse('Parcours académique non trouvé', 404);
    }
    
    // Vérifier si le parcours a des fiches de cotation associées
    const parcoursData = parcoursResult.data[0];
    const adminResult = await this.query('SELECT id_etudiant FROM administratif_etudiant WHERE id = ?', [parcoursData.id_adminEtudiant]);
    
    if (adminResult.success && Array.isArray(adminResult.data) && adminResult.data.length > 0) {
      const etudiantId = adminResult.data[0].id_etudiant;
      
      // Vérifier si l'étudiant a des notes pour cette année académique
      const notesResult = await this.query(
        'SELECT id FROM fiche_cotation WHERE id_etudiant = ? AND id_annee = ? LIMIT 1',
        [etudiantId, parcoursData.id_annee_acad]
      );
      
      if (notesResult.success && Array.isArray(notesResult.data) && notesResult.data.length > 0) {
        return this.errorResponse(
          'Impossible de supprimer ce parcours car l\'étudiant a des notes associées à cette année académique',
          400
        );
      }
    }
    
    return this.query('DELETE FROM promotion_etudiant WHERE id = ?', [parcoursId]);
  }

  /**
   * ------------ MÉTHODES POUR LA GESTION DES ANNÉES ACADÉMIQUES ------------
   */
  
  /**
   * Récupère toutes les années académiques
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getAllAnnees() {
    return this.query('SELECT * FROM annee ORDER BY debut DESC');
  }

  /**
   * Recupérer la dernière année académique
   */

  async getLastAnnee() {
    const result = await this.query('SELECT * FROM annee ORDER BY debut DESC LIMIT 1');
    
    if (result.success && (Array.isArray(result.data) && result.data.length === 0)) {
      return this.errorResponse('Aucune année académique trouvée', 404);
    }
    
    return result;
  }

  /**
   * Récupère une année académique par son ID
   * @param {number} id - ID de l'année académique
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getAnneeById(id) {
    const result = await this.query('SELECT * FROM annee WHERE id = ?', [id]);
    
    if (result.success && (Array.isArray(result.data) && result.data.length === 0)) {
      return this.errorResponse('Année académique non trouvée', 404);
    }
    
    return result;
  }

  /**
   * Crée une nouvelle année académique
   * @param {number} debut - Année de début
   * @param {number} fin - Année de fin
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async createAnnee(debut, fin) {
    // Valider les années
    if (!debut || !fin || isNaN(debut) || isNaN(fin)) {
      return this.errorResponse('Les années de début et de fin doivent être des nombres valides', 400);
    }
    
    if (fin <= debut) {
      return this.errorResponse('L\'année de fin doit être supérieure à l\'année de début', 400);
    }
    
    // Vérifier si cette année académique existe déjà
    const anneeExists = await this.query(
      'SELECT id FROM annee WHERE debut = ? AND fin = ?',
      [debut, fin]
    );
    
    if (anneeExists.success && Array.isArray(anneeExists.data) && anneeExists.data.length > 0) {
      return this.errorResponse('Cette année académique existe déjà', 409);
    }
    
    return this.query('INSERT INTO annee (debut, fin) VALUES (?, ?)', [debut, fin]);
  }

  /**
   * Met à jour une année académique
   * @param {number} id - ID de l'année académique
   * @param {number} debut - Année de début
   * @param {number} fin - Année de fin
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async updateAnnee(id, debut, fin) {
    // Vérifier si l'année existe
    const anneeExists = await this.getAnneeById(id);
    if (!anneeExists.success) {
      return anneeExists;
    }
    
    // Valider les années
    if (!debut || !fin || isNaN(debut) || isNaN(fin)) {
      return this.errorResponse('Les années de début et de fin doivent être des nombres valides', 400);
    }
    
    if (fin <= debut) {
      return this.errorResponse('L\'année de fin doit être supérieure à l\'année de début', 400);
    }
    
    // Vérifier si une autre année académique avec ces valeurs existe déjà
    const duplicateCheck = await this.query(
      'SELECT id FROM annee WHERE debut = ? AND fin = ? AND id != ?',
      [debut, fin, id]
    );
    
    if (duplicateCheck.success && Array.isArray(duplicateCheck.data) && duplicateCheck.data.length > 0) {
      return this.errorResponse('Une autre année académique avec ces valeurs existe déjà', 409);
    }
    
    return this.query(
      'UPDATE annee SET debut = ?, fin = ? WHERE id = ?',
      [debut, fin, id]
    );
  }

  /**
   * Supprime une année académique
   * @param {number} id - ID de l'année académique
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async deleteAnnee(id) {
    // Vérifier si l'année existe
    const anneeExists = await this.getAnneeById(id);
    if (!anneeExists.success) {
      return anneeExists;
    }
    
    // Vérifier les dépendances
    const tables = [
      { name: 'promotion_etudiant', field: 'id_annee_acad' },
      { name: 'fiche_cotation', field: 'id_annee' }
    ];
    
    for (const table of tables) {
      const checkResult = await this.query(
        `SELECT id FROM ${table.name} WHERE ${table.field} = ? LIMIT 1`,
        [id]
      );
      
      if (checkResult.success && Array.isArray(checkResult.data) && checkResult.data.length > 0) {
        return this.errorResponse(
          `Impossible de supprimer cette année académique car elle est référencée dans la table ${table.name}`,
          400
        );
      }
    }
    
    return this.query('DELETE FROM annee WHERE id = ?', [id]);
  }

  /**
   * ------------ MÉTHODES UTILITAIRES ------------
   */
  
  /**
   * Récupère un étudiant avec toutes ses informations
   * @param {number} id - ID de l'étudiant
   * @returns {Promise<Object>} - Détails complets de l'étudiant
   */
  async getEtudiantComplet(id) {
    // Récupérer les informations de base de l'étudiant
    const etudiantResult = await this.getEtudiantById(id);
    if (!etudiantResult.success) {
      return etudiantResult;
    }
    
    const etudiant = etudiantResult.data[0];
    const etudiantComplet = { ...etudiant };
    
    // Récupérer les informations administratives
    const adminResult = await this.getAdministratifEtudiant(id).catch(() => null);
    if (adminResult && adminResult.success) {
      etudiantComplet.administratif = adminResult.data[0];
    }
    
    // Récupérer l'origine (si implémenté)
    try {
      const origineModel = require('./OrigineModel');
      const origineResult = await origineModel.getFormattedOrigineEtudiant(id).catch(() => null);
      if (origineResult) {
        etudiantComplet.origine = origineResult;
      }
    } catch (error) {
      console.log('Module OrigineModel non disponible pour récupérer l\'origine de l\'étudiant');
    }
    
    // Récupérer le parcours académique
    const parcoursResult = await this.getParcoursByEtudiant(id).catch(() => ({ success: false }));
    if (parcoursResult && parcoursResult.success) {
      etudiantComplet.parcours_academique = parcoursResult.data;
    } else {
      etudiantComplet.parcours_academique = [];
    }
    
    // Récupérer les dernières commandes d'enrollement
    const commandesResult = await this.getCommandesEnrollementByEtudiant(id).catch(() => ({ success: false }));
    if (commandesResult && commandesResult.success) {
      etudiantComplet.commandes = commandesResult.data;
    } else {
      etudiantComplet.commandes = [];
    }
    
    return this.successResponse(etudiantComplet);
  }

  /**
   * Récupère les statistiques des étudiants
   * @returns {Promise<Object>} - Statistiques des étudiants
   */
  async getStatistiques() {
    const stats = {};
    
    // Nombre total d'étudiants
    const totalResult = await this.query('SELECT COUNT(*) as total FROM etudiant');
    stats.total = totalResult.success ? totalResult.data[0].total : 0;
    
    // Répartition par sexe
    const sexeResult = await this.query('SELECT sexe, COUNT(*) as nombre FROM etudiant GROUP BY sexe');
    stats.par_sexe = {};
    if (sexeResult.success) {
      sexeResult.data.forEach(row => {
        stats.par_sexe[row.sexe || 'Non spécifié'] = row.nombre;
      });
    }
    
    // Répartition par année d'inscription
    const parcoursResult = await this.query(`
      SELECT a.debut, a.fin, COUNT(DISTINCT pe.id_adminEtudiant) as nombre, a.id as annee_id
      FROM promotion_etudiant pe
      JOIN annee a ON pe.id_annee_acad = a.id
      GROUP BY a.id
      ORDER BY a.debut DESC
    `);
    
    stats.par_annee = {};
    if (parcoursResult.success) {
      parcoursResult.data.forEach(row => {
        stats.par_annee[`${row.debut}-${row.fin}`] = {
          total: row.nombre,
          id: row.annee_id
        };
      });
    }
    
    return this.successResponse(stats);
  }

  /**
   * Recherche avancée d'étudiants avec filtres multiples
   * @param {Object} filtres - Critères de recherche
   * @param {Object} options - Options de pagination et de tri
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async rechercheAvancee(filtres = {}, options = {}) {
    const { limit = null, offset = 0, sortBy = 'e.nom', sortDir = 'ASC' } = options;
    
    let sql = `
      SELECT e.*
      FROM etudiant e
      LEFT JOIN administratif_etudiant ae ON e.id = ae.id_etudiant
      LEFT JOIN promotion_etudiant pe ON ae.id = pe.id_adminEtudiant
      LEFT JOIN annee a ON pe.id_annee_acad = a.id
      LEFT JOIN promotion p ON pe.id_promotion = p.id
      LEFT JOIN section s ON p.id_section = s.id
      LEFT JOIN niveau n ON p.id_niveau = n.id
      WHERE 1=1
    `;
    
    const params = [];
    
    // Filtres sur les données de l'étudiant
    if (filtres.nom) {
      sql += ' AND e.nom LIKE ?';
      params.push(`%${filtres.nom}%`);
    }
    
    if (filtres.post_nom) {
      sql += ' AND e.post_nom LIKE ?';
      params.push(`%${filtres.post_nom}%`);
    }
    
    if (filtres.prenom) {
      sql += ' AND e.prenom LIKE ?';
      params.push(`%${filtres.prenom}%`);
    }
    
    if (filtres.matricule) {
      sql += ' AND e.matricule LIKE ?';
      params.push(`%${filtres.matricule}%`);
    }
    
    if (filtres.sexe) {
      sql += ' AND e.sexe = ?';
      params.push(filtres.sexe);
    }
    
    // Filtres sur les données administratives
    if (filtres.section) {
      sql += ' AND ae.section LIKE ?';
      params.push(`%${filtres.section}%`);
    }
    
    if (filtres.option) {
      sql += ' AND ae.option LIKE ?';
      params.push(`%${filtres.option}%`);
    }
    
    if (filtres.pourcentage_exetat_min) {
      sql += ' AND ae.pourcentage_exetat >= ?';
      params.push(filtres.pourcentage_exetat_min);
    }
    
    if (filtres.pourcentage_exetat_max) {
      sql += ' AND ae.pourcentage_exetat <= ?';
      params.push(filtres.pourcentage_exetat_max);
    }
    
    // Filtres sur le parcours académique
    if (filtres.promotion_id) {
      sql += ' AND p.id = ?';
      params.push(filtres.promotion_id);
    }
    
    if (filtres.annee_id) {
      sql += ' AND a.id = ?';
      params.push(filtres.annee_id);
    }
    
    if (filtres.niveau_id) {
      sql += ' AND n.id = ?';
      params.push(filtres.niveau_id);
    }
    
    sql += ' GROUP BY e.id';
    sql += ` ORDER BY ${sortBy} ${sortDir}`;
    
    if (limit !== null) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(parseInt(limit, 10), parseInt(offset, 10));
    }
    
    return this.query(sql, params);
  }
}

module.exports = EtudiantModel;