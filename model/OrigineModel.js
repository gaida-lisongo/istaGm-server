const Model = require('./Model');

/**
 * Modèle pour la gestion des origines géographiques
 * Structure des tables:
 * - pays(id, nomPays, codeTel)
 * - province(id, id_pays, nomProvince)
 * - ville(id, nomVille, id_province)
 * - origine_agent(id, id_agent, id_ville)
 * - origine_etudiant(id, id_etudiant, id_ville)
 */
class OrigineModel extends Model {
  /**
   * ------------ MÉTHODES POUR LA GESTION DES PAYS ------------
   */

  /**
   * Récupère tous les pays
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getAllPays() {
    return this.query('SELECT * FROM pays ORDER BY nomPays');
  }

  /**
   * Récupère un pays par son ID
   * @param {number} id - ID du pays
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getPaysById(id) {
    const result = await this.query('SELECT * FROM pays WHERE id = ?', [id]);
    
    if (result.success && (Array.isArray(result.data) && result.data.length === 0)) {
      return this.errorResponse('Pays not found', 404);
    }
    
    return result;
  }

  /**
   * Crée un nouveau pays
   * @param {string} nomPays - Nom du pays
   * @param {string} codeTel - Code téléphonique du pays (optionnel)
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async createPays(nomPays, codeTel = null) {
    if (!nomPays || nomPays.trim() === '') {
      return this.errorResponse('Nom du pays is required', 400);
    }
    
    // Vérifier si le pays existe déjà
    const paysExists = await this.query('SELECT id FROM pays WHERE nomPays = ?', [nomPays]);
    if (paysExists.success && Array.isArray(paysExists.data) && paysExists.data.length > 0) {
      return this.errorResponse('This country already exists', 409);
    }
    
    // Vérifier si le code téléphonique est déjà utilisé
    if (codeTel && codeTel.trim() !== '') {
      const codeTelExists = await this.query('SELECT id FROM pays WHERE codeTel = ?', [codeTel]);
      if (codeTelExists.success && Array.isArray(codeTelExists.data) && codeTelExists.data.length > 0) {
        return this.errorResponse('This telephone code is already used by another country', 409);
      }
    }
    
    return this.query(
      'INSERT INTO pays (nomPays, codeTel) VALUES (?, ?)',
      [nomPays, codeTel]
    );
  }

  /**
   * Met à jour un pays
   * @param {number} id - ID du pays
   * @param {Object} paysData - Données à mettre à jour (nomPays, codeTel)
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async updatePays(id, paysData) {
    // Vérifier si le pays existe
    const paysExists = await this.getPaysById(id);
    if (!paysExists.success) {
      return paysExists;
    }
    
    // Vérifier si les données sont fournies
    if (!paysData || Object.keys(paysData).length === 0) {
      return this.errorResponse('No data provided for update', 400);
    }
    
    // Vérifier si un pays avec le même nom existe déjà
    if (paysData.nomPays) {
      const paysNameExists = await this.query(
        'SELECT id FROM pays WHERE nomPays = ? AND id != ?', 
        [paysData.nomPays, id]
      );
      
      if (paysNameExists.success && Array.isArray(paysNameExists.data) && paysNameExists.data.length > 0) {
        return this.errorResponse('A country with this name already exists', 409);
      }
    }
    
    // Vérifier si un pays avec le même code téléphonique existe déjà
    if (paysData.codeTel) {
      const codeTelExists = await this.query(
        'SELECT id FROM pays WHERE codeTel = ? AND id != ?', 
        [paysData.codeTel, id]
      );
      
      if (codeTelExists.success && Array.isArray(codeTelExists.data) && codeTelExists.data.length > 0) {
        return this.errorResponse('This telephone code is already used by another country', 409);
      }
    }
    
    // Construire la requête SQL dynamiquement
    const fields = Object.keys(paysData);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => paysData[field]);
    values.push(id);
    
    return this.query(`UPDATE pays SET ${setClause} WHERE id = ?`, values);
  }

  /**
   * Supprime un pays
   * @param {number} id - ID du pays
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async deletePays(id) {
    // Vérifier si le pays existe
    const paysExists = await this.getPaysById(id);
    if (!paysExists.success) {
      return paysExists;
    }
    
    // Vérifier si le pays a des provinces associées
    const provincesCheck = await this.query('SELECT id FROM province WHERE id_pays = ? LIMIT 1', [id]);
    if (provincesCheck.success && Array.isArray(provincesCheck.data) && provincesCheck.data.length > 0) {
      return this.errorResponse('Cannot delete country that has provinces', 400);
    }
    
    return this.query('DELETE FROM pays WHERE id = ?', [id]);
  }

  /**
   * ------------ MÉTHODES POUR LA GESTION DES PROVINCES ------------
   */

