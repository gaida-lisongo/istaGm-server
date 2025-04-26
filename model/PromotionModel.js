const SectionModel = require('./SectionModel');

/**
 * Modèle pour la gestion de la table 'promotion'
 * Structure: promotion(id, id_section, id_niveau, orientation, vision)
 * Relations: niveau(id, intitule, systeme)
 */
class PromotionModel extends SectionModel {
  /**
   * Récupère toutes les promotions avec leurs informations complètes
   * @param {Object} options - Options de pagination et tri
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getAllPromotions(options = {}) {
    const { limit = null, offset = 0, sortBy = 'p.id', sortDir = 'ASC' } = options;
    
    let sql = `
      SELECT p.*, 
             n.intitule as niveau_intitule, 
             n.systeme as niveau_systeme,
             s.designation as section_designation
      FROM promotion p
      JOIN niveau n ON p.id_niveau = n.id
      JOIN section s ON p.id_section = s.id
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
   * Récupère une promotion par son ID
   * @param {number} id - ID de la promotion
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getPromotionById(id) {
    const sql = `
      SELECT p.*, 
             n.intitule as niveau_intitule, 
             n.systeme as niveau_systeme,
             s.designation as section_designation
      FROM promotion p
      JOIN niveau n ON p.id_niveau = n.id
      JOIN section s ON p.id_section = s.id
      WHERE p.id = ?
    `;
    
    const result = await this.query(sql, [id]);
    
    if (result.success && (Array.isArray(result.data) && result.data.length === 0)) {
      return this.errorResponse('Promotion not found', 404);
    }
    
    return result;
  }

  /**
   * Récupère les promotions d'une section
   * @param {number} sectionId - ID de la section
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getPromotionsBySection(sectionId) {
    const sql = `
      SELECT p.*, 
             n.intitule as niveau_intitule, 
             n.systeme as niveau_systeme
      FROM promotion p
      JOIN niveau n ON p.id_niveau = n.id
      WHERE p.id_section = ?
      ORDER BY n.intitule
    `;
    
    return this.query(sql, [sectionId]);
  }

  /**
   * Récupère les promotions d'un niveau
   * @param {number} niveauId - ID du niveau
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getPromotionsByNiveau(niveauId) {
    const sql = `
      SELECT p.*, 
             s.designation as section_designation
      FROM promotion p
      JOIN section s ON p.id_section = s.id
      WHERE p.id_niveau = ?
      ORDER BY s.designation
    `;
    
    return this.query(sql, [niveauId]);
  }

  /**
   * Récupère les promotions par orientation
   * @param {string} orientation - Orientation recherchée
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getPromotionsByOrientation(orientation) {
    const sql = `
      SELECT p.*, 
             n.intitule as niveau_intitule, 
             n.systeme as niveau_systeme,
             s.designation as section_designation
      FROM promotion p
      JOIN niveau n ON p.id_niveau = n.id
      JOIN section s ON p.id_section = s.id
      WHERE p.orientation LIKE ?
      ORDER BY s.designation, n.intitule
    `;
    
    return this.query(sql, [`%${orientation}%`]);
  }

  /**
   * Crée une nouvelle promotion
   * @param {number} sectionId - ID de la section
   * @param {number} niveauId - ID du niveau
   * @param {string} orientation - Orientation de la promotion
   * @param {string} vision - Vision de la promotion
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async createPromotion(sectionId, niveauId, orientation = null, vision = null) {
    // Vérifier si la section existe
    const sectionExists = await this.query('SELECT id FROM section WHERE id = ?', [sectionId]);
    if (sectionExists.success && (Array.isArray(sectionExists.data) && sectionExists.data.length === 0)) {
      return this.errorResponse('Section not found', 404);
    }
    
    // Vérifier si le niveau existe
    const niveauExists = await this.query('SELECT id FROM niveau WHERE id = ?', [niveauId]);
    if (niveauExists.success && (Array.isArray(niveauExists.data) && niveauExists.data.length === 0)) {
      return this.errorResponse('Niveau not found', 404);
    }
    
    // Vérifier si la promotion existe déjà pour cette section et ce niveau
    const promotionExists = await this.query(
      'SELECT id FROM promotion WHERE id_section = ? AND id_niveau = ?',
      [sectionId, niveauId]
    );
    
    if (promotionExists.success && Array.isArray(promotionExists.data) && promotionExists.data.length > 0) {
      return this.errorResponse('A promotion already exists for this section and level', 409);
    }
    
    return this.query(
      'INSERT INTO promotion (id_section, id_niveau, orientation, vision) VALUES (?, ?, ?, ?)',
      [sectionId, niveauId, orientation, vision]
    );
  }

  /**
   * Met à jour une promotion existante
   * @param {number} id - ID de la promotion
   * @param {Object} promotionData - Données à mettre à jour
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async updatePromotion(id, promotionData) {
    // Vérifier si la promotion existe
    const promotionExists = await this.getPromotionById(id);
    if (!promotionExists.success) {
      return promotionExists;
    }
    
    // Vérifier si les données sont fournies
    if (!promotionData || Object.keys(promotionData).length === 0) {
      return this.errorResponse('No data provided for update', 400);
    }
    
    // Si l'ID de section est modifié, vérifier que la nouvelle section existe
    if (promotionData.id_section) {
      const sectionExists = await this.query('SELECT id FROM section WHERE id = ?', [promotionData.id_section]);
      if (sectionExists.success && (Array.isArray(sectionExists.data) && sectionExists.data.length === 0)) {
        return this.errorResponse('Section not found', 404);
      }
    }
    
    // Si l'ID de niveau est modifié, vérifier que le nouveau niveau existe
    if (promotionData.id_niveau) {
      const niveauExists = await this.query('SELECT id FROM niveau WHERE id = ?', [promotionData.id_niveau]);
      if (niveauExists.success && (Array.isArray(niveauExists.data) && niveauExists.data.length === 0)) {
        return this.errorResponse('Niveau not found', 404);
      }
    }
    
    // Si la section et le niveau sont modifiés, vérifier qu'il n'y a pas déjà une promotion pour cette combinaison
    if (promotionData.id_section && promotionData.id_niveau) {
      const duplicateCheck = await this.query(
        'SELECT id FROM promotion WHERE id_section = ? AND id_niveau = ? AND id != ?',
        [promotionData.id_section, promotionData.id_niveau, id]
      );
      
      if (duplicateCheck.success && Array.isArray(duplicateCheck.data) && duplicateCheck.data.length > 0) {
        return this.errorResponse('A promotion already exists for this section and level', 409);
      }
    } else if (promotionData.id_section) {
      // Si seule la section est modifiée
      const existingNiveau = promotionExists.data[0].id_niveau;
      const duplicateCheck = await this.query(
        'SELECT id FROM promotion WHERE id_section = ? AND id_niveau = ? AND id != ?',
        [promotionData.id_section, existingNiveau, id]
      );
      
      if (duplicateCheck.success && Array.isArray(duplicateCheck.data) && duplicateCheck.data.length > 0) {
        return this.errorResponse('A promotion already exists for this section and level', 409);
      }
    } else if (promotionData.id_niveau) {
      // Si seul le niveau est modifié
      const existingSection = promotionExists.data[0].id_section;
      const duplicateCheck = await this.query(
        'SELECT id FROM promotion WHERE id_section = ? AND id_niveau = ? AND id != ?',
        [existingSection, promotionData.id_niveau, id]
      );
      
      if (duplicateCheck.success && Array.isArray(duplicateCheck.data) && duplicateCheck.data.length > 0) {
        return this.errorResponse('A promotion already exists for this section and level', 409);
      }
    }
    
    // Construire la requête SQL dynamiquement
    const fields = Object.keys(promotionData);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => promotionData[field]);
    values.push(id);
    
    return this.query(`UPDATE promotion SET ${setClause} WHERE id = ?`, values);
  }

  /**
   * Supprime une promotion
   * @param {number} id - ID de la promotion
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async deletePromotion(id) {
    // Vérifier si la promotion existe
    const promotionExists = await this.getPromotionById(id);
    if (!promotionExists.success) {
      return promotionExists;
    }
    
    // Vérifier si la promotion est utilisée dans d'autres tables (par exemple, des étudiants inscrits)
    // Cette vérification dépend de votre modèle de données
    // const hasStudents = await this.query('SELECT id FROM etudiant WHERE id_promotion = ? LIMIT 1', [id]);
    // if (hasStudents.success && Array.isArray(hasStudents.data) && hasStudents.data.length > 0) {
    //   return this.errorResponse('Cannot delete promotion that has students', 400);
    // }
    
    return this.query('DELETE FROM promotion WHERE id = ?', [id]);
  }

  /**
   * ------------ MÉTHODES POUR LA GESTION DES NIVEAUX ------------
   */

