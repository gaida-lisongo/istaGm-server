const Model = require('./Model');

/**
 * Modèle pour la gestion des tables liées aux sections
 * Inclut: section, affectation, poste et personnel
 */
class SectionModel extends Model {
  /**
   * ------------ MÉTHODES POUR LA TABLE SECTION ------------
   */
  
  /**
   * Récupère toutes les sections
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getAllSections() {
    return this.query('SELECT * FROM section ORDER BY designation');
  }

  /**
   * Récupère une section par son ID
   * @param {number} id - ID de la section
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getSectionById(id) {
    const result = await this.query('SELECT * FROM section WHERE id = ?', [id]);
    
    if (result.success && (Array.isArray(result.data) && result.data.length === 0)) {
      return this.errorResponse('Section not found', 404);
    }
    
    return result;
  }

  /**
   * Récupère les sections associées à un membre spécifique
   * @param {number} memberId - ID du membre
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getSectionsByIdMember(memberId) {
    return this.query('SELECT * FROM section WHERE id_chef = ? ORDER BY designation', [memberId]);
  }

  /**
   * Crée une nouvelle section
   * @param {string} designation - Nom de la section
   * @param {number|null} chefId - ID du chef (optionnel)
   * @param {number|null} parentSectionId - ID de la section parent (optionnel)
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async createSection(designation, chefId = null, parentSectionId = null) {
    if (!designation || designation.trim() === '') {
      return this.errorResponse('Designation is required', 400);
    }
    
    // Vérifier si une section avec cette désignation existe déjà
    const checkResult = await this.query('SELECT id FROM section WHERE designation = ?', [designation]);
    
    if (checkResult.success && Array.isArray(checkResult.data) && checkResult.data.length > 0) {
      return this.errorResponse('A section with this designation already exists', 409);
    }
    
    // Insérer la nouvelle section
    return this.query(
      'INSERT INTO section (designation, id_chef, id_sec) VALUES (?, ?, ?)',
      [designation, chefId, parentSectionId]
    );
  }

  /**
   * Met à jour une section existante
   * @param {number} id - ID de la section
   * @param {Object} sectionData - Données à mettre à jour (designation, id_chef, id_sec)
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async updateSection(id, sectionData) {
    // Vérifier si la section existe
    const checkResult = await this.getSectionById(id);
    if (!checkResult.success) {
      return checkResult;
    }
    
    // Vérifier si les données sont fournies
    if (!sectionData || Object.keys(sectionData).length === 0) {
      return this.errorResponse('No data provided for update', 400);
    }
    
    // Vérifier si une section avec cette désignation existe déjà (si la désignation est modifiée)
    if (sectionData.designation) {
      const designationExists = await this.query(
        'SELECT id FROM section WHERE designation = ? AND id != ?', 
        [sectionData.designation, id]
      );
      
      if (designationExists.success && Array.isArray(designationExists.data) && designationExists.data.length > 0) {
        return this.errorResponse('A section with this designation already exists', 409);
      }
    }
    
    // Construire la requête SQL dynamiquement
    const fields = Object.keys(sectionData);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => sectionData[field]);
    values.push(id);
    
    return this.query(`UPDATE section SET ${setClause} WHERE id = ?`, values);
  }

  /**
   * Supprime une section
   * @param {number} id - ID de la section
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async deleteSection(id) {
    // Vérifier si la section existe
    const checkResult = await this.getSectionById(id);
    if (!checkResult.success) {
      return checkResult;
    }
    
    // Vérifier si la section a des sous-sections
    const subSectionsResult = await this.query('SELECT id FROM section WHERE id_sec = ?', [id]);
    if (subSectionsResult.success && Array.isArray(subSectionsResult.data) && subSectionsResult.data.length > 0) {
      return this.errorResponse('Cannot delete a section that has sub-sections', 400);
    }
    
    return this.query('DELETE FROM section WHERE id = ?', [id]);
  }

  /**
   * ------------ MÉTHODES POUR LA TABLE AFFECTATION ------------
   * Structure: affectation(id, id_agent, id_poste)
   */
  