  /**
   * Récupère toutes les provinces
   * @param {boolean} includeDetails - Inclure les détails du pays associé
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getAllProvinces(includeDetails = false) {
    let sql = 'SELECT * FROM province ORDER BY nomProvince';
    
    if (includeDetails) {
      sql = `
        SELECT p.*, pays.nomPays, pays.codeTel
        FROM province p
        JOIN pays ON p.id_pays = pays.id
        ORDER BY p.nomProvince
      `;
    }
    
    return this.query(sql);
  }

  /**
   * Récupère une province par son ID
   * @param {number} id - ID de la province
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getProvinceById(id) {
    const result = await this.query(`
      SELECT p.*, pays.nomPays, pays.codeTel
      FROM province p
      JOIN pays ON p.id_pays = pays.id
      WHERE p.id = ?
    `, [id]);
    
    if (result.success && (Array.isArray(result.data) && result.data.length === 0)) {
      return this.errorResponse('Province not found', 404);
    }
    
    return result;
  }

  /**
   * Récupère les provinces d'un pays
   * @param {number} paysId - ID du pays
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getProvincesByPaysId(paysId) {
    // Vérifier si le pays existe
    const paysExists = await this.getPaysById(paysId);
    if (!paysExists.success) {
      return paysExists;
    }
    
    return this.query(
      'SELECT * FROM province WHERE id_pays = ? ORDER BY nomProvince',
      [paysId]
    );
  }

  /**
   * Crée une nouvelle province
   * @param {string} nomProvince - Nom de la province
   * @param {number} paysId - ID du pays
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async createProvince(nomProvince, paysId) {
    if (!nomProvince || nomProvince.trim() === '') {
      return this.errorResponse('Nom de la province is required', 400);
    }
    
    // Vérifier si le pays existe
    const paysExists = await this.getPaysById(paysId);
    if (!paysExists.success) {
      return paysExists;
    }
    
    // Vérifier si la province existe déjà dans ce pays
    const provinceExists = await this.query(
      'SELECT id FROM province WHERE nomProvince = ? AND id_pays = ?',
      [nomProvince, paysId]
    );
    
    if (provinceExists.success && Array.isArray(provinceExists.data) && provinceExists.data.length > 0) {
      return this.errorResponse('This province already exists in this country', 409);
    }
    
    return this.query(
      'INSERT INTO province (nomProvince, id_pays) VALUES (?, ?)',
      [nomProvince, paysId]
    );
  }

  /**
   * Met à jour une province
   * @param {number} id - ID de la province
   * @param {Object} provinceData - Données à mettre à jour (nomProvince, id_pays)
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async updateProvince(id, provinceData) {
    // Vérifier si la province existe
    const provinceExists = await this.getProvinceById(id);
    if (!provinceExists.success) {
      return provinceExists;
    }
    
    // Vérifier si les données sont fournies
    if (!provinceData || Object.keys(provinceData).length === 0) {
      return this.errorResponse('No data provided for update', 400);
    }
    
    // Si l'ID du pays est modifié, vérifier que le nouveau pays existe
    if (provinceData.id_pays) {
      const paysExists = await this.getPaysById(provinceData.id_pays);
      if (!paysExists.success) {
        return paysExists;
      }
    }
    
    // Vérifier s'il existe déjà une province avec le même nom dans le même pays
    if (provinceData.nomProvince) {
      const paysId = provinceData.id_pays || provinceExists.data[0].id_pays;
      
      const duplicateCheck = await this.query(
        'SELECT id FROM province WHERE nomProvince = ? AND id_pays = ? AND id != ?',
        [provinceData.nomProvince, paysId, id]
      );
      
      if (duplicateCheck.success && Array.isArray(duplicateCheck.data) && duplicateCheck.data.length > 0) {
        return this.errorResponse('This province already exists in this country', 409);
      }
    }
    
    // Construire la requête SQL dynamiquement
    const fields = Object.keys(provinceData);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => provinceData[field]);
    values.push(id);
    
    return this.query(`UPDATE province SET ${setClause} WHERE id = ?`, values);
  }

  /**
   * Supprime une province
   * @param {number} id - ID de la province
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async deleteProvince(id) {
    // Vérifier si la province existe
    const provinceExists = await this.getProvinceById(id);
    if (!provinceExists.success) {
      return provinceExists;
    }
    
    // Vérifier si la province a des villes associées
    const villesCheck = await this.query('SELECT id FROM ville WHERE id_province = ? LIMIT 1', [id]);
    if (villesCheck.success && Array.isArray(villesCheck.data) && villesCheck.data.length > 0) {
      return this.errorResponse('Cannot delete province that has cities', 400);
    }
    
    return this.query('DELETE FROM province WHERE id = ?', [id]);
  }

  /**
   * ------------ MÉTHODES POUR LA GESTION DES VILLES ------------
   */