  /**
   * Récupère tous les niveaux
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getAllNiveaux() {
    return this.query('SELECT * FROM niveau ORDER BY intitule');
  }

  /**
   * Récupère un niveau par son ID
   * @param {number} id - ID du niveau
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getNiveauById(id) {
    const result = await this.query('SELECT * FROM niveau WHERE id = ?', [id]);
    
    if (result.success && (Array.isArray(result.data) && result.data.length === 0)) {
      return this.errorResponse('Niveau not found', 404);
    }
    
    return result;
  }

  /**
   * Récupère les niveaux par système
   * @param {string} systeme - Système d'éducation (ex: LMD, A3)
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getNiveauxBySysteme(systeme) {
    return this.query('SELECT * FROM niveau WHERE systeme = ? ORDER BY intitule', [systeme]);
  }

  /**
   * Crée un nouveau niveau
   * @param {string} intitule - Intitulé du niveau
   * @param {string} systeme - Système du niveau
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async createNiveau(intitule, systeme) {
    if (!intitule || intitule.trim() === '') {
      return this.errorResponse('Intitule is required', 400);
    }
    
    // Vérifier si un niveau avec cet intitulé existe déjà
    const niveauExists = await this.query('SELECT id FROM niveau WHERE intitule = ?', [intitule]);
    
    if (niveauExists.success && Array.isArray(niveauExists.data) && niveauExists.data.length > 0) {
      return this.errorResponse('A niveau with this intitule already exists', 409);
    }
    
    return this.query('INSERT INTO niveau (intitule, systeme) VALUES (?, ?)', [intitule, systeme]);
  }

  /**
   * Met à jour un niveau
   * @param {number} id - ID du niveau
   * @param {string} intitule - Nouvel intitulé
   * @param {string} systeme - Nouveau système
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async updateNiveau(id, intitule, systeme) {
    // Vérifier si le niveau existe
    const niveauExists = await this.getNiveauById(id);
    if (!niveauExists.success) {
      return niveauExists;
    }
    
    // Vérifier si les données sont fournies
    if ((!intitule || intitule.trim() === '') && !systeme) {
      return this.errorResponse('No valid data provided for update', 400);
    }
    
    // Vérifier si un autre niveau avec cet intitulé existe déjà
    if (intitule && intitule.trim() !== '') {
      const duplicateCheck = await this.query(
        'SELECT id FROM niveau WHERE intitule = ? AND id != ?',
        [intitule, id]
      );
      
      if (duplicateCheck.success && Array.isArray(duplicateCheck.data) && duplicateCheck.data.length > 0) {
        return this.errorResponse('Another niveau with this intitule already exists', 409);
      }
    }
    
    const updates = [];
    const params = [];
    
    if (intitule && intitule.trim() !== '') {
      updates.push('intitule = ?');
      params.push(intitule);
    }
    
    if (systeme) {
      updates.push('systeme = ?');
      params.push(systeme);
    }
    
    params.push(id);
    return this.query(`UPDATE niveau SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  /**
   * Supprime un niveau
   * @param {number} id - ID du niveau
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async deleteNiveau(id) {
    // Vérifier si le niveau existe
    const niveauExists = await this.getNiveauById(id);
    if (!niveauExists.success) {
      return niveauExists;
    }
    
    // Vérifier si le niveau est utilisé dans des promotions
    const promotionsCheck = await this.query('SELECT id FROM promotion WHERE id_niveau = ? LIMIT 1', [id]);
    if (promotionsCheck.success && Array.isArray(promotionsCheck.data) && promotionsCheck.data.length > 0) {
      return this.errorResponse('Cannot delete niveau that is used in promotions', 400);
    }
    
    return this.query('DELETE FROM niveau WHERE id = ?', [id]);
  }

  /**
   * ------------ MÉTHODES UTILITAIRES ------------
   */

  /**
   * Compte le nombre de promotions par section
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async countPromotionsBySection() {
    const sql = `
      SELECT s.id, s.designation, COUNT(p.id) as promotion_count
      FROM section s
      LEFT JOIN promotion p ON s.id = p.id_section
      GROUP BY s.id, s.designation
      ORDER BY s.designation
    `;
    
    return this.query(sql);
  }

  /**
   * Compte le nombre de promotions par niveau
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async countPromotionsByNiveau() {
    const sql = `
      SELECT n.id, n.intitule, n.systeme, COUNT(p.id) as promotion_count
      FROM niveau n
      LEFT JOIN promotion p ON n.id = p.id_niveau
      GROUP BY n.id, n.intitule, n.systeme
      ORDER BY n.intitule
    `;
    
    return this.query(sql);
  }

  /**
   * Récupère les systèmes de niveau disponibles
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getAvailableSystemes() {
    return this.query('SELECT DISTINCT systeme FROM niveau ORDER BY systeme');
  }

  /**
   * Recherche des promotions par terme
   * @param {string} searchTerm - Terme de recherche
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async searchPromotions(searchTerm) {
    const sql = `
      SELECT p.*, 
             n.intitule as niveau_intitule, 
             n.systeme as niveau_systeme,
             s.designation as section_designation
      FROM promotion p
      JOIN niveau n ON p.id_niveau = n.id
      JOIN section s ON p.id_section = s.id
      WHERE s.designation LIKE ? 
         OR n.intitule LIKE ? 
         OR p.orientation LIKE ?
         OR p.vision LIKE ?
      ORDER BY s.designation, n.intitule
    `;
    
    const searchParam = `%${searchTerm}%`;
    return this.query(sql, [searchParam, searchParam, searchParam, searchParam]);
  }

  /**
   * Récupère la structure complète des promotions (avec niveaux et sections)
   * @returns {Promise<Object>} - Structure hiérarchique des promotions
   */
  async getPromotionStructure() {
    // Récupérer toutes les sections
    const sectionsResult = await this.query('SELECT * FROM section ORDER BY designation');
    
    if (!sectionsResult.success) {
      return sectionsResult;
    }
    
    const structure = [];
    
    // Pour chaque section, récupérer ses promotions
    for (const section of sectionsResult.data) {
      const section_data = {
        id: section.id,
        designation: section.designation,
        niveaux: []
      };
      
      // Récupérer les promotions pour cette section
      const promotionsResult = await this.getPromotionsBySection(section.id);
      
      if (promotionsResult.success) {
        // Organiser par niveau
        const niveauxMap = {};
        
        for (const promotion of promotionsResult.data) {
          if (!niveauxMap[promotion.id_niveau]) {
            niveauxMap[promotion.id_niveau] = {
              id: promotion.id_niveau,
              intitule: promotion.niveau_intitule,
              systeme: promotion.niveau_systeme,
              promotions: []
            };
          }
          
          niveauxMap[promotion.id_niveau].promotions.push({
            id: promotion.id,
            orientation: promotion.orientation,
            vision: promotion.vision
          });
        }
        
        // Convertir en tableau
        section_data.niveaux = Object.values(niveauxMap);
      }
      
      structure.push(section_data);
    }
    
    return this.successResponse(structure);
  }
  
