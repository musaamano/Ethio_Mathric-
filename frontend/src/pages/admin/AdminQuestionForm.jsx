/**
 * AdminQuestionForm.jsx — Create / Edit a single question.
 * Category (Practice vs Past Year) controls the year field:
 *   Practice  → year = null
 *   Past Year → year = selected year (required)
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import questionService from '../../services/questionService';
import subjectService  from '../../services/subjectService';
import { useToast }    from '../../components/common/Toast';
import Button          from '../../components/common/Button';
import Input           from '../../components/common/Input';
import LoadingSpinner  from '../../components/common/LoadingSpinner';

const DEFAULT_OPTIONS = [
  { label: 'A', text: '', is_correct: false },
  { label: 'B', text: '', is_correct: false },
  { label: 'C', text: '', is_correct: false },
  { label: 'D', text: '', is_correct: false },
];

const currentYear  = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: currentYear - 1989 }, (_, i) => currentYear - i);

export default function AdminQuestionForm() {
  const { id }   = useParams();
  const isEdit   = !!id;
  const navigate = useNavigate();
  const toast    = useToast();

  const [subjects,      setSubjects]      = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [imageFile,     setImageFile]     = useState(null);
  const [imagePreview,  setImagePreview]  = useState(null);
  const [correctOption, setCorrectOption] = useState('A');

  // Category state (derives the year value sent to backend)
  const [category, setCategory] = useState('practice'); // 'practice' | 'past_year'
  const [yearVal,  setYearVal]  = useState('');

  const {
    register, handleSubmit, watch, setValue, reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      subject_id:    '',
      type:          'multiple_choice',
      question_text: '',
      difficulty:    'medium',
      exam_importance: 'medium',
      is_free:       false,
      options:       DEFAULT_OPTIONS,
      explanation:   {
        why_correct: '', why_a_wrong: '', why_b_wrong: '',
        why_c_wrong: '', why_d_wrong: '',
        memory_trick: '', common_mistake: '', reference: '',
      },
    },
  });

  useEffect(() => {
    subjectService.getSubjects().then(setSubjects).catch(() => {});
  }, []);

  // Load existing question for edit
  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    questionService.getQuestion(id).then(q => {
      reset({
        subject_id:      q.subject_id,
        type:            q.type,
        question_text:   q.question_text,
        difficulty:      q.difficulty,
        exam_importance: q.exam_importance,
        is_free:         q.is_free,
        options: q.options?.map(o => ({
          label: o.option_label, text: o.option_text, is_correct: o.is_correct,
        })) || DEFAULT_OPTIONS,
        explanation: q.explanation || {},
      });
      if (q.options) {
        const correct = q.options.find(o => o.is_correct);
        if (correct) setCorrectOption(correct.option_label);
      }
      // Restore category + year from existing question
      if (q.year) {
        setCategory('past_year');
        setYearVal(String(q.year));
      } else {
        setCategory('practice');
        setYearVal('');
      }
      if (q.image_url) setImagePreview(q.image_url);
    }).finally(() => setLoading(false));
  }, [id, isEdit, reset]);

  const handleImageChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const onSubmit = async (data) => {
    // Validate category + year
    if (category === 'past_year' && !yearVal) {
      toast.warning('Please select an exam year for Past Year questions.');
      return;
    }

    setSaving(true);
    try {
      const optionsWithCorrect = data.options.map((o, i) => ({
        ...o,
        is_correct: o.label === correctOption,
        sort_order: i,
      }));

      const payload = {
        subject_id:      data.subject_id,
        type:            data.type,
        question_text:   data.question_text,
        difficulty:      data.difficulty,
        exam_importance: data.exam_importance,
        year:            category === 'past_year' ? parseInt(yearVal) : null,
        is_free:         data.is_free ? true : false,
        options:         JSON.stringify(optionsWithCorrect),
        explanation:     JSON.stringify(data.explanation),
      };

      if (imageFile) {
        // Use FormData when there is an image
        const formData = new FormData();
        Object.entries(payload).forEach(([k, v]) => formData.append(k, v));
        formData.append('image', imageFile);
        if (isEdit) {
          await questionService.updateQuestion(id, Object.fromEntries(formData));
        } else {
          await questionService.createQuestion(formData);
        }
      } else {
        if (isEdit) {
          await questionService.updateQuestion(id, payload);
        } else {
          await questionService.createQuestion(payload);
        }
      }

      toast.success(isEdit ? 'Question updated' : 'Question created');
      navigate('/admin/questions');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save question');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner variant="page" text="Loading question..." />;

  const options = watch('options') || DEFAULT_OPTIONS;

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-mint-light text-gray-400 hover:text-primary-600 transition-all">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h2 className="font-display font-extrabold text-2xl text-gray-800">
            {isEdit ? 'Edit Question' : 'New Question'}
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">Fill in all fields including a full explanation.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* ── Meta ── */}
        <div className="soft-card p-5 space-y-4">
          <h3 className="font-display font-bold text-base text-gray-700">Meta Information</h3>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Subject */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Subject <span className="text-red-500">*</span>
              </label>
              <select className="input-field text-sm"
                {...register('subject_id', { required: 'Subject is required' })}>
                <option value="">Select subject...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {errors.subject_id && (
                <p className="text-xs text-red-500 mt-1">{errors.subject_id.message}</p>
              )}
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Type</label>
              <select className="input-field text-sm" {...register('type')}>
                <option value="multiple_choice">Multiple Choice</option>
                <option value="true_false">True or False</option>
                <option value="fill_blank">Fill in the Blank</option>
                <option value="image_based">Image Based</option>
                <option value="matching">Matching</option>
              </select>
            </div>
          </div>

          {/* Category (Practice vs Past Year) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Question Category <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Practice = no year. Past Year = tagged with a specific exam year.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'practice',  label: 'Practice',        icon: '📝', hint: 'year = null' },
                { value: 'past_year', label: 'Past Year Exam',  icon: '📅', hint: 'tagged with year' },
              ].map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                    category === opt.value
                      ? 'border-primary-400 bg-primary-50'
                      : 'border-gray-100 hover:border-primary-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="qf-category"
                    value={opt.value}
                    checked={category === opt.value}
                    onChange={() => { setCategory(opt.value); if (opt.value === 'practice') setYearVal(''); }}
                  />
                  <div>
                    <span className="text-lg">{opt.icon}</span>
                    <p className="text-xs font-bold text-gray-700">{opt.label}</p>
                    <p className="text-[10px] text-gray-400">{opt.hint}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Exam Year — only shown for Past Year */}
          {category === 'past_year' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Exam Year <span className="text-red-500">*</span>
              </label>
              <select
                value={yearVal}
                onChange={e => setYearVal(e.target.value)}
                className="input-field text-sm w-full sm:w-48"
              >
                <option value="">— Select year —</option>
                {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              {!yearVal && (
                <p className="text-xs text-red-500 mt-1">Exam year is required.</p>
              )}
            </div>
          )}

          <div className="grid sm:grid-cols-3 gap-4">
            {/* Difficulty */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Difficulty</label>
              <select className="input-field text-sm" {...register('difficulty')}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            {/* Exam Importance */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Exam Importance</label>
              <select className="input-field text-sm" {...register('exam_importance')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="very_high">Very High</option>
              </select>
            </div>

            {/* Free toggle */}
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <div className="relative">
                  <input type="checkbox" className="sr-only peer" {...register('is_free')} />
                  <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-green-gradient transition-all" />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-all peer-checked:translate-x-4" />
                </div>
                <span className="text-sm font-semibold text-gray-700">Free question</span>
              </label>
            </div>
          </div>
        </div>

        {/* ── Question text + image ── */}
        <div className="soft-card p-5 space-y-4">
          <h3 className="font-display font-bold text-base text-gray-700">Question</h3>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Question Text <span className="text-red-500">*</span>
            </label>
            <textarea rows={4} placeholder="Enter the full question text..."
              className="w-full px-4 py-3 rounded-2xl border border-mint-dark/30 text-sm
                focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 resize-none"
              {...register('question_text', { required: 'Question text is required' })}
            />
            {errors.question_text && (
              <p className="text-xs text-red-500 mt-1">{errors.question_text.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Image (optional)</label>
            <div className="flex items-center gap-4">
              <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-surface rounded-2xl
                border border-mint-dark/20 text-sm font-medium text-gray-600 hover:bg-mint-light transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                Upload Image
                <input type="file" accept="image/*" className="sr-only" onChange={handleImageChange} />
              </label>
              {imagePreview && (
                <img src={imagePreview} alt="preview"
                  className="h-16 rounded-xl object-cover border border-mint-dark/20" />
              )}
            </div>
          </div>
        </div>

        {/* ── Options ── */}
        <div className="soft-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-base text-gray-700">Answer Options</h3>
            <p className="text-xs text-gray-400">Click the circle to mark the correct answer</p>
          </div>
          <div className="space-y-3">
            {options.map((opt, idx) => (
              <div key={idx} className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${
                correctOption === opt.label
                  ? 'border-sage-400 bg-mint-light'
                  : 'border-gray-100 bg-surface'
              }`}>
                <button type="button" onClick={() => setCorrectOption(opt.label)}
                  className={`w-8 h-8 rounded-xl font-bold text-sm flex items-center justify-center flex-shrink-0 transition-all ${
                    correctOption === opt.label
                      ? 'bg-green-gradient text-white shadow-glow-green'
                      : 'bg-gray-200 text-gray-500 hover:bg-primary-100'
                  }`}>
                  {opt.label}
                </button>
                <input type="text" placeholder={`Option ${opt.label}`}
                  className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder:text-gray-400"
                  {...register(`options.${idx}.text`, { required: 'Option text required' })}
                />
                {correctOption === opt.label && (
                  <span className="text-xs font-bold text-sage-600 flex-shrink-0">✓ Correct</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Explanation ── */}
        <div className="soft-card p-5 space-y-4">
          <h3 className="font-display font-bold text-base text-gray-700">
            Explanation <span className="text-red-500">*</span>
          </h3>
          <p className="text-xs text-gray-400">
            Every question must have a full explanation. Students see this immediately after answering.
          </p>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Why the correct answer is right <span className="text-red-500">*</span>
            </label>
            <textarea rows={3} placeholder="Explain clearly why this answer is correct..."
              className="w-full px-4 py-3 rounded-2xl border border-mint-dark/30 text-sm
                focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 resize-none"
              {...register('explanation.why_correct', { required: 'Explanation is required' })}
            />
            {errors.explanation?.why_correct && (
              <p className="text-xs text-red-500 mt-1">{errors.explanation.why_correct.message}</p>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {['a','b','c','d'].map(l => (
              <div key={l}>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Why option {l.toUpperCase()} is wrong
                </label>
                <textarea rows={2} placeholder={`Why option ${l.toUpperCase()} is incorrect...`}
                  className="w-full px-4 py-3 rounded-2xl border border-mint-dark/30 text-sm
                    focus:outline-none focus:border-primary-400 resize-none"
                  {...register(`explanation.why_${l}_wrong`)}
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">🧠 Memory Trick</label>
            <textarea rows={2} placeholder="A helpful mnemonic or trick to remember this..."
              className="w-full px-4 py-3 rounded-2xl border border-mint-dark/30 text-sm
                focus:outline-none focus:border-primary-400 resize-none"
              {...register('explanation.memory_trick')}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">⚠️ Common Mistake</label>
            <textarea rows={2} placeholder="What mistake do most students make with this question?"
              className="w-full px-4 py-3 rounded-2xl border border-mint-dark/30 text-sm
                focus:outline-none focus:border-primary-400 resize-none"
              {...register('explanation.common_mistake')}
            />
          </div>

          <Input label="📖 Reference" name="explanation.reference"
            placeholder="e.g. Grade 12 Biology Textbook, Page 45"
            {...register('explanation.reference')}
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3 justify-end">
          <Button variant="white" type="button" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" size="lg" loading={saving}>
            {isEdit ? 'Save Changes' : 'Create Question'}
          </Button>
        </div>
      </form>
    </div>
  );
}
