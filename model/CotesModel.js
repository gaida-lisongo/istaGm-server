const EtudiantModel = require('./EtudiantModel');
/**
 * Modèle pour la gestion des cotes et jurys
 * 
 * Tables associées:
 * - jury(id, id_section, designation, code, id_president, id_secretaire, autorisation, id_membre)
 * - niveau_jury(id, id_niveau, id_jury, id_annee)
 * - insertion(id, id_fiche_cotation, id_agent, cote, last_val, description, date_insert)
 * - fiche_cotation(id, id_etudiant, id_matiere, id_annee, tp, td, examen, rattrapage)
 */
class CotesModel extends EtudiantModel {
  /**
   * ------------ MÉTHODES POUR LA GESTION DES JURYS ------------
   */
  
  /**
   * Récupère tous les jurys
   * @param {Object} options - Options de pagination et de tri
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getAllJurys(options = {}) {
    const { limit = null, offset = 0, sortBy = 'j.designation', sortDir = 'ASC' } = options;
    
    let sql = `
      SELECT j.*,
             s.designation as section_designation,
             p.nom as president_nom, p.post_nom as president_post_nom, p.prenom as president_prenom,
             sec.nom as secretaire_nom, sec.post_nom as secretaire_post_nom, sec.prenom as secretaire_prenom,
             m.nom as membre_nom, m.post_nom as membre_post_nom, m.prenom as membre_prenom
      FROM jury j
      JOIN section s ON j.id_section = s.id
      LEFT JOIN agent p ON j.id_president = p.id
      LEFT JOIN agent sec ON j.id_secretaire = sec.id
      LEFT JOIN agent m ON j.id_membre = m.id
      ORDER BY ${sortBy} ${sortDir}
    `;
    
    const params = [];
    
    if (limit !== null) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(parseInt(limit, 10), parseInt(offset, 10));
    }
    
    return this.query(sql, params);
  }

  /**
   * Récupère un jury par son ID
   * @param {number} id - ID du jury
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getJuryById(id) {
    const sql = `
      SELECT j.*,
             s.designation as section_designation,
             p.nom as president_nom, p.post_nom as president_post_nom, p.prenom as president_prenom,
             sec.nom as secretaire_nom, sec.post_nom as secretaire_post_nom, sec.prenom as secretaire_prenom,
             m.nom as membre_nom, m.post_nom as membre_post_nom, m.prenom as membre_prenom
      FROM jury j
      JOIN section s ON j.id_section = s.id
      LEFT JOIN agent p ON j.id_president = p.id
      LEFT JOIN agent sec ON j.id_secretaire = sec.id
      LEFT JOIN agent m ON j.id_membre = m.id
      WHERE j.id = ?
    `;
    
    const result = await this.query(sql, [id]);
    
    if (result.success && (Array.isArray(result.data) && result.data.length === 0)) {
      return this.errorResponse('Jury not found', 404);
    }
    
    return result;
  }

  /**
   * Récupère un jury par son code
   * @param {string} code - Code du jury
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getJuryByCode(code) {
    const sql = `
      SELECT j.*,
             s.designation as section_designation,
             p.nom as president_nom, p.post_nom as president_post_nom, p.prenom as president_prenom,
             sec.nom as secretaire_nom, sec.post_nom as secretaire_post_nom, sec.prenom as secretaire_prenom,
             m.nom as membre_nom, m.post_nom as membre_post_nom, m.prenom as membre_prenom
      FROM jury j
      JOIN section s ON j.id_section = s.id
      LEFT JOIN agent p ON j.id_president = p.id
      LEFT JOIN agent sec ON j.id_secretaire = sec.id
      LEFT JOIN agent m ON j.id_membre = m.id
      WHERE j.code = ?
    `;
    
    const result = await this.query(sql, [code]);
    
    if (result.success && (Array.isArray(result.data) && result.data.length === 0)) {
      return this.errorResponse('Jury not found', 404);
    }
    
    return result;
  }

  /**
   * Récupère les jurys par section
   * @param {number} sectionId - ID de la section
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getJurysBySection(sectionId) {
    const sql = `
      SELECT j.*,
             s.designation as section_designation,
             p.nom as president_nom, p.post_nom as president_post_nom, p.prenom as president_prenom,
             sec.nom as secretaire_nom, sec.post_nom as secretaire_post_nom, sec.prenom as secretaire_prenom,
             m.nom as membre_nom, m.post_nom as membre_post_nom, m.prenom as membre_prenom
      FROM jury j
      JOIN section s ON j.id_section = s.id
      LEFT JOIN agent p ON j.id_president = p.id
      LEFT JOIN agent sec ON j.id_secretaire = sec.id
      LEFT JOIN agent m ON j.id_membre = m.id
      WHERE j.id_section = ?
      ORDER BY j.designation
    `;
    
    return this.query(sql, [sectionId]);
  }

  /**
   * Crée un nouveau jury
   * @param {Object} juryData - Données du jury
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async createJury(juryData) {
    // Vérifier les champs obligatoires
    if (!juryData.id_section) {
      return this.errorResponse('Section ID is required', 400);
    }
    
    if (!juryData.designation || juryData.designation.trim() === '') {
      return this.errorResponse('Designation is required', 400);
    }
    
    // Vérifier si la section existe
    const sectionResult = await this.query('SELECT id FROM section WHERE id = ?', [juryData.id_section]);
    if (sectionResult.success && (Array.isArray(sectionResult.data) && sectionResult.data.length === 0)) {
      return this.errorResponse('Section not found', 404);
    }
    
    // Vérifier si un jury avec ce code existe déjà
    if (juryData.code) {
      const codeExists = await this.query('SELECT id FROM jury WHERE code = ?', [juryData.code]);
      if (codeExists.success && Array.isArray(codeExists.data) && codeExists.data.length > 0) {
        return this.errorResponse('A jury with this code already exists', 409);
      }
    } else {
      // Générer un code pour le jury
      juryData.code = await this.generateJuryCode(juryData.id_section);
    }
    
    // Vérifier si un jury avec cette désignation existe déjà pour cette section
    const designationExists = await this.query(
      'SELECT id FROM jury WHERE designation = ? AND id_section = ?',
      [juryData.designation, juryData.id_section]
    );
    
    if (designationExists.success && Array.isArray(designationExists.data) && designationExists.data.length > 0) {
      return this.errorResponse('A jury with this designation already exists for this section', 409);
    }
    
    // Vérifier si les membres du jury existent (président, secrétaire, membre)
    for (const role of ['id_president', 'id_secretaire', 'id_membre']) {
      if (juryData[role]) {
        const agentExists = await this.query('SELECT id FROM agent WHERE id = ?', [juryData[role]]);
        if (agentExists.success && (Array.isArray(agentExists.data) && agentExists.data.length === 0)) {
          return this.errorResponse(`Agent for ${role.replace('id_', '')} not found`, 404);
        }
      }
    }
    
    // Préparer les champs et valeurs pour l'insertion
    const fields = Object.keys(juryData);
    const values = fields.map(field => juryData[field]);
    const placeholders = fields.map(() => '?').join(', ');
    
    return this.query(
      `INSERT INTO jury (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    );
  }

  /**
   * Met à jour un jury existant
   * @param {number} id - ID du jury
   * @param {Object} juryData - Données à mettre à jour
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async updateJury(id, juryData) {
    // Vérifier si le jury existe
    const juryExists = await this.getJuryById(id);
    if (!juryExists.success) {
      return juryExists;
    }
    
    // Vérifier si les données sont fournies
    if (!juryData || Object.keys(juryData).length === 0) {
      return this.errorResponse('No data provided for update', 400);
    }
    
    // Vérifier si la section existe (si elle est modifiée)
    if (juryData.id_section) {
      const sectionExists = await this.query('SELECT id FROM section WHERE id = ?', [juryData.id_section]);
      if (sectionExists.success && (Array.isArray(sectionExists.data) && sectionExists.data.length === 0)) {
        return this.errorResponse('Section not found', 404);
      }
    }
    
    // Vérifier si un jury avec ce code existe déjà (si le code est modifié)
    if (juryData.code) {
      const codeExists = await this.query(
        'SELECT id FROM jury WHERE code = ? AND id != ?',
        [juryData.code, id]
      );
      
      if (codeExists.success && Array.isArray(codeExists.data) && codeExists.data.length > 0) {
        return this.errorResponse('A jury with this code already exists', 409);
      }
    }
    
    // Vérifier si un jury avec cette désignation existe déjà pour cette section (si la désignation ou la section sont modifiées)
    if (juryData.designation || juryData.id_section) {
      const designation = juryData.designation || juryExists.data[0].designation;
      const sectionId = juryData.id_section || juryExists.data[0].id_section;
      
      const designationExists = await this.query(
        'SELECT id FROM jury WHERE designation = ? AND id_section = ? AND id != ?',
        [designation, sectionId, id]
      );
      
      if (designationExists.success && Array.isArray(designationExists.data) && designationExists.data.length > 0) {
        return this.errorResponse('A jury with this designation already exists for this section', 409);
      }
    }
    
    // Vérifier si les membres du jury existent (président, secrétaire, membre) s'ils sont modifiés
    for (const role of ['id_president', 'id_secretaire', 'id_membre']) {
      if (juryData[role]) {
        const agentExists = await this.query('SELECT id FROM agent WHERE id = ?', [juryData[role]]);
        if (agentExists.success && (Array.isArray(agentExists.data) && agentExists.data.length === 0)) {
          return this.errorResponse(`Agent for ${role.replace('id_', '')} not found`, 404);
        }
      }
    }
    
    // Construire la requête SQL dynamiquement
    const fields = Object.keys(juryData);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => juryData[field]);
    values.push(id);
    
    return this.query(`UPDATE jury SET ${setClause} WHERE id = ?`, values);
  }

  /**
   * Supprime un jury
   * @param {number} id - ID du jury
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async deleteJury(id) {
    // Vérifier si le jury existe
    const juryExists = await this.getJuryById(id);
    if (!juryExists.success) {
      return juryExists;
    }
    
    // Vérifier si le jury est associé à des niveaux
    const niveauJuryCheck = await this.query('SELECT id FROM niveau_jury WHERE id_jury = ? LIMIT 1', [id]);
    if (niveauJuryCheck.success && Array.isArray(niveauJuryCheck.data) && niveauJuryCheck.data.length > 0) {
      return this.errorResponse('Cannot delete jury that is assigned to levels', 400);
    }
    
    return this.query('DELETE FROM jury WHERE id = ?', [id]);
  }

  /**
   * Génère un code unique pour un nouveau jury
   * @param {number} sectionId - ID de la section
   * @returns {Promise<string>} - Code unique
   */
  async generateJuryCode(sectionId) {
    // Récupérer le code de la section
    const sectionResult = await this.query('SELECT designation FROM section WHERE id = ?', [sectionId]);
    let sectionPrefix = 'JURY';
    
    if (sectionResult.success && Array.isArray(sectionResult.data) && sectionResult.data.length > 0) {
      // Prendre les initiales de la désignation de la section
      const designation = sectionResult.data[0].designation;
      sectionPrefix = designation.split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase();
    }
    
    // Récupérer le dernier jury de cette section pour construire le code suivant
    const lastJuryResult = await this.query(
      "SELECT code FROM jury WHERE id_section = ? ORDER BY id DESC LIMIT 1",
      [sectionId]
    );
    
    let number = 1;
    
    if (lastJuryResult.success && Array.isArray(lastJuryResult.data) && lastJuryResult.data.length > 0) {
      const lastCode = lastJuryResult.data[0].code;
      const match = lastCode.match(/\d+$/);
      if (match) {
        number = parseInt(match[0], 10) + 1;
      }
    }
    
    return `${sectionPrefix}-${number.toString().padStart(3, '0')}`;
  }

