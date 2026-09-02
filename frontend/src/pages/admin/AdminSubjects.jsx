import React, { useEffect, useState } from 'react';
import subjectService from '../../services/subjectService';
import { useToast } from '../../components/common/Toast';
import { useForm } from 'react-hook-form';
import Button       from '../../components/common/Button';
import Input        from '../../components/common/Input';
import Modal        from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState   from '../../components/common/EmptyState';
import Badge        from '../../components/common/Badge';
import { STREAM_OPTIONS } from '../../utils/helpers';

export default function AdminSubjects() {
  const toast = useToast();
  const [streams, setStreams]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem,  setEditItem]  = useState(null);  // subject being edited
  const [deleteItem,setDeleteItem]= useState(null);
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const load = () => {
    setLoading(true);
    subjectService.getStreams().then(setStreams).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openAdd = () => { reset({ name:'', slug:'', description:'', color:'#52B788', sort_order:0, stream_id:'' }); setEditItem(null); setModalOpen(true); };
  const openEdit = (s) => { reset(s); setEditItem(s); setModalOpen(true); };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      if (editItem) {
        await subjectService.updateSubject(editItem.id, data);
        toast.success('Subject updated');
      } else {
        await subjectService.createSubject(data);
        toast.success('Subject created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save subject');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await subjectService.deleteSubject(deleteItem.id);
      toast.success('Subject deactivated');
      setDeleteItem(null);
      load();
    } catch { toast.error('Failed to delete subject'); }
    finally { setDeleting(false); }
  };

  if (loading) return <LoadingSpinner variant="dots" className="py-20" />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-gray-800">Subjects</h2>
          <p className="text-sm text-gray-400 mt-0.5">Manage all subjects across both streams.</p>
        </div>
        <Button onClick={openAdd} leftIcon={<span>+</span>}>Add Subject</Button>
      </div>

      {streams.map(stream => (
        <div key={stream.id} className="soft-card overflow-hidden">
          <div className="px-5 py-3 bg-primary-50 border-b border-primary-100 flex items-center gap-2">
            <span className="text-lg">{stream.name === 'Natural Science' ? '🔬' : '📰'}</span>
            <h3 className="font-display font-bold text-primary-700">{stream.name}</h3>
            <span className="text-xs text-gray-400">({stream.subjects?.length || 0} subjects)</span>
          </div>

          {!stream.subjects?.length ? (
            <EmptyState preset="empty" size="sm" message="No subjects in this stream." className="py-8" />
          ) : (
            <div className="divide-y divide-gray-50">
              {stream.subjects.map(s => (
                <div key={s.id} className="flex items-center gap-4 px-5 py-3 hover:bg-surface transition-colors">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-soft"
                    style={{ background: s.color || '#52B788' }}>
                    {s.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-700">{s.name}</p>
                    <p className="text-xs text-gray-400">/{s.slug}</p>
                  </div>
                  <Badge color={s.is_active ? 'green' : 'gray'} dot size="xs">
                    {s.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-xl hover:bg-primary-50 text-gray-400 hover:text-primary-600 transition-all">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                      </svg>
                    </button>
                    <button onClick={() => setDeleteItem(s)} className="p-1.5 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
        title={editItem ? 'Edit Subject' : 'Add Subject'} size="sm"
        footer={<>
          <Button variant="white" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={saving}>Save</Button>
        </>}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Stream</label>
            <select className="input-field text-sm" {...register('stream_id', { required: 'Stream is required' })}>
              <option value="">Select stream...</option>
              {streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {errors.stream_id && <p className="text-xs text-red-500 mt-1">{errors.stream_id.message}</p>}
          </div>
          <Input label="Subject Name" name="name" required placeholder="e.g. Physics"
            error={errors.name?.message} {...register('name', { required: 'Name is required' })} />
          <Input label="Slug" name="slug" required placeholder="e.g. physics"
            error={errors.slug?.message} {...register('slug', { required: 'Slug is required' })} />
          <Input label="Description" name="description" placeholder="Short description"
            {...register('description')} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Color</label>
              <input type="color" {...register('color')} className="h-10 w-full rounded-xl border border-mint-dark/30 cursor-pointer" />
            </div>
            <Input label="Sort Order" name="sort_order" type="number"
              {...register('sort_order', { valueAsNumber: true })} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete} loading={deleting}
        title="Deactivate Subject"
        message={`"${deleteItem?.name}" will be hidden from students. You can reactivate it later.`}
        confirmLabel="Deactivate" variant="warning" />
    </div>
  );
}
