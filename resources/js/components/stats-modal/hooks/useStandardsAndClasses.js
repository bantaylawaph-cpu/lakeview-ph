import { useEffect, useState } from 'react';
import { apiPublic } from '../../../lib/api';

// Fetch public water quality standards and classes for dropdowns
export default function useStandardsAndClasses() {
  const [standards, setStandards] = useState([]);
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiPublic('/options/wq-standards');
        if (!mounted) return;
        const rows = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        setStandards((rows || []).map(r => ({ id: r.id, code: r.code, name: r.name || r.code })));
      } catch {
        if (!mounted) return; setStandards([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiPublic('/options/water-quality-classes');
        const rows = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        if (!mounted) return;
        const mapped = (rows || []).map(r => ({ code: r.code || r.id, name: r.name || r.code || r.id }));
        setClasses(mapped);
      } catch {
        if (!mounted) return; setClasses([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return { standards, classes };
}
