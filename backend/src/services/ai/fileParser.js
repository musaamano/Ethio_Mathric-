/**
 * fileParser.js
 * Extracts raw text from uploaded files.
 * Supports: PDF, DOCX, DOC, TXT, CSV, XLSX
 *
 * Fixes:
 * - pdf-parse exports a default function, not { PDFParse }
 * - Added streaming-friendly CSV/XLSX parsing for large files
 * - Returns page count and image-presence hints for PDF
 */
const mammoth = require('mammoth');
const XLSX = require('node-xlsx');
const csv = require('csv-parser');
const path = require('path');
const { Readable } = require('stream');
const logger = require('../../utils/logger');

/**
 * Extract text from a file buffer based on mime type / extension.
 * @param {Buffer} buffer   - File content as Buffer
 * @param {string} filename - Original file name (used to detect type)
 * @returns {Promise<{text: string, rows: Array|null, type: string, pages?: number}>}
 */
async function extractText(buffer, filename) {
  const ext = path.extname(filename).toLowerCase().replace('.', '');

  switch (ext) {
    case 'pdf':
      return extractFromPDF(buffer);

    case 'docx':
    case 'doc':
    case 'dotx':
      return extractFromDOCX(buffer);

    case 'txt':
      return { text: buffer.toString('utf8'), rows: null, type: 'txt' };

    case 'csv':
      return extractFromCSV(buffer);

    case 'xlsx':
    case 'xls':
      return extractFromXLSX(buffer);

    default:
      throw new Error(`Unsupported file type: .${ext}`);
  }
}

// ── PDF ────────────────────────────────────────────────────────
// pdf-parse v2.x exports a class { PDFParse } — NOT a plain function.
// The constructor takes an options object that MUST include `data` (the buffer
// as Uint8Array) plus `verbosity`. The text extraction method is getText().
async function extractFromPDF(buffer) {
  try {
    const { PDFParse } = require('pdf-parse');
    const data = Buffer.isBuffer(buffer) ? new Uint8Array(buffer) : new Uint8Array(Buffer.from(buffer));

    // verbosity: 1 = ERRORS only (suppresses pdfjs noise)
    const parser = new PDFParse({ data, verbosity: 1 });
    const result = await parser.getText();

    // result.text  — full concatenated text
    // result.total — page count
    let text = result.text || '';
    const pages = result.total || 1;

    const questionMatches = text.match(/Question\s+\d+/gi) || text.match(/(?:^|\s)(\d+)[.)]\s/gi) || [];
    const questionCount = questionMatches.length;
    logger.info(`[PDF Extraction] Raw text length: ${text.length} chars, Pages: ${pages}, Question markers found: ${questionCount}`);
    logger.info(`[PDF Extraction] Raw preview: ${text.slice(0, 1200).replace(/\s+/g, ' ').trim()}`);
    if (questionCount > 0) {
      const firstQ = questionMatches[0];
      const lastQ = questionMatches[questionMatches.length - 1];
      logger.info(`[PDF Extraction] First question marker: ${firstQ}, Last question marker: ${lastQ}`);
    }

    // Normalize text for better parsing
    text = normalizeText(text);

    // DEBUG: Count question markers after normalization
    const normalizedMatches = text.match(/Question\s+\d+/gi);
    const normalizedCount = normalizedMatches ? normalizedMatches.length : 0;
    logger.info(`[PDF Extraction] After normalization: Question markers: ${normalizedCount}`);

    return {
      text,
      rows: null,
      type: 'pdf',
      pages,
      hasImages: pages > 0 && (text.length / pages) < 200,
    };
  } catch (err) {
    throw new Error(`PDF parsing failed: ${err.message}`);
  }
}

// ── Text normalization ───────────────────────────────────────
function normalizeText(text) {
  // Normalize line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Remove excessive spaces (but preserve single spaces)
  text = text.replace(/[ \t]+/g, ' ');

  // Remove PDF formatting artifacts (Markdown-style * and **)
  text = text.replace(/\*\*/g, '').replace(/\*/g, '');

  // Repair words split across lines (e.g., "exam-\nple" -> "example")
  text = text.replace(/([a-z])-\n([a-z])/gi, '$1$2');

  // Preserve meaningful line breaks (after question numbers, options, etc.)
  // Don't flatten everything into one line

  return text;
}

// ── DOCX ──────────────────────────────────────────────────────
async function extractFromDOCX(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value, rows: null, type: 'docx' };
  } catch (err) {
    throw new Error(`DOCX parsing failed: ${err.message}`);
  }
}

// ── CSV ───────────────────────────────────────────────────────
async function extractFromCSV(buffer) {
  return new Promise((resolve, reject) => {
    const rows = [];
    const stream = Readable.from(buffer.toString('utf8'));
    stream
      .pipe(csv())
      .on('data', row => rows.push(row))
      .on('end', () => {
        const text = rows.map(r => Object.values(r).join(' | ')).join('\n');
        resolve({ text, rows, type: 'csv' });
      })
      .on('error', err => reject(new Error(`CSV parsing failed: ${err.message}`)));
  });
}

// ── XLSX ──────────────────────────────────────────────────────
async function extractFromXLSX(buffer) {
  try {
    const sheets = XLSX.parse(buffer);
    const rows = [];
    let text = '';

    for (const sheet of sheets) {
      if (!sheet.data?.length) continue;
      const headers = sheet.data[0].map(h => (h || '').toString().trim());
      for (let i = 1; i < sheet.data.length; i++) {
        const rowData = sheet.data[i];
        // Skip completely empty rows
        if (!rowData || rowData.every(cell => cell === null || cell === undefined || cell === '')) continue;
        const row = {};
        headers.forEach((h, j) => { row[h] = rowData[j] ?? ''; });
        rows.push(row);
        text += Object.values(row).join(' | ') + '\n';
      }
    }
    return { text, rows, type: 'xlsx' };
  } catch (err) {
    throw new Error(`XLSX parsing failed: ${err.message}`);
  }
}

module.exports = { extractText };