  /**
   * Récupère toutes les villes
   * @param {boolean} includeDetails - Inclure les détails de la province et du pays associés
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getAllVilles(includeDetails = false) {
    let sql = 'SELECT * FROM ville ORDER BY nomVille';
    
    if (includeDetails) {
      sql = `
        SELECT v.*, p.nomProvince, p.id_pays, pays.nomPays, pays.codeTel
        FROM ville v
        JOIN province p ON v.id_province = p.id
        JOIN pays ON p.id_pays = pays.id
        ORDER BY v.nomVille
      `;
    }
    
    return this.query(sql);
  }

  /**
   * Récupère une ville par son ID
   * @param {number} id - ID de la ville
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getVilleById(id) {
    const result = await this.query(`
      SELECT v.*, p.nomProvince, p.id_pays, pays.nomPays, pays.codeTel
      FROM ville v
      JOIN province p ON v.id_province = p.id
      JOIN pays ON p.id_pays = pays.id
      WHERE v.id = ?
    `, [id]);
    
    if (result.success && (Array.isArray(result.data) && result.data.length === 0)) {
      return this.errorResponse('Ville not found', 404);
    }
    
    return result;
  }

  /**
   * Récupère les villes d'une province
   * @param {number} provinceId - ID de la province
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getVillesByProvinceId(provinceId) {
    // Vérifier si la province existe
    const provinceExists = await this.getProvinceById(provinceId);
    if (!provinceExists.success) {
      return provinceExists;
    }
    
    return this.query(
      'SELECT * FROM ville WHERE id_province = ? ORDER BY nomVille',
      [provinceId]
    );
  }

  /**
   * Récupère les villes d'un pays
   * @param {number} paysId - ID du pays
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getVillesByPaysId(paysId) {
    // Vérifier si le pays existe
    const paysExists = await this.getPaysById(paysId);
    if (!paysExists.success) {
      return paysExists;
    }
    
    return this.query(`
      SELECT v.*, p.nomProvince
      FROM ville v
      JOIN province p ON v.id_province = p.id
      WHERE p.id_pays = ?
      ORDER BY v.nomVille
    `, [paysId]);
  }

  /**
   * Crée une nouvelle ville
   * @param {string} nomVille - Nom de la ville
   * @param {number} provinceId - ID de la province
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async createVille(nomVille, provinceId) {
    if (!nomVille || nomVille.trim() === '') {
      return this.errorResponse('Nom de la ville is required', 400);
    }
    
    // Vérifier si la province existe
    const provinceExists = await this.getProvinceById(provinceId);
    if (!provinceExists.success) {
      return provinceExists;
    }
    
    // Vérifier si la ville existe déjà dans cette province
    const villeExists = await this.query(
      'SELECT id FROM ville WHERE nomVille = ? AND id_province = ?',
      [nomVille, provinceId]
    );
    
    if (villeExists.success && Array.isArray(villeExists.data) && villeExists.data.length > 0) {
      return this.errorResponse('This ville already exists in this province', 409);
    }
    
    return this.query(
      'INSERT INTO ville (nomVille, id_province) VALUES (?, ?)',
      [nomVille, provinceId]
    );
  }

  /**
   * Met à jour une ville
   * @param {number} id - ID de la ville
   * @param {Object} villeData - Données à mettre à jour (nomVille, id_province)
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async updateVille(id, villeData) {
    // Vérifier si la ville existe
    const villeExists = await this.getVilleById(id);
    if (!villeExists.success) {
      return villeExists;
    }
    
    // Vérifier si les données sont fournies
    if (!villeData || Object.keys(villeData).length === 0) {
      return this.errorResponse('No data provided for update', 400);
    }
    
    // Si l'ID de la province est modifié, vérifier que la nouvelle province existe
    if (villeData.id_province) {
      const provinceExists = await this.getProvinceById(villeData.id_province);
      if (!provinceExists.success) {
        return provinceExists;
      }
    }
    
    // Vérifier s'il existe déjà une ville avec le même nom dans la même province
    if (villeData.nomVille) {
      const provinceId = villeData.id_province || villeExists.data[0].id_province;
      
      const duplicateCheck = await this.query(
        'SELECT id FROM ville WHERE nomVille = ? AND id_province = ? AND id != ?',
        [villeData.nomVille, provinceId, id]
      );
      
      if (duplicateCheck.success && Array.isArray(duplicateCheck.data) && duplicateCheck.data.length > 0) {
        return this.errorResponse('This ville already exists in this province', 409);
      }
    }
    
    // Construire la requête SQL dynamiquement
    const fields = Object.keys(villeData);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => villeData[field]);
    values.push(id);
    
    return this.query(`UPDATE ville SET ${setClause} WHERE id = ?`, values);
  }

  /**
   * Supprime une ville
   * @param {number} id - ID de la ville
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async deleteVille(id) {
    // Vérifier si la ville existe
    const villeExists = await this.getVilleById(id);
    if (!villeExists.success) {
      return villeExists;
    }
    
    // Vérifier si la ville est utilisée comme origine d'agents
    const agentCheck = await this.query('SELECT id FROM origine_agent WHERE id_ville = ? LIMIT 1', [id]);
    if (agentCheck.success && Array.isArray(agentCheck.data) && agentCheck.data.length > 0) {
      return this.errorResponse('Cannot delete ville that is used as agent origin', 400);
    }
    
    // Vérifier si la ville est utilisée comme origine d'étudiants
    const etudiantCheck = await this.query('SELECT id FROM origine_etudiant WHERE id_ville = ? LIMIT 1', [id]);
    if (etudiantCheck.success && Array.isArray(etudiantCheck.data) && etudiantCheck.data.length > 0) {
      return this.errorResponse('Cannot delete ville that is used as student origin', 400);
    }
    
    return this.query('DELETE FROM ville WHERE id = ?', [id]);
  }

  /**
   * ------------ MÉTHODES POUR LA GESTION DES ORIGINES D'AGENTS ------------
   */

