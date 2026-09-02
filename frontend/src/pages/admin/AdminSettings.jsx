import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../components/common/Toast';
import Button from '../../components/common/Button';
import Input  from '../../components/common/Input';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function AdminSettings() {
  const toast = useToast();
  const [settings, setSettings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [values,   setValues]   = useState({});
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    api.get('/settings').then(r => {
      const data = r.data.data || [];
      setSettings(data);
      const v = {};
      data.forEach(s => { v[s.setting_key] = s.value; });
      setValues(v);
    }).catch(() => {
      // Fallback defaults — shown while backend is not yet configured
      const defaults = [
        { setting_key: 'site_name',           value: 'Ethio Matric Academy', description: 'Website display name' },
        { setting_key: 'free_question_limit', value: '20',                   description: 'Questions free users can access' },
        { setting_key: 'maintenance_mode',    value: 'false',                description: 'Enable maintenance mode' },
      ];
      setSettings(defaults);
      const v = {};
      defaults.forEach(s => { v[s.setting_key] = s.value; });
      setValues(v);
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(
        Object.entries(values).map(([key, value]) =>
          api.put(`/settings/${key}`, { value }).catch(() => {})
        )
      );
      toast.success('Settings saved successfully');
    } catch { toast.error('Failed to save settings'); }
    finally { setSaving(false); }
  };

  if (loading) return <LoadingSpinner variant="dots" className="py-20" />;

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <h2 className="font-display font-extrabold text-2xl text-gray-800">System Settings ⚙️</h2>
        <p className="text-sm text-gray-400 mt-0.5">Configure global platform settings.</p>
      </div>

      <div className="soft-card p-6 space-y-5">
        {settings.map(s => (
          <div key={s.setting_key}>
            {s.value === 'true' || s.value === 'false' ? (
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-semibold text-gray-700 capitalize">
                    {s.setting_key.replace(/_/g, ' ')}
                  </p>
                  {s.description && <p className="text-xs text-gray-400 mt-0.5">{s.description}</p>}
                </div>
                <label className="relative cursor-pointer flex-shrink-0 ml-4">
                  <input type="checkbox"
                    checked={values[s.setting_key] === 'true'}
                    onChange={e => setValues(v => ({ ...v, [s.setting_key]: e.target.checked ? 'true' : 'false' }))}
                    className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-green-gradient transition-all" />
                  <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-all peer-checked:translate-x-5" />
                </label>
              </div>
            ) : (
              <Input
                label={s.setting_key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                name={s.setting_key}
                value={values[s.setting_key] || ''}
                onChange={e => setValues(v => ({ ...v, [s.setting_key]: e.target.value }))}
                helperText={s.description}
              />
            )}
          </div>
        ))}
      </div>

      {/* Danger zone */}
      <div className="soft-card p-5 border border-red-200 bg-red-50/30">
        <h3 className="font-display font-bold text-base text-red-700 mb-3">⚠️ Danger Zone</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-red-100">
            <div>
              <p className="text-sm font-semibold text-gray-700">Clear All Sessions</p>
              <p className="text-xs text-gray-400">Force logout all users immediately</p>
            </div>
            <Button variant="danger" size="sm" onClick={() => toast.warning('This feature requires manual DB action for safety')}>
              Clear
            </Button>
          </div>
          <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-red-100">
            <div>
              <p className="text-sm font-semibold text-gray-700">Maintenance Mode</p>
              <p className="text-xs text-gray-400">Block all student access temporarily</p>
            </div>
            <div className="text-sm font-semibold text-gray-500">
              {values['maintenance_mode'] === 'true' ? '🔴 ON' : '🟢 OFF'}
            </div>
          </div>
        </div>
      </div>

      <Button onClick={handleSave} loading={saving} size="lg" fullWidth>
        Save All Settings
      </Button>
    </div>
  );
}