  /**
   * ------------ MÉTHODES POUR LA GESTION DES NIVEAU-JURY ------------
   */
  
  /**
   * Récupère toutes les associations niveau-jury
   * @param {Object} options - Options de pagination et de tri
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getAllNiveauJury(options = {}) {
    const { limit = null, offset = 0, sortBy = 'nj.id', sortDir = 'ASC' } = options;
    
    let sql = `
      SELECT nj.*,
             n.intitule as niveau_intitule,
             j.designation as jury_designation,
             j.code as jury_code,
             s.designation as section_designation,
             a.debut as annee_debut,
             a.fin as annee_fin
      FROM niveau_jury nj
      JOIN niveau n ON nj.id_niveau = n.id
      JOIN jury j ON nj.id_jury = j.id
      JOIN section s ON j.id_section = s.id
      JOIN annee a ON nj.id_annee = a.id
      ORDER BY ${sortBy} ${sortDir}
    `;
    
    const params = [];
    
    if (limit !== null) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(parseInt(limit, 10), parseInt(offset, 10));
    }
    
    return this.query(sql, params);
  }

  /**
   * Récupère une association niveau-jury par son ID
   * @param {number} id - ID de l'association niveau-jury
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getNiveauJuryById(id) {
    const sql = `
      SELECT nj.*,
             n.intitule as niveau_intitule,
             j.designation as jury_designation,
             j.code as jury_code,
             s.designation as section_designation,
             a.debut as annee_debut,
             a.fin as annee_fin
      FROM niveau_jury nj
      JOIN niveau n ON nj.id_niveau = n.id
      JOIN jury j ON nj.id_jury = j.id
      JOIN section s ON j.id_section = s.id
      JOIN annee a ON nj.id_annee = a.id
      WHERE nj.id = ?
    `;
    
    const result = await this.query(sql, [id]);
    
    if (result.success && (Array.isArray(result.data) && result.data.length === 0)) {
      return this.errorResponse('Niveau-jury association not found', 404);
    }
    
    return result;
  }

  /**
   * Récupère les niveaux associés à un jury pour une année académique
   * @param {number} juryId - ID du jury
   * @param {number} anneeId - ID de l'année académique (optionnel)
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getNiveauxByJury(juryId, anneeId = null) {
    let sql = `
      SELECT nj.*,
             n.intitule as niveau_intitule,
             n.systeme as niveau_systeme,
             a.debut as annee_debut,
             a.fin as annee_fin
      FROM niveau_jury nj
      JOIN niveau n ON nj.id_niveau = n.id
      JOIN annee a ON nj.id_annee = a.id
      WHERE nj.id_jury = ?
    `;
    
    const params = [juryId];
    
    if (anneeId) {
      sql += ' AND nj.id_annee = ?';
      params.push(anneeId);
    }
    
    sql += ' ORDER BY a.debut DESC, n.intitule';
    
    return this.query(sql, params);
  }

  /**
   * Récupère les jurys associés à un niveau pour une année académique
   * @param {number} niveauId - ID du niveau
   * @param {number} anneeId - ID de l'année académique (optionnel)
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getJurysByNiveau(niveauId, anneeId = null) {
    let sql = `
      SELECT nj.*,
             j.designation as jury_designation,
             j.code as jury_code,
             s.designation as section_designation,
             a.debut as annee_debut,
             a.fin as annee_fin
      FROM niveau_jury nj
      JOIN jury j ON nj.id_jury = j.id
      JOIN section s ON j.id_section = s.id
      JOIN annee a ON nj.id_annee = a.id
      WHERE nj.id_niveau = ?
    `;
    
    const params = [niveauId];
    
    if (anneeId) {
      sql += ' AND nj.id_annee = ?';
      params.push(anneeId);
    }
    
    sql += ' ORDER BY a.debut DESC, j.designation';
    
    return this.query(sql, params);
  }

  /**
   * Associe un jury à un niveau pour une année académique
   * @param {number} niveauId - ID du niveau
   * @param {number} juryId - ID du jury
   * @param {number} anneeId - ID de l'année académique
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async assignJuryToNiveau(niveauId, juryId, anneeId) {
    // Vérifier si le niveau existe
    const niveauResult = await this.query('SELECT id FROM niveau WHERE id = ?', [niveauId]);
    if (niveauResult.success && (Array.isArray(niveauResult.data) && niveauResult.data.length === 0)) {
      return this.errorResponse('Niveau not found', 404);
    }
    
    // Vérifier si le jury existe
    const juryResult = await this.getJuryById(juryId);
    if (!juryResult.success) {
      return juryResult;
    }
    
    // Vérifier si l'année académique existe
    const anneeResult = await this.query('SELECT id FROM annee WHERE id = ?', [anneeId]);
    if (anneeResult.success && (Array.isArray(anneeResult.data) && anneeResult.data.length === 0)) {
      return this.errorResponse('Année académique not found', 404);
    }
    
    // Vérifier si cette association existe déjà
    const existingResult = await this.query(
      'SELECT id FROM niveau_jury WHERE id_niveau = ? AND id_jury = ? AND id_annee = ?',
      [niveauId, juryId, anneeId]
    );
    
    if (existingResult.success && Array.isArray(existingResult.data) && existingResult.data.length > 0) {
      return this.errorResponse('This jury is already assigned to this level for this academic year', 409);
    }
    
    return this.query(
      'INSERT INTO niveau_jury (id_niveau, id_jury, id_annee) VALUES (?, ?, ?)',
      [niveauId, juryId, anneeId]
    );
  }

  /**
   * Supprime l'association entre un jury et un niveau
   * @param {number} niveauJuryId - ID de l'association niveau-jury
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async removeJuryFromNiveau(niveauJuryId) {
    // Vérifier si l'association existe
    const niveauJuryResult = await this.getNiveauJuryById(niveauJuryId);
    if (!niveauJuryResult.success) {
      return niveauJuryResult;
    }
    
    // Vérifier si des cotes ont été enregistrées pour ce jury et ce niveau
    const cotesResult = await this.getInsertionsByNiveauJury(niveauJuryId);
    if (cotesResult.success && Array.isArray(cotesResult.data) && cotesResult.data.length > 0) {
      return this.errorResponse('Cannot remove jury from niveau because grades have been recorded', 400);
    }
    
    return this.query('DELETE FROM niveau_jury WHERE id = ?', [niveauJuryId]);
  }

  /**
   * ------------ MÉTHODES POUR LA GESTION DES LOGS D'INSERTION DE COTES ------------
   */
  
