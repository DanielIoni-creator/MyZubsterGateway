const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/myzubster';

/**
 * Permessi di default per il sistema RBAC.
 * Ogni permesso è definito da: resource, action, description.
 */
const DEFAULT_PERMISSIONS = [
  // Users
  { name: 'users:read',   resource: 'users',   action: 'read',   description: 'View user list and profiles' },
  { name: 'users:create', resource: 'users',   action: 'create', description: 'Create new users' },
  { name: 'users:update', resource: 'users',   action: 'update', description: 'Update user data and roles' },
  { name: 'users:delete', resource: 'users',   action: 'delete', description: 'Delete users' },

  // Skills
  { name: 'skills:read',   resource: 'skills',   action: 'read',   description: 'View skills' },
  { name: 'skills:create', resource: 'skills',   action: 'create', description: 'Create skills' },
  { name: 'skills:update', resource: 'skills',   action: 'update', description: 'Update skills' },
  { name: 'skills:delete', resource: 'skills',   action: 'delete', description: 'Delete skills' },
  { name: 'skills:moderate', resource: 'skills', action: 'moderate', description: 'Approve/reject skills' },

  // Bookings
  { name: 'bookings:read',   resource: 'bookings',   action: 'read',   description: 'View bookings' },
  { name: 'bookings:create', resource: 'bookings',   action: 'create', description: 'Create bookings' },
  { name: 'bookings:update', resource: 'bookings',   action: 'update', description: 'Update bookings' },
  { name: 'bookings:delete', resource: 'bookings',   action: 'delete', description: 'Delete bookings' },

  // Reviews
  { name: 'reviews:read',     resource: 'reviews',     action: 'read',     description: 'View reviews' },
  { name: 'reviews:create',   resource: 'reviews',     action: 'create',   description: 'Create reviews' },
  { name: 'reviews:moderate', resource: 'reviews',     action: 'moderate', description: 'Moderate/delete reviews' },

  // Reports
  { name: 'reports:read',     resource: 'reports',     action: 'read',     description: 'View reports' },
  { name: 'reports:create',   resource: 'reports',     action: 'create',   description: 'Create reports' },
  { name: 'reports:moderate', resource: 'reports',     action: 'moderate', description: 'Resolve/dismiss reports' },

  // Admin — Roles & Permissions
  { name: 'roles:admin',        resource: 'roles',        action: 'admin',        description: 'Full CRUD on roles' },
  { name: 'permissions:admin',  resource: 'permissions',  action: 'admin',        description: 'Full CRUD on permissions' },

  // Admin — General
  { name: 'admin:dashboard', resource: 'admin', action: 'dashboard', description: 'Access admin dashboard' },
  { name: 'admin:stats',     resource: 'admin', action: 'stats',     description: 'View admin statistics' },
  { name: 'admin:logs',      resource: 'admin', action: 'logs',      description: 'View moderation logs' },

  // Escrow
  { name: 'escrow:read',   resource: 'escrow',   action: 'read',   description: 'View escrow transactions' },
  { name: 'escrow:manage', resource: 'escrow',   action: 'manage', description: 'Manage escrow (release/refund)' },

  // Quotes
  { name: 'quotes:read',   resource: 'quotes',   action: 'read',   description: 'View quotes' },
  { name: 'quotes:create', resource: 'quotes',   action: 'create', description: 'Create quotes' },
  { name: 'quotes:update', resource: 'quotes',   action: 'update', description: 'Update quotes' },
];

/**
 * Ruoli di sistema con i permessi assegnati.
 */
const DEFAULT_ROLES = [
  {
    name: 'admin',
    description: 'Full system access — can manage users, roles, permissions, and all content',
    // Admin gets ALL permissions (assegnati dopo la creazione dei permessi)
    permissionNames: null // special: all
  },
  {
    name: 'moderator',
    description: 'Can moderate content (skills, reviews, reports) and view admin dashboard',
    permissionNames: [
      'users:read',
      'skills:read', 'skills:moderate',
      'bookings:read',
      'reviews:read', 'reviews:moderate',
      'reports:read', 'reports:moderate',
      'admin:dashboard', 'admin:stats',
      'escrow:read',
      'quotes:read',
    ]
  },
  {
    name: 'user',
    description: 'Standard user — can manage own profile, skills, bookings, and reviews',
    permissionNames: [
      'bookings:read', 'bookings:create', 'bookings:update',
      'reviews:read', 'reviews:create',
      'quotes:read', 'quotes:create',
      'skills:read', 'skills:create', 'skills:update',
    ]
  },
  {
    name: 'robot',
    description: 'Automated system account — limited API access for bots and integrations',
    permissionNames: [
      'bookings:read',
      'escrow:read',
      'quotes:read',
    ]
  },
];

