/**
 * seeder.js — Seeds the PostgreSQL database with demo/test data.
 * System: Stream → Subject → Question (chapters/topics/mock exams removed)
 *
 * Seeds: roles, users, streams, subjects, questions+options+explanations,
 *        subscription plans, system settings, announcement.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('❌  DATABASE_URL is not set.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;

const log  = (msg) => console.log(`  ✅  ${msg}`);
const warn = (msg) => console.log(`  ⚠️   ${msg}`);
const fail = (msg) => console.error(`  ❌  ${msg}`);

async function run() {
  console.log('\n🌱  Starting Ethio Matric Academy Database Seeder...\n');

  const client = await pool.connect();

  try {
    // ── 1. Roles ─────────────────────────────────────────────
    await client.query(`
      INSERT INTO roles (id, name, description)
        OVERRIDING SYSTEM VALUE
        VALUES
          (1, 'student',     'Grade 12 student preparing for Matric'),
          (2, 'admin',       'Content and user administrator'),
          (3, 'super_admin', 'Full system access')
        ON CONFLICT (id) DO NOTHING
    `);
    await client.query(`SELECT setval(pg_get_serial_sequence('roles','id'), COALESCE((SELECT MAX(id) FROM roles),0)+1, false)`);
    log('Roles seeded');

    // ── 2. Users ─────────────────────────────────────────────
    const superPwd   = await bcrypt.hash('Admin@1234',   BCRYPT_ROUNDS);
    const adminPwd   = await bcrypt.hash('Admin@1234',   BCRYPT_ROUNDS);
    const studentPwd = await bcrypt.hash('Student@1234', BCRYPT_ROUNDS);

    await client.query(`
      INSERT INTO users (id, role_id, first_name, last_name, email, password_hash, is_email_verified, is_active)
        OVERRIDING SYSTEM VALUE
        VALUES
          (1, 3, 'Super',   'Admin',  'superadmin@ethiomatric.com', $1, TRUE, TRUE),
          (2, 2, 'Content', 'Admin',  'admin@ethiomatric.com',      $2, TRUE, TRUE),
          (3, 1, 'Selam',   'Bekele', 'student@ethiomatric.com',    $3, TRUE, TRUE)
        ON CONFLICT (id) DO NOTHING
    `, [superPwd, adminPwd, studentPwd]);
    await client.query(`SELECT setval(pg_get_serial_sequence('users','id'), COALESCE((SELECT MAX(id) FROM users),0)+1, false)`);
    log('Users seeded');

    // ── 3. Streams ───────────────────────────────────────────
    await client.query(`
      INSERT INTO streams (id, name, slug, description)
        OVERRIDING SYSTEM VALUE
        VALUES
          (1, 'Natural Science', 'natural-science', 'Physics, Chemistry, Biology, Mathematics, English, ICT'),
          (2, 'Social Science',  'social-science',  'Economics, History, Geography, Mathematics, English, Citizenship')
        ON CONFLICT (id) DO NOTHING
    `);
    await client.query(`SELECT setval(pg_get_serial_sequence('streams','id'), COALESCE((SELECT MAX(id) FROM streams),0)+1, false)`);
    log('Streams seeded');

    // ── 4. Subjects ──────────────────────────────────────────
    await client.query(`
      INSERT INTO subjects (id, stream_id, name, slug, description, color, sort_order)
        OVERRIDING SYSTEM VALUE
        VALUES
          (1,  1, 'Mathematics', 'math-natural',    'Calculus, Algebra, Trigonometry',           '#3B82F6', 1),
          (2,  1, 'Physics',     'physics',         'Mechanics, Waves, Optics, Electricity',      '#14B8A6', 2),
          (3,  1, 'Chemistry',   'chemistry',       'Organic and Inorganic Chemistry',            '#8B5CF6', 3),
          (4,  1, 'Biology',     'biology',         'Cell Biology, Genetics, Ecology',            '#22C55E', 4),
          (5,  1, 'English',     'english-natural', 'Grammar, Comprehension, Writing',            '#F59E0B', 5),
          (6,  1, 'ICT',         'ict',             'Computer Science, Programming',              '#EC4899', 6),
          (7,  2, 'Mathematics', 'math-social',     'Business Math, Statistics',                  '#3B82F6', 1),
          (8,  2, 'Economics',   'economics',       'Micro and Macro Economics',                  '#14B8A6', 2),
          (9,  2, 'History',     'history',         'Ethiopian and World History',                '#F59E0B', 3),
          (10, 2, 'Geography',   'geography',       'Physical and Human Geography',               '#22C55E', 4),
          (11, 2, 'English',     'english-social',  'Grammar, Comprehension, Writing',            '#F59E0B', 5),
          (12, 2, 'Citizenship', 'citizenship',     'Civics and Democratic Culture',              '#EC4899', 6)
        ON CONFLICT (id) DO NOTHING
    `);
    await client.query(`SELECT setval(pg_get_serial_sequence('subjects','id'), COALESCE((SELECT MAX(id) FROM subjects),0)+1, false)`);
    log('Subjects seeded');

    // ── 5. Sample Questions (subject-based, no chapter_id or topic) ──
    await client.query(`
      INSERT INTO questions
        (id, subject_id, type, question_text, difficulty, exam_importance, is_free, created_by)
        OVERRIDING SYSTEM VALUE
        VALUES
          (1,  2, 'multiple_choice',
           'A 5 kg object is acted upon by a net force of 20 N. What is its acceleration?',
           'medium', 'high', TRUE, 1),
          (2,  2, 'multiple_choice',
           'An object at rest will remain at rest unless acted upon by:',
           'easy', 'high', TRUE, 1),
          (3,  2, 'multiple_choice',
           'When a rocket expels gas downward, the rocket moves upward. This is an example of Newton''s:',
           'easy', 'medium', TRUE, 1),
          (4,  2, 'multiple_choice',
           'A car travels 120 km in 2 hours. What is its average speed?',
           'easy', 'high', TRUE, 1),
          (5,  2, 'multiple_choice',
           'A car accelerates from 0 to 30 m/s in 6 seconds. What is its acceleration?',
           'medium', 'very_high', TRUE, 1),
          (6,  1, 'multiple_choice',
           'Find the sum of the first 10 terms of the arithmetic series: 2, 5, 8, 11, ...',
           'medium', 'very_high', TRUE, 1),
          (7,  1, 'multiple_choice',
           'If sin θ = 3/5, what is cos θ? (Assume θ is in the first quadrant)',
           'medium', 'high', FALSE, 1),
          (8,  3, 'multiple_choice',
           'The atomic number of an element is equal to the number of:',
           'easy', 'high', TRUE, 1),
          (9,  4, 'multiple_choice',
           'Which organelle is known as the powerhouse of the cell?',
           'easy', 'very_high', TRUE, 1),
          (10, 8, 'multiple_choice',
           'According to the Law of Demand, when the price of a good increases, the quantity demanded will:',
           'easy', 'very_high', TRUE, 1),
          (11, 2, 'true_false',
           'According to Newton''s First Law, an object in motion will eventually stop on its own due to inertia.',
           'easy', 'medium', TRUE, 1),
          (12, 4, 'true_false',
           'All living organisms are made up of cells.',
           'easy', 'high', TRUE, 1)
        ON CONFLICT (id) DO NOTHING
    `);
    await client.query(`SELECT setval(pg_get_serial_sequence('questions','id'), COALESCE((SELECT MAX(id) FROM questions),0)+1, false)`);
    log('Questions seeded');

    // ── 7. Options ────────────────────────────────────────────
    await client.query(`
      INSERT INTO options (question_id, option_label, option_text, is_correct, sort_order)
        VALUES
          -- Q1: a = F/m = 20/5 = 4 m/s²
          (1,'A','2 m/s²',  FALSE, 0), (1,'B','4 m/s²',  TRUE,  1), (1,'C','10 m/s²', FALSE, 2), (1,'D','25 m/s²', FALSE, 3),
          -- Q2
          (2,'A','An unbalanced external force', TRUE,  0), (2,'B','Friction',     FALSE, 1),
          (2,'C','Gravity only',                 FALSE, 2), (2,'D','Air resistance',FALSE, 3),
          -- Q3
          (3,'A','First Law', FALSE, 0), (3,'B','Second Law', FALSE, 1),
          (3,'C','Third Law', TRUE,  2), (3,'D','Law of Gravitation', FALSE, 3),
          -- Q4: 120/2 = 60 km/h
          (4,'A','60 km/h',  TRUE,  0), (4,'B','240 km/h', FALSE, 1), (4,'C','30 km/h', FALSE, 2), (4,'D','120 km/h', FALSE, 3),
          -- Q5: a = 30/6 = 5 m/s²
          (5,'A','3 m/s²', FALSE, 0), (5,'B','5 m/s²', TRUE,  1), (5,'C','6 m/s²', FALSE, 2), (5,'D','180 m/s²', FALSE, 3),
          -- Q6: S = 155
          (6,'A','100', FALSE, 0), (6,'B','120', FALSE, 1), (6,'C','155', TRUE,  2), (6,'D','175', FALSE, 3),
          -- Q7: cos θ = 4/5
          (7,'A','4/5', TRUE,  0), (7,'B','3/4', FALSE, 1), (7,'C','5/3', FALSE, 2), (7,'D','5/4', FALSE, 3),
          -- Q8
          (8,'A','Neutrons',  FALSE, 0), (8,'B','Protons', TRUE,  1), (8,'C','Electrons', FALSE, 2), (8,'D','Nucleons', FALSE, 3),
          -- Q9
          (9,'A','Nucleus',      FALSE, 0), (9,'B','Ribosome',    FALSE, 1),
          (9,'C','Mitochondria', TRUE,  2), (9,'D','Chloroplast', FALSE, 3),
          -- Q10
          (10,'A','Increase', FALSE, 0), (10,'B','Stay the same', FALSE, 1),
          (10,'C','Decrease', TRUE,  2), (10,'D','Double',        FALSE, 3),
          -- Q11 True/False
          (11,'A','True',  FALSE, 0), (11,'B','False', TRUE,  1),
          -- Q12 True/False
          (12,'A','True',  TRUE,  0), (12,'B','False', FALSE, 1)
        ON CONFLICT DO NOTHING
    `);
    log('Options seeded');

    // ── 8. Explanations ───────────────────────────────────────
    await client.query(`
      INSERT INTO explanations
        (question_id, why_correct, why_a_wrong, why_b_wrong, why_c_wrong, why_d_wrong, memory_trick, common_mistake)
        VALUES
          (1,
           'Using Newton''s Second Law: F = ma, rearranged: a = F/m = 20/5 = 4 m/s².',
           'Option A (2 m/s²) would require F = 10 N, not 20 N.',
           NULL,
           'Option C (10 m/s²) would require a mass of 2 kg, not 5 kg.',
           'Option D (25 m/s²) results from multiplying instead of dividing.',
           'Remember F = ma. To find a, cover the "a": what''s left is F/m.',
           'Most students multiply F × m instead of dividing. Always use a = F ÷ m.'
          ),
          (2,
           'Newton''s First Law (Law of Inertia) states a body at rest stays at rest unless acted on by an unbalanced external force.',
           NULL,
           'Friction is one type of force but the answer must be general — any unbalanced external force.',
           'Gravity is always present but alone does not cause an object to move from rest unless unbalanced.',
           'Air resistance opposes motion — it does not initiate it.',
           'First Law = Law of Inertia. An external UNBALANCED force causes change.',
           'Students often say "any force" — it must be UNBALANCED. Balanced forces cancel out.'
          ),
          (9,
           'Mitochondria produces ATP through cellular respiration, earning the nickname "powerhouse of the cell".',
           'The nucleus controls cell activities and stores DNA — it is the "control center".',
           'Ribosomes synthesize proteins — they are the cell''s "protein factories".',
           NULL,
           'Chloroplasts are found only in plant cells and capture sunlight for photosynthesis.',
           'MITO = Mighty power. Mitochondria = Mighty powerhouse.',
           'Students confuse mitochondria with chloroplasts. Chloroplasts are ONLY in plant cells.'
          ),
          (10,
           'The Law of Demand states an inverse relationship between price and quantity demanded — when price rises, demand falls.',
           'Quantity demanded does NOT increase when price rises — that violates the Law of Demand.',
           'Quantity demanded never stays the same when price changes (except perfectly inelastic goods).',
           NULL,
           'Doubling is not a specific prediction of the Law of Demand.',
           'Price UP → Demand DOWN. Think of a seesaw.',
           'Many students confuse Demand (the whole curve) with Quantity Demanded (a point on the curve).'
          )
        ON CONFLICT (question_id) DO NOTHING
    `);
    log('Explanations seeded');

    // ── 9. Subscription Plans ─────────────────────────────────
    await client.query(`
      INSERT INTO subscription_plans (id, name, duration_days, price_etb, description, sort_order)
        OVERRIDING SYSTEM VALUE
        VALUES
          (1, '1 Month',    30,  199.00, 'Full access for 1 month',  1),
          (2, '3 Months',   90,  499.00, 'Full access for 3 months', 2),
          (3, '6 Months',  180,  849.00, 'Full access for 6 months', 3),
          (4, '1 Year',    365, 1499.00, 'Full access for 1 year',   4)
        ON CONFLICT (id) DO NOTHING
    `);
    await client.query(`SELECT setval(pg_get_serial_sequence('subscription_plans','id'), COALESCE((SELECT MAX(id) FROM subscription_plans),0)+1, false)`);
    log('Subscription plans seeded');

    // ── 11. Student Subscription ──────────────────────────────
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await client.query(`
      INSERT INTO subscriptions (id, user_id, plan_id, status, starts_at, expires_at)
        OVERRIDING SYSTEM VALUE
        VALUES (1, 3, 1, 'active', NOW(), $1)
        ON CONFLICT (id) DO NOTHING
    `, [expiresAt]);
    await client.query(`SELECT setval(pg_get_serial_sequence('subscriptions','id'), COALESCE((SELECT MAX(id) FROM subscriptions),0)+1, false)`);
    log('Student subscription seeded');

    // ── 12. System Settings ───────────────────────────────────
    await client.query(`
      INSERT INTO system_settings (setting_key, value, description)
        VALUES
          ('site_name',           'Ethio Matric Academy', 'Website name'),
          ('free_question_limit', '20',                   'Questions free users can access'),
          ('maintenance_mode',    'false',                'Enable/disable maintenance mode')
        ON CONFLICT (setting_key) DO NOTHING
    `);
    log('System settings seeded');

    // ── 13. Announcement ─────────────────────────────────────
    await client.query(`
      INSERT INTO announcements (id, title, content, type, target_role, is_active, created_by)
        OVERRIDING SYSTEM VALUE
        VALUES
          (1, 'Welcome to Ethio Matric Academy!',
           'Start practicing today. Your first 20 questions are completely free. Upgrade anytime for full access to all questions.',
           'success', 'student', TRUE, 1)
        ON CONFLICT (id) DO NOTHING
    `);
    await client.query(`SELECT setval(pg_get_serial_sequence('announcements','id'), COALESCE((SELECT MAX(id) FROM announcements),0)+1, false)`);
    log('Announcement seeded');

    // ── Done ──────────────────────────────────────────────────
    console.log('\n');
    console.log('═'.repeat(55));
    console.log('  ✅  DATABASE SEEDED SUCCESSFULLY');
    console.log('═'.repeat(55));
    console.log('\n  LOGIN CREDENTIALS:\n');
    console.log('  👑 Super Admin');
    console.log('     Email:    superadmin@ethiomatric.com');
    console.log('     Password: Admin@1234');
    console.log('\n  🛠️  Admin');
    console.log('     Email:    admin@ethiomatric.com');
    console.log('     Password: Admin@1234');
    console.log('\n  🎓 Student');
    console.log('     Email:    student@ethiomatric.com');
    console.log('     Password: Student@1234');
    console.log('\n' + '═'.repeat(55) + '\n');

  } catch (error) {
    fail(`Seeder failed: ${error.message}`);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

run();
