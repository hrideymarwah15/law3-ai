/**
 * Nyaay Saathi Database Seeder
 * Run: node database/seed-runner.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seed() {
  console.log('🌱 Starting database seed...\n');

  // ========================================
  // SEED USERS
  // ========================================
  console.log('📝 Seeding users...');
  
  const users = [
    // Regular Users
    { id: '11111111-1111-1111-1111-111111111111', email: 'rahul.sharma@gmail.com', phone: '+919876543210', name: 'Rahul Sharma', role: 'user', preferred_language: 'hi', city: 'Mumbai', state: 'Maharashtra', email_verified: true, phone_verified: true },
    { id: '22222222-2222-2222-2222-222222222222', email: 'priya.patel@gmail.com', phone: '+919876543211', name: 'Priya Patel', role: 'user', preferred_language: 'en', city: 'Delhi', state: 'Delhi', email_verified: true, phone_verified: true },
    { id: '33333333-3333-3333-3333-333333333333', email: 'amit.kumar@gmail.com', phone: '+919876543212', name: 'Amit Kumar', role: 'user', preferred_language: 'hi', city: 'Bangalore', state: 'Karnataka', email_verified: true, phone_verified: false },
    { id: '44444444-4444-4444-4444-444444444444', email: 'sneha.reddy@gmail.com', phone: '+919876543213', name: 'Sneha Reddy', role: 'user', preferred_language: 'te', city: 'Hyderabad', state: 'Telangana', email_verified: true, phone_verified: true },
    { id: '55555555-5555-5555-5555-555555555555', email: 'vikram.singh@gmail.com', phone: '+919876543214', name: 'Vikram Singh', role: 'user', preferred_language: 'hi', city: 'Jaipur', state: 'Rajasthan', email_verified: false, phone_verified: true },
    // Lawyers
    { id: 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', email: 'adv.arjun.mehta@gmail.com', phone: '+919876543220', name: 'Adv. Arjun Mehta', role: 'lawyer', preferred_language: 'en', city: 'Mumbai', state: 'Maharashtra', email_verified: true, phone_verified: true },
    { id: 'aaaa2222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', email: 'adv.kavita.iyer@gmail.com', phone: '+919876543221', name: 'Adv. Kavita Iyer', role: 'lawyer', preferred_language: 'en', city: 'Chennai', state: 'Tamil Nadu', email_verified: true, phone_verified: true },
    { id: 'aaaa3333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', email: 'adv.rajesh.gupta@gmail.com', phone: '+919876543222', name: 'Adv. Rajesh Gupta', role: 'lawyer', preferred_language: 'hi', city: 'Delhi', state: 'Delhi', email_verified: true, phone_verified: true },
    { id: 'aaaa4444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', email: 'adv.neha.sharma@gmail.com', phone: '+919876543223', name: 'Adv. Neha Sharma', role: 'lawyer', preferred_language: 'hi', city: 'Lucknow', state: 'Uttar Pradesh', email_verified: true, phone_verified: true },
    { id: 'aaaa5555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', email: 'adv.sanjay.desai@gmail.com', phone: '+919876543224', name: 'Adv. Sanjay Desai', role: 'lawyer', preferred_language: 'mr', city: 'Pune', state: 'Maharashtra', email_verified: true, phone_verified: true },
    // Admin
    { id: 'admin111-admin-admin-admin-adminadmin', email: 'admin@nyaaysaathi.com', phone: '+919876543299', name: 'System Admin', role: 'admin', preferred_language: 'en', city: 'Mumbai', state: 'Maharashtra', email_verified: true, phone_verified: true },
  ];

  const { data: userData, error: userError } = await supabase.from('users').upsert(users, { onConflict: 'id' }).select();
  if (userError) {
    console.error('❌ Users error:', userError.message);
  } else {
    console.log(`✅ Users seeded: ${userData.length}`);
  }

  // ========================================
  // SEED LAWYER PROFILES
  // ========================================
  console.log('👨‍⚖️ Seeding lawyer profiles...');

  const lawyerProfiles = [
    {
      id: 'lawyer-profile-1111-1111-111111111111',
      user_id: 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      bar_council_number: 'MAH/1234/2010',
      bar_council_state: 'Maharashtra',
      specializations: ['Criminal Law', 'Constitutional Law', 'Civil Rights'],
      experience_years: 14,
      bio: 'Senior advocate with 14+ years of experience specializing in criminal defense and constitutional matters. Successfully handled over 500 cases including high-profile criminal trials. Former Additional Public Prosecutor.',
      education: [
        { degree: 'LL.B', institution: 'Government Law College, Mumbai', year: 2008 },
        { degree: 'LL.M (Criminal Law)', institution: 'Mumbai University', year: 2010 }
      ],
      practice_areas: ['Criminal Defense', 'Bail Matters', 'Constitutional Petitions', 'White Collar Crimes'],
      courts_practiced: ['Supreme Court of India', 'Bombay High Court', 'Sessions Court Mumbai'],
      languages_spoken: ['English', 'Hindi', 'Marathi'],
      office_address: '401, Maker Chambers IV, Nariman Point',
      office_city: 'Mumbai',
      office_state: 'Maharashtra',
      office_pincode: '400021',
      consultation_fee: 2500,
      verification_status: 'verified',
      verified_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
      profile_photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=arjun',
      avg_rating: 4.8,
      total_reviews: 45,
      total_consultations: 120,
      is_available: true
    },
    {
      id: 'lawyer-profile-2222-2222-222222222222',
      user_id: 'aaaa2222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      bar_council_number: 'TN/5678/2012',
      bar_council_state: 'Tamil Nadu',
      specializations: ['Family Law', 'Matrimonial Law', 'Child Custody'],
      experience_years: 12,
      bio: 'Compassionate family law specialist helping clients navigate divorce, custody, and domestic matters with sensitivity. Known for out-of-court settlements and mediation.',
      education: [
        { degree: 'B.A. LL.B (Hons)', institution: 'National Law School, Bangalore', year: 2010 },
        { degree: 'Diploma in Mediation', institution: 'IIAM', year: 2014 }
      ],
      practice_areas: ['Divorce', 'Child Custody', 'Domestic Violence', 'Alimony', 'Mediation'],
      courts_practiced: ['Madras High Court', 'Family Courts Chennai'],
      languages_spoken: ['English', 'Tamil', 'Hindi'],
      office_address: '23, Cathedral Road, Gopalapuram',
      office_city: 'Chennai',
      office_state: 'Tamil Nadu',
      office_pincode: '600086',
      consultation_fee: 2000,
      verification_status: 'verified',
      verified_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
      profile_photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=kavita',
      avg_rating: 4.9,
      total_reviews: 62,
      total_consultations: 180,
      is_available: true
    },
    {
      id: 'lawyer-profile-3333-3333-333333333333',
      user_id: 'aaaa3333-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      bar_council_number: 'DEL/9012/2008',
      bar_council_state: 'Delhi',
      specializations: ['Property Law', 'Real Estate', 'Land Disputes'],
      experience_years: 16,
      bio: 'Expert in property law with extensive experience in real estate transactions, land disputes, and RERA matters. Advisor to multiple real estate developers.',
      education: [
        { degree: 'LL.B', institution: 'Faculty of Law, Delhi University', year: 2006 },
        { degree: 'LL.M (Property Law)', institution: 'Delhi University', year: 2008 }
      ],
      practice_areas: ['Property Disputes', 'Real Estate Transactions', 'RERA', 'Land Acquisition', 'Title Verification'],
      courts_practiced: ['Delhi High Court', 'District Courts Delhi', 'RERA Tribunal'],
      languages_spoken: ['English', 'Hindi', 'Punjabi'],
      office_address: '45, Connaught Place, Block B',
      office_city: 'Delhi',
      office_state: 'Delhi',
      office_pincode: '110001',
      consultation_fee: 3000,
      verification_status: 'verified',
      verified_at: new Date(Date.now() - 240 * 24 * 60 * 60 * 1000).toISOString(),
      profile_photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rajesh',
      avg_rating: 4.7,
      total_reviews: 38,
      total_consultations: 95,
      is_available: true
    },
    {
      id: 'lawyer-profile-4444-4444-444444444444',
      user_id: 'aaaa4444-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      bar_council_number: 'UP/3456/2015',
      bar_council_state: 'Uttar Pradesh',
      specializations: ['Corporate Law', 'Commercial Law', 'Startup Advisory'],
      experience_years: 9,
      bio: 'Young and dynamic corporate lawyer specializing in startup law, venture capital, and M&A transactions. Legal advisor to 20+ startups.',
      education: [
        { degree: 'B.A. LL.B (Hons)', institution: 'NLIU Bhopal', year: 2013 },
        { degree: 'Company Secretary', institution: 'ICSI', year: 2015 }
      ],
      practice_areas: ['Startup Law', 'Company Formation', 'Contract Drafting', 'M&A', 'Venture Capital'],
      courts_practiced: ['Allahabad High Court Lucknow Bench', 'NCLT'],
      languages_spoken: ['English', 'Hindi'],
      office_address: '12, Hazratganj, Lucknow',
      office_city: 'Lucknow',
      office_state: 'Uttar Pradesh',
      office_pincode: '226001',
      consultation_fee: 1500,
      verification_status: 'verified',
      verified_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      profile_photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=neha',
      avg_rating: 4.6,
      total_reviews: 28,
      total_consultations: 65,
      is_available: true
    },
    {
      id: 'lawyer-profile-5555-5555-555555555555',
      user_id: 'aaaa5555-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      bar_council_number: 'MAH/7890/2011',
      bar_council_state: 'Maharashtra',
      specializations: ['Labour Law', 'Employment Law', 'Industrial Disputes'],
      experience_years: 13,
      bio: 'Labour law expert with extensive experience representing both employers and employees. Former legal advisor to Labour Department.',
      education: [
        { degree: 'LL.B', institution: 'ILS Law College, Pune', year: 2009 },
        { degree: 'LL.M (Labour Law)', institution: 'Pune University', year: 2011 }
      ],
      practice_areas: ['Employment Contracts', 'Wrongful Termination', 'POSH', 'PF/ESI Matters', 'Industrial Disputes'],
      courts_practiced: ['Bombay High Court', 'Labour Courts Pune', 'Industrial Tribunal'],
      languages_spoken: ['English', 'Hindi', 'Marathi'],
      office_address: '78, FC Road, Shivajinagar',
      office_city: 'Pune',
      office_state: 'Maharashtra',
      office_pincode: '411005',
      consultation_fee: 1800,
      verification_status: 'verified',
      verified_at: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString(),
      profile_photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sanjay',
      avg_rating: 4.5,
      total_reviews: 33,
      total_consultations: 88,
      is_available: true
    }
  ];

  const { data: lawyerData, error: lawyerError } = await supabase.from('lawyer_profiles').upsert(lawyerProfiles, { onConflict: 'id' }).select();
  if (lawyerError) {
    console.error('❌ Lawyer profiles error:', lawyerError.message);
  } else {
    console.log(`✅ Lawyer profiles seeded: ${lawyerData.length}`);
  }

  // ========================================
  // SEED CONSULTATIONS
  // ========================================
  console.log('📅 Seeding consultations...');

  const now = new Date();
  const consultations = [
    // Completed consultations
    {
      id: 'consult-1111-1111-1111-111111111111',
      user_id: '11111111-1111-1111-1111-111111111111',
      lawyer_id: 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      scheduled_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      duration: 30,
      status: 'completed',
      amount: 2500,
      payment_status: 'captured',
      meeting_link: 'https://meet.nyaaysaathi.com/consult-1111',
      user_notes: 'Need help with a criminal case regarding false accusations.',
      completed_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString()
    },
    {
      id: 'consult-2222-2222-2222-222222222222',
      user_id: '22222222-2222-2222-2222-222222222222',
      lawyer_id: 'aaaa2222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      scheduled_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      duration: 30,
      status: 'completed',
      amount: 2000,
      payment_status: 'captured',
      meeting_link: 'https://meet.nyaaysaathi.com/consult-2222',
      user_notes: 'Divorce proceedings and child custody discussion.',
      completed_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString()
    },
    {
      id: 'consult-3333-3333-3333-333333333333',
      user_id: '33333333-3333-3333-3333-333333333333',
      lawyer_id: 'aaaa3333-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      scheduled_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      duration: 30,
      status: 'completed',
      amount: 3000,
      payment_status: 'captured',
      meeting_link: 'https://meet.nyaaysaathi.com/consult-3333',
      user_notes: 'Property dispute with neighbor regarding boundary wall.',
      completed_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString()
    },
    // Upcoming consultations
    {
      id: 'consult-4444-4444-4444-444444444444',
      user_id: '44444444-4444-4444-4444-444444444444',
      lawyer_id: 'aaaa4444-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      scheduled_at: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      duration: 30,
      status: 'confirmed',
      amount: 1500,
      payment_status: 'captured',
      meeting_link: 'https://meet.nyaaysaathi.com/consult-4444',
      user_notes: 'Need advice on startup incorporation and funding agreement.'
    },
    {
      id: 'consult-5555-5555-5555-555555555555',
      user_id: '55555555-5555-5555-5555-555555555555',
      lawyer_id: 'aaaa5555-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      scheduled_at: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      duration: 30,
      status: 'confirmed',
      amount: 1800,
      payment_status: 'captured',
      meeting_link: 'https://meet.nyaaysaathi.com/consult-5555',
      user_notes: 'Wrongful termination case - need legal options.'
    }
  ];

  const { data: consultData, error: consultError } = await supabase.from('consultations').upsert(consultations, { onConflict: 'id' }).select();
  if (consultError) {
    console.error('❌ Consultations error:', consultError.message);
  } else {
    console.log(`✅ Consultations seeded: ${consultData.length}`);
  }

  // ========================================
  // SEED REVIEWS
  // ========================================
  console.log('⭐ Seeding reviews...');

  const reviews = [
    {
      id: 'review-1111-1111-1111-111111111111',
      consultation_id: 'consult-1111-1111-1111-111111111111',
      user_id: '11111111-1111-1111-1111-111111111111',
      lawyer_id: 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      rating: 5,
      comment: 'Excellent lawyer! Very knowledgeable about criminal law. Explained everything clearly and helped me understand my options. Highly recommended!',
      is_anonymous: false
    },
    {
      id: 'review-2222-2222-2222-222222222222',
      consultation_id: 'consult-2222-2222-2222-222222222222',
      user_id: '22222222-2222-2222-2222-222222222222',
      lawyer_id: 'aaaa2222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      rating: 5,
      comment: 'Very compassionate and understanding. Made a difficult divorce process much easier. Great at mediation and always available for queries.',
      is_anonymous: false
    },
    {
      id: 'review-3333-3333-3333-333333333333',
      consultation_id: 'consult-3333-3333-3333-333333333333',
      user_id: '33333333-3333-3333-3333-333333333333',
      lawyer_id: 'aaaa3333-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      rating: 4,
      comment: 'Good knowledge of property laws. Helped resolve my boundary dispute efficiently. Could improve on response time.',
      is_anonymous: false
    }
  ];

  const { data: reviewData, error: reviewError } = await supabase.from('reviews').upsert(reviews, { onConflict: 'id' }).select();
  if (reviewError) {
    console.error('❌ Reviews error:', reviewError.message);
  } else {
    console.log(`✅ Reviews seeded: ${reviewData.length}`);
  }

  // ========================================
  // SEED CASES
  // ========================================
  console.log('📁 Seeding cases...');

  const cases = [
    {
      id: 'case-1111-1111-1111-111111111111',
      user_id: '11111111-1111-1111-1111-111111111111',
      case_title: 'Property Inheritance Dispute',
      case_number: 'CS/2024/1234',
      court_name: 'City Civil Court, Mumbai',
      case_type: 'property',
      status: 'active',
      next_hearing_date: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      lawyer_name: 'Adv. Rajesh Gupta',
      notes: 'Family property dispute regarding ancestral property division. Documents submitted, awaiting court date.'
    },
    {
      id: 'case-2222-2222-2222-222222222222',
      user_id: '22222222-2222-2222-2222-222222222222',
      case_title: 'Divorce Petition',
      case_number: 'HMA/2024/5678',
      court_name: 'Family Court, Delhi',
      case_type: 'family',
      status: 'active',
      next_hearing_date: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      lawyer_name: 'Adv. Kavita Iyer',
      notes: 'Mutual consent divorce. Both parties have agreed on terms. Cooling period ongoing.'
    },
    {
      id: 'case-3333-3333-3333-333333333333',
      user_id: '33333333-3333-3333-3333-333333333333',
      case_title: 'Consumer Complaint - Defective Product',
      case_number: 'CC/2024/9012',
      court_name: 'District Consumer Forum, Bangalore',
      case_type: 'consumer',
      status: 'pending',
      next_hearing_date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Complaint filed against electronics company for selling defective laptop. Awaiting first hearing.'
    },
    {
      id: 'case-4444-4444-4444-444444444444',
      user_id: '44444444-4444-4444-4444-444444444444',
      case_title: 'Employment Termination Appeal',
      case_number: 'LA/2024/3456',
      court_name: 'Labour Court, Hyderabad',
      case_type: 'labour',
      status: 'active',
      next_hearing_date: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000).toISOString(),
      lawyer_name: 'Adv. Sanjay Desai',
      notes: 'Appeal against wrongful termination. Company claims performance issues, we have evidence of discrimination.'
    }
  ];

  const { data: caseData, error: caseError } = await supabase.from('cases').upsert(cases, { onConflict: 'id' }).select();
  if (caseError) {
    console.error('❌ Cases error:', caseError.message);
  } else {
    console.log(`✅ Cases seeded: ${caseData.length}`);
  }

  // ========================================
  // SUMMARY
  // ========================================
  console.log('\n========================================');
  console.log('🎉 DATABASE SEED COMPLETE!');
  console.log('========================================');
  console.log('\n📊 Test Accounts:');
  console.log('─────────────────────────────────────────');
  console.log('👤 Regular Users:');
  console.log('   • rahul.sharma@gmail.com');
  console.log('   • priya.patel@gmail.com');
  console.log('   • amit.kumar@gmail.com');
  console.log('   • sneha.reddy@gmail.com');
  console.log('   • vikram.singh@gmail.com');
  console.log('\n👨‍⚖️ Lawyers (verified):');
  console.log('   • adv.arjun.mehta@gmail.com (Criminal Law) - ₹2500');
  console.log('   • adv.kavita.iyer@gmail.com (Family Law) - ₹2000');
  console.log('   • adv.rajesh.gupta@gmail.com (Property Law) - ₹3000');
  console.log('   • adv.neha.sharma@gmail.com (Corporate Law) - ₹1500');
  console.log('   • adv.sanjay.desai@gmail.com (Labour Law) - ₹1800');
  console.log('\n🔑 Admin:');
  console.log('   • admin@nyaaysaathi.com');
  console.log('─────────────────────────────────────────');
}

seed().catch(console.error);