/**
 * Admin user di default.
 */
const DEFAULT_ADMIN = {
  username: 'admin',
  email: 'admin@myzubster.com',
  password: 'Admin123!',
  name: 'System Admin',
  role: 'admin'
};

async function seedRBAC() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // ─── 1. Crea tutti i permessi ───
    console.log('\n📋 Seeding permissions...');
    const permissionMap = {}; // name -> Permission doc

    for (const permDef of DEFAULT_PERMISSIONS) {
      const perm = await Permission.findOrCreate(
        permDef.name,
        permDef.resource,
        permDef.action,
        permDef.description
      );
      permissionMap[permDef.name] = perm;
      console.log(`  ✓ ${perm.name} (${perm.resource}:${perm.action})`);
    }

    const allPermissionIds = Object.values(permissionMap).map(p => p._id);
    console.log(`✅ ${allPermissionIds.length} permissions seeded`);

    // ─── 2. Crea i ruoli ───
    console.log('\n👥 Seeding roles...');

    for (const roleDef of DEFAULT_ROLES) {
      let existing = await Role.findOne({ name: roleDef.name });
      let permIds;

      if (roleDef.permissionNames === null) {
        // Admin: tutti i permessi
        permIds = allPermissionIds;
      } else {
        permIds = roleDef.permissionNames
          .map(name => permissionMap[name] ? permissionMap[name]._id : null)
          .filter(Boolean);
      }

      if (existing) {
        existing.description = roleDef.description;
        existing.permissions = permIds;
        await existing.save();
        console.log(`  ✓ ${roleDef.name} (updated, ${permIds.length} permissions)`);
      } else {
        await Role.create({
          name: roleDef.name,
          description: roleDef.description,
          permissions: permIds
        });
        console.log(`  ✓ ${roleDef.name} (created, ${permIds.length} permissions)`);
      }
    }

    console.log(`✅ ${DEFAULT_ROLES.length} roles seeded`);

    // ─── 3. Crea l'admin user ───
    console.log('\n👤 Seeding admin user...');

    const adminRole = await Role.findOne({ name: 'admin' });
    if (!adminRole) {
      throw new Error('Admin role not found after seeding!');
    }

    const existingAdmin = await User.findOne({ email: DEFAULT_ADMIN.email });
    if (existingAdmin) {
      // Aggiorna il ruolo dell'admin esistente al Role document RBAC
      existingAdmin.role = adminRole._id;
      if (DEFAULT_ADMIN.password) {
        existingAdmin.password = DEFAULT_ADMIN.password; // trigger pre-save hash
      }
      await existingAdmin.save();
      console.log(`  ✓ Admin user updated: ${existingAdmin.email} (role ref: ${adminRole._id})`);
    } else {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, salt);

      await User.create({
        username: DEFAULT_ADMIN.username,
        email: DEFAULT_ADMIN.email,
        password: hashedPassword,
        name: DEFAULT_ADMIN.name,
        role: adminRole._id // Riferimento ObjectId al Role RBAC
      });
      console.log(`  ✓ Admin user created: ${DEFAULT_ADMIN.email}`);
    }

    console.log('\n🎉 RBAC seeding complete!');
    console.log('   Default admin credentials:');
    console.log(`   Email:    ${DEFAULT_ADMIN.email}`);
    console.log(`   Password: ${DEFAULT_ADMIN.password}`);
    console.log('\n   Run: node src/seed/admin.js');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
}

// Supporta esecuzione diretta
if (require.main === module) {
  seedRBAC();
}

module.exports = { seedRBAC, DEFAULT_PERMISSIONS, DEFAULT_ROLES, DEFAULT_ADMIN };