  /**
   * Récupère toutes les affectations
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getAllAffectations() {
    return this.query(`
      SELECT a.*, p.designation as poste_designation 
      FROM affectation a
      JOIN poste p ON a.id_poste = p.id
      ORDER BY a.id
    `);
  }

  /**
   * Récupère une affectation par son ID
   * @param {number} id - ID de l'affectation
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getAffectationById(id) {
    const result = await this.query(`
      SELECT a.*, p.designation as poste_designation 
      FROM affectation a
      JOIN poste p ON a.id_poste = p.id
      WHERE a.id = ?
    `, [id]);
    
    if (result.success && (Array.isArray(result.data) && result.data.length === 0)) {
      return this.errorResponse('Affectation not found', 404);
    }
    
    return result;
  }

  /**
   * Récupère les affectations d'un agent spécifique
   * @param {number} agentId - ID de l'agent
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getAffectationsByAgentId(agentId) {
    return this.query(`
      SELECT a.*, p.designation as poste_designation 
      FROM affectation a
      JOIN poste p ON a.id_poste = p.id
      WHERE a.id_agent = ?
      ORDER BY a.id
    `, [agentId]);
  }

  /**
   * Récupère les affectations pour un poste spécifique
   * @param {number} posteId - ID du poste
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getAffectationsByPosteId(posteId) {
    return this.query(`
      SELECT a.*, p.designation as poste_designation 
      FROM affectation a
      JOIN poste p ON a.id_poste = p.id
      WHERE a.id_poste = ?
      ORDER BY a.id
    `, [posteId]);
  }

  /**
   * Crée une nouvelle affectation
   * @param {number} agentId - ID de l'agent
   * @param {number} posteId - ID du poste
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async createAffectation(agentId, posteId) {
    // Vérifier si les champs obligatoires sont fournis
    if (!agentId || !posteId) {
      return this.errorResponse('Agent ID and Poste ID are required', 400);
    }
    
    // Vérifier si l'agent existe (cette vérification dépend de votre modèle de données)
    // const agentExists = await this.query('SELECT id FROM agent WHERE id = ?', [agentId]);
    // if (agentExists.success && agentExists.data.length === 0) {
    //   return this.errorResponse('Agent not found', 404);
    // }
    
    // Vérifier si le poste existe
    const posteExists = await this.query('SELECT id FROM poste WHERE id = ?', [posteId]);
    if (posteExists.success && Array.isArray(posteExists.data) && posteExists.data.length === 0) {
      return this.errorResponse('Poste not found', 404);
    }
    
    // Vérifier si l'affectation existe déjà
    const affectationExists = await this.query(
      'SELECT id FROM affectation WHERE id_agent = ? AND id_poste = ?',
      [agentId, posteId]
    );
    
    if (affectationExists.success && Array.isArray(affectationExists.data) && affectationExists.data.length > 0) {
      return this.errorResponse('This affectation already exists', 409);
    }
    
    // Créer l'affectation
    return this.query(
      'INSERT INTO affectation (id_agent, id_poste) VALUES (?, ?)',
      [agentId, posteId]
    );
  }

  /**
   * Met à jour une affectation existante
   * @param {number} id - ID de l'affectation
   * @param {Object} affectationData - Données à mettre à jour (id_agent, id_poste)
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async updateAffectation(id, affectationData) {
    // Vérifier si l'affectation existe
    const checkResult = await this.getAffectationById(id);
    if (!checkResult.success) {
      return checkResult;
    }
    
    // Vérifier si les données sont fournies
    if (!affectationData || Object.keys(affectationData).length === 0) {
      return this.errorResponse('No data provided for update', 400);
    }
    
    // Si l'ID du poste est fourni, vérifier si le poste existe
    if (affectationData.id_poste) {
      const posteExists = await this.query('SELECT id FROM poste WHERE id = ?', [affectationData.id_poste]);
      if (posteExists.success && Array.isArray(posteExists.data) && posteExists.data.length === 0) {
        return this.errorResponse('Poste not found', 404);
      }
    }
    
    // Vérifier si la mise à jour créerait un doublon
    if (affectationData.id_agent && affectationData.id_poste) {
      const duplicateCheck = await this.query(
        'SELECT id FROM affectation WHERE id_agent = ? AND id_poste = ? AND id != ?',
        [affectationData.id_agent, affectationData.id_poste, id]
      );
      
      if (duplicateCheck.success && Array.isArray(duplicateCheck.data) && duplicateCheck.data.length > 0) {
        return this.errorResponse('This affectation already exists for another entry', 409);
      }
    }
    
    // Construire la requête SQL dynamiquement
    const fields = Object.keys(affectationData);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => affectationData[field]);
    values.push(id);
    
    return this.query(`UPDATE affectation SET ${setClause} WHERE id = ?`, values);
  }

  /**
   * Supprime une affectation
   * @param {number} id - ID de l'affectation
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async deleteAffectation(id) {
    // Vérifier si l'affectation existe
    const checkResult = await this.getAffectationById(id);
    if (!checkResult.success) {
      return checkResult;
    }
    
    return this.query('DELETE FROM affectation WHERE id = ?', [id]);
  }

  /**
   * ------------ MÉTHODES POUR LA TABLE POSTE ------------
   * Structure: poste(id, designation, id_personnel)
   */
  