  /**
   * Récupère tous les logs d'insertion de cotes
   * @param {Object} options - Options de pagination et de tri
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getAllInsertions(options = {}) {
    const { limit = null, offset = 0, sortBy = 'i.date_insert', sortDir = 'DESC' } = options;
    
    let sql = `
      SELECT i.*,
             fc.tp, fc.td, fc.examen, fc.rattrapage,
             a.nom as agent_nom, a.post_nom as agent_post_nom, a.prenom as agent_prenom,
             e.nom as etudiant_nom, e.post_nom as etudiant_post_nom, e.prenom as etudiant_prenom, e.matricule,
             m.designation as matiere_designation, m.code as matiere_code,
             an.debut as annee_debut, an.fin as annee_fin
      FROM insertion i
      JOIN fiche_cotation fc ON i.id_fiche_cotation = fc.id
      JOIN agent a ON i.id_agent = a.id
      JOIN etudiant e ON fc.id_etudiant = e.id
      JOIN matiere m ON fc.id_matiere = m.id
      JOIN annee an ON fc.id_annee = an.id
      ORDER BY ${sortBy} ${sortDir}
    `;
    
    const params = [];
    
    if (limit !== null) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(parseInt(limit, 10), parseInt(offset, 10));
    }
    
    return this.query(sql, params);
  }

  /**
   * Récupère un log d'insertion par Annee
   * @param {number} id - ID du log d'insertion
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getInsertionsByAnnee(id) {
    const sql = `
      SELECT i.*,
             fc.tp, fc.td, fc.examen, fc.rattrapage,
             CONCAT(a.nom, ' ', a.post_nom) as agent_nom,
             a.id as agent_id,
             CONCAT(e.nom, ' ', e.post_nom) as etudiant_nom,
             e.matricule,
             e.id as etudiant_id,
             m.designation as matiere_designation, m.code as matiere_code,
             CONCAT(an.debut, ' - ', an.fin) as annee_acad,
             an.id as annee_id
      FROM insertion i
      JOIN fiche_cotation fc ON i.id_fiche_cotation = fc.id
      JOIN agent a ON i.id_agent = a.id
      JOIN etudiant e ON fc.id_etudiant = e.id
      JOIN matiere m ON fc.id_matiere = m.id
      JOIN annee an ON fc.id_annee = an.id
      WHERE an.id = ?
    `;
    
    const result = await this.query(sql, [id]);
    
    if (result.success && (Array.isArray(result.data) && result.data.length === 0)) {
      return this.errorResponse('Insertion log not found', 404);
    }
    
    return result;
  }

  /**
   * Récupère un log d'insertion par son ID
   * @param {number} id - ID du log d'insertion
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getInsertionById(id) {
    const sql = `
      SELECT i.*,
             fc.tp, fc.td, fc.examen, fc.rattrapage,
             a.nom as agent_nom, a.post_nom as agent_post_nom, a.prenom as agent_prenom,
             e.nom as etudiant_nom, e.post_nom as etudiant_post_nom, e.prenom as etudiant_prenom, e.matricule,
             m.designation as matiere_designation, m.code as matiere_code,
             an.debut as annee_debut, an.fin as annee_fin
      FROM insertion i
      JOIN fiche_cotation fc ON i.id_fiche_cotation = fc.id
      JOIN agent a ON i.id_agent = a.id
      JOIN etudiant e ON fc.id_etudiant = e.id
      JOIN matiere m ON fc.id_matiere = m.id
      JOIN annee an ON fc.id_annee = an.id
      WHERE i.id = ?
    `;
    
    const result = await this.query(sql, [id]);
    
    if (result.success && (Array.isArray(result.data) && result.data.length === 0)) {
      return this.errorResponse('Insertion log not found', 404);
    }
    
    return result;
  }

  /**
   * Récupère les logs d'insertion pour une fiche de cotation spécifique
   * @param {number} ficheId - ID de la fiche de cotation
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getInsertionsByFicheId(ficheId) {
    const sql = `
      SELECT i.*,
             a.nom as agent_nom, a.post_nom as agent_post_nom, a.prenom as agent_prenom
      FROM insertion i
      JOIN agent a ON i.id_agent = a.id
      WHERE i.id_fiche_cotation = ?
      ORDER BY i.date_insert DESC
    `;
    
    return this.query(sql, [ficheId]);
  }

  /**
   * Récupère les logs d'insertion effectués par un agent
   * @param {number} agentId - ID de l'agent
   * @param {Object} options - Options de pagination et de tri
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getInsertionsByAgent(agentId, options = {}) {
    const { limit = null, offset = 0 } = options;
    
    let sql = `
      SELECT i.*,
             e.nom as etudiant_nom, e.post_nom as etudiant_post_nom, e.prenom as etudiant_prenom, e.matricule,
             m.designation as matiere_designation, m.code as matiere_code,
             an.debut as annee_debut, an.fin as annee_fin
      FROM insertion i
      JOIN fiche_cotation fc ON i.id_fiche_cotation = fc.id
      JOIN etudiant e ON fc.id_etudiant = e.id
      JOIN matiere m ON fc.id_matiere = m.id
      JOIN annee an ON fc.id_annee = an.id
      WHERE i.id_agent = ?
      ORDER BY i.date_insert DESC
    `;
    
    const params = [agentId];
    
    if (limit !== null) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(parseInt(limit, 10), parseInt(offset, 10));
    }
    
    return this.query(sql, params);
  }

  /**
   * Récupère les logs d'insertion pour une association niveau-jury
   * @param {number} niveauJuryId - ID de l'association niveau-jury
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getInsertionsByNiveauJury(niveauJuryId) {
    // D'abord récupérer les informations du niveau-jury
    const niveauJuryResult = await this.getNiveauJuryById(niveauJuryId);
    if (!niveauJuryResult.success) {
      return niveauJuryResult;
    }
    
    const niveauJury = niveauJuryResult.data[0];
    
    // Récupérer les agents associés au jury
    const juryResult = await this.getJuryById(niveauJury.id_jury);
    if (!juryResult.success) {
      return juryResult;
    }
    
    const jury = juryResult.data[0];
    const agentIds = [];
    
    if (jury.id_president) agentIds.push(jury.id_president);
    if (jury.id_secretaire) agentIds.push(jury.id_secretaire);
    if (jury.id_membre) agentIds.push(jury.id_membre);
    
    if (agentIds.length === 0) {
      return this.errorResponse('No agents associated with this jury', 404);
    }
    
    // Récupérer les promotions associées à ce niveau
    const promotionsResult = await this.query(
      'SELECT id FROM promotion WHERE id_niveau = ?',
      [niveauJury.id_niveau]
    );
    
    if (promotionsResult.success && (Array.isArray(promotionsResult.data) && promotionsResult.data.length === 0)) {
      return this.errorResponse('No promotions found for this niveau', 404);
    }
    
    // Récupérer les étudiants inscrits dans ces promotions pour cette année académique
    const promotionIds = promotionsResult.data.map(p => p.id);
    const promotionPlaceholders = promotionIds.map(() => '?').join(',');
    
    const etudiantsResult = await this.query(`
      SELECT pe.id_adminEtudiant
      FROM promotion_etudiant pe
      WHERE pe.id_promotion IN (${promotionPlaceholders})
        AND pe.id_annee_acad = ?
    `, [...promotionIds, niveauJury.id_annee]);
    
    if (etudiantsResult.success && (Array.isArray(etudiantsResult.data) && etudiantsResult.data.length === 0)) {
      return this.errorResponse('No students found for these promotions in this academic year', 404);
    }
    
    // Récupérer les ID des étudiants
    const adminIds = etudiantsResult.data.map(pe => pe.id_adminEtudiant);
    const etudiantIdsResult = await this.query(`
      SELECT id_etudiant
      FROM administratif_etudiant
      WHERE id IN (${adminIds.map(() => '?').join(',')})
    `, adminIds);
    
    if (etudiantIdsResult.success && (Array.isArray(etudiantIdsResult.data) && etudiantIdsResult.data.length === 0)) {
      return this.errorResponse('No student IDs found', 404);
    }
    
    const etudiantIds = etudiantIdsResult.data.map(ae => ae.id_etudiant);
    
    // Récupérer les fiches de cotation pour ces étudiants et cette année académique
    const fichesResult = await this.query(`
      SELECT id
      FROM fiche_cotation
      WHERE id_etudiant IN (${etudiantIds.map(() => '?').join(',')})
        AND id_annee = ?
    `, [...etudiantIds, niveauJury.id_annee]);
    
    if (fichesResult.success && (Array.isArray(fichesResult.data) && fichesResult.data.length === 0)) {
      return this.errorResponse('No grade sheets found for these students in this academic year', 404);
    }
    
    const ficheIds = fichesResult.data.map(fc => fc.id);
    
    // Récupérer les logs d'insertion pour ces fiches de cotation et ces agents
    const sql = `
      SELECT i.*,
             fc.tp, fc.td, fc.examen, fc.rattrapage,
             a.nom as agent_nom, a.post_nom as agent_post_nom, a.prenom as agent_prenom,
             e.nom as etudiant_nom, e.post_nom as etudiant_post_nom, e.prenom as etudiant_prenom, e.matricule,
             m.designation as matiere_designation, m.code as matiere_code
      FROM insertion i
      JOIN fiche_cotation fc ON i.id_fiche_cotation = fc.id
      JOIN agent a ON i.id_agent = a.id
      JOIN etudiant e ON fc.id_etudiant = e.id
      JOIN matiere m ON fc.id_matiere = m.id
      WHERE i.id_fiche_cotation IN (${ficheIds.map(() => '?').join(',')})
        AND i.id_agent IN (${agentIds.map(() => '?').join(',')})
      ORDER BY i.date_insert DESC
    `;
    
    return this.query(sql, [...ficheIds, ...agentIds]);
  }

  /**
   * Enregistre un log d'insertion de cote
   * @param {number} ficheId - ID de la fiche de cotation
   * @param {number} agentId - ID de l'agent
   * @param {string} cote - Type de cote modifiée (tp, td, examen, rattrapage)
   * @param {number} lastVal - Ancienne valeur
   * @param {string} description - Description de la modification
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async logInsertion(ficheId, agentId, cote, lastVal, description = '') {
    // Vérifier si la fiche de cotation existe
    const ficheResult = await this.query('SELECT * FROM fiche_cotation WHERE id = ?', [ficheId]);
    if (ficheResult.success && (Array.isArray(ficheResult.data) && ficheResult.data.length === 0)) {
      return this.errorResponse('Fiche de cotation not found', 404);
    }
    
    // Vérifier si l'agent existe
    const agentResult = await this.query('SELECT id FROM agent WHERE id = ?', [agentId]);
    if (agentResult.success && (Array.isArray(agentResult.data) && agentResult.data.length === 0)) {
      return this.errorResponse('Agent not found', 404);
    }
    
    // Vérifier que le type de cote est valide
    const validCotes = ['tp', 'td', 'examen', 'rattrapage'];
    if (!validCotes.includes(cote)) {
      return this.errorResponse('Invalid cote type', 400);
    }
    
    // Préparer les données pour l'insertion
    const data = {
      id_fiche_cotation: ficheId,
      id_agent: agentId,
      cote,
      last_val: lastVal,
      description: description || `Modification de la cote ${cote}`,
      date_insert: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };
    
    // Insérer le log
    return this.query(
      'INSERT INTO insertion (id_fiche_cotation, id_agent, cote, last_val, description, date_insert) VALUES (?, ?, ?, ?, ?, ?)',
      [data.id_fiche_cotation, data.id_agent, data.cote, data.last_val, data.description, data.date_insert]
    );
  }

  /**
   * Modifie une fiche de cotation et enregistre le log correspondant
   * @param {number} ficheId - ID de la fiche de cotation
   * @param {number} agentId - ID de l'agent
   * @param {string} cote - Type de cote à modifier (tp, td, examen, rattrapage)
   * @param {number} nouvelleValeur - Nouvelle valeur de la cote
   * @param {string} description - Description de la modification
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async modifierCote(ficheId, agentId, cote, nouvelleValeur, description = '') {
    // Vérifier si la fiche de cotation existe
    const ficheResult = await this.query('SELECT * FROM fiche_cotation WHERE id = ?', [ficheId]);
    if (ficheResult.success && (Array.isArray(ficheResult.data) && ficheResult.data.length === 0)) {
      return this.errorResponse('Fiche de cotation not found', 404);
    }
    
    const fiche = ficheResult.data[0];
    
    // Vérifier si l'agent existe
    const agentResult = await this.query('SELECT * FROM agent WHERE id = ?', [agentId]);
    if (agentResult.success && (Array.isArray(agentResult.data) && agentResult.data.length === 0)) {
      return this.errorResponse('Agent not found', 404);
    }
    
    // Vérifier que le type de cote est valide
    const validCotes = ['tp', 'td', 'examen', 'rattrapage'];
    if (!validCotes.includes(cote)) {
      return this.errorResponse('Invalid cote type', 400);
    }
    
    // Valider la nouvelle valeur
    if (nouvelleValeur < 0 || nouvelleValeur > 20) {
      return this.errorResponse('La cote doit être comprise entre 0 et 20', 400);
    }
    
    // Vérifier que l'agent est membre d'un jury autorisé pour cette modification
    // On récupère la matière et l'année de la fiche de cotation
    const matiereId = fiche.id_matiere;
    const anneeId = fiche.id_annee;
    
    // Récupérer l'information sur la matière pour connaître son unité et sa promotion
    const matiereResult = await this.query(`
      SELECT m.*, u.id_promotion
      FROM matiere m
      JOIN unite u ON m.id_unite = u.id
      WHERE m.id = ?
    `, [matiereId]);
    
    if (matiereResult.success && (Array.isArray(matiereResult.data) && matiereResult.data.length === 0)) {
      return this.errorResponse('Matière not found', 404);
    }
    
    const matiere = matiereResult.data[0];
    const promotionId = matiere.id_promotion;
    
    // Récupérer la promotion pour connaître son niveau
    const promotionResult = await this.query('SELECT id_niveau FROM promotion WHERE id = ?', [promotionId]);
    if (promotionResult.success && (Array.isArray(promotionResult.data) && promotionResult.data.length === 0)) {
      return this.errorResponse('Promotion not found', 404);
    }
    
    const niveauId = promotionResult.data[0].id_niveau;
    
    // Vérifier si l'agent est membre d'un jury assigné à ce niveau pour cette année académique
    const juryCheck = await this.query(`
      SELECT j.id, j.autorisation
      FROM jury j
      JOIN niveau_jury nj ON j.id = nj.id_jury
      WHERE nj.id_niveau = ? AND nj.id_annee = ?
        AND (j.id_president = ? OR j.id_secretaire = ? OR j.id_membre = ?)
    `, [niveauId, anneeId, agentId, agentId, agentId]);
    
    if (juryCheck.success && (Array.isArray(juryCheck.data) && juryCheck.data.length === 0)) {
      return this.errorResponse('Agent is not authorized to modify this grade', 403);
    }
    
    // Vérifier l'autorisation du jury
    const jury = juryCheck.data[0];
    if (jury.autorisation === 'restreinte' && cote === 'rattrapage') {
      return this.errorResponse('Ce jury n\'est pas autorisé à modifier les rattrapages', 403);
    }
    
    // Récupérer l'ancienne valeur
    const ancienneValeur = fiche[cote];
    
    // Mettre à jour la fiche de cotation
    const updateResult = await this.query(
      `UPDATE fiche_cotation SET ${cote} = ? WHERE id = ?`,
      [nouvelleValeur, ficheId]
    );
    
    if (!updateResult.success) {
      return updateResult;
    }
    
    // Enregistrer le log
    const logDescription = description || `Modification de la cote ${cote} de ${ancienneValeur || 0} à ${nouvelleValeur}`;
    return this.logInsertion(ficheId, agentId, cote, ancienneValeur, logDescription);
  }

  /**
   * Vérifie si un agent est autorisé à modifier une fiche de cotation
   * @param {number} agentId - ID de l'agent
   * @param {number} ficheId - ID de la fiche de cotation
   * @returns {Promise<Object>} - Résultat avec métadonnées sur l'autorisation
   */
  async verifierAutorisation(agentId, ficheId) {
    // Vérifier si la fiche de cotation existe
    const ficheResult = await this.query('SELECT * FROM fiche_cotation WHERE id = ?', [ficheId]);
    if (ficheResult.success && (Array.isArray(ficheResult.data) && ficheResult.data.length === 0)) {
      return this.errorResponse('Fiche de cotation not found', 404);
    }
    
    const fiche = ficheResult.data[0];
    
    // Vérifier si l'agent existe
    const agentResult = await this.query('SELECT * FROM agent WHERE id = ?', [agentId]);
    if (agentResult.success && (Array.isArray(agentResult.data) && agentResult.data.length === 0)) {
      return this.errorResponse('Agent not found', 404);
    }
    
    // On récupère la matière et l'année de la fiche de cotation
    const matiereId = fiche.id_matiere;
    const anneeId = fiche.id_annee;
    
    // Récupérer l'information sur la matière pour connaître son unité et sa promotion
    const matiereResult = await this.query(`
      SELECT m.*, u.id_promotion
      FROM matiere m
      JOIN unite u ON m.id_unite = u.id
      WHERE m.id = ?
    `, [matiereId]);
    
    if (matiereResult.success && (Array.isArray(matiereResult.data) && matiereResult.data.length === 0)) {
      return this.errorResponse('Matière not found', 404);
    }
    
    const matiere = matiereResult.data[0];
    const promotionId = matiere.id_promotion;
    
    // Récupérer la promotion pour connaître son niveau
    const promotionResult = await this.query('SELECT id_niveau FROM promotion WHERE id = ?', [promotionId]);
    if (promotionResult.success && (Array.isArray(promotionResult.data) && promotionResult.data.length === 0)) {
      return this.errorResponse('Promotion not found', 404);
    }
    
    const niveauId = promotionResult.data[0].id_niveau;
    
    // Vérifier si l'agent est membre d'un jury assigné à ce niveau pour cette année académique
    const juryCheck = await this.query(`
      SELECT j.id, j.autorisation, j.designation,
             CASE
               WHEN j.id_president = ? THEN 'president'
               WHEN j.id_secretaire = ? THEN 'secretaire'
               WHEN j.id_membre = ? THEN 'membre'
               ELSE NULL
             END as role
      FROM jury j
      JOIN niveau_jury nj ON j.id = nj.id_jury
      WHERE nj.id_niveau = ? AND nj.id_annee = ?
        AND (j.id_president = ? OR j.id_secretaire = ? OR j.id_membre = ?)
    `, [agentId, agentId, agentId, niveauId, anneeId, agentId, agentId, agentId]);
    
    if (juryCheck.success && (Array.isArray(juryCheck.data) && juryCheck.data.length === 0)) {
      return this.errorResponse('Agent is not authorized to modify this grade', 403);
    }
    
    const jury = juryCheck.data[0];
    
    // Préparer les autorisations
    const autorisations = {
      tp: true,
      td: true,
      examen: true,
      rattrapage: jury.autorisation !== 'restreinte'
    };
    
    return this.successResponse({
      agent_id: agentId,
      fiche_id: ficheId,
      jury_id: jury.id,
      jury_designation: jury.designation,
      role: jury.role,
      autorisations,
      message: 'Agent is authorized to modify this grade'
    });
  }

