const Model = require('./Model');

/**
 * Modèle pour la gestion de la table 'agent'
 * Structure: agent(id, nom, post_nom, prenom, sexe, matricule, grade, statut, mdp, telephone, adresse, e_mail, avatar, date_naiss)
 */
class AgentModel extends Model {
  /**
   * Récupère tous les agents
   * @param {Object} options - Options de pagination et de tri
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getAllAgents(options = {}) {
    const { limit = null, offset = 0, sortBy = 'nom', sortDir = 'ASC' } = options;
    
    let sql = 'SELECT * FROM agent';
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
   * Récupère un agent par son ID
   * @param {number} id - ID de l'agent
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getAgentById(id) {
    const result = await this.query('SELECT * FROM agent WHERE id = ?', [id]);
    
    if (result.success && (Array.isArray(result.data) && result.data.length === 0)) {
      return this.errorResponse('Agent not found', 404);
    }
    
    return result;
  }

  /**
   * Récupère un agent par son matricule
   * @param {string} matricule - Matricule de l'agent
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getAgentByMatricule(matricule) {
    const result = await this.query('SELECT * FROM agent WHERE matricule = ?', [matricule]);
    
    if (result.success && (Array.isArray(result.data) && result.data.length === 0)) {
      return this.errorResponse('Agent not found', 404);
    }
    
    return result;
  }

  /**
   * Récupère un agent par son email
   * @param {string} email - Email de l'agent
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getAgentByEmail(email) {
    const result = await this.query('SELECT * FROM agent WHERE e_mail = ?', [email]);
    
    if (result.success && (Array.isArray(result.data) && result.data.length === 0)) {
      return this.errorResponse('Agent not found', 404);
    }
    
    return result;
  }

  /**
   * Recherche des agents selon différents critères
   * @param {string} searchTerm - Terme de recherche
   * @param {Object} options - Options de pagination et de tri
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async searchAgents(searchTerm, options = {}) {
    const { limit = null, offset = 0, sortBy = 'nom', sortDir = 'ASC' } = options;
    
    let sql = `
      SELECT * FROM agent 
      WHERE nom LIKE ? 
         OR post_nom LIKE ? 
         OR prenom LIKE ? 
         OR matricule LIKE ? 
         OR grade LIKE ? 
         OR e_mail LIKE ?
    `;
    const searchParam = `%${searchTerm}%`;
    const params = [searchParam, searchParam, searchParam, searchParam, searchParam, searchParam];
    
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
   * Filtre les agents selon différents critères
   * @param {Object} filters - Critères de filtrage
   * @param {Object} options - Options de pagination et de tri
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async filterAgents(filters = {}, options = {}) {
    const { limit = null, offset = 0, sortBy = 'nom', sortDir = 'ASC' } = options;
    
    let sql = 'SELECT * FROM agent WHERE 1=1';
    const params = [];
    
    // Appliquer les filtres
    if (filters.sexe) {
      sql += ' AND sexe = ?';
      params.push(filters.sexe);
    }
    
    if (filters.grade) {
      sql += ' AND grade = ?';
      params.push(filters.grade);
    }
    
    if (filters.statut) {
      sql += ' AND statut = ?';
      params.push(filters.statut);
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
   * Crée un nouvel agent
   * @param {Object} agentData - Données de l'agent à créer
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async createAgent(agentData) {
    // Valider les champs requis
    const requiredFields = ['nom', 'matricule'];
    const missingFields = requiredFields.filter(field => !agentData[field]);
    
    if (missingFields.length > 0) {
      return this.errorResponse(`Missing required fields: ${missingFields.join(', ')}`, 400);
    }
    
    // Vérifier si un agent avec ce matricule existe déjà
    const matriculeExists = await this.query('SELECT id FROM agent WHERE matricule = ?', [agentData.matricule]);
    if (matriculeExists.success && Array.isArray(matriculeExists.data) && matriculeExists.data.length > 0) {
      return this.errorResponse('An agent with this matricule already exists', 409);
    }
    
    // Vérifier si un agent avec cet email existe déjà (si l'email est fourni)
    if (agentData.e_mail) {
      const emailExists = await this.query('SELECT id FROM agent WHERE e_mail = ?', [agentData.e_mail]);
      if (emailExists.success && Array.isArray(emailExists.data) && emailExists.data.length > 0) {
        return this.errorResponse('An agent with this email already exists', 409);
      }
    }
    
    // Préparer les champs et valeurs pour l'insertion
    const fields = Object.keys(agentData);
    const values = fields.map(field => agentData[field]);
    const placeholders = fields.map(() => '?').join(', ');
    
    const sql = `INSERT INTO agent (${fields.join(', ')}) VALUES (${placeholders})`;
    return this.query(sql, values);
  }

  /**
   * Met à jour un agent existant
   * @param {number} id - ID de l'agent
   * @param {Object} agentData - Données à mettre à jour
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async updateAgent(id, agentData) {
    // Vérifier si l'agent existe
    const agentExists = await this.getAgentById(id);
    if (!agentExists.success) {
      return agentExists;
    }
    
    // Vérifier si les données sont fournies
    if (!agentData || Object.keys(agentData).length === 0) {
      return this.errorResponse('No data provided for update', 400);
    }
    
    // Vérifier si un autre agent a déjà ce matricule (si le matricule est modifié)
    if (agentData.matricule) {
      const matriculeExists = await this.query(
        'SELECT id FROM agent WHERE matricule = ? AND id != ?', 
        [agentData.matricule, id]
      );
      
      if (matriculeExists.success && Array.isArray(matriculeExists.data) && matriculeExists.data.length > 0) {
        return this.errorResponse('Another agent with this matricule already exists', 409);
      }
    }
    
    // Vérifier si un autre agent a déjà cet email (si l'email est modifié)
    if (agentData.e_mail) {
      const emailExists = await this.query(
        'SELECT id FROM agent WHERE e_mail = ? AND id != ?', 
        [agentData.e_mail, id]
      );
      
      if (emailExists.success && Array.isArray(emailExists.data) && emailExists.data.length > 0) {
        return this.errorResponse('Another agent with this email already exists', 409);
      }
    }
    
    // Construire la requête SQL dynamiquement
    const fields = Object.keys(agentData);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => agentData[field]);
    values.push(id);
    
    const sql = `UPDATE agent SET ${setClause} WHERE id = ?`;
    return this.query(sql, values);
  }

  /**
   * Met à jour partiellement un agent existant
   * @param {number} id - ID de l'agent
   * @param {Object} patchData - Données partielles à mettre à jour
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async patchAgent(id, patchData) {
    return this.updateAgent(id, patchData);
  }

  /**
   * Supprime un agent
   * @param {number} id - ID de l'agent
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async deleteAgent(id) {
    // Vérifier si l'agent existe
    const agentExists = await this.getAgentById(id);
    if (!agentExists.success) {
      return agentExists;
    }
    
    // Vérifier si l'agent est référencé dans d'autres tables (à adapter selon votre schéma)
    // Par exemple, vérifiez s'il existe des affectations pour cet agent
    // const hasAffectations = await this.query('SELECT id FROM affectation WHERE id_agent = ? LIMIT 1', [id]);
    // if (hasAffectations.success && Array.isArray(hasAffectations.data) && hasAffectations.data.length > 0) {
    //   return this.errorResponse('Cannot delete agent that has affectations', 400);
    // }
    
    return this.query('DELETE FROM agent WHERE id = ?', [id]);
  }

  /**
   * Met à jour le mot de passe d'un agent
   * @param {number} id - ID de l'agent
   * @param {string} oldPassword - Ancien mot de passe
   * @param {string} newPassword - Nouveau mot de passe
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async updatePassword(id, oldPassword, newPassword) {
    // Vérifier si l'agent existe
    const agentExists = await this.getAgentById(id);
    if (!agentExists.success) {
      return agentExists;
    }
    
    // Vérifier si l'ancien mot de passe correspond
    const passwordCheck = await this.query(
      'SELECT id FROM agent WHERE id = ? AND mdp = ?', 
      [id, oldPassword]
    );
    
    if (passwordCheck.success && Array.isArray(passwordCheck.data) && passwordCheck.data.length === 0) {
      return this.errorResponse('Incorrect password', 401);
    }
    
    // Mettre à jour le mot de passe
    return this.query('UPDATE agent SET mdp = ? WHERE id = ?', [newPassword, id]);
  }

  /**
   * Met à jour l'avatar d'un agent
   * @param {number} id - ID de l'agent
   * @param {string} avatarPath - Chemin vers l'image d'avatar
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async updateAvatar(id, avatarPath) {
    // Vérifier si l'agent existe
    const agentExists = await this.getAgentById(id);
    if (!agentExists.success) {
      return agentExists;
    }
    
    return this.query('UPDATE agent SET avatar = ? WHERE id = ?', [avatarPath, id]);
  }

  /**
   * Vérifie les identifiants d'un agent (pour connexion)
   * @param {string} login - Matricule ou email
   * @param {string} password - Mot de passe
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async verifyCredentials(login, password) {
    if (!login || !password) {
      return this.errorResponse('Login and password are required', 400);
    }
    
    // Vérifier si le login est un email ou un matricule
    let sql;
    if (login.includes('@')) {
      sql = 'SELECT * FROM agent WHERE e_mail = ? AND mdp = ?';
    } else {
      sql = 'SELECT * FROM agent WHERE matricule = ? AND mdp = ?';
    }
    
    const result = await this.query(sql, [login, password]);
    
    if (result.success && Array.isArray(result.data) && result.data.length === 0) {
      return this.errorResponse('Invalid credentials', 401);
    }
    
    // Ne pas renvoyer le mot de passe dans la réponse
    if (result.success && Array.isArray(result.data) && result.data.length > 0) {
      const agent = result.data[0];
      delete agent.mdp; // Supprimer le mot de passe des données renvoyées
    }
    
    return result;
  }

  /**
   * Compte le nombre total d'agents
   * @param {Object} filters - Filtres optionnels
   * @returns {Promise<number>} - Nombre d'agents
   */
  async countAgents(filters = {}) {
    let sql = 'SELECT COUNT(*) AS count FROM agent WHERE 1=1';
    const params = [];
    
    // Appliquer les filtres
    if (filters.sexe) {
      sql += ' AND sexe = ?';
      params.push(filters.sexe);
    }
    
    if (filters.grade) {
      sql += ' AND grade = ?';
      params.push(filters.grade);
    }
    
    if (filters.statut) {
      sql += ' AND statut = ?';
      params.push(filters.statut);
    }
    
    const result = await this.query(sql, params);
    
    if (result.success && Array.isArray(result.data) && result.data.length > 0) {
      return result.data[0].count;
    }
    
    return 0;
  }

