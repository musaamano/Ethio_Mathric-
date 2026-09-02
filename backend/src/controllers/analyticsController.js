/**
 * Analytics Controller — Student progress & leaderboard
 * System: Stream → Subject → Question
 * Topic-level analytics removed. Subject-level analytics kept.
 * Mock exam history JOIN removed.
 * PostgreSQL version
 */
const { pool } = require('../config/db');
const R        = require('../utils/apiResponse');

// ─────────────────────────────────────────────
// STUDENT DASHBOARD OVERVIEW
// ─────────────────────────────────────────────
const getStudentOverview = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { rows: totals } = await pool.query(
      `SELECT
         COUNT(*)                    AS total_attempts,
         SUM(correct_answers)        AS total_correct,
         SUM(wrong_answers)          AS total_wrong,
         AVG(score_percent)          AS avg_score,
         SUM(time_taken_secs)        AS total_study_secs,
         COUNT(DISTINCT subject_id)  AS subjects_studied
       FROM results
       WHERE user_id = $1`,
      [userId]
    );

    const { rows: subjectStats } = await pool.query(
      `SELECT s.name AS subject_name, s.color,
              COUNT(r.id)            AS attempts,
              AVG(r.score_percent)   AS avg_score,
              SUM(r.correct_answers) AS total_correct
       FROM results r
       JOIN subjects s ON s.id = r.subject_id
       WHERE r.user_id = $1
       GROUP BY r.subject_id, s.name, s.color
       ORDER BY avg_score DESC`,
      [userId]
    );

    const { rows: weeklyProgress } = await pool.query(
      `SELECT
         DATE(completed_at)     AS day,
         COUNT(*)               AS sessions,
         AVG(score_percent)     AS avg_score,
         SUM(correct_answers)   AS correct
       FROM results
       WHERE user_id = $1
         AND completed_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(completed_at)
       ORDER BY day`,
      [userId]
    );

    const { rows: monthlyProgress } = await pool.query(
      `SELECT
         TO_CHAR(completed_at, 'YYYY-MM') AS month,
         COUNT(*)                          AS sessions,
         AVG(score_percent)                AS avg_score
       FROM results
       WHERE user_id = $1
         AND completed_at >= NOW() - INTERVAL '6 months'
       GROUP BY TO_CHAR(completed_at, 'YYYY-MM')
       ORDER BY month`,
      [userId]
    );

    const { rows: dates } = await pool.query(
      `SELECT DISTINCT DATE(completed_at) AS day
       FROM results
       WHERE user_id = $1
         AND completed_at >= CURRENT_DATE - INTERVAL '30 days'
       ORDER BY day DESC`,
      [userId]
    );

    // Study streak
    let currentStreak = 0;
    let expectedDiff  = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < dates.length; i++) {
      const d = new Date(dates[i].day);
      d.setHours(0, 0, 0, 0);
      const diffDays = Math.round((today - d) / 86400000);
      if (i === 0 && diffDays > 1) break;
      if (i === 0 && diffDays === 1) expectedDiff = 1;
      if (diffDays === expectedDiff) { currentStreak++; expectedDiff++; }
      else break;
    }

    const { rows: bookmarkCount } = await pool.query(
      'SELECT COUNT(*) AS total FROM bookmarks WHERE user_id = $1', [userId]
    );

    return R.success(res, {
      overview:       totals[0],
      subjectStats,
      weeklyProgress,
      monthlyProgress,
      streak:         currentStreak,
      bookmarks:      parseInt(bookmarkCount[0].total),
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────
// LEADERBOARD
// ─────────────────────────────────────────────
const getLeaderboard = async (req, res, next) => {
  try {
    const { period = 'weekly', stream, limit = 20 } = req.query;

    const VALID_STREAMS = ['natural_science', 'social_science'];
    const safeStream = stream && VALID_STREAMS.includes(stream) ? stream : null;

    const INTERVAL_MAP = { daily: '1 day', weekly: '7 days', monthly: '30 days' };
    const interval = INTERVAL_MAP[period] || null;

    const params = [];
    const conditions = ['u.role_id = 1'];

    if (interval) conditions.push(`r.completed_at >= NOW() - INTERVAL '${interval}'`);
    if (safeStream) {
      params.push(safeStream);
      conditions.push(`u.stream = $${params.length}`);
    }

    const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
    params.push(safeLimit);

    const { rows } = await pool.query(
      `SELECT
         u.id,
         CONCAT(u.first_name, ' ', u.last_name) AS full_name,
         u.avatar_url, u.stream, u.school,
         COUNT(r.id)                              AS exams_taken,
         ROUND(AVG(r.score_percent)::numeric, 1)  AS avg_score,
         SUM(r.correct_answers)                   AS total_correct,
         ROW_NUMBER() OVER (
           ORDER BY AVG(r.score_percent) DESC, SUM(r.correct_answers) DESC
         )                                        AS rank_pos
       FROM users u
       JOIN results r ON r.user_id = u.id
       WHERE ${conditions.join(' AND ')}
       GROUP BY u.id, u.first_name, u.last_name, u.avatar_url, u.stream, u.school
       ORDER BY avg_score DESC, total_correct DESC
       LIMIT $${params.length}`,
      params
    );

    return R.success(res, rows);
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────
// STUDENT HISTORY
// mock_exams JOIN removed — results reference subject only.
// ─────────────────────────────────────────────
const getHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows: total } = await pool.query(
      'SELECT COUNT(*) AS c FROM results WHERE user_id = $1', [req.user.id]
    );
    const { rows } = await pool.query(
      `SELECT r.id, r.mode, r.total_questions, r.correct_answers, r.wrong_answers,
              r.skipped, r.score_percent, r.time_taken_secs, r.completed_at,
              s.name AS subject_name
       FROM results r
       LEFT JOIN subjects s ON s.id = r.subject_id
       WHERE r.user_id = $1
       ORDER BY r.completed_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, parseInt(limit), offset]
    );

    return R.paginated(res, rows, parseInt(total[0].c), page, limit);
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────
// ADMIN SITE-WIDE ANALYTICS
// ─────────────────────────────────────────────
const getAdminAnalytics = async (req, res, next) => {
  try {
    const { rows: users } = await pool.query(
      `SELECT
         COUNT(*)                                                      AS total_users,
         SUM(CASE WHEN role_id = 1 THEN 1 ELSE 0 END)                 AS students,
         SUM(CASE WHEN is_active THEN 1 ELSE 0 END)                   AS active_users,
         SUM(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 ELSE 0 END) AS new_today
       FROM users`
    );
    const { rows: questions } = await pool.query(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN is_free THEN 1 ELSE 0 END) AS free_count
       FROM questions WHERE is_active = TRUE`
    );
    const { rows: revenue } = await pool.query(
      `SELECT SUM(amount_etb) AS total_revenue, COUNT(*) AS total_payments,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS successful
       FROM payments`
    );
    const { rows: subscriptions } = await pool.query(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status = 'active'  THEN 1 ELSE 0 END) AS active,
              SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) AS expired
       FROM subscriptions`
    );
    const { rows: signupsLast7 } = await pool.query(
      `SELECT DATE(created_at) AS day, COUNT(*) AS count
       FROM users
       WHERE created_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(created_at) ORDER BY day`
    );

    return R.success(res, { users: users[0], questions: questions[0], revenue: revenue[0], subscriptions: subscriptions[0], signupsLast7 });
  } catch (err) { next(err); }
};

module.exports = { getStudentOverview, getLeaderboard, getHistory, getAdminAnalytics };
