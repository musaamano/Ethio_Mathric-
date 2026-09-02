/**
 * questionExtractor.js
 * Extracts structured questions from raw text using pattern matching.
 * System: Stream → Subject → Question
 * chapter_id, topic, chapter_name removed from parsed output.
 */
const logger = require('../../utils/logger');

// ── Subject keyword map ───────────────────────────────────────
// Keywords are checked against the FULL question text (including options).
// Each keyword must be specific enough not to fire for other subjects.
// Biology keywords expanded to cover real Ethiopian Grade 12 exam patterns.
const SUBJECT_KEYWORDS = {
  physics:     ['newton', 'force', 'velocity', 'acceleration', 'momentum', 'wave', 'optics',
                'electric', 'magnetic', 'kinetic energy', 'potential energy', 'frequency',
                'wavelength', 'thermal', 'pressure', 'gravity', 'friction', 'refraction',
                'reflection', 'lens', 'circuit', 'voltage', 'current', 'resistance',
                'projectile', 'torque', 'capacitor', 'oscillation', 'amplitude',
                'electromagnetic', 'nuclear', 'radioactive', 'fission', 'fusion'],

  chemistry:   ['atom', 'molecule', 'element', 'compound', 'chemical reaction', 'acid', 'base',
                'organic chemistry', 'inorganic', 'periodic table', 'chemical bond', 'electron',
                'proton', 'neutron', 'mole', 'molecular formula', 'oxidation', 'reduction',
                'titration', 'chemical equilibrium', 'ionic', 'covalent', 'molar mass',
                'solubility', 'ph value', 'electrolysis', 'hydrocarbon', 'polymer', 'isomer',
                'alkane', 'alkene', 'benzene', 'ester', 'buffer solution'],

  biology:     ['cell', 'dna', 'rna', 'gene', 'protein', 'enzyme', 'organism',
                'evolution', 'photosynthesis', 'cellular respiration', 'mitosis', 'meiosis',
                'ecology', 'ecosystem', 'chromosome', 'nucleus', 'cell membrane',
                'bacteria', 'virus', 'hormone', 'osmosis', 'diffusion', 'active transport',
                'natural selection', 'darwin', 'genetic', 'allele', 'phenotype', 'genotype',
                'dominant', 'recessive', 'heredity', 'mutation', 'nucleotide',
                'ribosome', 'mitochondria', 'chloroplast', 'vacuole', 'lysosome',
                'tissue', 'organ system', 'digestive', 'circulatory', 'respiratory',
                'nervous system', 'excretory', 'reproductive', 'immune', 'endocrine',
                'blood vessel', 'heart chamber', 'chamber', 'lung', 'kidney', 'liver', 'stomata',
                'transpiration', 'food chain', 'food web', 'biodiversity', 'speciation',
                'biome', 'nitrogen cycle', 'carbon cycle', 'water cycle',
                'antibody', 'antigen', 'pathogen', 'vaccine', 'homeostasis',
                'immunity', 'immunology',
                'atp', 'glucose', 'amino acid', 'fatty acid', 'nucleic acid',
                'population ecology', 'community', 'habitat', 'niche', 'predator',
                'flowering plant', 'pea plant', 'gamete', 'fertilization', 'embryo', 'seed',
                'blood type', 'hemoglobin', 'plasma', 'platelet', 'lymph',
                'heterozygous', 'homozygous', 'monohybrid', 'dihybrid', 'mendel',
                'biochemical', 'living organism', 'characteristic of living',
                'density-dependent', 'density-independent', 'carrying capacity',
                'coevolution', 'symbiosis', 'parasite', 'host'],

  mathematics: ['equation', 'function', 'derivative', 'integral', 'matrix', 'vector',
                'trigonometry', 'calculus', 'algebra', 'geometry', 'probability',
                'statistics', 'polynomial', 'arithmetic sequence', 'geometric series',
                'logarithm', 'exponential', 'inequality', 'binomial theorem',
                'quadratic', 'linear equation', 'simultaneous', 'determinant',
                'permutation', 'combination', 'differentiation', 'integration',
                'limit', 'continuity', 'parabola', 'ellipse', 'hyperbola'],

  economics:   ['supply', 'demand', 'market', 'price level', 'inflation', 'gdp',
                'fiscal policy', 'monetary policy', 'elasticity', 'market equilibrium',
                'consumer', 'producer', 'international trade', 'government budget',
                'investment', 'capital', 'labour market', 'aggregate demand',
                'opportunity cost', 'marginal', 'monopoly', 'oligopoly', 'taxation',
                'subsidy', 'foreign exchange', 'balance of payments'],

  history:     ['war', 'revolution', 'empire', 'dynasty', 'civilization', 'colonial',
                'independence', 'treaty', 'century', 'ancient', 'medieval',
                'ethiopia', 'african history', 'adwa', 'haile selassie', 'menelik',
                'liberation movement', 'feudalism', 'imperialism', 'nationalism',
                'world war', 'cold war', 'decolonization'],

  geography:   ['climate', 'weather pattern', 'continent', 'ocean', 'river basin',
                'mountain range', 'population', 'urbanization', 'soil erosion',
                'latitude', 'longitude', 'biome', 'habitat', 'annual rainfall',
                'highland', 'plateau', 'vegetation', 'drainage basin', 'delta',
                'savanna', 'tropical', 'temperate', 'tectonic', 'earthquake',
                'migration', 'demographic'],

  english:     ['grammar', 'vocabulary', 'reading comprehension', 'verb tense', 'sentence',
                'paragraph', 'essay writing', 'punctuation', 'synonym', 'antonym',
                'idiom', 'phrase', 'passive voice', 'active voice', 'clause',
                'conjunction', 'preposition', 'article', 'adjective', 'adverb',
                'subject-verb agreement', 'reported speech', 'conditional'],

  citizenship: ['constitution', 'democracy', 'civil rights', 'government structure',
                'parliament', 'citizenship', 'rule of law', 'public policy',
                'federal system', 'regional government', 'election process',
                'social justice', 'sovereignty', 'human rights', 'civic duty',
                'separation of powers', 'judicial'],

  ict:         ['computer', 'software', 'hardware', 'internet', 'network',
                'database', 'algorithm', 'program', 'binary code', 'processor',
                'storage memory', 'spreadsheet', 'operating system', 'programming',
                'data structure', 'encryption', 'cybersecurity', 'ip address'],
};

