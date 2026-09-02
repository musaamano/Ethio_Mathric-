/**
 * AdminImportAI.jsx — Bulk AI Question Import (v3)
 * Supports 1,000+ questions via background job + SSE live progress.
 *
 * Admin MUST select:
 *   1. Subject        (required — applied to every imported question)
 *   2. Category       (Practice | Past Year — determines year = NULL vs integer)
 *   3. Year           (required when category = Past Year)
 *
 * The admin-selected metadata is authoritative: the document content cannot
 * override subject, category or year.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from '../../components/common/Toast';
import importService from '../../services/importService';
import Button from '../../components/common/Button';
import './AdminImportAI.css';

// ── Constants ─────────────────────────────────────────────────
const STEPS    = ['Upload', 'Processing', 'Report'];
const ACCEPTED = '.pdf,.docx,.doc,.dotx,.txt,.csv,.xlsx,.xls';
const MAX_MB   = 200;

const PHASES = [
  { key: 'queued',        label: 'Queued',                  icon: '⏳' },
  { key: 'analysing',     label: 'Analysing file...',        icon: '🔍' },
  { key: 'extracting',    label: 'Extracting questions...',  icon: '📋' },
  { key: 'deduplicating', label: 'Checking duplicates...',   icon: '🔁' },
  { key: 'saving',        label: 'Saving questions...',      icon: '💾' },
  { key: 'done',          label: 'Import Complete!',         icon: '✅' },
];

// Year range helper
const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from(
  { length: currentYear - 1989 },
  (_, i) => currentYear - i
);

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function StepBar({ current }) {
  return (
    <div className="biq-stepbar">
      {STEPS.map((step, i) => (
        <React.Fragment key={step}>
          <div className="biq-step-item">
            <div className={`biq-step-circle ${i < current ? 'done' : i === current ? 'active' : ''}`}>
              {i < current ? '✓' : i + 1}
            </div>
            <span className={`biq-step-label ${i === current ? 'active' : ''}`}>{step}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`biq-step-line ${i < current ? 'done' : ''}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Import metadata form (subject + category + year + file) ──
function ImportForm({ subjects, subjectId, setSubjectId,
                      category, setCategory, year, setYear,
                      file, setFile, uploading, uploadPct,
                      onStart }) {
  const inputRef   = useRef(null);
  const [dragging, setDragging] = useState(false);

  const validate = (f) => {
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['pdf','docx','doc','dotx','txt','csv','xlsx','xls'].includes(ext))
      return `File type .${ext} not supported`;
    if (f.size > MAX_MB * 1024 * 1024) return `File too large. Max ${MAX_MB}MB`;
    return null;
  };

  const handleSelect = (f) => {
    if (!f) return;
    const err = validate(f);
    if (err) { alert(err); return; }
    setFile(f);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    handleSelect(e.dataTransfer.files[0]);
  }, []);

  const canStart = !!subjectId && !!category &&
    (category === 'practice' || (category === 'past_year' && !!year)) &&
    !!file && !uploading;

  const sizeMB = file ? (file.size / 1024 / 1024).toFixed(1) : 0;

  return (
    <div className="biq-section">

      {/* ── 1. Subject (required) ── */}
      <div className="biq-field-card">
        <label className="biq-field-label">
          📚 Subject <span className="biq-required">*</span>
        </label>
        <p className="biq-field-hint">
          All questions from this import will be assigned to this subject.
        </p>
        <select
          value={subjectId}
          onChange={e => setSubjectId(e.target.value)}
          className={`biq-select ${!subjectId ? 'biq-select--empty' : ''}`}
        >
          <option value="">— Select a subject —</option>
          {subjects.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {!subjectId && (
          <p className="biq-field-error">Subject is required before importing.</p>
        )}
      </div>

      {/* ── 2. Category (required) ── */}
      <div className="biq-field-card">
        <label className="biq-field-label">
          📂 Question Category <span className="biq-required">*</span>
        </label>
        <p className="biq-field-hint">
          Determines whether imported questions appear in Practice or Past Year sections.
        </p>
        <div className="biq-radio-group">
          <label className={`biq-radio-card ${category === 'practice' ? 'selected' : ''}`}>
            <input
              type="radio" name="category" value="practice"
              checked={category === 'practice'}
              onChange={() => { setCategory('practice'); setYear(''); }}
            />
            <div className="biq-radio-content">
              <span className="biq-radio-icon">📝</span>
              <div>
                <strong>Practice Questions</strong>
                <p>No year — shown in the Practice section for regular study.</p>
              </div>
            </div>
          </label>

          <label className={`biq-radio-card ${category === 'past_year' ? 'selected' : ''}`}>
            <input
              type="radio" name="category" value="past_year"
              checked={category === 'past_year'}
              onChange={() => setCategory('past_year')}
            />
            <div className="biq-radio-content">
              <span className="biq-radio-icon">📅</span>
              <div>
                <strong>Past Year Questions</strong>
                <p>Assigned to a specific exam year — shown in the Past Year section.</p>
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* ── 3. Exam Year (required when Past Year) ── */}
      {category === 'past_year' && (
        <div className="biq-field-card">
          <label className="biq-field-label">
            📅 Exam Year <span className="biq-required">*</span>
          </label>
          <p className="biq-field-hint">
            Every question in this file will be tagged with this year.
          </p>
          <select
            value={year}
            onChange={e => setYear(e.target.value)}
            className={`biq-select ${!year ? 'biq-select--empty' : ''}`}
          >
            <option value="">— Select exam year —</option>
            {YEAR_OPTIONS.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {!year && (
            <p className="biq-field-error">Exam year is required for Past Year questions.</p>
          )}
        </div>
      )}

      {/* ── 4. File upload ── */}
      <div className="biq-field-card">
        <label className="biq-field-label">📁 Question File <span className="biq-required">*</span></label>
        <p className="biq-field-hint">PDF, DOCX, TXT, CSV, XLSX — up to {MAX_MB} MB — 1,000+ questions supported.</p>

        <div
          className={`biq-upload-zone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''} ${uploading ? 'uploading' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !file && !uploading && inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept={ACCEPTED} className="sr-only"
            onChange={e => handleSelect(e.target.files[0])} />

          {uploading ? (
            <div className="biq-upload-state">
              <div className="biq-upload-icon spin">⚙️</div>
              <p className="biq-upload-title">Uploading...</p>
              <div className="biq-progress-bar">
                <div className="biq-progress-fill" style={{ width: `${uploadPct}%` }} />
              </div>
              <p className="biq-upload-sub">{uploadPct}% uploaded</p>
            </div>
          ) : file ? (
            <div className="biq-upload-state">
              <div className="biq-upload-icon">📄</div>
              <p className="biq-upload-title">{file.name}</p>
              <p className="biq-upload-sub">{sizeMB} MB</p>
              <button className="biq-remove-btn"
                onClick={e => { e.stopPropagation(); setFile(null); }}>
                ✕ Remove
              </button>
            </div>
          ) : (
            <div className="biq-upload-state">
              <div className="biq-upload-icon">📥</div>
              <p className="biq-upload-title">Drop your question bank here</p>
              <p className="biq-upload-sub">or click to browse</p>
              <div className="biq-format-chips">
                {['PDF','DOCX','TXT','CSV','XLSX'].map(f =>
                  <span key={f} className="biq-chip">{f}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Import summary before start ── */}
      {subjectId && category && (category === 'practice' || year) && file && (
        <div className="biq-summary-preview">
          <h4 className="biq-summary-title">📋 Import Summary</h4>
          <div className="biq-summary-rows">
            <div className="biq-summary-row">
              <span>Subject</span>
              <strong>{subjects.find(s => String(s.id) === String(subjectId))?.name || subjectId}</strong>
            </div>
            <div className="biq-summary-row">
              <span>Category</span>
              <strong>{category === 'practice' ? 'Practice Questions' : 'Past Year Questions'}</strong>
            </div>
            <div className="biq-summary-row">
              <span>Year</span>
              <strong>{category === 'practice' ? '— (Practice)' : year}</strong>
            </div>
            <div className="biq-summary-row">
              <span>File</span>
              <strong>{file.name}</strong>
            </div>
          </div>
        </div>
      )}

      {/* ── Format guide ── */}
      <div className="biq-format-guide">
        <h3 className="biq-format-title">📋 Supported Formats</h3>
        <div className="biq-format-grid">
          {[
            { fmt: 'Excel / CSV', icon: '📊', desc: 'Columns: question_text, option_A–D, correct_option, difficulty, exam_importance, is_free, why_correct. Subject, category and year are set above — not from the file.' },
            { fmt: 'PDF / DOCX', icon: '📄', desc: 'Numbered questions with A/B/C/D options. "Answer: X" or inline [Answer: X] format.' },
            { fmt: 'TXT', icon: '📝', desc: 'Plain text with same format as PDF. True/False also supported.' },
          ].map(f => (
            <div key={f.fmt} className="biq-format-card">
              <span className="biq-format-icon">{f.icon}</span>
              <strong>{f.fmt}</strong>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <button
        className="biq-btn-primary full"
        onClick={onStart}
        disabled={!canStart}
        title={!canStart ? 'Fill in all required fields above' : ''}
      >
        {uploading ? `Uploading... ${uploadPct}%` : '🚀 Start Import'}
      </button>

      {!canStart && !uploading && (
        <p className="biq-start-hint">
          {!subjectId ? '⚠ Select a subject first.' :
           !category  ? '⚠ Choose Practice or Past Year.' :
           category === 'past_year' && !year ? '⚠ Select an exam year.' :
           !file ? '⚠ Add a question file.' : ''}
        </p>
      )}
    </div>
  );
}

function LiveProgressPanel({ jobState, onCancel }) {
  const phaseIdx  = PHASES.findIndex(p => p.key === jobState?.phase);
  const isPolling = jobState?.progress === -1;

  return (
    <div className="biq-progress-panel">
      <div className="biq-progress-header">
        <div className="biq-anim-icon">🤖</div>
        <h3 className="biq-progress-title">
          {jobState?.phase === 'done' ? 'Processing Complete!' : 'AI is processing your file...'}
        </h3>
        {isPolling ? (
          <p className="biq-progress-sub" style={{ color: '#f59e0b' }}>
            ⚠️ Live connection dropped — checking status every few seconds...
          </p>
        ) : (
          <p className="biq-progress-sub">This runs in the background — you can navigate away safely.</p>
        )}
      </div>

      <div className="biq-phases">
        {PHASES.map((ph, i) => {
          const done   = i < phaseIdx;
          const active = i === phaseIdx;
          return (
            <div key={ph.key} className={`biq-phase-row ${done ? 'done' : active ? 'active' : 'pending'}`}>
              <div className="biq-phase-icon">{done ? '✅' : active ? '⏳' : ph.icon}</div>
              <span className="biq-phase-label">{ph.label}</span>
              {active && jobState?.total > 0 && (
                <span className="biq-phase-count">
                  {(jobState.imported || 0).toLocaleString()} / {jobState.total.toLocaleString()}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="biq-overall-bar">
        <div className="biq-overall-fill" style={{ width: `${Math.max(0, jobState?.progress || 0)}%` }} />
      </div>
      <p className="biq-overall-pct">{Math.max(0, jobState?.progress || 0)}%</p>

      {jobState?.total > 0 && (
        <div className="biq-live-counters">
          <div className="biq-counter green"><strong>{(jobState.imported || 0).toLocaleString()}</strong><span>Imported</span></div>
          <div className="biq-counter yellow"><strong>{(jobState.duplicates || 0).toLocaleString()}</strong><span>Duplicates</span></div>
          <div className="biq-counter red"><strong>{(jobState.failed || 0).toLocaleString()}</strong><span>Failed</span></div>
          <div className="biq-counter gray"><strong>{(jobState.total || 0).toLocaleString()}</strong><span>Total</span></div>
        </div>
      )}

      {jobState?.status === 'running' && onCancel && (
        <button className="biq-cancel-btn" onClick={onCancel}>Cancel Import</button>
      )}
    </div>
  );
}

function ImportReport({ result, onReset }) {
  const [showFailed, setShowFailed] = useState(false);
  if (!result) return null;

  // Metadata summary rows
  const metaRows = [
    { label: 'Subject',   value: result.subjectName || '—' },
    { label: 'Category',  value: result.questionCategory === 'past_year' ? 'Past Year Questions' : 'Practice Questions' },
    { label: 'Year',      value: result.questionCategory === 'past_year' ? String(result.importYear) : '— (Practice)' },
  ];

  const statRows = [
    { label: 'Total Questions Found',  value: result.total,               color: 'blue' },
    { label: 'Successfully Imported',  value: result.imported,            color: 'green' },
    { label: 'Duplicates Skipped',     value: result.duplicates,          color: 'yellow' },
    { label: 'Missing Answers',        value: result.missingAnswer,       color: 'orange' },
    { label: 'Missing Explanations',   value: result.missingExplanation,  color: 'orange' },
    { label: 'Formatting Errors',      value: result.formattingErrors,    color: 'red' },
    { label: 'Failed to Insert',       value: result.failed,              color: 'red' },
    { label: 'Import Time',            value: `${result.importTimeSec}s`, color: 'gray' },
  ];

  const downloadCSV = () => {
    const lines = [
      'Import Metadata', ...metaRows.map(r => `"${r.label}","${r.value}"`),
      '', 'Results', ...statRows.map(r => `"${r.label}","${r.value}"`),
    ];
    if (result.failedItems?.length) {
      lines.push('', 'Failed Questions', 'Question,Reason',
        ...result.failedItems.map(f => `"${f.question}","${f.reason}"`)
      );
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'import-report.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="biq-report">
      <div className="biq-report-header">
        <div className="biq-report-icon">{result.failed === 0 ? '🎉' : '⚠️'}</div>
        <h2 className="biq-report-title">Import Complete!</h2>
        <p className="biq-report-sub">Here is your detailed import summary</p>
      </div>

      {/* ── Where the questions went ── */}
      <div className="biq-meta-summary">
        <h3 className="biq-breakdown-title">📌 Questions Imported To</h3>
        <div className="biq-meta-rows">
          {metaRows.map(r => (
            <div key={r.label} className="biq-meta-row">
              <span className="biq-meta-label">{r.label}</span>
              <strong className="biq-meta-value">{r.value}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="biq-stat-grid">
        <div className="biq-stat-card blue">
          <div className="biq-stat-val">{(result.total || 0).toLocaleString()}</div>
          <div className="biq-stat-lbl">Total Found</div>
        </div>
        <div className="biq-stat-card green">
          <div className="biq-stat-val">{(result.imported || 0).toLocaleString()}</div>
          <div className="biq-stat-lbl">Imported ✅</div>
        </div>
        <div className="biq-stat-card yellow">
          <div className="biq-stat-val">{(result.duplicates || 0).toLocaleString()}</div>
          <div className="biq-stat-lbl">Duplicates 🔁</div>
        </div>
        <div className="biq-stat-card red">
          <div className="biq-stat-val">{(result.failed || 0).toLocaleString()}</div>
          <div className="biq-stat-lbl">Failed ❌</div>
        </div>
      </div>

      {/* ── Detailed breakdown ── */}
      <div className="biq-breakdown-table">
        <h3 className="biq-breakdown-title">📊 Detailed Breakdown</h3>
        <table>
          <tbody>
            {statRows.map(r => (
              <tr key={r.label}>
                <td className="biq-td-label">{r.label}</td>
                <td className={`biq-td-value ${r.color}`}>{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Failed questions ── */}
      {result.failedItems?.length > 0 && (
        <div className="biq-failed-section">
          <button className="biq-failed-toggle" onClick={() => setShowFailed(v => !v)}>
            {showFailed ? '▲' : '▼'} {result.failedItems.length} Failed Questions — click to {showFailed ? 'hide' : 'view'}
          </button>
          {showFailed && (
            <div className="biq-failed-list">
              {result.failedItems.map((item, i) => (
                <div key={i} className="biq-failed-item">
                  <span className="biq-failed-q">Q{i + 1}: {item.question}</span>
                  <span className="biq-failed-r">⚠ {item.reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="biq-report-actions">
        <button className="biq-btn-primary"   onClick={onReset}>⬆ Import Another File</button>
        <button className="biq-btn-secondary" onClick={downloadCSV}>⬇ Download CSV Report</button>
        <button className="biq-btn-outline"
          onClick={() => window.location.href = '/admin/questions'}>
          View Questions →
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function AdminImportAI() {
  const toast = useToast();

  const [step,      setStep]      = useState(0);
  const [file,      setFile]      = useState(null);
  const [subjectId, setSubjectId] = useState('');
  const [category,  setCategory]  = useState('practice');
  const [year,      setYear]      = useState('');
  const [subjects,  setSubjects]  = useState([]);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [jobId,     setJobId]     = useState(null);
  const [jobState,  setJobState]  = useState(null);
  const [result,    setResult]    = useState(null);
  const [error,     setError]     = useState(null);

  const cleanupSSE = useRef(null);

  // Load subjects
  useEffect(() => {
    (async () => {
      try {
        const { default: api } = await import('./../../services/api');
        const { data } = await api.get('/subjects');
        setSubjects(data?.data || []);
      } catch { /* ignore */ }
    })();
  }, []);

  const handleStart = async () => {
    // Client-side guard (backend also validates)
    if (!subjectId) { toast.warning('Please select a subject first.'); return; }
    if (!category)  { toast.warning('Please select a question category.'); return; }
    if (category === 'past_year' && !year) { toast.warning('Please select an exam year.'); return; }
    if (!file)      { toast.warning('Please select a file first.'); return; }

    setError(null);
    setUploading(true);
    setUploadPct(0);

    try {
      const { jobId: id } = await importService.startBulkImport(
        file, subjectId, category, category === 'past_year' ? year : null,
        (e) => setUploadPct(Math.round((e.loaded / e.total) * 100))
      );
      setJobId(id);
      setStep(1);
      setJobState({ status: 'queued', phase: 'queued', progress: 0 });

      cleanupSSE.current = importService.subscribeToProgress(
        id,
        (state) => setJobState({ ...state }),
        (finalResult) => {
          setResult(finalResult);
          setJobState({ ...(finalResult || {}), status: 'completed', phase: 'done', progress: 100 });
          setStep(2);
          toast.success(`✅ ${(finalResult.imported || 0).toLocaleString()} questions imported!`);
        },
        async (errMsg) => {
          try {
            const r = await importService.getBulkResult(id);
            if (r) {
              setResult(r);
              setJobState({ ...(r || {}), status: 'completed', phase: 'done', progress: 100 });
              setStep(2);
              toast.success(`✅ ${(r.imported || 0).toLocaleString()} questions imported!`);
              return;
            }
          } catch { /* fall through */ }
          setError(errMsg);
          setStep(2);
          toast.error(errMsg);
        }
      );
    } catch (err) {
      const msg = err?.response?.data?.message || 'Upload failed. Try again.';
      toast.error(msg);
      setStep(0);
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = async () => {
    if (!jobId) return;
    try { await importService.cancelBulkJob(jobId); toast.info('Import cancelled'); } catch { /* ignore */ }
    cleanupSSE.current?.();
    setStep(0);
    resetState();
  };

  const resetState = () => {
    setFile(null); setJobId(null);
    setJobState(null); setResult(null); setError(null);
    setUploadPct(0); setUploading(false);
    cleanupSSE.current?.();
    cleanupSSE.current = null;
    // Keep subject/category/year so admin can re-import without re-selecting
  };

  const handleReset = () => { setStep(0); resetState(); };

  // Cleanup SSE on unmount
  useEffect(() => () => cleanupSSE.current?.(), []);

  return (
    <div className="biq-root">
      {/* Header */}
      <div className="biq-header">
        <div>
          <h2 className="biq-title">🤖 AI Bulk Question Import</h2>
          <p className="biq-subtitle">
            Upload question banks — AI extracts, validates, deduplicates and imports automatically.
          </p>
        </div>
        {step > 0 && step < 2 && (
          <button className="biq-btn-outline sm" onClick={handleReset}>↩ Start Over</button>
        )}
      </div>

      <StepBar current={step} />

      {/* ── STEP 0: Upload form ── */}
      {step === 0 && (
        <ImportForm
          subjects={subjects}
          subjectId={subjectId}  setSubjectId={setSubjectId}
          category={category}    setCategory={setCategory}
          year={year}            setYear={setYear}
          file={file}            setFile={setFile}
          uploading={uploading}  uploadPct={uploadPct}
          onStart={handleStart}
        />
      )}

      {/* ── STEP 1: Processing ── */}
      {step === 1 && jobState && (
        <LiveProgressPanel jobState={jobState} onCancel={handleCancel} />
      )}

      {/* ── STEP 2: Report ── */}
      {step === 2 && (
        error && !result ? (
          <div className="biq-error-card">
            <div className="biq-error-icon">❌</div>
            <h3>Import Failed</h3>
            <p>{error}</p>
            <button className="biq-btn-primary" onClick={handleReset}>Try Again</button>
          </div>
        ) : (
          <ImportReport result={result} onReset={handleReset} />
        )
      )}
    </div>
  );
}
