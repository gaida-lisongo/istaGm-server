const { db } = require('../config');

/**
 * Classe de base pour encapsuler les réponses de la base de données
 */
class Model {
  /**
   * Exécute une requête SQL personnalisée
   * @param {string} sql - Requête SQL
   * @param {Array} params - Paramètres pour la requête préparée
   * @returns {Object} - Résultat avec métadonnées
   */
  async query(sql, params = []) {
    try {
      const result = await db.query(sql, params);
      
      return {
        success: true,
        data: result,
        metadata: {
          affectedRows: result.affectedRows || 0,
          changedRows: result.changedRows || 0,
          insertId: result.insertId || null,
          status: this._getStatusMessage(result)
        }
      };
    } catch (error) {
      console.error('Query execution error:', error);
      return {
        success: false,
        error: error.message,
        metadata: {
          code: error.code,
          sqlState: error.sqlState,
          errno: error.errno
        }
      };
    }
  }

  /**
   * Génère un message de statut basé sur les résultats de la requête
   * @param {Object} result - Résultat de la requête MySQL
   * @returns {string} - Message de statut
   * @private
   */
  _getStatusMessage(result) {
    if (!result) return 'No result';
    
    if (result.affectedRows === 0) {
      return 'No rows affected';
    }
    
    if (result.insertId) {
      return `Record inserted with ID: ${result.insertId}`;
    }
    
    if (result.changedRows) {
      return `${result.changedRows} row(s) modified`;
    }
    
    if (result.affectedRows) {
      return `${result.affectedRows} row(s) affected`;
    }
    
    if (Array.isArray(result)) {
      return `${result.length} record(s) found`;
    }
    
    return 'Operation completed';
  }

  /**
   * Récupère le dernier ID inséré
   * @returns {Promise<number|null>} - Dernier ID inséré ou null en cas d'erreur
   */
  async getLastInsertId() {
    const result = await this.query('SELECT LAST_INSERT_ID() as lastId');
    if (result.success && Array.isArray(result.data) && result.data.length > 0) {
      return result.data[0].lastId;
    }
    return null;
  }

  /**
   * Formate une réponse d'erreur
   * @param {string} message - Message d'erreur
   * @param {number} code - Code d'erreur (optionnel)
   * @returns {Object} - Réponse d'erreur formatée
   */
  errorResponse(message, code = null) {
    return {
      success: false,
      error: message,
      metadata: {
        code: code
      }
    };
  }

  /**
   * Formate une réponse de succès
   * @param {*} data - Données à renvoyer
   * @param {Object} metadata - Métadonnées supplémentaires (optionnel)
   * @returns {Object} - Réponse de succès formatée
   */
  successResponse(data, metadata = {}) {
    return {
      success: true,
      data,
      metadata
    };
  }
}

module.exports = Model;