  /**
   * ------------ MÉTHODES POUR LA GESTION DES INFORMATIONS ADMINISTRATIVES DES AGENTS ------------
   * Structure: administratif_agent(id, id_agent, diplome, niveau)
   */

  /**
   * Récupère les informations administratives d'un agent
   * @param {number} agentId - ID de l'agent
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getAdministratifAgent(agentId) {
    const result = await this.query(
      'SELECT * FROM administratif_agent WHERE id_agent = ?', 
      [agentId]
    );
    
    if (result.success && (Array.isArray(result.data) && result.data.length === 0)) {
      return this.errorResponse('Administrative information not found for this agent', 404);
    }
    
    return result;
  }

  /**
   * Récupère toutes les informations administratives des agents
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getAllAdministratifAgents() {
    return this.query(`
      SELECT aa.*, a.nom, a.post_nom, a.prenom, a.matricule
      FROM administratif_agent aa
      JOIN agent a ON aa.id_agent = a.id
      ORDER BY a.nom, a.post_nom, a.prenom
    `);
  }

  /**
   * Crée ou met à jour les informations administratives d'un agent
   * @param {number} agentId - ID de l'agent
   * @param {string} diplome - Diplôme de l'agent
   * @param {string} niveau - Niveau académique/administratif
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async setAdministratifAgent(agentId, diplome, niveau) {
    // Vérifier si l'agent existe
    const agentExists = await this.getAgentById(agentId);
    if (!agentExists.success) {
      return agentExists;
    }
    
    // Vérifier si l'agent a déjà des informations administratives
    const adminExists = await this.query(
      'SELECT id FROM administratif_agent WHERE id_agent = ?', 
      [agentId]
    );
    
    if (adminExists.success && Array.isArray(adminExists.data) && adminExists.data.length > 0) {
      // Mettre à jour les informations existantes
      return this.query(
        'UPDATE administratif_agent SET diplome = ?, niveau = ? WHERE id_agent = ?',
        [diplome, niveau, agentId]
      );
    } else {
      // Créer une nouvelle entrée
      return this.query(
        'INSERT INTO administratif_agent (id_agent, diplome, niveau) VALUES (?, ?, ?)',
        [agentId, diplome, niveau]
      );
    }
  }

  /**
   * Met à jour les informations administratives d'un agent
   * @param {number} id - ID de l'entrée administrative (pas l'ID de l'agent)
   * @param {Object} adminData - Données à mettre à jour (diplome, niveau)
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async updateAdministratifAgent(id, adminData) {
    // Vérifier si l'entrée administrative existe
    const result = await this.query('SELECT * FROM administratif_agent WHERE id = ?', [id]);
    if (result.success && (Array.isArray(result.data) && result.data.length === 0)) {
      return this.errorResponse('Administrative information not found', 404);
    }
    
    // Vérifier si les données sont fournies
    if (!adminData || Object.keys(adminData).length === 0) {
      return this.errorResponse('No data provided for update', 400);
    }
    
    // Construire la requête SQL dynamiquement
    const fields = Object.keys(adminData);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => adminData[field]);
    values.push(id);
    
    return this.query(`UPDATE administratif_agent SET ${setClause} WHERE id = ?`, values);
  }

  /**
   * Supprime les informations administratives d'un agent
   * @param {number} agentId - ID de l'agent
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async deleteAdministratifAgent(agentId) {
    // Vérifier si l'agent existe
    const agentExists = await this.getAgentById(agentId);
    if (!agentExists.success) {
      return agentExists;
    }
    
    // Vérifier si l'agent a des informations administratives
    const adminExists = await this.getAdministratifAgent(agentId);
    if (!adminExists.success) {
      return adminExists;
    }
    
    return this.query('DELETE FROM administratif_agent WHERE id_agent = ?', [agentId]);
  }

  /**
   * Filtre les agents par diplôme ou niveau
   * @param {Object} filters - Critères de filtrage (diplome, niveau)
   * @param {Object} options - Options de pagination et de tri
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async filterAgentsByAdministratif(filters = {}, options = {}) {
    const { limit = null, offset = 0, sortBy = 'a.nom', sortDir = 'ASC' } = options;
    
    let sql = `
      SELECT a.*, aa.diplome, aa.niveau
      FROM agent a
      JOIN administratif_agent aa ON a.id = aa.id_agent
      WHERE 1=1
    `;
    const params = [];
    
    // Appliquer les filtres
    if (filters.diplome) {
      sql += ' AND aa.diplome LIKE ?';
      params.push(`%${filters.diplome}%`);
    }
    
    if (filters.niveau) {
      sql += ' AND aa.niveau LIKE ?';
      params.push(`%${filters.niveau}%`);
    }
    
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
   * Récupère les statistiques sur les diplômes des agents
   * @returns {Promise<Object>} - Statistiques sur les diplômes
   */
  async getDiplomeStats() {
    const sql = `
      SELECT
        aa.diplome,
        COUNT(*) as count
      FROM administratif_agent aa
      GROUP BY aa.diplome
      ORDER BY count DESC
    `;
    
    const result = await this.query(sql);
    
    // Formatage des résultats
    if (result.success && Array.isArray(result.data)) {
      const stats = {
        total: 0,
        byDiplome: {}
      };
      
      result.data.forEach(row => {
        stats.byDiplome[row.diplome || 'Non spécifié'] = row.count;
        stats.total += row.count;
      });
      
      return stats;
    }
    
    return { total: 0, byDiplome: {} };
  }