function detectSubject(text) {
  const lower = text.toLowerCase();
  const scores = {};
  for (const [subject, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
    scores[subject] = keywords.filter(k => lower.includes(k)).length;
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : null;
}

function detectDifficulty(text) {
  const lower = text.toLowerCase();
  const hard  = ['calculate', 'derive', 'prove', 'evaluate', 'analyze', 'compare', 'synthesize', 'determine', 'justify'];
  const easy  = ['define', 'what is', 'name', 'list', 'state', 'identify', 'recall', 'which of the following is'];
  if (hard.some(w => lower.includes(w))) return 'hard';
  if (easy.some(w => lower.includes(w))) return 'easy';
  return 'medium';
}

function detectExamImportance(text) {
  const lower = text.toLowerCase();
  if (lower.includes('very important') || lower.includes('critical')) return 'very_high';
  if (lower.includes('important') || lower.includes('key'))           return 'high';
  if (lower.includes('basic') || lower.includes('simple'))            return 'low';
  return 'medium';
}

function detectLearningObjective(text) {
  const lower = text.toLowerCase();
  if (lower.includes('define') || lower.includes('what is'))   return 'Knowledge';
  if (lower.includes('explain') || lower.includes('describe')) return 'Comprehension';
  if (lower.includes('calculate') || lower.includes('solve'))  return 'Application';
  if (lower.includes('analyze') || lower.includes('compare'))  return 'Analysis';
  if (lower.includes('evaluate') || lower.includes('justify')) return 'Evaluation';
  if (lower.includes('design') || lower.includes('create'))    return 'Synthesis';
  return null;
}

// ─────────────────────────────────────────────────────────────
// Main text parser
// ─────────────────────────────────────────────────────────────
// PERFORMANCE NOTE: the original approach used multi-line greedy regexes that
// caused catastrophic backtracking on large files (300q = 2579ms).
// The fix: split the text into per-question blocks first (O(n) single pass),
// then apply simple single-line regexes within each small block (fast, no backtrack).
// ─────────────────────────────────────────────────────────────
function parseQuestionsFromText(text) {
  const questions = [];
  const seen      = new Set();

  // Normalise line endings once
  const normalised = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // ── Split into question blocks ──────────────────────────
  // A new block starts when a line begins with a number followed by . or )
  // This is O(n) and avoids multi-line backtracking entirely.
  const lines  = normalised.split('\n');
  const blocks = []; // each block = array of lines belonging to one question
  let current  = null;

  for (const line of lines) {
    if (/^\s*\d+[.)]\s+\S/.test(line)) {
      // New numbered item — start a new block
      if (current !== null) blocks.push(current);
      current = [line];
    } else if (current !== null) {
      current.push(line);
    }
  }
  if (current !== null) blocks.push(current);

  // ── Process each block ──────────────────────────────────
  for (const blockLines of blocks) {
    const block = blockLines.join('\n');

    // Extract question text (first line, strip leading number)
    const firstLine = blockLines[0] || '';
    const qTxt = firstLine.replace(/^\s*\d+[.)]\s*/, '').trim();
    if (!qTxt || qTxt.length < 5) continue;
    const key = qTxt.slice(0, 60);
    if (seen.has(key)) continue;

    // ── Parse options ───────────────────────────────────────
    // Options may be on separate lines OR all on one line.
    // Try per-line first, then fall back to inline scan.
    const optMap = {};

    // Pass 1: per-line options (one letter per line)
    for (const ln of blockLines) {
      const om = ln.match(/^\s*([A-D])[.)]\s+(.+)/i);
      if (om) {
        const label = om[1].toUpperCase();
        // Only take the first match per label; stop at next label or answer keyword
        const text = om[2].replace(/\s+[B-D][.)]\s.+$/i, '').trim();
        if (text) optMap[label] = text;
      }
    }

    // Pass 2: inline options — handles "A. foo   B. bar   C. baz   D. qux" on one line
    // This covers the case where all 4 options are on a single line.
    if (Object.keys(optMap).length < 2) {
      for (const ln of blockLines) {
        // Match all occurrences of "A. text" on the same line
        const inlineRe = /([A-D])[.)]\s+([^A-Da-d\n.]+?)(?=\s+[A-D][.)]|$)/g;
        let im;
        while ((im = inlineRe.exec(ln)) !== null) {
          const label = im[1].toUpperCase();
          const text  = im[2].trim();
          if (text && !optMap[label]) optMap[label] = text;
        }
      }
    }

    // Find answer line — e.g. "Answer: C" / "Ans: B" / "Key: A"
    let answer = null;
    for (const ln of blockLines) {
      const am = ln.match(/^\s*(?:Answer|Ans(?:wer)?|Key|Correct)[:\s]+([A-D])/i);
      if (am) { answer = am[1].toUpperCase(); break; }
    }

    // Find explanation line (optional) — "Explanation: ..." / "Exp: ..."
    let explanationText = null;
    for (const ln of blockLines) {
      const em = ln.match(/^\s*(?:Explanation|Exp(?:lanation)?|Why)[:\s]+(.+)/i);
      if (em) { explanationText = em[1].trim(); break; }
    }

    // Pattern 3 fallback: all on one line (question + A B C D Answer all together)
    if (!optMap.A && !optMap.B) {
      const p3 = firstLine.match(
        /\S.+?\s+A[.)]\s*(.+?)\s+B[.)]\s*(.+?)\s+C[.)]\s*(.+?)\s+D[.)]\s*(.+?)\s+(?:Answer|Ans)[:\s]+([A-D])/i
      );
      if (p3) {
        optMap.A = p3[1].trim();
        optMap.B = p3[2].trim();
        optMap.C = p3[3].trim();
        optMap.D = p3[4].trim();
        answer = p3[5].toUpperCase();
      }
    }

    // Pattern 2 fallback: inline answer bracket [Answer: X]
    if (!answer) {
      const am2 = block.match(/\[(?:Answer|Ans)[:\s]+([A-D])\]/i);
      if (am2) answer = am2[1].toUpperCase();
    }

    // Pattern 4: True/False (no A/B/C/D options, Answer: True|False)
    if (!optMap.A && !optMap.B) {
      const tfMatch = block.match(/^\s*(?:Answer|Ans)[:\s]+(True|False)/im);
      if (tfMatch) {
        if (seen.has(key)) continue;
        seen.add(key);
        questions.push({
          question_text:    qTxt,
          type:             'true_false',
          options:          [{ label: 'A', text: 'True' }, { label: 'B', text: 'False' }],
          correct_option:   tfMatch[1].toLowerCase() === 'true' ? 'A' : 'B',
          difficulty:       detectDifficulty(qTxt),
          detected_subject: detectSubject(qTxt),
          has_explanation:  !!explanationText,
          explanation:      explanationText ? { why_correct: explanationText } : undefined,
          is_free:          true,
          status:           'pending',
          errors:           [],
        });
        continue;
      }
    }

    // Only emit if we have at least 2 options (otherwise it's garbled text)
    const optCount = ['A','B','C','D'].filter(l => optMap[l]).length;
    if (optCount < 2) continue;

    seen.add(key);
    const q = makeQuestion({
      qTxt,
      optA: optMap.A || '',
      optB: optMap.B || '',
      optC: optMap.C || '',
      optD: optMap.D || '',
      answer: answer || '',
    });

    // Attach explanation if the block contained one
    if (explanationText) {
      q.has_explanation = true;
      q.explanation = { why_correct: explanationText };
    }

    questions.push(q);
  }

  // ── Fallback: unnumbered question blocks ────────────────
  // Ethiopian past-year PDFs often omit question numbers entirely, or use
  // a different numbering style. If the block-split above found 0 questions,
  // try detecting blocks by the presence of A./B./C./D. option lines.
  if (questions.length === 0) {
    const unnumberedBlocks = [];
    let curBlock = null;

    for (const line of lines) {
      const isOption = /^\s*[A-D][.)]\s+\S/.test(line);
      const isAnswer = /^\s*(?:Answer|Ans(?:wer)?|Key|Correct)[:\s]+[A-D]/i.test(line);

      if (isOption || isAnswer) {
        if (!curBlock) curBlock = [];
        curBlock.push(line);
      } else if (line.trim().length > 10 && !isOption) {
        // Non-empty, non-option line: could be a new question or continuation
        if (curBlock && curBlock.some(l => /^\s*[A-D][.)]/i.test(l))) {
          unnumberedBlocks.push(curBlock);
          curBlock = [line];
        } else {
          if (!curBlock) curBlock = [];
          curBlock.push(line);
        }
      } else if (line.trim() === '' && curBlock) {
        if (curBlock.some(l => /^\s*[A-D][.)]/i.test(l))) {
          unnumberedBlocks.push(curBlock);
        }
        curBlock = null;
      }
    }
    if (curBlock && curBlock.some(l => /^\s*[A-D][.)]/i.test(l))) {
      unnumberedBlocks.push(curBlock);
    }

    for (const blockLines of unnumberedBlocks) {
      // First non-option, non-answer line is the question text
      const qLine = blockLines.find(l => !/^\s*[A-D][.)]/i.test(l) && !/^\s*(?:Answer|Ans|Key)/i.test(l));
      if (!qLine) continue;
      const qTxt = qLine.replace(/^\s*\d+[.)]\s*/, '').trim();
      if (!qTxt || qTxt.length < 5) continue;
      const key = qTxt.slice(0, 60);
      if (seen.has(key)) continue;

      const optMap = {};
      for (const ln of blockLines) {
        const om = ln.match(/^\s*([A-D])[.)]\s+(.+)/i);
        if (om) optMap[om[1].toUpperCase()] = om[2].trim();
      }

      let answer = null;
      for (const ln of blockLines) {
        const am = ln.match(/^\s*(?:Answer|Ans(?:wer)?|Key|Correct)[:\s]+([A-D])/i);
        if (am) { answer = am[1].toUpperCase(); break; }
      }

      const optCount = ['A','B','C','D'].filter(l => optMap[l]).length;
      if (optCount < 2) continue;

      seen.add(key);
      questions.push(makeQuestion({
        qTxt,
        optA: optMap.A || '',
        optB: optMap.B || '',
        optC: optMap.C || '',
        optD: optMap.D || '',
        answer: answer || '',
      }));
    }
  }

  return questions;
}

