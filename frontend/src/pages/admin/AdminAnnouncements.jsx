import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../components/common/Toast';
import { useForm }  from 'react-hook-form';
import Button        from '../../components/common/Button';
import Input         from '../../components/common/Input';
import Modal         from '../../components/common/Modal';
import Badge         from '../../components/common/Badge';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState    from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate } from '../../utils/helpers';

const TYPE_COLORS = { info:'blue', success:'green', warning:'warm', error:'red' };

export default function AdminAnnouncements() {
  const toast = useToast();
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editItem,   setEditItem]   = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const load = () => {
    setLoading(true);
    api.get('/announcements').then(r => setItems(r.data.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openAdd  = () => { reset({ title:'', content:'', type:'info', target_role:'all', expires_at:'' }); setEditItem(null); setModalOpen(true); };
  const openEdit = (a) => { reset({ ...a, expires_at: a.expires_at?.split('T')[0] || '' }); setEditItem(a); setModalOpen(true); };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      if (editItem) {
        await api.put(`/announcements/${editItem.id}`, data);
        toast.success('Announcement updated');
      } else {
        await api.post('/announcements', data);
        toast.success('Announcement created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/announcements/${deleteItem.id}`);
      toast.success('Announcement removed');
      setDeleteItem(null);
      load();
    } catch { toast.error('Failed'); }
    finally { setDeleting(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-gray-800">Announcements 📢</h2>
          <p className="text-sm text-gray-400 mt-0.5">Post messages to students and admins.</p>
        </div>
        <Button onClick={openAdd} leftIcon={<span>+</span>}>New Announcement</Button>
      </div>

      {loading ? <LoadingSpinner variant="dots" className="py-16" /> : items.length === 0 ? (
        <EmptyState icon="📢" title="No announcements" action={{ label: 'Create One', onClick: openAdd }} />
      ) : (
        <div className="space-y-3">
          {items.map(a => (
            <div key={a.id} className="soft-card p-5 flex items-start gap-4">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0 ${
                a.type === 'success' ? 'bg-mint-light' : a.type === 'warning' ? 'bg-yellow-50' : a.type === 'error' ? 'bg-red-50' : 'bg-primary-50'
              }`}>
                {a.type === 'success' ? '✅' : a.type === 'warning' ? '⚠️' : a.type === 'error' ? '❌' : 'ℹ️'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-semibold text-gray-800 text-sm">{a.title}</p>
                  <Badge color={TYPE_COLORS[a.type] || 'blue'} size="xs">{a.type}</Badge>
                  <Badge color="gray" size="xs">{a.target_role}</Badge>
                  {!a.is_active && <Badge color="gray" size="xs">Hidden</Badge>}
                </div>
                <p className="text-sm text-gray-500 line-clamp-2">{a.content}</p>
                <p className="text-xs text-gray-300 mt-1">
                  Published: {formatDate(a.published_at)}
                  {a.expires_at && ` · Expires: ${formatDate(a.expires_at)}`}
                </p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={() => openEdit(a)} className="p-1.5 rounded-xl hover:bg-primary-50 text-gray-400 hover:text-primary-600 transition-all">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
                <button onClick={() => setDeleteItem(a)} className="p-1.5 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
        title={editItem ? 'Edit Announcement' : 'New Announcement'} size="md"
        footer={<>
          <Button variant="white" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={saving}>Save</Button>
        </>}>
        <div className="space-y-4">
          <Input label="Title" name="title" required error={errors.title?.message}
            {...register('title', { required: 'Title is required' })} />
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Content <span className="text-red-500">*</span></label>
            <textarea rows={4} className="w-full px-4 py-3 rounded-2xl border border-mint-dark/30 text-sm focus:outline-none focus:border-primary-400 resize-none"
              placeholder="Announcement message..."
              {...register('content', { required: 'Content is required' })} />
            {errors.content && <p className="text-xs text-red-500 mt-1">{errors.content.message}</p>}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Type</label>
              <select className="input-field text-sm" {...register('type')}>
                <option value="info">ℹ️ Info</option>
                <option value="success">✅ Success</option>
                <option value="warning">⚠️ Warning</option>
                <option value="error">❌ Error</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Show To</label>
              <select className="input-field text-sm" {...register('target_role')}>
                <option value="all">Everyone</option>
                <option value="student">Students only</option>
                <option value="admin">Admins only</option>
              </select>
            </div>
          </div>
          <Input label="Expires At (optional)" name="expires_at" type="date"
            {...register('expires_at')} />
          {editItem && (
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input type="checkbox" className="sr-only peer" {...register('is_active')} />
                <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-green-gradient transition-all" />
                <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-all peer-checked:translate-x-4" />
              </div>
              <span className="text-sm font-semibold text-gray-700">Active (visible to users)</span>
            </label>
          )}
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete} loading={deleting}
        title="Remove Announcement" message={`"${deleteItem?.title}" will be hidden from all users.`}
        confirmLabel="Remove" variant="danger" />
    </div>
  );
}
