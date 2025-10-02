// Central configuration for settings modes.
// context: 'public' | 'dashboard'
// role: 'superadmin' | 'org_admin' | 'contributor' | 'basic'
export const settingsConfig = {
  'public:basic': {
    sections: ['profile', 'password'],
    editable: ['name', 'password'],
    layout: 'narrow'
  },
  'dashboard:superadmin': {
    sections: ['profile', 'password', 'tenant', 'adminTools'],
    editable: ['name', 'password'],
    layout: 'wide'
  },
  'dashboard:org_admin': {
    sections: ['profile', 'password', 'tenant', 'orgTools'],
    editable: ['name', 'password'],
    layout: 'wide'
  },
  'dashboard:contributor': {
    sections: ['profile', 'password', 'tenant'],
    editable: ['name', 'password'],
    layout: 'standard'
  }
};

export function computeMode({ context, role }) {
  if (context === 'public') return 'public:basic';
  if (!role) return 'public:basic';
  if (['superadmin','org_admin','contributor'].includes(role)) return `dashboard:${role}`;
  return 'public:basic';
}