  /**
   * ------------ MÉTHODES UTILITAIRES ------------
   */
  
  /**
   * Récupère les statistiques des modifications de cotes par agent
   * @param {number} anneeId - ID de l'année académique
   * @returns {Promise<Object>} - Statistiques des modifications
   */
  async getStatistiquesByAgent(anneeId) {
    const sql = `
      SELECT 
        a.id as agent_id,
        a.nom, a.post_nom, a.prenom,
        COUNT(i.id) as total_modifications,
        COUNT(CASE WHEN i.cote = 'tp' THEN 1 END) as tp_modifications,
        COUNT(CASE WHEN i.cote = 'td' THEN 1 END) as td_modifications,
        COUNT(CASE WHEN i.cote = 'examen' THEN 1 END) as examen_modifications,
        COUNT(CASE WHEN i.cote = 'rattrapage' THEN 1 END) as rattrapage_modifications,
        j.designation as jury_designation
      FROM insertion i
      JOIN agent a ON i.id_agent = a.id
      JOIN fiche_cotation fc ON i.id_fiche_cotation = fc.id
      LEFT JOIN jury j ON (j.id_president = a.id OR j.id_secretaire = a.id OR j.id_membre = a.id)
      WHERE fc.id_annee = ?
      GROUP BY a.id, j.id
      ORDER BY total_modifications DESC
    `;
    
    return this.query(sql, [anneeId]);
  }

