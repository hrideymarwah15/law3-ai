-- Nyaay Saathi Seed Data
-- Test data for development and testing

-- ============================================
-- SEED USERS (Regular Users)
-- ============================================

INSERT INTO users (id, email, phone, name, avatar_url, role, preferred_language, city, state, email_verified, phone_verified)
VALUES 
-- Regular Users
('11111111-1111-1111-1111-111111111111', 'rahul.sharma@gmail.com', '+919876543210', 'Rahul Sharma', 'https://api.dicebear.com/7.x/avataaars/svg?seed=rahul', 'user', 'hi', 'Mumbai', 'Maharashtra', true, true),
('22222222-2222-2222-2222-222222222222', 'priya.patel@gmail.com', '+919876543211', 'Priya Patel', 'https://api.dicebear.com/7.x/avataaars/svg?seed=priya', 'user', 'en', 'Delhi', 'Delhi', true, true),
('33333333-3333-3333-3333-333333333333', 'amit.kumar@gmail.com', '+919876543212', 'Amit Kumar', 'https://api.dicebear.com/7.x/avataaars/svg?seed=amit', 'user', 'hi', 'Bangalore', 'Karnataka', true, false),
('44444444-4444-4444-4444-444444444444', 'sneha.reddy@gmail.com', '+919876543213', 'Sneha Reddy', 'https://api.dicebear.com/7.x/avataaars/svg?seed=sneha', 'user', 'te', 'Hyderabad', 'Telangana', true, true),
('55555555-5555-5555-5555-555555555555', 'vikram.singh@gmail.com', '+919876543214', 'Vikram Singh', 'https://api.dicebear.com/7.x/avataaars/svg?seed=vikram', 'user', 'hi', 'Jaipur', 'Rajasthan', false, true),

-- Lawyers (will also have lawyer_profiles)
('aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adv.arjun.mehta@gmail.com', '+919876543220', 'Adv. Arjun Mehta', 'https://api.dicebear.com/7.x/avataaars/svg?seed=arjun', 'lawyer', 'en', 'Mumbai', 'Maharashtra', true, true),
('aaaa2222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adv.kavita.iyer@gmail.com', '+919876543221', 'Adv. Kavita Iyer', 'https://api.dicebear.com/7.x/avataaars/svg?seed=kavita', 'lawyer', 'en', 'Chennai', 'Tamil Nadu', true, true),
('aaaa3333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adv.rajesh.gupta@gmail.com', '+919876543222', 'Adv. Rajesh Gupta', 'https://api.dicebear.com/7.x/avataaars/svg?seed=rajesh', 'lawyer', 'hi', 'Delhi', 'Delhi', true, true),
('aaaa4444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adv.neha.sharma@gmail.com', '+919876543223', 'Adv. Neha Sharma', 'https://api.dicebear.com/7.x/avataaars/svg?seed=neha', 'lawyer', 'hi', 'Lucknow', 'Uttar Pradesh', true, true),
('aaaa5555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adv.sanjay.desai@gmail.com', '+919876543224', 'Adv. Sanjay Desai', 'https://api.dicebear.com/7.x/avataaars/svg?seed=sanjay', 'lawyer', 'mr', 'Pune', 'Maharashtra', true, true),

