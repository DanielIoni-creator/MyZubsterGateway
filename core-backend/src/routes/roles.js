const express = require('express');
const router = express.Router();
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');

// ============================================
// TUTTE LE ROTTE RICHIEDONO AUTENTICAZIONE
// ============================================
router.use(auth.verifyToken);

// ============================================
// MIDDLEWARE RBAC PER ADMIN
// ============================================
const requireRolesAdmin = rbac.hasPermission('roles', 'admin');
const requirePermissionsAdmin = rbac.hasPermission('permissions', 'admin');

// ============================================
// 1. GESTIONE RUOLI (ROLES)
// ============================================

// GET /api/admin/roles — Lista tutti i ruoli con permessi
router.get('/roles', requireRolesAdmin, async (req, res) => {
  try {
    const roles = await Role.find().populate('permissions').sort({ name: 1 });
    res.json({
      success: true,
      data: roles
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/admin/roles/:id — Dettaglio singolo ruolo
router.get('/roles/:id', requireRolesAdmin, async (req, res) => {
  try {
    const role = await Role.findById(req.params.id).populate('permissions');
    if (!role) {
      return res.status(404).json({ success: false, error: 'Role not found' });
    }
    res.json({ success: true, data: role });
  } catch (error) {
    console.error('Error fetching role:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/admin/roles — Crea un nuovo ruolo
router.post('/roles', requireRolesAdmin, async (req, res) => {
  try {
    const { name, description, permissionIds } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Role name is required' });
    }

    const normalizedName = name.toLowerCase().trim();

    // Verifica se esiste già
    const existing = await Role.findOne({ name: normalizedName });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Role already exists' });
    }

    // Valida i permissionIds se forniti
    const permissions = [];
    if (permissionIds && Array.isArray(permissionIds)) {
      for (const id of permissionIds) {
        const perm = await Permission.findById(id);
        if (perm) {
          permissions.push(perm._id);
        }
      }
    }

    const role = await Role.create({
      name: normalizedName,
      description: description || '',
      permissions
    });

    await role.populate('permissions');

    res.status(201).json({
      success: true,
      data: role,
      message: 'Role created successfully'
    });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/admin/roles/:id — Aggiorna un ruolo esistente
router.put('/roles/:id', requireRolesAdmin, async (req, res) => {
  try {
    const { name, description, permissionIds } = req.body;

    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, error: 'Role not found' });
    }

    // Proteggi i ruoli di sistema
    if (['admin', 'user', 'moderator', 'robot'].includes(role.name) && name && name.toLowerCase() !== role.name) {
      return res.status(403).json({
        success: false,
        error: 'Cannot rename system roles (admin, user, moderator, robot)'
      });
    }

    if (name) role.name = name.toLowerCase().trim();
    if (description !== undefined) role.description = description;

    if (permissionIds && Array.isArray(permissionIds)) {
      const validPerms = [];
      for (const id of permissionIds) {
        const perm = await Permission.findById(id);
        if (perm) validPerms.push(perm._id);
      }
      role.permissions = validPerms;
    }

    await role.save();
    await role.populate('permissions');

    res.json({
      success: true,
      data: role,
      message: 'Role updated successfully'
    });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/admin/roles/:id — Elimina un ruolo
router.delete('/roles/:id', requireRolesAdmin, async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, error: 'Role not found' });
    }

    // Impedisci eliminazione ruoli di sistema
    if (['admin', 'user', 'moderator', 'robot'].includes(role.name)) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete system roles (admin, user, moderator, robot)'
      });
    }

    await Role.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================
// 2. GESTIONE PERMESSI (PERMISSIONS)
// ============================================

// GET /api/admin/permissions — Lista tutti i permessi
router.get('/permissions', requirePermissionsAdmin, async (req, res) => {
  try {
    const { resource, action } = req.query;
    const filter = {};
    if (resource) filter.resource = resource.toLowerCase();
    if (action) filter.action = action.toLowerCase();

    const permissions = await Permission.find(filter).sort({ resource: 1, action: 1 });

    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/admin/permissions/:id — Dettaglio singolo permesso
router.get('/permissions/:id', requirePermissionsAdmin, async (req, res) => {
  try {
    const permission = await Permission.findById(req.params.id);
    if (!permission) {
      return res.status(404).json({ success: false, error: 'Permission not found' });
    }
    res.json({ success: true, data: permission });
  } catch (error) {
    console.error('Error fetching permission:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/admin/permissions — Crea un nuovo permesso
router.post('/permissions', requirePermissionsAdmin, async (req, res) => {
  try {
    const { name, resource, action, description } = req.body;

    if (!name || !resource || !action) {
      return res.status(400).json({
        success: false,
        error: 'Name, resource, and action are required'
      });
    }

    const normalizedResource = resource.toLowerCase().trim();
    const normalizedAction = action.toLowerCase().trim();

    // Verifica duplicati
    const existing = await Permission.findOne({
      resource: normalizedResource,
      action: normalizedAction
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Permission with this resource+action already exists'
      });
    }

    const permission = await Permission.create({
      name: name.toLowerCase().trim(),
      resource: normalizedResource,
      action: normalizedAction,
      description: description || ''
    });

    res.status(201).json({
      success: true,
      data: permission,
      message: 'Permission created successfully'
    });
  } catch (error) {
    console.error('Error creating permission:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/admin/permissions/:id — Aggiorna un permesso
router.put('/permissions/:id', requirePermissionsAdmin, async (req, res) => {
  try {
    const { name, resource, action, description } = req.body;

    const permission = await Permission.findById(req.params.id);
    if (!permission) {
      return res.status(404).json({ success: false, error: 'Permission not found' });
    }

    if (name) permission.name = name.toLowerCase().trim();
    if (resource) permission.resource = resource.toLowerCase().trim();
    if (action) permission.action = action.toLowerCase().trim();
    if (description !== undefined) permission.description = description;

    await permission.save();

    res.json({
      success: true,
      data: permission,
      message: 'Permission updated successfully'
    });
  } catch (error) {
    console.error('Error updating permission:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/admin/permissions/:id — Elimina un permesso
router.delete('/permissions/:id', requirePermissionsAdmin, async (req, res) => {
  try {
    const permission = await Permission.findById(req.params.id);
    if (!permission) {
      return res.status(404).json({ success: false, error: 'Permission not found' });
    }

    // Rimuovi il permesso da tutti i ruoli che lo referenziano
    await Role.updateMany(
      { permissions: permission._id },
      { $pull: { permissions: permission._id } }
    );

    await Permission.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Permission deleted and removed from all roles'
    });
  } catch (error) {
    console.error('Error deleting permission:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================
// 3. UTILITY: ASSEGNA PERMESSI A RUOLO
// ============================================

// PUT /api/admin/roles/:id/permissions — Aggiorna i permessi di un ruolo (bulk)
router.put('/roles/:id/permissions', requireRolesAdmin, async (req, res) => {
  try {
    const { permissionIds } = req.body;

    if (!permissionIds || !Array.isArray(permissionIds)) {
      return res.status(400).json({
        success: false,
        error: 'permissionIds array is required'
      });
    }

    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, error: 'Role not found' });
    }

    // Valida tutti gli ID
    const validPerms = [];
    for (const id of permissionIds) {
      const perm = await Permission.findById(id);
      if (perm) validPerms.push(perm._id);
    }

    role.permissions = validPerms;
    await role.save();
    await role.populate('permissions');

    res.json({
      success: true,
      data: role,
      message: 'Role permissions updated successfully'
    });
  } catch (error) {
    console.error('Error updating role permissions:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
