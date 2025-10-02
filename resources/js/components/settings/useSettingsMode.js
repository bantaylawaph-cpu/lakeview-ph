import { useMemo } from 'react';
import { settingsConfig, computeMode } from './settingsConfig';

export default function useSettingsMode({ user, context }) {
  const role = user?.role;
  return useMemo(() => {
    const mode = computeMode({ context, role });
    const conf = settingsConfig[mode] || settingsConfig['public:basic'];
    const canEdit = (field) => conf.editable.includes(field);
    const showSection = (section) => conf.sections.includes(section);
    return { mode, config: conf, canEdit, showSection };
  }, [role, context]);
}