  /**
   * Récupère toutes les origines d'agents avec leurs informations complètes
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getAllOriginesAgents() {
    const sql = `
      SELECT oa.id, oa.id_agent, oa.id_ville,
             v.nomVille, p.id as province_id, p.nomProvince, 
             pays.id as pays_id, pays.nomPays, pays.codeTel
      FROM origine_agent oa
      JOIN ville v ON oa.id_ville = v.id
      JOIN province p ON v.id_province = p.id
      JOIN pays ON p.id_pays = pays.id
      ORDER BY oa.id_agent
    `;
    
    return this.query(sql);
  }

  /**
   * Récupère l'origine d'un agent
   * @param {number} agentId - ID de l'agent
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getOrigineAgent(agentId) {
    const sql = `
      SELECT oa.id, oa.id_agent, oa.id_ville,
             v.nomVille, p.id as province_id, p.nomProvince, 
             pays.id as pays_id, pays.nomPays, pays.codeTel
      FROM origine_agent oa
      JOIN ville v ON oa.id_ville = v.id
      JOIN province p ON v.id_province = p.id
      JOIN pays ON p.id_pays = pays.id
      WHERE oa.id_agent = ?
    `;
    
    const result = await this.query(sql, [agentId]);
    
    if (result.success && (Array.isArray(result.data) && result.data.length === 0)) {
      return this.errorResponse('Origin not found for this agent', 404);
    }
    
    return result;
  }

  /**
   * Définit ou met à jour l'origine d'un agent
   * @param {number} agentId - ID de l'agent
   * @param {number} villeId - ID de la ville d'origine
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async setOrigineAgent(agentId, villeId) {
    // Vérifier si la ville existe
    const villeExists = await this.getVilleById(villeId);
    if (!villeExists.success) {
      return villeExists;
    }
    
    // Vérifier si l'agent a déjà une origine définie
    const originExists = await this.query(
      'SELECT id FROM origine_agent WHERE id_agent = ?', 
      [agentId]
    );
    
    if (originExists.success && Array.isArray(originExists.data) && originExists.data.length > 0) {
      // Mettre à jour l'origine existante
      return this.query(
        'UPDATE origine_agent SET id_ville = ? WHERE id_agent = ?',
        [villeId, agentId]
      );
    } else {
      // Créer une nouvelle entrée d'origine
      return this.query(
        'INSERT INTO origine_agent (id_agent, id_ville) VALUES (?, ?)',
        [agentId, villeId]
      );
    }
  }

  /**
   * Supprime l'origine d'un agent
   * @param {number} agentId - ID de l'agent
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async deleteOrigineAgent(agentId) {
    // Vérifier si l'agent a une origine définie
    const originExists = await this.getOrigineAgent(agentId);
    if (!originExists.success) {
      return originExists;
    }
    
    return this.query('DELETE FROM origine_agent WHERE id_agent = ?', [agentId]);
  }

  /**
   * ------------ MÉTHODES POUR LA GESTION DES ORIGINES D'ÉTUDIANTS ------------
   */

