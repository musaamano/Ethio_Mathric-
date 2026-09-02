/**
 * AdminImportQuestions.jsx — Legacy Excel/CSV import
 * Admin must select Subject, Category and (if Past Year) Exam Year.
 * These values are authoritative and override anything in the spreadsheet.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api             from '../../services/api';
import questionService from '../../services/questionService';
import { useToast }    from '../../components/common/Toast';
import Button          from '../../components/common/Button';

const currentYear  = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: currentYear - 1989 }, (_, i) => currentYear - i);

export default function AdminImportQuestions() {
  const toast    = useToast();
  const navigate = useNavigate();

  const [subjects,  setSubjects]  = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [category,  setCategory]  = useState('practice');
  const [year,      setYear]      = useState('');
  const [file,      setFile]      = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result,    setResult]    = useState(null);
  const [dragging,  setDragging]  = useState(false);

  useEffect(() => {
    api.get('/subjects')
      .then(r => setSubjects(r.data?.data || []))
      .catch(() => {});
  }, []);

  const handleFile = (f) => {
    const ext = f?.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      toast.error('Only .xlsx, .xls or .csv files allowed');
      return;
    }
    setFile(f);
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const canUpload = !!subjectId && !!category &&
    (category === 'practice' || (category === 'past_year' && !!year)) &&
    !!file;

  const handleUpload = async () => {
    if (!canUpload) {
      if (!subjectId)                            toast.warning('Select a subject first.');
      else if (category === 'past_year' && !year) toast.warning('Select an exam year.');
      else if (!file)                            toast.warning('Select a file.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file',              file);
      formData.append('subject_id',        subjectId);
      formData.append('question_category', category);
      if (category === 'past_year' && year) formData.append('year', year);

      const res = await api.post('/questions/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = res.data?.data;
      setResult(data);
      toast.success(`Imported ${data.created} questions successfully`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Import failed');
    } finally {
      setUploading(false);
    }
  };

  const subjectName = subjects.find(s => String(s.id) === String(subjectId))?.name || '';

  return (
    <div className="max-w-2xl space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-mint-light text-gray-400 hover:text-primary-600 transition-all">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h2 className="font-display font-extrabold text-2xl text-gray-800">Import Questions</h2>
          <p className="text-sm text-gray-400 mt-0.5">Upload an Excel or CSV file with bulk questions.</p>
        </div>
      </div>

      {/* ── 1. Subject ── */}
      <div className="soft-card p-5 space-y-2">
        <label className="block text-sm font-bold text-gray-700">
          Subject <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-400">All imported questions will be assigned to this subject.</p>
        <select
          value={subjectId}
          onChange={e => setSubjectId(e.target.value)}
          className="input-field text-sm w-full"
        >
          <option value="">— Select a subject —</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {!subjectId && (
          <p className="text-xs text-red-400">Subject is required.</p>
        )}
      </div>

      {/* ── 2. Category ── */}
      <div className="soft-card p-5 space-y-3">
        <label className="block text-sm font-bold text-gray-700">
          Question Category <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-400">
          Practice = no year, shows under Practice. Past Year = tagged with a specific exam year.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'practice',  label: 'Practice Questions', icon: '📝',
              desc: 'year = null' },
            { value: 'past_year', label: 'Past Year Questions', icon: '📅',
              desc: 'tagged with exam year' },
          ].map(opt => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                category === opt.value
                  ? 'border-primary-400 bg-primary-50'
                  : 'border-gray-100 hover:border-primary-200'
              }`}
            >
              <input
                type="radio"
                name="imp-category"
                value={opt.value}
                checked={category === opt.value}
                onChange={() => { setCategory(opt.value); setYear(''); }}
                className="mt-0.5"
              />
              <div>
                <span className="text-base">{opt.icon}</span>
                <p className="text-xs font-bold text-gray-700 mt-0.5">{opt.label}</p>
                <p className="text-[10px] text-gray-400">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* ── 3. Exam Year (only for Past Year) ── */}
      {category === 'past_year' && (
        <div className="soft-card p-5 space-y-2">
          <label className="block text-sm font-bold text-gray-700">
            Exam Year <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-400">Every imported question will be tagged with this year.</p>
          <select
            value={year}
            onChange={e => setYear(e.target.value)}
            className="input-field text-sm w-full"
          >
            <option value="">— Select exam year —</option>
            {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {!year && (
            <p className="text-xs text-red-400">Exam year is required for Past Year questions.</p>
          )}
        </div>
      )}

      {/* ── 4. Template info ── */}
      <div className="soft-card p-5 border border-primary-100 bg-primary-50">
        <h3 className="font-display font-semibold text-primary-700 mb-3">📋 Required Columns</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-gray-600">
            <thead>
              <tr className="border-b border-primary-200">
                {['question_text','option_A','option_B','option_C','option_D',
                  'correct_option','difficulty','exam_importance','is_free','why_correct']
                  .map(col => (
                    <th key={col} className="text-left py-1 pr-3 font-bold text-primary-600 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {["What is F=ma?","Force=mass×acc","F=m/a","F=a/m","F=m+a",
                  "A","medium","high","0","Newton's 2nd Law..."]
                  .map((v, i) => (
                    <td key={i} className="py-1 pr-3 text-gray-400 whitespace-nowrap">{v}</td>
                  ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          <strong>subject_id</strong>, <strong>year</strong> and <strong>question_category</strong> are
          set above — they must <em>not</em> be in the file (ignored if present).
          &nbsp;|&nbsp; <strong>correct_option</strong>: A, B, C or D
          &nbsp;|&nbsp; <strong>is_free</strong>: 0 or 1
        </p>
      </div>

      {/* ── 5. Drop zone ── */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer ${
          dragging ? 'border-primary-400 bg-primary-50' : 'border-mint-dark/30 hover:border-primary-300 hover:bg-surface'
        }`}
        onClick={() => document.getElementById('leg-file-input').click()}
      >
        <input
          id="leg-file-input"
          type="file"
          accept=".xlsx,.xls,.csv"
          className="sr-only"
          onChange={e => handleFile(e.target.files[0])}
        />
        {file ? (
          <div className="space-y-2">
            <div className="text-4xl">📄</div>
            <p className="font-semibold text-primary-700">{file.name}</p>
            <p className="text-sm text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
            <button
              onClick={e => { e.stopPropagation(); setFile(null); setResult(null); }}
              className="text-xs text-red-400 hover:text-red-600"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-5xl">📥</div>
            <p className="font-semibold text-gray-600">Drop your Excel / CSV file here</p>
            <p className="text-sm text-gray-400">or click to browse</p>
            <p className="text-xs text-gray-300">.xlsx, .xls, .csv supported</p>
          </div>
        )}
      </div>

      {/* ── Summary before import ── */}
      {canUpload && (
        <div className="soft-card p-4 bg-green-50 border border-green-200 space-y-1">
          <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-1">Import Settings</p>
          <p className="text-sm text-gray-700">
            <span className="text-gray-400">Subject:</span> <strong>{subjectName}</strong>
          </p>
          <p className="text-sm text-gray-700">
            <span className="text-gray-400">Category:</span>{' '}
            <strong>{category === 'practice' ? 'Practice Questions' : 'Past Year Questions'}</strong>
          </p>
          <p className="text-sm text-gray-700">
            <span className="text-gray-400">Year:</span>{' '}
            <strong>{category === 'practice' ? '— (Practice)' : year}</strong>
          </p>
        </div>
      )}

      {/* ── Result ── */}
      {result && (
        <div className="soft-card p-5 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">✅</span>
            <div>
              <p className="font-bold text-sage-700">Import Complete</p>
              <p className="text-sm text-gray-500">
                {result.created} questions imported as{' '}
                <strong>{category === 'practice' ? 'Practice' : `Past Year ${year}`}</strong>{' '}
                under <strong>{subjectName}</strong>.
              </p>
            </div>
          </div>
          {result.errors?.length > 0 && (
            <div className="p-3 bg-red-50 rounded-2xl">
              <p className="text-xs font-bold text-red-600 mb-2">{result.errors.length} rows had errors:</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-500">Row {e.row}: {e.error}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex gap-3 justify-end">
        <Button variant="white" onClick={() => navigate('/admin/questions')}>Cancel</Button>
        <Button onClick={handleUpload} loading={uploading} disabled={!canUpload}>
          Import Questions
        </Button>
      </div>
    </div>
  );
}
