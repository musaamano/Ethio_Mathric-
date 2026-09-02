import React, { useState } from 'react';
import Modal  from '../common/Modal';
import Button from '../common/Button';
import { useToast } from '../common/Toast';
import { REPORT_REASONS } from '../../utils/helpers';
import questionService from '../../services/questionService';

export default function ReportModal({ isOpen, onClose, questionId }) {
  const toast = useToast();
  const [reason,      setReason]      = useState('');
  const [description, setDescription] = useState('');
  const [loading,     setLoading]     = useState(false);

  const submit = async () => {
    if (!reason) { toast.warning('Please select a reason'); return; }
    setLoading(true);
    try {
      await questionService.reportQuestion({ question_id: questionId, reason, description });
      toast.success('Report submitted. Thank you for the feedback!');
      onClose();
      setReason(''); setDescription('');
    } catch {
      toast.error('Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Report a Problem" size="sm"
      footer={<>
        <Button variant="white" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} loading={loading}>Submit Report</Button>
      </>}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">What's wrong?</label>
          <div className="space-y-2">
            {REPORT_REASONS.map(r => (
              <label key={r.value} className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                reason === r.value ? 'border-primary-400 bg-primary-50' : 'border-mint-dark/20 hover:border-primary-200'
              }`}>
                <input type="radio" name="reason" value={r.value}
                  checked={reason === r.value} onChange={() => setReason(r.value)}
                  className="sr-only" />
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  reason === r.value ? 'border-primary-500 bg-primary-500' : 'border-gray-300'
                }`}>
                  {reason === r.value && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
                <span className="text-sm text-gray-700">{r.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Additional details (optional)</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Describe the issue..."
            rows={3}
            className="w-full px-4 py-3 rounded-2xl border border-mint-dark/30 text-sm resize-none focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          />
        </div>
      </div>
    </Modal>
  );
}