  /**
   * Récupère les statistiques des agents (par sexe, grade, statut)
   * @returns {Promise<Object>} - Statistiques des agents
   */
  async getAgentStats() {
    const stats = {
      total: 0,
      bySex: {},
      byGrade: {},
      byStatus: {}
    };
    
    // Nombre total d'agents
    const totalResult = await this.query('SELECT COUNT(*) AS count FROM agent');
    if (totalResult.success && Array.isArray(totalResult.data) && totalResult.data.length > 0) {
      stats.total = totalResult.data[0].count;
    }
    
    // Répartition par sexe
    const sexResult = await this.query('SELECT sexe, COUNT(*) AS count FROM agent GROUP BY sexe');
    if (sexResult.success && Array.isArray(sexResult.data)) {
      sexResult.data.forEach(row => {
        stats.bySex[row.sexe] = row.count;
      });
    }
    
    // Répartition par grade
    const gradeResult = await this.query('SELECT grade, COUNT(*) AS count FROM agent GROUP BY grade');
    if (gradeResult.success && Array.isArray(gradeResult.data)) {
      gradeResult.data.forEach(row => {
        stats.byGrade[row.grade] = row.count;
      });
    }
    
    // Répartition par statut
    const statutResult = await this.query('SELECT statut, COUNT(*) AS count FROM agent GROUP BY statut');
    if (statutResult.success && Array.isArray(statutResult.data)) {
      statutResult.data.forEach(row => {
        stats.byStatus[row.statut] = row.count;
      });
    }
    
    return stats;
  }

