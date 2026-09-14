/**
 * ModeHandler - Role-based mode switching logic
 * Extracted from dasbor-kuis.js for better maintainability
 * 
 * Handles: guru/siswa/admin mode switching based on user role
 */

export class ModeHandler {
  /**
   * Determine mode based on user role and requested mode
   * @param {string} userRole - User's role (guru/siswa/admin)
   * @param {string} requestedMode - Requested mode (guru/siswa)
   * @returns {string} Effective mode
   */
  static getModeForRole(userRole, requestedMode) {
    // Admin can access any mode
    if (userRole === 'admin') {
      return requestedMode || 'guru';
    }
    
    // Guru can only access guru mode
    if (userRole === 'guru') {
      return 'guru';
    }
    
    // Siswa can only access siswa mode
    if (userRole === 'siswa') {
      return 'siswa';
    }
    
    // Default: siswa mode
    return 'siswa';
  }

  /**
   * Check if user has access to a specific feature
   * @param {string} userRole - User's role
   * @param {string} feature - Feature name
   * @returns {boolean} True if user has access
   */
  static hasAccess(userRole, feature) {
    const permissions = {
      guru: [
        'view_dashboard',
        'edit_nilai',
        'view_leaderboard',
        'view_pantauan',
        'manage_questions',
        'export_data',
      ],
      siswa: [
        'take_quiz',
        'view_own_score',
        'view_own_history',
        'forum',
        'submit_assignment',
      ],
      admin: [
        'view_dashboard',
        'edit_nilai',
        'view_leaderboard',
        'view_pantauan',
        'manage_questions',
        'export_data',
        'take_quiz',
        'view_own_score',
        'view_own_history',
        'forum',
        'submit_assignment',
        'manage_users',
        'system_settings',
      ],
    };

    const rolePermissions = permissions[userRole] || permissions.siswa;
    return rolePermissions.includes(feature);
  }

  /**
   * Get role display name
   * @param {string} role - Role code
   * @returns {string} Display name
   */
  static getRoleDisplayName(role) {
    const names = {
      guru: 'Guru',
      siswa: 'Siswa',
      admin: 'Administrator',
    };
    return names[role] || 'Siswa';
  }

  /**
   * Get allowed modes for a role
   * @param {string} role - User's role
   * @returns {Array<string>} Allowed modes
   */
  static getAllowedModes(role) {
    const allowed = {
      guru: ['guru'],
      siswa: ['siswa'],
      admin: ['guru', 'siswa'],
    };
    return allowed[role] || ['siswa'];
  }

  /**
   * Validate role change
   * @param {string} currentRole - Current user role
   * @param {string} newRole - Requested new role
   * @returns {boolean} True if role change is allowed
   */
  static canChangeRole(currentRole, newRole) {
    // Only admin can change roles
    if (currentRole !== 'admin') return false;
    
    // Valid roles
    const validRoles = ['guru', 'siswa', 'admin'];
    return validRoles.includes(newRole);
  }

  /**
   * Get role-based UI configuration
   * @param {string} role - User's role
   * @returns {Object} UI configuration
   */
  static getUIConfig(role) {
    const configs = {
      guru: {
        showDashboard: true,
        showPantauan: true,
        showLeaderboard: true,
        showEditSoal: true,
        showExport: true,
        showQuiz: false,
        showForum: true,
      },
      siswa: {
        showDashboard: false,
        showPantauan: false,
        showLeaderboard: false,
        showEditSoal: false,
        showExport: false,
        showQuiz: true,
        showForum: true,
      },
      admin: {
        showDashboard: true,
        showPantauan: true,
        showLeaderboard: true,
        showEditSoal: true,
        showExport: true,
        showQuiz: true,
        showForum: true,
      },
    };
    return configs[role] || configs.siswa;
  }
}