  /**
   * Récupère tous les postes
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getAllPostes() {
    return this.query(`
      SELECT p.*, per.designation as personnel_designation 
      FROM poste p
      LEFT JOIN personnel per ON p.id_personnel = per.id
      ORDER BY p.designation
    `);
  }

  /**
   * Récupère un poste par son ID
   * @param {number} id - ID du poste
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getPosteById(id) {
    const result = await this.query(`
      SELECT p.*, per.designation as personnel_designation 
      FROM poste p
      LEFT JOIN personnel per ON p.id_personnel = per.id
      WHERE p.id = ?
    `, [id]);
    
    if (result.success && (Array.isArray(result.data) && result.data.length === 0)) {
      return this.errorResponse('Poste not found', 404);
    }
    
    return result;
  }

  /**
   * Récupère les postes par type de personnel
   * @param {number} personnelId - ID du type de personnel
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getPostesByPersonnelId(personnelId) {
    return this.query(`
      SELECT p.*, per.designation as personnel_designation 
      FROM poste p
      LEFT JOIN personnel per ON p.id_personnel = per.id
      WHERE p.id_personnel = ?
      ORDER BY p.designation
    `, [personnelId]);
  }

  /**
   * Crée un nouveau poste
   * @param {string} designation - Désignation du poste
   * @param {number|null} personnelId - ID du type de personnel (optionnel)
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async createPoste(designation, personnelId = null) {
    if (!designation || designation.trim() === '') {
      return this.errorResponse('Designation is required', 400);
    }
    
    // Vérifier si un poste avec cette désignation existe déjà
    const checkResult = await this.query('SELECT id FROM poste WHERE designation = ?', [designation]);
    
    if (checkResult.success && Array.isArray(checkResult.data) && checkResult.data.length > 0) {
      return this.errorResponse('A poste with this designation already exists', 409);
    }
    
    // Si un type de personnel est spécifié, vérifier s'il existe
    if (personnelId !== null) {
      const personnelExists = await this.query('SELECT id FROM personnel WHERE id = ?', [personnelId]);
      if (personnelExists.success && Array.isArray(personnelExists.data) && personnelExists.data.length === 0) {
        return this.errorResponse('Personnel type not found', 404);
      }
    }
    
    // Insérer le nouveau poste
    return this.query(
      'INSERT INTO poste (designation, id_personnel) VALUES (?, ?)',
      [designation, personnelId]
    );
  }

  /**
   * Met à jour un poste existant
   * @param {number} id - ID du poste
   * @param {Object} posteData - Données à mettre à jour (designation, id_personnel)
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async updatePoste(id, posteData) {
    // Vérifier si le poste existe
    const checkResult = await this.getPosteById(id);
    if (!checkResult.success) {
      return checkResult;
    }
    
    // Vérifier si les données sont fournies
    if (!posteData || Object.keys(posteData).length === 0) {
      return this.errorResponse('No data provided for update', 400);
    }
    
    // Vérifier si un poste avec cette désignation existe déjà (si la désignation est modifiée)
    if (posteData.designation) {
      const designationExists = await this.query(
        'SELECT id FROM poste WHERE designation = ? AND id != ?', 
        [posteData.designation, id]
      );
      
      if (designationExists.success && Array.isArray(designationExists.data) && designationExists.data.length > 0) {
        return this.errorResponse('A poste with this designation already exists', 409);
      }
    }
    
    // Si un type de personnel est spécifié, vérifier s'il existe
    if (posteData.id_personnel !== undefined) {
      if (posteData.id_personnel !== null) {
        const personnelExists = await this.query('SELECT id FROM personnel WHERE id = ?', [posteData.id_personnel]);
        if (personnelExists.success && Array.isArray(personnelExists.data) && personnelExists.data.length === 0) {
          return this.errorResponse('Personnel type not found', 404);
        }
      }
    }
    
    // Construire la requête SQL dynamiquement
    const fields = Object.keys(posteData);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => posteData[field]);
    values.push(id);
    
    return this.query(`UPDATE poste SET ${setClause} WHERE id = ?`, values);
  }

  /**
   * Supprime un poste
   * @param {number} id - ID du poste
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async deletePoste(id) {
    // Vérifier si le poste existe
    const checkResult = await this.getPosteById(id);
    if (!checkResult.success) {
      return checkResult;
    }
    
    // Vérifier si le poste est utilisé dans des affectations
    const affectationCheck = await this.query('SELECT id FROM affectation WHERE id_poste = ? LIMIT 1', [id]);
    if (affectationCheck.success && Array.isArray(affectationCheck.data) && affectationCheck.data.length > 0) {
      return this.errorResponse('Cannot delete poste that is used in affectations', 400);
    }
    
    return this.query('DELETE FROM poste WHERE id = ?', [id]);
  }

  /**
   * ------------ MÉTHODES POUR LA TABLE PERSONNEL ------------
   * Structure: personnel(id, designation)
   */
  