  /**
   * Récupère les statistiques des modifications de cotes par jury
   * @param {number} anneeId - ID de l'année académique
   * @returns {Promise<Object>} - Statistiques des modifications
   */
  async getStatistiquesByJury(anneeId) {
    const sql = `
      SELECT 
        j.id as jury_id,
        j.designation as jury_designation,
        j.code as jury_code,
        s.designation as section_designation,
        COUNT(i.id) as total_modifications,
        COUNT(DISTINCT i.id_agent) as agents_count,
        COUNT(DISTINCT fc.id_etudiant) as etudiants_count,
        COUNT(CASE WHEN i.cote = 'tp' THEN 1 END) as tp_modifications,
        COUNT(CASE WHEN i.cote = 'td' THEN 1 END) as td_modifications,
        COUNT(CASE WHEN i.cote = 'examen' THEN 1 END) as examen_modifications,
        COUNT(CASE WHEN i.cote = 'rattrapage' THEN 1 END) as rattrapage_modifications
      FROM jury j
      JOIN section s ON j.id_section = s.id
      JOIN niveau_jury nj ON j.id = nj.id_jury
      LEFT JOIN insertion i ON (i.id_agent = j.id_president OR i.id_agent = j.id_secretaire OR i.id_agent = j.id_membre)
      LEFT JOIN fiche_cotation fc ON i.id_fiche_cotation = fc.id
      WHERE nj.id_annee = ? AND (fc.id_annee = ? OR fc.id_annee IS NULL)
      GROUP BY j.id
      ORDER BY total_modifications DESC
    `;
    
    return this.query(sql, [anneeId, anneeId]);
  }