  /**
   * Vérifie si un matricule existe déjà
   * @param {string} matricule - Matricule à vérifier
   * @param {number} excludeId - ID de l'agent à exclure (pour les mises à jour)
   * @returns {Promise<boolean>} - True si le matricule existe déjà
   */
  async isMatriculeExists(matricule, excludeId = null) {
    let sql = 'SELECT id FROM agent WHERE matricule = ?';
    const params = [matricule];
    
    if (excludeId !== null) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }
    
    const result = await this.query(sql, params);
    return result.success && Array.isArray(result.data) && result.data.length > 0;
  }

  /**
   * Vérifie si un email existe déjà
   * @param {string} email - Email à vérifier
   * @param {number} excludeId - ID de l'agent à exclure (pour les mises à jour)
   * @returns {Promise<boolean>} - True si l'email existe déjà
   */
  async isEmailExists(email, excludeId = null) {
    if (!email) return false;
    
    let sql = 'SELECT id FROM agent WHERE e_mail = ?';
    const params = [email];
    
    if (excludeId !== null) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }
    
    const result = await this.query(sql, params);
    return result.success && Array.isArray(result.data) && result.data.length > 0;
  }

  
  /**
   * Supprime un type de personnel
   * @param {number} id - ID du type de personnel
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async deletePersonnel(id) {
    // Vérifier si le type de personnel existe
    const checkResult = await this.getPersonnelById(id);
    if (!checkResult.success) {
      return checkResult;
    }
    
    // Vérifier si le type de personnel est utilisé dans des postes
    const posteCheck = await this.query('SELECT id FROM poste WHERE id_personnel = ? LIMIT 1', [id]);
    if (posteCheck.success && Array.isArray(posteCheck.data) && posteCheck.data.length > 0) {
      return this.errorResponse('Cannot delete personnel type that is used in postes', 400);
    }
    
    return this.query('DELETE FROM personnel WHERE id = ?', [id]);
  }

  /**
   * ------------ MÉTHODES UTILITAIRES POUR LA GESTION DES AFFECTATIONS ------------
   */

  /**
   * Récupère toutes les affectations pour une section spécifique
   * @param {number} sectionId - ID de la section
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getAffectationsBySectionId(sectionId) {
    // Cette requête suppose une relation entre postes et sections
    // Ajustez selon votre schéma de base de données si nécessaire
    return this.query(`
      SELECT a.*, p.designation as poste_designation 
      FROM affectation a
      JOIN poste p ON a.id_poste = p.id
      JOIN section s ON p.id_section = s.id  -- Cette jointure dépend de votre modèle
      WHERE s.id = ?
      ORDER BY a.id
    `, [sectionId]);
  }

  /**
   * Vérifie si un agent a une affectation à un poste spécifique
   * @param {number} agentId - ID de l'agent
   * @param {number} posteId - ID du poste
   * @returns {Promise<boolean>} - True si l'affectation existe
   */
  async hasAffectation(agentId, posteId) {
    const result = await this.query(
      'SELECT id FROM affectation WHERE id_agent = ? AND id_poste = ?',
      [agentId, posteId]
    );
    
    return result.success && Array.isArray(result.data) && result.data.length > 0;
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
   * ------------ MÉTHODES POUR LA GESTION DES ADMINISTRATEURS SYSTÈME ------------
   * Structure: administration(id, id_agent, mdp)
   */
  
  /**
   * Récupère tous les administrateurs du système
   * @param {Object} options - Options de pagination et de tri
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getAllAdmins(options = {}) {
    const { limit = null, offset = 0, sortBy = 'a.nom', sortDir = 'ASC' } = options;
    
    let sql = `
      SELECT adm.id, adm.id_agent, a.nom, a.post_nom, a.prenom, a.matricule, 
             a.grade, a.statut, a.telephone, a.e_mail, a.avatar
      FROM administration adm
      JOIN agent a ON adm.id_agent = a.id
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
   * Vérifie si un agent est administrateur du système
   * @param {number} agentId - ID de l'agent
   * @returns {Promise<boolean>} - True si l'agent est administrateur
   */
  async isAdmin(agentId) {
    const result = await this.query(
      'SELECT id FROM administration WHERE id_agent = ? LIMIT 1',
      [agentId]
    );
    
    return result.success && Array.isArray(result.data) && result.data.length > 0;
  }

  /**
   * Récupère un administrateur par son ID d'administrateur
   * @param {number} adminId - ID de l'administrateur
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getAdminById(adminId) {
    const sql = `
      SELECT adm.id, adm.id_agent, a.nom, a.post_nom, a.prenom, a.matricule, 
             a.grade, a.statut, a.telephone, a.e_mail, a.avatar
      FROM administration adm
      JOIN agent a ON adm.id_agent = a.id
      WHERE adm.id = ?
    `;
    
    const result = await this.query(sql, [adminId]);
    
    if (result.success && (Array.isArray(result.data) && result.data.length === 0)) {
      return this.errorResponse('Administrator not found', 404);
    }
    
    return result;
  }

  /**
   * Récupère un administrateur par son ID d'agent
   * @param {number} agentId - ID de l'agent
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getAdminByAgentId(agentId) {
    const sql = `
      SELECT adm.id, adm.id_agent, a.nom, a.post_nom, a.prenom, a.matricule, 
             a.grade, a.statut, a.telephone, a.e_mail, a.avatar
      FROM administration adm
      JOIN agent a ON adm.id_agent = a.id
      WHERE adm.id_agent = ?
    `;
    
    const result = await this.query(sql, [agentId]);
    
    if (result.success && (Array.isArray(result.data) && result.data.length === 0)) {
      return this.errorResponse('Administrator not found for this agent', 404);
    }
    
    return result;
  }

  /**
   * Ajoute un agent comme administrateur du système
   * @param {number} agentId - ID de l'agent
   * @param {string} password - Mot de passe d'administrateur (peut être différent du mot de passe agent)
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async addAdmin(agentId, password) {
    // Vérifier si l'agent existe
    const agentExists = await this.getAgentById(agentId);
    if (!agentExists.success) {
      return agentExists;
    }
    
    // Vérifier si l'agent est déjà administrateur
    const isAdminAlready = await this.isAdmin(agentId);
    if (isAdminAlready) {
      return this.errorResponse('This agent is already an administrator', 409);
    }
    
    // Valider le mot de passe
    if (!password || password.trim() === '') {
      return this.errorResponse('Password is required', 400);
    }
    
    // Dans une application réelle, nous devrions hasher le mot de passe avant de l'enregistrer
    // Exemple: const hashedPassword = await bcrypt.hash(password, 10);
    
    return this.query(
      'INSERT INTO administration (id_agent, mdp) VALUES (?, ?)',
      [agentId, password]
    );
  }

  /**
   * Met à jour le mot de passe d'un administrateur
   * @param {number} agentId - ID de l'agent administrateur
   * @param {string} currentPassword - Mot de passe actuel
   * @param {string} newPassword - Nouveau mot de passe
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async updateAdminPassword(agentId, currentPassword, newPassword) {
    // Vérifier si l'agent est administrateur
    const adminInfo = await this.query(
      'SELECT * FROM administration WHERE id_agent = ?',
      [agentId]
    );
    
    if (adminInfo.success && (Array.isArray(adminInfo.data) && adminInfo.data.length === 0)) {
      return this.errorResponse('This agent is not an administrator', 404);
    }
    
    // Vérifier si le mot de passe actuel est correct
    const passwordCheck = await this.query(
      'SELECT id FROM administration WHERE id_agent = ? AND mdp = ?',
      [agentId, currentPassword]
    );
    
    if (passwordCheck.success && (Array.isArray(passwordCheck.data) && passwordCheck.data.length === 0)) {
      return this.errorResponse('Current password is incorrect', 401);
    }
    
    // Valider le nouveau mot de passe
    if (!newPassword || newPassword.trim() === '') {
      return this.errorResponse('New password is required', 400);
    }
    
    // Dans une application réelle, nous devrions hasher le nouveau mot de passe
    // Exemple: const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    return this.query(
      'UPDATE administration SET mdp = ? WHERE id_agent = ?',
      [newPassword, agentId]
    );
  }

  /**
   * Supprime les droits d'administrateur d'un agent
   * @param {number} agentId - ID de l'agent
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async removeAdmin(agentId) {
    // Vérifier si l'agent est administrateur
    const isAdmin = await this.isAdmin(agentId);
    if (!isAdmin) {
      return this.errorResponse('This agent is not an administrator', 404);
    }
    
    return this.query('DELETE FROM administration WHERE id_agent = ?', [agentId]);
  }

  /**
   * Authentifie un administrateur système
   * @param {string} matricule - Matricule de l'agent
   * @param {string} password - Mot de passe administrateur
   * @returns {Promise<Object>} - Résultat avec métadonnées et informations sur l'administrateur
   */
  async authenticateAdmin(matricule, password) {
    if (!matricule || !password) {
      return this.errorResponse('Matricule and password are required', 400);
    }
    
    // Récupérer l'agent par son matricule
    const agentResult = await this.getAgentByMatricule(matricule);
    if (!agentResult.success) {
      return this.errorResponse('Invalid credentials', 401);
    }
    
    const agentId = agentResult.data[0].id;
    
    // Vérifier si l'agent est administrateur et si le mot de passe est correct
    const adminAuth = await this.query(
      'SELECT adm.id, adm.id_agent FROM administration adm WHERE adm.id_agent = ? AND adm.mdp = ?',
      [agentId, password]
    );
    
    if (adminAuth.success && (Array.isArray(adminAuth.data) && adminAuth.data.length === 0)) {
      return this.errorResponse('Invalid credentials or insufficient privileges', 401);
    }
    
    // Récupérer les informations complètes de l'administrateur
    const adminInfo = adminAuth.data[0];
    const agent = agentResult.data[0];
    
    // Ne pas renvoyer le mot de passe dans la réponse
    delete agent.mdp;
    
    return this.successResponse({
      admin_id: adminInfo.id,
      agent_id: adminInfo.id_agent,
      nom: agent.nom,
      post_nom: agent.post_nom,
      prenom: agent.prenom,
      matricule: agent.matricule,
      email: agent.e_mail,
      avatar: agent.avatar,
      grade: agent.grade,
      statut: agent.statut,
      role: 'admin'
    });
  }

  /**
   * Vérifie si les identifiants d'administrateur sont valides (sans renvoyer les détails)
   * @param {string} matricule - Matricule de l'agent
   * @param {string} password - Mot de passe administrateur
   * @returns {Promise<boolean>} - True si les identifiants sont valides
   */
  async verifyAdminCredentials(matricule, password) {
    const authResult = await this.authenticateAdmin(matricule, password);
    return authResult.success;
  }

  /**
   * Récupère la liste des administrateurs système avec leurs informations détaillées
   * @returns {Promise<Object>} - Résultat avec métadonnées et liste des administrateurs
   */
  async getDetailedAdmins() {
    const sql = `
      SELECT adm.id as admin_id, adm.id_agent,
             a.nom, a.post_nom, a.prenom, a.matricule, a.grade, a.statut, a.e_mail, a.telephone, a.avatar,
             (SELECT COUNT(*) FROM jury j WHERE j.id_president = a.id OR j.id_secretaire = a.id OR j.id_membre = a.id) as jury_count
      FROM administration adm
      JOIN agent a ON adm.id_agent = a.id
      ORDER BY a.nom, a.post_nom
    `;
    
    return this.query(sql);
  }

  /**
   * Ajoute les informations administrateur à un objet agent
   * @param {Object} agent - Objet agent
   * @returns {Promise<Object>} - Agent avec des informations administrateur si applicable
   */
  async enrichAgentWithAdminInfo(agent) {
    if (!agent || !agent.id) {
      return agent;
    }
    
    const isAdmin = await this.isAdmin(agent.id);
    if (isAdmin) {
      const adminInfo = await this.getAdminByAgentId(agent.id);
      if (adminInfo.success) {
        agent.is_admin = true;
        agent.admin_id = adminInfo.data[0].id;
      }
    } else {
      agent.is_admin = false;
    }
    
    return agent;
  }
  
  /**
   * Extension de la méthode getAgentWithFullInfo pour inclure les informations d'administrateur
   */
  async getAgentWithFullInfo(id) {
    // Récupérer les informations de base de l'agent
    const agentResult = await this.getAgentById(id);
    if (!agentResult.success) {
      return agentResult;
    }
    
    const agent = agentResult.data[0];
    const fullInfo = { ...agent, administratif: null, is_admin: false };
    
    // Récupérer les informations administratives (si elles existent)
    const adminResult = await this.getAdministratifAgent(id).catch(() => null);
    if (adminResult && adminResult.success) {
      fullInfo.administratif = adminResult.data[0];
    }
    
    // Vérifier si l'agent est administrateur
    const isAdmin = await this.isAdmin(id);
    if (isAdmin) {
      fullInfo.is_admin = true;
      const adminInfo = await this.getAdminByAgentId(id);
      if (adminInfo.success) {
        fullInfo.admin_id = adminInfo.data[0].id;
      }
    }
    
    // Récupérer d'autres informations associées si besoin
    // (origine, affectations, etc. si vous avez intégré ces méthodes)
    
    return this.successResponse(fullInfo);
  }
}

module.exports = AgentModel;