-- Admin
('admin111-admin-admin-admin-adminadmin', 'admin@nyaaysaathi.com', '+919876543299', 'System Admin', 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin', 'admin', 'en', 'Mumbai', 'Maharashtra', true, true)

ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SEED LAWYER PROFILES
-- ============================================

INSERT INTO lawyer_profiles (
    id, user_id, bar_council_number, bar_council_state, specializations, 
    experience_years, bio, education, certifications, practice_areas, 
    courts_practiced, languages_spoken, office_address, office_city, 
    office_state, office_pincode, consultation_fee, verification_status, 
    verified_at, profile_photo_url, avg_rating, total_reviews, total_consultations, is_available
)
VALUES 
-- Adv. Arjun Mehta - Criminal & Constitutional Law
(
    'lawyer-profile-1111-1111-111111111111',
    'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'MAH/1234/2010',
    'Maharashtra',
    ARRAY['Criminal Law', 'Constitutional Law', 'Civil Rights'],
    14,
    'Senior advocate with 14+ years of experience specializing in criminal defense and constitutional matters. Successfully handled over 500 cases including high-profile criminal trials. Former Additional Public Prosecutor.',
    '[{"degree": "LL.B", "institution": "Government Law College, Mumbai", "year": 2008}, {"degree": "LL.M (Criminal Law)", "institution": "Mumbai University", "year": 2010}]'::jsonb,
    '[{"name": "Certificate in Criminal Litigation", "issuer": "Bar Council of India", "year": 2012}]'::jsonb,
    ARRAY['Criminal Defense', 'Bail Matters', 'Constitutional Petitions', 'White Collar Crimes'],
    ARRAY['Supreme Court of India', 'Bombay High Court', 'Sessions Court Mumbai'],
    ARRAY['English', 'Hindi', 'Marathi'],
    '401, Maker Chambers IV, Nariman Point',
    'Mumbai',
    'Maharashtra',
    '400021',
    2500,
    'verified',
    NOW() - INTERVAL '6 months',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=arjun',
    4.8,
    45,
    120,
    true
),

-- Adv. Kavita Iyer - Family & Matrimonial Law
(
    'lawyer-profile-2222-2222-222222222222',
    'aaaa2222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'TN/5678/2012',
    'Tamil Nadu',
    ARRAY['Family Law', 'Matrimonial Law', 'Child Custody'],
    12,
    'Compassionate family law specialist helping clients navigate divorce, custody, and domestic matters with sensitivity. Known for out-of-court settlements and mediation.',
    '[{"degree": "B.A. LL.B (Hons)", "institution": "National Law School, Bangalore", "year": 2010}, {"degree": "Diploma in Mediation", "institution": "IIAM", "year": 2014}]'::jsonb,
    '[{"name": "Certified Family Mediator", "issuer": "Mediation and Conciliation Project Committee", "year": 2015}]'::jsonb,
    ARRAY['Divorce', 'Child Custody', 'Domestic Violence', 'Alimony', 'Mediation'],
    ARRAY['Madras High Court', 'Family Courts Chennai'],
    ARRAY['English', 'Tamil', 'Hindi'],
    '23, Cathedral Road, Gopalapuram',
    'Chennai',
    'Tamil Nadu',
    '600086',
    2000,
    'verified',
    NOW() - INTERVAL '4 months',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=kavita',
    4.9,
    62,
    180,
    true
),

-- Adv. Rajesh Gupta - Property & Real Estate Law
(
    'lawyer-profile-3333-3333-333333333333',
    'aaaa3333-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'DEL/9012/2008',
    'Delhi',
    ARRAY['Property Law', 'Real Estate', 'Land Disputes'],
    16,
    'Expert in property law with extensive experience in real estate transactions, land disputes, and RERA matters. Advisor to multiple real estate developers.',
    '[{"degree": "LL.B", "institution": "Faculty of Law, Delhi University", "year": 2006}, {"degree": "LL.M (Property Law)", "institution": "Delhi University", "year": 2008}]'::jsonb,
    '[{"name": "RERA Certified Consultant", "issuer": "RERA Delhi", "year": 2018}]'::jsonb,
    ARRAY['Property Disputes', 'Real Estate Transactions', 'RERA', 'Land Acquisition', 'Title Verification'],
    ARRAY['Delhi High Court', 'District Courts Delhi', 'RERA Tribunal'],
    ARRAY['English', 'Hindi', 'Punjabi'],
    '45, Connaught Place, Block B',
    'Delhi',
    'Delhi',
    '110001',
    3000,
    'verified',
    NOW() - INTERVAL '8 months',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=rajesh',
    4.7,
    38,
    95,
    true
),

-- Adv. Neha Sharma - Corporate & Commercial Law
(
    'lawyer-profile-4444-4444-444444444444',
    'aaaa4444-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'UP/3456/2015',
    'Uttar Pradesh',
    ARRAY['Corporate Law', 'Commercial Law', 'Startup Advisory'],
    9,
    'Young and dynamic corporate lawyer specializing in startup law, venture capital, and M&A transactions. Legal advisor to 20+ startups.',
    '[{"degree": "B.A. LL.B (Hons)", "institution": "NLIU Bhopal", "year": 2013}, {"degree": "Company Secretary", "institution": "ICSI", "year": 2015}]'::jsonb,
    '[{"name": "Certified in M&A Law", "issuer": "Harvard Law School Online", "year": 2020}]'::jsonb,
    ARRAY['Startup Law', 'Company Formation', 'Contract Drafting', 'M&A', 'Venture Capital'],
    ARRAY['Allahabad High Court Lucknow Bench', 'NCLT'],
    ARRAY['English', 'Hindi'],
    '12, Hazratganj, Lucknow',
    'Lucknow',
    'Uttar Pradesh',
    '226001',
    1500,
    'verified',
    NOW() - INTERVAL '3 months',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=neha',
    4.6,
    28,
    65,
    true
),

-- Adv. Sanjay Desai - Labour & Employment Law
(
    'lawyer-profile-5555-5555-555555555555',
    'aaaa5555-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'MAH/7890/2011',
    'Maharashtra',
    ARRAY['Labour Law', 'Employment Law', 'Industrial Disputes'],
    13,
    'Labour law expert with extensive experience representing both employers and employees. Former legal advisor to Labour Department.',
    '[{"degree": "LL.B", "institution": "ILS Law College, Pune", "year": 2009}, {"degree": "LL.M (Labour Law)", "institution": "Pune University", "year": 2011}]'::jsonb,
    '[{"name": "Certificate in Industrial Relations", "issuer": "XLRI Jamshedpur", "year": 2016}]'::jsonb,
    ARRAY['Employment Contracts', 'Wrongful Termination', 'POSH', 'PF/ESI Matters', 'Industrial Disputes'],
    ARRAY['Bombay High Court', 'Labour Courts Pune', 'Industrial Tribunal'],
    ARRAY['English', 'Hindi', 'Marathi'],
    '78, FC Road, Shivajinagar',
    'Pune',
    'Maharashtra',
    '411005',
    1800,
    'verified',
    NOW() - INTERVAL '5 months',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=sanjay',
    4.5,
    33,
    88,
    true
)

ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SEED LAWYER AVAILABILITY
-- ============================================

-- Adv. Arjun Mehta availability (Mon-Fri, 10am-6pm)
INSERT INTO lawyer_availability (lawyer_id, day_of_week, start_time, end_time, slot_duration, is_active)
SELECT 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', day, '10:00', '18:00', 30, true
FROM generate_series(1, 5) AS day
ON CONFLICT DO NOTHING;

-- Adv. Kavita Iyer availability (Mon-Sat, 9am-5pm)
INSERT INTO lawyer_availability (lawyer_id, day_of_week, start_time, end_time, slot_duration, is_active)
SELECT 'aaaa2222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', day, '09:00', '17:00', 30, true
FROM generate_series(1, 6) AS day
ON CONFLICT DO NOTHING;

-- Adv. Rajesh Gupta availability (Mon-Fri, 11am-7pm)
INSERT INTO lawyer_availability (lawyer_id, day_of_week, start_time, end_time, slot_duration, is_active)
SELECT 'aaaa3333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', day, '11:00', '19:00', 30, true
FROM generate_series(1, 5) AS day
ON CONFLICT DO NOTHING;

-- Adv. Neha Sharma availability (Mon-Fri, 10am-6pm)
INSERT INTO lawyer_availability (lawyer_id, day_of_week, start_time, end_time, slot_duration, is_active)
SELECT 'aaaa4444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', day, '10:00', '18:00', 30, true
FROM generate_series(1, 5) AS day
ON CONFLICT DO NOTHING;

-- Adv. Sanjay Desai availability (Mon-Sat, 9am-6pm)
INSERT INTO lawyer_availability (lawyer_id, day_of_week, start_time, end_time, slot_duration, is_active)
SELECT 'aaaa5555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', day, '09:00', '18:00', 30, true
FROM generate_series(1, 6) AS day
ON CONFLICT DO NOTHING;

-- ============================================
-- SEED CONSULTATIONS
-- ============================================

INSERT INTO consultations (
    id, user_id, lawyer_id, scheduled_at, duration, status, 
    amount, payment_status, meeting_link, user_notes, completed_at
)
VALUES 
-- Completed consultations
(
    'consult-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NOW() - INTERVAL '10 days',
    30,
    'completed',
    2500,
    'captured',
    'https://meet.nyaaysaathi.com/consult-1111',
    'Need help with a criminal case regarding false accusations.',
    NOW() - INTERVAL '10 days' + INTERVAL '30 minutes'
),
(
    'consult-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'aaaa2222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NOW() - INTERVAL '7 days',
    30,
    'completed',
    2000,
    'captured',
    'https://meet.nyaaysaathi.com/consult-2222',
    'Divorce proceedings and child custody discussion.',
    NOW() - INTERVAL '7 days' + INTERVAL '30 minutes'
),
(
    'consult-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    'aaaa3333-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NOW() - INTERVAL '5 days',
    30,
    'completed',
    3000,
    'captured',
    'https://meet.nyaaysaathi.com/consult-3333',
    'Property dispute with neighbor regarding boundary wall.',
    NOW() - INTERVAL '5 days' + INTERVAL '30 minutes'
),

-- Upcoming/Confirmed consultations
(
    'consult-4444-4444-4444-444444444444',
    '44444444-4444-4444-4444-444444444444',
    'aaaa4444-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NOW() + INTERVAL '2 days',
    30,
    'confirmed',
    1500,
    'captured',
    'https://meet.nyaaysaathi.com/consult-4444',
    'Need advice on startup incorporation and funding agreement.',
    NULL
),
(
    'consult-5555-5555-5555-555555555555',
    '55555555-5555-5555-5555-555555555555',
    'aaaa5555-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NOW() + INTERVAL '3 days',
    30,
    'confirmed',
    1800,
    'captured',
    'https://meet.nyaaysaathi.com/consult-5555',
    'Wrongful termination case - need legal options.',
    NULL
),
(
    'consult-6666-6666-6666-666666666666',
    '11111111-1111-1111-1111-111111111111',
    'aaaa2222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NOW() + INTERVAL '5 days',
    30,
    'confirmed',
    2000,
    'captured',
    'https://meet.nyaaysaathi.com/consult-6666',
    'Family property inheritance dispute.',
    NULL
),

-- Pending consultation
(
    'consult-7777-7777-7777-777777777777',
    '22222222-2222-2222-2222-222222222222',
    'aaaa3333-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NOW() + INTERVAL '7 days',
    30,
    'pending',
    3000,
    'pending',
    NULL,
    'RERA complaint against builder.',
    NULL
)

ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SEED REVIEWS
-- ============================================

INSERT INTO reviews (id, consultation_id, user_id, lawyer_id, rating, comment, is_anonymous)
VALUES 
(
    'review-1111-1111-1111-111111111111',
    'consult-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    5,
    'Excellent lawyer! Very knowledgeable about criminal law. Explained everything clearly and helped me understand my options. Highly recommended!',
    false
),
(
    'review-2222-2222-2222-222222222222',
    'consult-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'aaaa2222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    5,
    'Very compassionate and understanding. Made a difficult divorce process much easier. Great at mediation and always available for queries.',
    false
),
(
    'review-3333-3333-3333-333333333333',
    'consult-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    'aaaa3333-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    4,
    'Good knowledge of property laws. Helped resolve my boundary dispute efficiently. Could improve on response time.',
    false
)

ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SEED CASES
-- ============================================

INSERT INTO cases (id, user_id, case_title, case_number, court_name, case_type, status, next_hearing_date, lawyer_name, notes)
VALUES 
(
    'case-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'Property Inheritance Dispute',
    'CS/2024/1234',
    'City Civil Court, Mumbai',
    'property',
    'active',
    NOW() + INTERVAL '15 days',
    'Adv. Rajesh Gupta',
    'Family property dispute regarding ancestral property division. Documents submitted, awaiting court date.'
),
(
    'case-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'Divorce Petition',
    'HMA/2024/5678',
    'Family Court, Delhi',
    'family',
    'active',
    NOW() + INTERVAL '20 days',
    'Adv. Kavita Iyer',
    'Mutual consent divorce. Both parties have agreed on terms. Cooling period ongoing.'
),
(
    'case-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    'Consumer Complaint - Defective Product',
    'CC/2024/9012',
    'District Consumer Forum, Bangalore',
    'consumer',
    'pending',
    NOW() + INTERVAL '30 days',
    NULL,
    'Complaint filed against electronics company for selling defective laptop. Awaiting first hearing.'
),
(
    'case-4444-4444-4444-444444444444',
    '44444444-4444-4444-4444-444444444444',
    'Employment Termination Appeal',
    'LA/2024/3456',
    'Labour Court, Hyderabad',
    'labour',
    'active',
    NOW() + INTERVAL '25 days',
    'Adv. Sanjay Desai',
    'Appeal against wrongful termination. Company claims performance issues, we have evidence of discrimination.'
)

ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SEED REMINDERS
-- ============================================

INSERT INTO reminders (id, user_id, case_id, reminder_type, reminder_date, message, send_sms, status)
VALUES 
(
    'reminder-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'case-1111-1111-1111-111111111111',
    'hearing',
    NOW() + INTERVAL '14 days',
    'Court hearing for Property Inheritance Dispute case tomorrow at 10:30 AM.',
    true,
    'pending'
),
(
    'reminder-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'case-2222-2222-2222-222222222222',
    'document_submission',
    NOW() + INTERVAL '7 days',
    'Submit affidavit for divorce petition before next hearing.',
    true,
    'pending'
),
(
    'reminder-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    NULL,
    'custom',
    NOW() + INTERVAL '1 day',
    'Consultation with Adv. Neha Sharma scheduled for tomorrow.',
    true,
    'pending'
)

ON CONFLICT (id) DO NOTHING;

-- ============================================
-- UPDATE STATISTICS
-- ============================================

-- This ensures the statistics are correct after seeding
DO $$
BEGIN
    -- Update lawyer stats based on reviews
    UPDATE lawyer_profiles lp
    SET 
        avg_rating = COALESCE((SELECT AVG(r.rating) FROM reviews r WHERE r.lawyer_id = lp.user_id), 0),
        total_reviews = (SELECT COUNT(*) FROM reviews r WHERE r.lawyer_id = lp.user_id);
END $$;

-- ============================================
-- VERIFICATION SUMMARY
-- ============================================

SELECT 'Users seeded: ' || COUNT(*) AS result FROM users;
SELECT 'Lawyer profiles seeded: ' || COUNT(*) AS result FROM lawyer_profiles;
SELECT 'Consultations seeded: ' || COUNT(*) AS result FROM consultations;
SELECT 'Reviews seeded: ' || COUNT(*) AS result FROM reviews;
SELECT 'Cases seeded: ' || COUNT(*) AS result FROM cases;
SELECT 'Reminders seeded: ' || COUNT(*) AS result FROM reminders;