  /**
   * Récupère tous les types de personnel
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getAllPersonnel() {
    return this.query('SELECT * FROM personnel ORDER BY designation');
  }

  /**
   * Récupère un type de personnel par son ID
   * @param {number} id - ID du type de personnel
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async getPersonnelById(id) {
    const result = await this.query('SELECT * FROM personnel WHERE id = ?', [id]);
    
    if (result.success && (Array.isArray(result.data) && result.data.length === 0)) {
      return this.errorResponse('Personnel type not found', 404);
    }
    
    return result;
  }

  /**
   * Crée un nouveau type de personnel
   * @param {string} designation - Désignation du type de personnel
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async createPersonnel(designation) {
    if (!designation || designation.trim() === '') {
      return this.errorResponse('Designation is required', 400);
    }
    
    // Vérifier si un type de personnel avec cette désignation existe déjà
    const checkResult = await this.query('SELECT id FROM personnel WHERE designation = ?', [designation]);
    
    if (checkResult.success && Array.isArray(checkResult.data) && checkResult.data.length > 0) {
      return this.errorResponse('A personnel type with this designation already exists', 409);
    }
    
    // Insérer le nouveau type de personnel
    return this.query('INSERT INTO personnel (designation) VALUES (?)', [designation]);
  }

  /**
   * Met à jour un type de personnel existant
   * @param {number} id - ID du type de personnel
   * @param {string} designation - Nouvelle désignation
   * @returns {Promise<Object>} - Résultat avec métadonnées
   */
  async updatePersonnel(id, designation) {
    // Vérifier si le type de personnel existe
    const checkResult = await this.getPersonnelById(id);
    if (!checkResult.success) {
      return checkResult;
    }
    
    // Vérifier si la désignation est fournie
    if (!designation || designation.trim() === '') {
      return this.errorResponse('Designation is required', 400);
    }
    
    // Vérifier si un type de personnel avec cette désignation existe déjà
    const designationExists = await this.query(
      'SELECT id FROM personnel WHERE designation = ? AND id != ?', 
      [designation, id]
    );
    
    if (designationExists.success && Array.isArray(designationExists.data) && designationExists.data.length > 0) {
      return this.errorResponse('A personnel type with this designation already exists', 409);
    }
    
    return this.query('UPDATE personnel SET designation = ? WHERE id = ?', [designation, id]);
  }

}

module.exports = SectionModel;