  /**
   * Récupère toutes les origines d'étudiants avec leurs informations complètes
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getAllOriginesEtudiants() {
    const sql = `
      SELECT oe.id, oe.id_etudiant, oe.id_ville,
             v.nomVille, p.id as province_id, p.nomProvince, 
             pays.id as pays_id, pays.nomPays, pays.codeTel
      FROM origine_etudiant oe
      JOIN ville v ON oe.id_ville = v.id
      JOIN province p ON v.id_province = p.id
      JOIN pays ON p.id_pays = pays.id
      ORDER BY oe.id_etudiant
    `;
    
    return this.query(sql);
  }

  /**
   * Récupère l'origine d'un étudiant
   * @param {number} etudiantId - ID de l'étudiant
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getOrigineEtudiant(etudiantId) {
    const sql = `
      SELECT oe.id, oe.id_etudiant, oe.id_ville,
             v.nomVille, p.id as province_id, p.nomProvince, 
             pays.id as pays_id, pays.nomPays, pays.codeTel
      FROM origine_etudiant oe
      JOIN ville v ON oe.id_ville = v.id
      JOIN province p ON v.id_province = p.id
      JOIN pays ON p.id_pays = pays.id
      WHERE oe.id_etudiant = ?
    `;
    
    const result = await this.query(sql, [etudiantId]);
    
    if (result.success && (Array.isArray(result.data) && result.data.length === 0)) {
      return this.errorResponse('Origin not found for this student', 404);
    }
    
    return result;
  }

  /**
   * Définit ou met à jour l'origine d'un étudiant
   * @param {number} etudiantId - ID de l'étudiant
   * @param {number} villeId - ID de la ville d'origine
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async setOrigineEtudiant(etudiantId, villeId) {
    // Vérifier si la ville existe
    const villeExists = await this.getVilleById(villeId);
    if (!villeExists.success) {
      return villeExists;
    }
    
    // Vérifier si l'étudiant a déjà une origine définie
    const originExists = await this.query(
      'SELECT id FROM origine_etudiant WHERE id_etudiant = ?', 
      [etudiantId]
    );
    
    if (originExists.success && Array.isArray(originExists.data) && originExists.data.length > 0) {
      // Mettre à jour l'origine existante
      return this.query(
        'UPDATE origine_etudiant SET id_ville = ? WHERE id_etudiant = ?',
        [villeId, etudiantId]
      );
    } else {
      // Créer une nouvelle entrée d'origine
      return this.query(
        'INSERT INTO origine_etudiant (id_etudiant, id_ville) VALUES (?, ?)',
        [etudiantId, villeId]
      );
    }
  }

  /**
   * Supprime l'origine d'un étudiant
   * @param {number} etudiantId - ID de l'étudiant
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async deleteOrigineEtudiant(etudiantId) {
    // Vérifier si l'étudiant a une origine définie
    const originExists = await this.getOrigineEtudiant(etudiantId);
    if (!originExists.success) {
      return originExists;
    }
    
    return this.query('DELETE FROM origine_etudiant WHERE id_etudiant = ?', [etudiantId]);
  }

  /**
   * ------------ MÉTHODES UTILITAIRES ET DE RECHERCHE ------------
   */

