/**
 * Subject & Stream Controller
 * PostgreSQL version
 */
const { pool } = require('../config/db');
const R        = require('../utils/apiResponse');

// Get all streams with subjects
const getStreams = async (req, res, next) => {
  try {
    const { rows: streams } = await pool.query(
      'SELECT * FROM streams WHERE is_active = TRUE ORDER BY id'
    );
    for (const stream of streams) {
      const { rows: subjects } = await pool.query(
        'SELECT * FROM subjects WHERE stream_id = $1 AND is_active = TRUE ORDER BY sort_order',
        [stream.id]
      );
      stream.subjects = subjects;
    }
    return R.success(res, streams);
  } catch (err) { next(err); }
};

// Get all subjects (with optional stream filter)
const getSubjects = async (req, res, next) => {
  try {
    const { stream_id } = req.query;
    const params = [];
    let query = 'SELECT s.*, st.name AS stream_name FROM subjects s LEFT JOIN streams st ON st.id = s.stream_id WHERE s.is_active = TRUE';
    if (stream_id) { params.push(stream_id); query += ` AND s.stream_id = $${params.length}`; }
    query += ' ORDER BY s.sort_order';
    const { rows } = await pool.query(query, params);
    return R.success(res, rows);
  } catch (err) { next(err); }
};

// Get single subject (no chapters — Stream → Subject → Question)
const getSubject = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { rows } = await pool.query(
      'SELECT s.*, st.name AS stream_name FROM subjects s LEFT JOIN streams st ON st.id = s.stream_id WHERE s.slug = $1 AND s.is_active = TRUE',
      [slug]
    );
    if (!rows.length) return R.notFound(res, 'Subject not found');
    return R.success(res, rows[0]);
  } catch (err) { next(err); }
};

// Admin: create subject
const createSubject = async (req, res, next) => {
  try {
    const { stream_id, name, slug, description, icon, color, sort_order } = req.body;
    const { rows: r } = await pool.query(
      'INSERT INTO subjects (stream_id, name, slug, description, icon, color, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
      [stream_id || null, name, slug, description || null, icon || null, color || null, sort_order || 0]
    );
    return R.created(res, { id: r[0].id }, 'Subject created');
  } catch (err) { next(err); }
};

// Admin: update subject
const updateSubject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, slug, description, icon, color, sort_order, is_active } = req.body;
    await pool.query(
      'UPDATE subjects SET name=$1, slug=$2, description=$3, icon=$4, color=$5, sort_order=$6, is_active=$7 WHERE id=$8',
      [name, slug, description, icon, color, sort_order, is_active, id]
    );
    return R.success(res, {}, 'Subject updated');
  } catch (err) { next(err); }
};

// Admin: delete subject (soft)
const deleteSubject = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE subjects SET is_active = FALSE WHERE id = $1', [id]);
    return R.success(res, {}, 'Subject deactivated');
  } catch (err) { next(err); }
};

module.exports = { getStreams, getSubjects, getSubject, createSubject, updateSubject, deleteSubject };