  /**
   * Récupère les statistiques sur les niveaux des agents
   * @returns {Promise<Object>} - Statistiques sur les niveaux
   */
  async getNiveauStats() {
    const sql = `
      SELECT
        aa.niveau,
        COUNT(*) as count
      FROM administratif_agent aa
      GROUP BY aa.niveau
      ORDER BY count DESC
    `;
    
    const result = await this.query(sql);
    
    // Formatage des résultats
    if (result.success && Array.isArray(result.data)) {
      const stats = {
        total: 0,
        byNiveau: {}
      };
      
      result.data.forEach(row => {
        stats.byNiveau[row.niveau || 'Non spécifié'] = row.count;
        stats.total += row.count;
      });
      
      return stats;
    }
    
    return { total: 0, byNiveau: {} };
  }

  /**
   * Vérifie si un agent a des informations administratives
   * @param {number} agentId - ID de l'agent
   * @returns {Promise<boolean>} - True si l'agent a des informations administratives
   */
  async hasAdministratifInfo(agentId) {
    const result = await this.query(
      'SELECT id FROM administratif_agent WHERE id_agent = ? LIMIT 1',
      [agentId]
    );
    
    return result.success && Array.isArray(result.data) && result.data.length > 0;
  }

  /**
   * Récupère un agent avec toutes ses informations (administratives, origine, etc.)
   * @param {number} id - ID de l'agent
   * @returns {Promise<Object>} - Agent avec ses informations complètes
   */
  async getAgentWithFullInfo(id) {
    // Récupérer les informations de base de l'agent
    const agentResult = await this.getAgentById(id);
    if (!agentResult.success) {
      return agentResult;
    }
    
    const agent = agentResult.data[0];
    const fullInfo = { ...agent, administratif: null };
    
    // Récupérer les informations administratives (si elles existent)
    const adminResult = await this.getAdministratifAgent(id);
    if (adminResult.success) {
      fullInfo.administratif = adminResult.data[0];
    }
    
    // Récupérer d'autres informations associées si besoin
    // (origine, affectations, etc. si vous avez intégré ces méthodes)
    
    return this.successResponse(fullInfo);
  }

/**
 * ------------ MÉTHODES POUR LA GESTION DES UNITÉS D'ENSEIGNEMENT ------------
 * Structure: unite(id, designation, id_promotion, code)
 */

/**
 * Récupère toutes les unités d'enseignement
 * @param {Object} options - Options de pagination et de tri
 * @returns {Promise<Object>} - Résultat avec métadonnées
 */
async getAllUnites(options = {}) {
    const { limit = null, offset = 0, sortBy = 'u.designation', sortDir = 'ASC' } = options;
    
    let sql = `
      SELECT u.*, 
             p.id as promotion_id,
             p.orientation as promotion_orientation,
             s.designation as section_designation,
             n.intitule as niveau_intitule
      FROM unite u
      JOIN promotion p ON u.id_promotion = p.id
      JOIN section s ON p.id_section = s.id
      JOIN niveau n ON p.id_niveau = n.id
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
   * Récupère une unité d'enseignement par son ID
   * @param {number} id - ID de l'unité
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getUniteById(id) {
    const sql = `
      SELECT u.*, 
             p.id as promotion_id,
             p.orientation as promotion_orientation,
             s.designation as section_designation,
             n.intitule as niveau_intitule
      FROM unite u
      JOIN promotion p ON u.id_promotion = p.id
      JOIN section s ON p.id_section = s.id
      JOIN niveau n ON p.id_niveau = n.id
      WHERE u.id = ?
    `;
    
    const result = await this.query(sql, [id]);
    
    if (result.success && (Array.isArray(result.data) && result.data.length === 0)) {
      return this.errorResponse('Unité not found', 404);
    }
    
    return result;
  }
  
  /**
   * Récupère une unité d'enseignement par son code
   * @param {string} code - Code de l'unité
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getUniteByCode(code) {
    const sql = `
      SELECT u.*, 
             p.id as promotion_id,
             p.orientation as promotion_orientation,
             s.designation as section_designation,
             n.intitule as niveau_intitule
      FROM unite u
      JOIN promotion p ON u.id_promotion = p.id
      JOIN section s ON p.id_section = s.id
      JOIN niveau n ON p.id_niveau = n.id
      WHERE u.code = ?
    `;
    
    const result = await this.query(sql, [code]);
    
    if (result.success && (Array.isArray(result.data) && result.data.length === 0)) {
      return this.errorResponse('Unité not found', 404);
    }
    
    return result;
  }
  
  /**
   * Récupère les unités d'enseignement d'une promotion
   * @param {number} promotionId - ID de la promotion
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getUnitesByPromotionId(promotionId) {
    // Vérifier si la promotion existe
    const promotionExists = await this.getPromotionById(promotionId);
    if (!promotionExists.success) {
      return promotionExists;
    }
    
    const sql = `
      SELECT u.*
      FROM unite u
      WHERE u.id_promotion = ?
      ORDER BY u.designation
    `;
    
    return this.query(sql, [promotionId]);
  }
  
  /**
   * Crée une nouvelle unité d'enseignement
   * @param {string} designation - Désignation de l'unité
   * @param {number} promotionId - ID de la promotion
   * @param {string} code - Code de l'unité
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async createUnite(designation, promotionId, code) {
    if (!designation || designation.trim() === '') {
      return this.errorResponse('Designation is required', 400);
    }
    
    if (!promotionId) {
      return this.errorResponse('Promotion ID is required', 400);
    }
    
    // Vérifier si la promotion existe
    const promotionExists = await this.getPromotionById(promotionId);
    if (!promotionExists.success) {
      return promotionExists;
    }
    
    // Vérifier si une unité avec ce code existe déjà
    if (code) {
      const codeExists = await this.query('SELECT id FROM unite WHERE code = ?', [code]);
      if (codeExists.success && Array.isArray(codeExists.data) && codeExists.data.length > 0) {
        return this.errorResponse('An unite with this code already exists', 409);
      }
    }
    
    // Vérifier si une unité avec cette désignation existe déjà pour cette promotion
    const designationExists = await this.query(
      'SELECT id FROM unite WHERE designation = ? AND id_promotion = ?',
      [designation, promotionId]
    );
    
    if (designationExists.success && Array.isArray(designationExists.data) && designationExists.data.length > 0) {
      return this.errorResponse('An unite with this designation already exists for this promotion', 409);
    }
    
    return this.query(
      'INSERT INTO unite (designation, id_promotion, code) VALUES (?, ?, ?)',
      [designation, promotionId, code]
    );
  }
  
  /**
   * Met à jour une unité d'enseignement existante
   * @param {number} id - ID de l'unité
   * @param {Object} uniteData - Données à mettre à jour (designation, id_promotion, code)
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async updateUnite(id, uniteData) {
    // Vérifier si l'unité existe
    const uniteExists = await this.getUniteById(id);
    if (!uniteExists.success) {
      return uniteExists;
    }
    
    // Vérifier si les données sont fournies
    if (!uniteData || Object.keys(uniteData).length === 0) {
      return this.errorResponse('No data provided for update', 400);
    }
    
    // Si l'ID de promotion est modifié, vérifier que la nouvelle promotion existe
    if (uniteData.id_promotion) {
      const promotionExists = await this.getPromotionById(uniteData.id_promotion);
      if (!promotionExists.success) {
        return promotionExists;
      }
    }
    
    // Vérifier si une unité avec ce code existe déjà (si le code est modifié)
    if (uniteData.code) {
      const codeExists = await this.query(
        'SELECT id FROM unite WHERE code = ? AND id != ?',
        [uniteData.code, id]
      );
      
      if (codeExists.success && Array.isArray(codeExists.data) && codeExists.data.length > 0) {
        return this.errorResponse('An unite with this code already exists', 409);
      }
    }
    
    // Vérifier si une unité avec cette désignation existe déjà pour cette promotion (si la désignation ou la promotion sont modifiées)
    if (uniteData.designation || uniteData.id_promotion) {
      const designation = uniteData.designation || uniteExists.data[0].designation;
      const promotionId = uniteData.id_promotion || uniteExists.data[0].id_promotion;
      
      const designationExists = await this.query(
        'SELECT id FROM unite WHERE designation = ? AND id_promotion = ? AND id != ?',
        [designation, promotionId, id]
      );
      
      if (designationExists.success && Array.isArray(designationExists.data) && designationExists.data.length > 0) {
        return this.errorResponse('An unite with this designation already exists for this promotion', 409);
      }
    }
    
    // Construire la requête SQL dynamiquement
    const fields = Object.keys(uniteData);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => uniteData[field]);
    values.push(id);
    
    return this.query(`UPDATE unite SET ${setClause} WHERE id = ?`, values);
  }
  
  /**
   * Supprime une unité d'enseignement
   * @param {number} id - ID de l'unité
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async deleteUnite(id) {
    // Vérifier si l'unité existe
    const uniteExists = await this.getUniteById(id);
    if (!uniteExists.success) {
      return uniteExists;
    }
    
    // Vérifier si l'unité a des matières associées
    const matieresCheck = await this.query('SELECT id FROM matiere WHERE id_unite = ? LIMIT 1', [id]);
    if (matieresCheck.success && Array.isArray(matieresCheck.data) && matieresCheck.data.length > 0) {
      return this.errorResponse('Cannot delete unite that has matieres', 400);
    }
    
    return this.query('DELETE FROM unite WHERE id = ?', [id]);
  }
  
  /**
   * ------------ MÉTHODES POUR LA GESTION DES MATIÈRES ------------
   * Structure: matiere(id, designation, credit, id_unite, code, statut, semestre)
   */
  
  /**
   * Récupère toutes les matières
   * @param {Object} options - Options de pagination et de tri
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getAllMatieres(options = {}) {
    const { limit = null, offset = 0, sortBy = 'm.designation', sortDir = 'ASC' } = options;
    
    let sql = `
      SELECT m.*, 
             u.designation as unite_designation,
             u.code as unite_code,
             p.id as promotion_id,
             p.orientation as promotion_orientation,
             s.designation as section_designation,
             n.intitule as niveau_intitule
      FROM matiere m
      JOIN unite u ON m.id_unite = u.id
      JOIN promotion p ON u.id_promotion = p.id
      JOIN section s ON p.id_section = s.id
      JOIN niveau n ON p.id_niveau = n.id
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
   * Récupère une matière par son ID
   * @param {number} id - ID de la matière
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getMatiereById(id) {
    const sql = `
      SELECT m.*, 
             u.designation as unite_designation,
             u.code as unite_code,
             p.id as promotion_id,
             p.orientation as promotion_orientation,
             s.designation as section_designation,
             n.intitule as niveau_intitule
      FROM matiere m
      JOIN unite u ON m.id_unite = u.id
      JOIN promotion p ON u.id_promotion = p.id
      JOIN section s ON p.id_section = s.id
      JOIN niveau n ON p.id_niveau = n.id
      WHERE m.id = ?
    `;
    
    const result = await this.query(sql, [id]);
    
    if (result.success && (Array.isArray(result.data) && result.data.length === 0)) {
      return this.errorResponse('Matiere not found', 404);
    }
    
    return result;
  }
  
  /**
   * Récupère une matière par son code
   * @param {string} code - Code de la matière
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getMatiereByCode(code) {
    const sql = `
      SELECT m.*, 
             u.designation as unite_designation,
             u.code as unite_code,
             p.id as promotion_id,
             p.orientation as promotion_orientation,
             s.designation as section_designation,
             n.intitule as niveau_intitule
      FROM matiere m
      JOIN unite u ON m.id_unite = u.id
      JOIN promotion p ON u.id_promotion = p.id
      JOIN section s ON p.id_section = s.id
      JOIN niveau n ON p.id_niveau = n.id
      WHERE m.code = ?
    `;
    
    const result = await this.query(sql, [code]);
    
    if (result.success && (Array.isArray(result.data) && result.data.length === 0)) {
      return this.errorResponse('Matiere not found', 404);
    }
    
    return result;
  }
  
  /**
   * Récupère les matières d'une unité d'enseignement
   * @param {number} uniteId - ID de l'unité
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getMatieresByUniteId(uniteId) {
    // Vérifier si l'unité existe
    const uniteExists = await this.getUniteById(uniteId);
    if (!uniteExists.success) {
      return uniteExists;
    }
    
    const sql = `
      SELECT m.*
      FROM matiere m
      WHERE m.id_unite = ?
      ORDER BY m.semestre, m.designation
    `;
    
    return this.query(sql, [uniteId]);
  }
  
  /**
   * Récupère les matières d'une promotion
   * @param {number} promotionId - ID de la promotion
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getMatieresByPromotionId(promotionId) {
    // Vérifier si la promotion existe
    const promotionExists = await this.getPromotionById(promotionId);
    if (!promotionExists.success) {
      return promotionExists;
    }
    
    const sql = `
      SELECT m.*, u.designation as unite_designation, u.code as unite_code
      FROM matiere m
      JOIN unite u ON m.id_unite = u.id
      WHERE u.id_promotion = ?
      ORDER BY m.semestre, u.designation, m.designation
    `;
    
    return this.query(sql, [promotionId]);
  }
  
  /**
   * Récupère les matières par semestre pour une promotion
   * @param {number} promotionId - ID de la promotion
   * @param {number} semestre - Numéro du semestre
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getMatieresBySemestre(promotionId, semestre) {
    // Vérifier si la promotion existe
    const promotionExists = await this.getPromotionById(promotionId);
    if (!promotionExists.success) {
      return promotionExists;
    }
    
    const sql = `
      SELECT m.*, u.designation as unite_designation, u.code as unite_code
      FROM matiere m
      JOIN unite u ON m.id_unite = u.id
      WHERE u.id_promotion = ? AND m.semestre = ?
      ORDER BY u.designation, m.designation
    `;
    
    return this.query(sql, [promotionId, semestre]);
  }
  
  /**
   * Crée une nouvelle matière
   * @param {Object} matiereData - Données de la matière
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async createMatiere(matiereData) {
    // Vérifier les champs obligatoires
    if (!matiereData.designation || matiereData.designation.trim() === '') {
      return this.errorResponse('Designation is required', 400);
    }
    
    if (!matiereData.id_unite) {
      return this.errorResponse('Unite ID is required', 400);
    }
    
    // Vérifier si l'unité existe
    const uniteExists = await this.getUniteById(matiereData.id_unite);
    if (!uniteExists.success) {
      return uniteExists;
    }
    
    // Vérifier si une matière avec ce code existe déjà
    if (matiereData.code) {
      const codeExists = await this.query('SELECT id FROM matiere WHERE code = ?', [matiereData.code]);
      if (codeExists.success && Array.isArray(codeExists.data) && codeExists.data.length > 0) {
        return this.errorResponse('A matiere with this code already exists', 409);
      }
    }
    
    // Vérifier si une matière avec cette désignation existe déjà dans cette unité
    const designationExists = await this.query(
      'SELECT id FROM matiere WHERE designation = ? AND id_unite = ?',
      [matiereData.designation, matiereData.id_unite]
    );
    
    if (designationExists.success && Array.isArray(designationExists.data) && designationExists.data.length > 0) {
      return this.errorResponse('A matiere with this designation already exists in this unite', 409);
    }
    
    // Préparer les champs et valeurs pour l'insertion
    const fields = Object.keys(matiereData);
    const values = fields.map(field => matiereData[field]);
    const placeholders = fields.map(() => '?').join(', ');
    
    return this.query(
      `INSERT INTO matiere (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    );
  }
  
  /**
   * Met à jour une matière existante
   * @param {number} id - ID de la matière
   * @param {Object} matiereData - Données à mettre à jour
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async updateMatiere(id, matiereData) {
    // Vérifier si la matière existe
    const matiereExists = await this.getMatiereById(id);
    if (!matiereExists.success) {
      return matiereExists;
    }
    
    // Vérifier si les données sont fournies
    if (!matiereData || Object.keys(matiereData).length === 0) {
      return this.errorResponse('No data provided for update', 400);
    }
    
    // Si l'ID de l'unité est modifié, vérifier que la nouvelle unité existe
    if (matiereData.id_unite) {
      const uniteExists = await this.getUniteById(matiereData.id_unite);
      if (!uniteExists.success) {
        return uniteExists;
      }
    }
    
    // Vérifier si une matière avec ce code existe déjà (si le code est modifié)
    if (matiereData.code) {
      const codeExists = await this.query(
        'SELECT id FROM matiere WHERE code = ? AND id != ?',
        [matiereData.code, id]
      );
      
      if (codeExists.success && Array.isArray(codeExists.data) && codeExists.data.length > 0) {
        return this.errorResponse('A matiere with this code already exists', 409);
      }
    }
    
    // Vérifier si une matière avec cette désignation existe déjà dans cette unité (si la désignation ou l'unité sont modifiées)
    if (matiereData.designation || matiereData.id_unite) {
      const designation = matiereData.designation || matiereExists.data[0].designation;
      const uniteId = matiereData.id_unite || matiereExists.data[0].id_unite;
      
      const designationExists = await this.query(
        'SELECT id FROM matiere WHERE designation = ? AND id_unite = ? AND id != ?',
        [designation, uniteId, id]
      );
      
      if (designationExists.success && Array.isArray(designationExists.data) && designationExists.data.length > 0) {
        return this.errorResponse('A matiere with this designation already exists in this unite', 409);
      }
    }
    
    // Construire la requête SQL dynamiquement
    const fields = Object.keys(matiereData);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => matiereData[field]);
    values.push(id);
    
    return this.query(`UPDATE matiere SET ${setClause} WHERE id = ?`, values);
  }
  
  /**
   * Supprime une matière
   * @param {number} id - ID de la matière
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async deleteMatiere(id) {
    // Vérifier si la matière existe
    const matiereExists = await this.getMatiereById(id);
    if (!matiereExists.success) {
      return matiereExists;
    }
    
    // Vérifier si la matière est utilisée dans d'autres tables
    // Par exemple les notes ou les horaires (à adapter selon votre modèle de données)
    // const hasNotes = await this.query('SELECT id FROM note WHERE id_matiere = ? LIMIT 1', [id]);
    // if (hasNotes.success && Array.isArray(hasNotes.data) && hasNotes.data.length > 0) {
    //   return this.errorResponse('Cannot delete matiere that has notes', 400);
    // }
    
    return this.query('DELETE FROM matiere WHERE id = ?', [id]);
  }
  
  /**
   * ------------ MÉTHODES UTILITAIRES POUR LES UNITÉS ET MATIÈRES ------------
   */
  
  /**
   * Calcule le total des crédits pour une unité d'enseignement
   * @param {number} uniteId - ID de l'unité
   * @returns {Promise<number>} - Total des crédits
   */
  async calculateCreditsForUnite(uniteId) {
    const result = await this.query(
      'SELECT SUM(credit) as total_credits FROM matiere WHERE id_unite = ?',
      [uniteId]
    );
    
    if (result.success && Array.isArray(result.data) && result.data.length > 0) {
      return result.data[0].total_credits || 0;
    }
    
    return 0;
  }
  
  /**
   * Calcule le total des crédits pour une promotion
   * @param {number} promotionId - ID de la promotion
   * @returns {Promise<number>} - Total des crédits
   */
  async calculateCreditsForPromotion(promotionId) {
    const result = await this.query(`
      SELECT SUM(m.credit) as total_credits 
      FROM matiere m
      JOIN unite u ON m.id_unite = u.id
      WHERE u.id_promotion = ?
    `, [promotionId]);
    
    if (result.success && Array.isArray(result.data) && result.data.length > 0) {
      return result.data[0].total_credits || 0;
    }
    
    return 0;
  }
  
  /**
   * Récupère la structure complète des matières par unité pour une promotion
   * @param {number} promotionId - ID de la promotion
   * @returns {Promise<Object>} - Structure hiérarchique des unités et matières
   */
  async getUnitesMatieresByPromotion(promotionId) {
    // Vérifier si la promotion existe
    const promotionResult = await this.getPromotionById(promotionId);
    if (!promotionResult.success) {
      return promotionResult;
    }
    
    const promotion = promotionResult.data[0];
    
    // Récupérer toutes les unités de cette promotion
    const unitesResult = await this.getUnitesByPromotionId(promotionId);
    if (!unitesResult.success) {
      return unitesResult;
    }
    
    const structure = {
      promotion: {
        id: promotion.id,
        orientation: promotion.orientation,
        section: promotion.section_designation,
        niveau: promotion.niveau_intitule
      },
      unites: []
    };
    
    // Pour chaque unité, récupérer ses matières
    for (const unite of unitesResult.data) {
      const matieresResult = await this.getMatieresByUniteId(unite.id);
      
      const uniteData = {
        id: unite.id,
        designation: unite.designation,
        code: unite.code,
        totalCredits: 0,
        matieres: []
      };
      
      if (matieresResult.success) {
        uniteData.matieres = matieresResult.data;
        
        // Calculer le total des crédits
        uniteData.totalCredits = uniteData.matieres.reduce((sum, matiere) => {
          return sum + (matiere.credit || 0);
        }, 0);
      }
      
      structure.unites.push(uniteData);
    }
    
    // Calcul du total des crédits pour la promotion
    structure.totalCredits = structure.unites.reduce((sum, unite) => {
      return sum + unite.totalCredits;
    }, 0);
    
    return this.successResponse(structure);
  }
  
  /**
   * Récupère la structure des matières par semestre pour une promotion
   * @param {number} promotionId - ID de la promotion
   * @returns {Promise<Object>} - Structure organisée par semestre
   */
  async getMatieresBySemestreStructure(promotionId) {
    // Vérifier si la promotion existe
    const promotionResult = await this.getPromotionById(promotionId);
    if (!promotionResult.success) {
      return promotionResult;
    }
    
    // Récupérer toutes les matières de cette promotion
    const matieresResult = await this.getMatieresByPromotionId(promotionId);
    if (!matieresResult.success) {
      return matieresResult;
    }
    
    const semestreMap = {};
    
    // Organiser les matières par semestre
    for (const matiere of matieresResult.data) {
      const semestre = matiere.semestre || 'Non défini';
      
      if (!semestreMap[semestre]) {
        semestreMap[semestre] = {
          semestre,
          matieres: [],
          totalCredits: 0
        };
      }
      
      semestreMap[semestre].matieres.push(matiere);
      semestreMap[semestre].totalCredits += (matiere.credit || 0);
    }
    
    // Convertir en tableau et trier par semestre
    const semestres = Object.values(semestreMap).sort((a, b) => {
      if (a.semestre === 'Non défini') return 1;
      if (b.semestre === 'Non défini') return -1;
      return a.semestre - b.semestre;
    });
    
    return this.successResponse({
      promotion: promotionResult.data[0],
      semestres,
      totalCredits: semestres.reduce((sum, s) => sum + s.totalCredits, 0)
    });
  }
  
  /**
   * Recherche des matières par terme
   * @param {string} searchTerm - Terme de recherche
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async searchMatieres(searchTerm) {
    const sql = `
      SELECT m.*, 
             u.designation as unite_designation,
             u.code as unite_code,
             p.id as promotion_id,
             p.orientation as promotion_orientation,
             s.designation as section_designation,
             n.intitule as niveau_intitule
      FROM matiere m
      JOIN unite u ON m.id_unite = u.id
      JOIN promotion p ON u.id_promotion = p.id
      JOIN section s ON p.id_section = s.id
      JOIN niveau n ON p.id_niveau = n.id
      WHERE m.designation LIKE ?
         OR m.code LIKE ?
         OR u.designation LIKE ?
      ORDER BY m.designation
    `;
    
    const searchParam = `%${searchTerm}%`;
    return this.query(sql, [searchParam, searchParam, searchParam]);
  }
/**
 * ------------ MÉTHODES POUR LA GESTION DES ENROLLEMENTS ------------
 * Structure: enrollements(id, id_promotion, designation, montant, session, date_creation)
 */

/**
 * Récupère tous les enrollements
 * @param {Object} options - Options de pagination et de tri
 * @returns {Promise<Object>} - Résultat avec métadonnées
 */
async getAllEnrollements(options = {}) {
    const { limit = null, offset = 0, sortBy = 'e.id', sortDir = 'ASC' } = options;
    
    let sql = `
      SELECT e.*, 
             p.orientation as promotion_orientation,
             s.designation as section_designation,
             n.intitule as niveau_intitule
      FROM enrollements e
      JOIN promotion p ON e.id_promotion = p.id
      JOIN section s ON p.id_section = s.id
      JOIN niveau n ON p.id_niveau = n.id
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
   * Récupère un enrollement par son ID
   * @param {number} id - ID de l'enrollement
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getEnrollementById(id) {
    const sql = `
      SELECT e.*, 
             p.orientation as promotion_orientation,
             s.designation as section_designation,
             n.intitule as niveau_intitule
      FROM enrollements e
      JOIN promotion p ON e.id_promotion = p.id
      JOIN section s ON p.id_section = s.id
      JOIN niveau n ON p.id_niveau = n.id
      WHERE e.id = ?
    `;
    
    const result = await this.query(sql, [id]);
    
    if (result.success && (Array.isArray(result.data) && result.data.length === 0)) {
      return this.errorResponse('Enrollement not found', 404);
    }
    
    return result;
  }
  
  /**
   * Récupère les enrollements d'une promotion
   * @param {number} promotionId - ID de la promotion
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getEnrollementsByPromotionId(promotionId) {
    // Vérifier si la promotion existe
    const promotionExists = await this.getPromotionById(promotionId);
    if (!promotionExists.success) {
      return promotionExists;
    }
    
    const sql = `
      SELECT e.*
      FROM enrollements e
      WHERE e.id_promotion = ?
      ORDER BY e.session, e.designation
    `;
    
    return this.query(sql, [promotionId]);
  }
  
  /**
   * Récupère les enrollements par session académique
   * @param {string} session - Session académique (ex: "2023-2024")
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getEnrollementsBySession(session) {
    const sql = `
      SELECT e.*, 
             p.orientation as promotion_orientation,
             s.designation as section_designation,
             n.intitule as niveau_intitule
      FROM enrollements e
      JOIN promotion p ON e.id_promotion = p.id
      JOIN section s ON p.id_section = s.id
      JOIN niveau n ON p.id_niveau = n.id
      WHERE e.session = ?
      ORDER BY s.designation, n.intitule, e.designation
    `;
    
    return this.query(sql, [session]);
  }
  
  /**
   * Crée un nouvel enrollement
   * @param {Object} enrollementData - Données de l'enrollement
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async createEnrollement(enrollementData) {
    // Vérifier les champs obligatoires
    if (!enrollementData.id_promotion) {
      return this.errorResponse('Promotion ID is required', 400);
    }
    
    if (!enrollementData.designation || enrollementData.designation.trim() === '') {
      return this.errorResponse('Designation is required', 400);
    }
    
    if (enrollementData.montant === undefined || enrollementData.montant === null) {
      return this.errorResponse('Amount is required', 400);
    }
    
    if (!enrollementData.session || enrollementData.session.trim() === '') {
      return this.errorResponse('Session is required', 400);
    }
    
    // Vérifier si la promotion existe
    const promotionExists = await this.getPromotionById(enrollementData.id_promotion);
    if (!promotionExists.success) {
      return promotionExists;
    }
    
    // Vérifier si un enrollement avec cette désignation existe déjà pour cette promotion et session
    const enrollementExists = await this.query(
      'SELECT id FROM enrollements WHERE designation = ? AND id_promotion = ? AND session = ?',
      [enrollementData.designation, enrollementData.id_promotion, enrollementData.session]
    );
    
    if (enrollementExists.success && Array.isArray(enrollementExists.data) && enrollementExists.data.length > 0) {
      return this.errorResponse('An enrollement with this designation already exists for this promotion and session', 409);
    }
    
    // Définir la date de création si elle n'est pas fournie
    if (!enrollementData.date_creation) {
      enrollementData.date_creation = new Date().toISOString().slice(0, 10);
    }
    
    // Préparer les champs et valeurs pour l'insertion
    const fields = Object.keys(enrollementData);
    const values = fields.map(field => enrollementData[field]);
    const placeholders = fields.map(() => '?').join(', ');
    
    return this.query(
      `INSERT INTO enrollements (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    );
  }
  
  /**
   * Met à jour un enrollement existant
   * @param {number} id - ID de l'enrollement
   * @param {Object} enrollementData - Données à mettre à jour
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async updateEnrollement(id, enrollementData) {
    // Vérifier si l'enrollement existe
    const enrollementExists = await this.getEnrollementById(id);
    if (!enrollementExists.success) {
      return enrollementExists;
    }
    
    // Vérifier si les données sont fournies
    if (!enrollementData || Object.keys(enrollementData).length === 0) {
      return this.errorResponse('No data provided for update', 400);
    }
    
    // Si l'ID de promotion est modifié, vérifier que la nouvelle promotion existe
    if (enrollementData.id_promotion) {
      const promotionExists = await this.getPromotionById(enrollementData.id_promotion);
      if (!promotionExists.success) {
        return promotionExists;
      }
    }
    
    // Vérifier si un enrollement avec cette désignation existe déjà pour cette promotion et session
    if (enrollementData.designation || enrollementData.id_promotion || enrollementData.session) {
      const designation = enrollementData.designation || enrollementExists.data[0].designation;
      const promotionId = enrollementData.id_promotion || enrollementExists.data[0].id_promotion;
      const session = enrollementData.session || enrollementExists.data[0].session;
      
      const duplicateCheck = await this.query(
        'SELECT id FROM enrollements WHERE designation = ? AND id_promotion = ? AND session = ? AND id != ?',
        [designation, promotionId, session, id]
      );
      
      if (duplicateCheck.success && Array.isArray(duplicateCheck.data) && duplicateCheck.data.length > 0) {
        return this.errorResponse('An enrollement with this designation already exists for this promotion and session', 409);
      }
    }
    
    // Construire la requête SQL dynamiquement
    const fields = Object.keys(enrollementData);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => enrollementData[field]);
    values.push(id);
    
    return this.query(`UPDATE enrollements SET ${setClause} WHERE id = ?`, values);
  }
  
  /**
   * Supprime un enrollement
   * @param {number} id - ID de l'enrollement
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async deleteEnrollement(id) {
    // Vérifier si l'enrollement existe
    const enrollementExists = await this.getEnrollementById(id);
    if (!enrollementExists.success) {
      return enrollementExists;
    }
    
    // Vérifier si l'enrollement est utilisé dans des paiements d'étudiants
    // Note: Cette vérification dépend de votre modèle de données pour les paiements
    // const paymentsCheck = await this.query('SELECT id FROM etudiant_payment WHERE id_enrollement = ? LIMIT 1', [id]);
    // if (paymentsCheck.success && Array.isArray(paymentsCheck.data) && paymentsCheck.data.length > 0) {
    //   return this.errorResponse('Cannot delete enrollement that is used in student payments', 400);
    // }
    
    return this.query('DELETE FROM enrollements WHERE id = ?', [id]);
  }
  
  /**
   * ------------ MÉTHODES UTILITAIRES POUR LES ENROLLEMENTS ------------
   */
  
  /**
   * Calcule le montant total des enrollements pour une promotion et une session
   * @param {number} promotionId - ID de la promotion
   * @param {string} session - Session académique (ex: "2023-2024")
   * @returns {Promise<number>} - Montant total
   */
  async calculateTotalEnrollementAmount(promotionId, session) {
    const result = await this.query(
      'SELECT SUM(montant) as total_amount FROM enrollements WHERE id_promotion = ? AND session = ?',
      [promotionId, session]
    );
    
    if (result.success && Array.isArray(result.data) && result.data.length > 0) {
      return result.data[0].total_amount || 0;
    }
    
    return 0;
  }
  
  /**
   * Récupère toutes les sessions académiques disponibles
   * @returns {Promise<Object>} - Liste des sessions uniques
   */
  async getAllSessions() {
    const result = await this.query('SELECT DISTINCT session FROM enrollements ORDER BY session DESC');
    
    if (result.success) {
      const sessions = result.data.map(row => row.session);
      return this.successResponse(sessions);
    }
    
    return this.errorResponse('Failed to retrieve sessions', 500);
  }
  
  /**
   * Récupère le résumé des enrollements par section et niveau pour une session donnée
   * @param {string} session - Session académique
   * @returns {Promise<Object>} - Résumé des enrollements
   */
  async getEnrollementsResumeBySession(session) {
    const sql = `
      SELECT 
        s.id as section_id,
        s.designation as section,
        n.id as niveau_id,
        n.intitule as niveau,
        p.id as promotion_id,
        p.orientation,
        COUNT(e.id) as enrollement_count,
        SUM(e.montant) as total_amount
      FROM enrollements e
      JOIN promotion p ON e.id_promotion = p.id
      JOIN section s ON p.id_section = s.id
      JOIN niveau n ON p.id_niveau = n.id
      WHERE e.session = ?
      GROUP BY s.id, n.id, p.id
      ORDER BY s.designation, n.intitule, p.orientation
    `;
    
    const result = await this.query(sql, [session]);
    
    if (result.success) {
      // Organiser les données par section puis par niveau
      const resumeBySection = {};
      
      result.data.forEach(row => {
        if (!resumeBySection[row.section_id]) {
          resumeBySection[row.section_id] = {
            id: row.section_id,
            designation: row.section,
            niveaux: {},
            total_amount: 0
          };
        }
        
        if (!resumeBySection[row.section_id].niveaux[row.niveau_id]) {
          resumeBySection[row.section_id].niveaux[row.niveau_id] = {
            id: row.niveau_id,
            intitule: row.niveau,
            promotions: [],
            total_amount: 0
          };
        }
        
        resumeBySection[row.section_id].niveaux[row.niveau_id].promotions.push({
          id: row.promotion_id,
          orientation: row.orientation || 'Générale',
          enrollement_count: row.enrollement_count,
          total_amount: row.total_amount
        });
        
        resumeBySection[row.section_id].niveaux[row.niveau_id].total_amount += parseFloat(row.total_amount || 0);
        resumeBySection[row.section_id].total_amount += parseFloat(row.total_amount || 0);
      });
      
      // Convertir en tableaux pour un format plus facile à utiliser
      const formattedResult = Object.values(resumeBySection).map(section => {
        section.niveaux = Object.values(section.niveaux);
        return section;
      });
      
      return this.successResponse({
        session,
        sections: formattedResult,
        total_amount: formattedResult.reduce((sum, section) => sum + section.total_amount, 0)
      });
    }
    
    return this.errorResponse('Failed to retrieve enrollements resume', 500);
  }
  
  /**
   * Vérifie si un enrollement existe pour une promotion, une désignation et une session
   * @param {number} promotionId - ID de la promotion
   * @param {string} designation - Désignation de l'enrollement
   * @param {string} session - Session académique
   * @returns {Promise<boolean>} - True si l'enrollement existe
   */
  async checkEnrollementExists(promotionId, designation, session) {
    const result = await this.query(
      'SELECT id FROM enrollements WHERE id_promotion = ? AND designation = ? AND session = ? LIMIT 1',
      [promotionId, designation, session]
    );
    
    return result.success && Array.isArray(result.data) && result.data.length > 0;
  }
}

module.exports = PromotionModel;