  /**
   * Recherche des villes par nom avec leurs données complètes
   * @param {string} searchTerm - Terme de recherche
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async searchVilles(searchTerm) {
    return this.query(`
      SELECT 
        v.id as ville_id, 
        v.nomVille,
        p.id as province_id,
        p.nomProvince,
        pays.id as pays_id,
        pays.nomPays,
        pays.codeTel,
        CONCAT(v.nomVille, ', ', p.nomProvince, ', ', pays.nomPays) as full_location
      FROM ville v
      JOIN province p ON v.id_province = p.id
      JOIN pays ON p.id_pays = pays.id
      WHERE v.nomVille LIKE ?
      ORDER BY v.nomVille, p.nomProvince, pays.nomPays
    `, [`%${searchTerm}%`]);
  }

  /**
   * Recherche des provinces par nom avec leurs données complètes
   * @param {string} searchTerm - Terme de recherche
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async searchProvinces(searchTerm) {
    return this.query(`
      SELECT 
        p.id as province_id,
        p.nomProvince,
        pays.id as pays_id,
        pays.nomPays,
        pays.codeTel,
        CONCAT(p.nomProvince, ', ', pays.nomPays) as full_location
      FROM province p
      JOIN pays ON p.id_pays = pays.id
      WHERE p.nomProvince LIKE ?
      ORDER BY p.nomProvince, pays.nomPays
    `, [`%${searchTerm}%`]);
  }

  /**
   * Recherche des pays par nom
   * @param {string} searchTerm - Terme de recherche
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async searchPays(searchTerm) {
    return this.query(
      'SELECT * FROM pays WHERE nomPays LIKE ? ORDER BY nomPays',
      [`%${searchTerm}%`]
    );
  }

  /**
   * Récupère le nombre d'agents par pays d'origine
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getAgentCountByPays() {
    const sql = `
      SELECT 
        pays.id, 
        pays.nomPays, 
        COUNT(oa.id) as agent_count
      FROM pays
      LEFT JOIN province p ON pays.id = p.id_pays
      LEFT JOIN ville v ON p.id = v.id_province
      LEFT JOIN origine_agent oa ON v.id = oa.id_ville
      GROUP BY pays.id, pays.nomPays
      ORDER BY agent_count DESC
    `;
    
    return this.query(sql);
  }

  /**
   * Récupère le nombre d'étudiants par pays d'origine
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getEtudiantCountByPays() {
    const sql = `
      SELECT 
        pays.id, 
        pays.nomPays, 
        COUNT(oe.id) as etudiant_count
      FROM pays
      LEFT JOIN province p ON pays.id = p.id_pays
      LEFT JOIN ville v ON p.id = v.id_province
      LEFT JOIN origine_etudiant oe ON v.id = oe.id_ville
      GROUP BY pays.id, pays.nomPays
      ORDER BY etudiant_count DESC
    `;
    
    return this.query(sql);
  }

  /**
   * Formatte une origine complète pour l'affichage
   * @param {Object} origineData - Données d'origine
   * @returns {Object} - Origine formatée
   */
  formatOrigine(origineData) {
    if (!origineData) return null;
    
    return {
      id: origineData.id,
      ville: {
        id: origineData.id_ville,
        nom: origineData.nomVille
      },
      province: {
        id: origineData.province_id,
        nom: origineData.nomProvince
      },
      pays: {
        id: origineData.pays_id,
        nom: origineData.nomPays,
        codeTel: origineData.codeTel
      },
      formatted: `${origineData.nomVille}, ${origineData.nomProvince}, ${origineData.nomPays}`
    };
  }

  /**
   * Récupère et formate l'origine d'un agent
   * @param {number} agentId - ID de l'agent
   * @returns {Promise<Object|null>} - Origine formatée ou null si non trouvée
   */
  async getFormattedOrigineAgent(agentId) {
    const origin = await this.getOrigineAgent(agentId);
    
    if (!origin.success) {
      return null;
    }
    
    return this.formatOrigine(origin.data[0]);
  }

  /**
   * Récupère et formate l'origine d'un étudiant
   * @param {number} etudiantId - ID de l'étudiant
   * @returns {Promise<Object|null>} - Origine formatée ou null si non trouvée
   */
  async getFormattedOrigineEtudiant(etudiantId) {
    const origin = await this.getOrigineEtudiant(etudiantId);
    
    if (!origin.success) {
      return null;
    }
    
    return this.formatOrigine(origin.data[0]);
  }
}

module.exports = OrigineModel;