// ─────────────────────────────────────────────────────────────
// CSV / XLSX structured row parser
// chapter/topic columns are accepted from uploaded files but not forwarded to DB
// ─────────────────────────────────────────────────────────────
function parseQuestionsFromRows(rows) {
  return rows
    .filter(row => !!(row.question_text || row.question || row.Question || row.QUESTION))
    .map((row, idx) => {
      const qTxt   = (row.question_text || row.question || row.Question || row.QUESTION || '').toString().trim();
      const optA   = (row.option_A || row.option_a || row.A || row['Option A'] || row.optionA || '').toString().trim();
      const optB   = (row.option_B || row.option_b || row.B || row['Option B'] || row.optionB || '').toString().trim();
      const optC   = (row.option_C || row.option_c || row.C || row['Option C'] || row.optionC || '').toString().trim();
      const optD   = (row.option_D || row.option_d || row.D || row['Option D'] || row.optionD || '').toString().trim();
      const answer = (row.correct_option || row.answer || row.Answer || row.correct || row.Correct || '').toString().trim().toUpperCase();
      const diff   = (row.difficulty || row.Difficulty || 'medium').toString().toLowerCase();
      const isFree = row.is_free === '1' || row.is_free === 'true' || row.is_free === true || row.is_free === 1;
      const premium = row.premium === '1' || row.premium === 'true';

      const whyCorrect  = (row.why_correct || row.explanation || row.Explanation || '').toString().trim();
      const memoryTrick = (row.memory_trick || row.mnemonic || '').toString().trim();
      const commonMist  = (row.common_mistake || '').toString().trim();
      const learningObj = (row.learning_objective || row.objective || '').toString().trim() || detectLearningObjective(qTxt);

      const q = {
        number:           idx + 1,
        question_text:    qTxt,
        type:             normaliseType(row.type || row.Type || 'multiple_choice'),
        options: [
          { label: 'A', text: optA },
          { label: 'B', text: optB },
          { label: 'C', text: optC },
          { label: 'D', text: optD },
        ],
        correct_option:     answer,
        difficulty:         ['easy','medium','hard'].includes(diff) ? diff : 'medium',
        subject_id:         row.subject_id ? parseInt(row.subject_id) : null,
        is_free:            premium ? false : isFree,
        exam_importance:    premium ? 'medium' : 'medium',
        learning_objective: learningObj || null,
        explanation: {
          why_correct:    whyCorrect,
          memory_trick:   memoryTrick,
          common_mistake: commonMist,
        },
        detected_subject:  detectSubject(qTxt),
        has_explanation:   !!(whyCorrect),
        status:            'pending',
      };

      q.errors = validateQuestion(q);
      return q;
    });
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function makeQuestion({ qTxt, optA, optB, optC, optD, answer }) {
  return {
    question_text:     qTxt?.trim(),
    type:              'multiple_choice',
    options: [
      { label: 'A', text: (optA || '').trim() },
      { label: 'B', text: (optB || '').trim() },
      { label: 'C', text: (optC || '').trim() },
      { label: 'D', text: (optD || '').trim() },
    ],
    correct_option:    answer?.trim()?.toUpperCase() || null,
    difficulty:        detectDifficulty(qTxt || ''),
    detected_subject:  detectSubject(qTxt || ''),
    learning_objective: detectLearningObjective(qTxt || ''),
    has_explanation:   false,
    is_free:           true,
    status:            'pending',
    errors:            [],
  };
}

function normaliseType(t) {
  const lower = (t || '').toString().toLowerCase().replace(/[\s-]/g, '_');
  if (lower.includes('true') || lower.includes('false') || lower === 'tf') return 'true_false';
  if (lower.includes('match'))                                               return 'matching';
  if (lower.includes('image'))                                               return 'image_based';
  if (lower.includes('short') || lower.includes('fill') || lower.includes('blank') || lower.includes('essay')) return 'fill_blank';
  return 'multiple_choice';
}

function validateQuestion(q) {
  const errors = [];
  if (!q.question_text || q.question_text.length < 5) errors.push('Question text is too short or missing');
  if (!q.subject_id) errors.push('No subject assigned — select a subject or include subject_id in your file');
  if (q.type === 'multiple_choice') {
    const validOpts = (q.options || []).filter(o => o.text && o.text.trim().length > 0);
    if (validOpts.length < 2) errors.push(`Only ${validOpts.length}/4 options provided`);
    if (!q.correct_option)    errors.push('No correct answer specified');
    if (q.correct_option && !['A','B','C','D'].includes(q.correct_option.toUpperCase())) {
      errors.push(`Invalid correct answer: "${q.correct_option}"`);
    }
  }
  return errors;
}

function generateBasicExplanation(question) {
  const correct = question.options?.find(o => o.label === question.correct_option);
  return {
    why_correct:    correct
      ? `The correct answer is ${question.correct_option}: "${correct.text}". Review this concept carefully in your textbook.`
      : 'Review your textbook for the correct explanation.',
    memory_trick:   'Create a mnemonic to remember this concept.',
    common_mistake: 'Students often confuse this with a similar concept. Read each option carefully.',
    why_a_wrong:    question.correct_option !== 'A' ? 'Option A is incorrect for this question.' : null,
    why_b_wrong:    question.correct_option !== 'B' ? 'Option B is incorrect for this question.' : null,
    why_c_wrong:    question.correct_option !== 'C' ? 'Option C is incorrect for this question.' : null,
    why_d_wrong:    question.correct_option !== 'D' ? 'Option D is incorrect for this question.' : null,
  };
}

module.exports = {
  parseQuestionsFromText,
  parseQuestionsFromRows,
  validateQuestion,
  generateBasicExplanation,
  detectSubject,
  detectDifficulty,
  detectLearningObjective,
};