  /**
   * Récupère les dernières modifications de cotes pour un étudiant
   * @param {number} etudiantId - ID de l'étudiant
   * @param {number} limit - Nombre de résultats à retourner
   * @returns {Promise<Object>} - Dernières modifications
   */
  async getDernieresModificationsEtudiant(etudiantId, limit = 10) {
    const sql = `
      SELECT i.*,
             m.designation as matiere_designation,
             a.nom as agent_nom, a.post_nom as agent_post_nom, a.prenom as agent_prenom,
             fc.${i.cote} as nouvelle_valeur
      FROM insertion i
      JOIN fiche_cotation fc ON i.id_fiche_cotation = fc.id
      JOIN matiere m ON fc.id_matiere = m.id
      JOIN agent a ON i.id_agent = a.id
      WHERE fc.id_etudiant = ?
      ORDER BY i.date_insert DESC
      LIMIT ?
    `;
    
    return this.query(sql, [etudiantId, limit]);
  }

  /**
   * Récupère les dernières modifications de cotes d'une matière
   * @param {number} matiereId - ID de la matière
   * @param {number} anneeId - ID de l'année académique
   * @param {number} limit - Nombre de résultats à retourner
   * @returns {Promise<Object>} - Dernières modifications
   */
  async getDernieresModificationsMatiere(matiereId, anneeId, limit = 20) {
    const sql = `
      SELECT i.*,
             e.nom as etudiant_nom, e.post_nom as etudiant_post_nom, e.prenom as etudiant_prenom, e.matricule,
             a.nom as agent_nom, a.post_nom as agent_post_nom, a.prenom as agent_prenom,
             fc.${i.cote} as nouvelle_valeur
      FROM insertion i
      JOIN fiche_cotation fc ON i.id_fiche_cotation = fc.id
      JOIN etudiant e ON fc.id_etudiant = e.id
      JOIN agent a ON i.id_agent = a.id
      WHERE fc.id_matiere = ? AND fc.id_annee = ?
      ORDER BY i.date_insert DESC
      LIMIT ?
    `;
    
    return this.query(sql, [matiereId, anneeId, limit]);
  }
}

module.exports = CotesModel;