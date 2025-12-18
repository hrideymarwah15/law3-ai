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
    { email: 'rahul.sharma@gmail.com', phone: '+919876543210', first_name: 'Rahul', last_name: 'Sharma', role: 'user', preferred_language: 'hi', city: 'Mumbai', state: 'Maharashtra', is_email_verified: true, is_phone_verified: true, is_active: true },
    { email: 'priya.patel@gmail.com', phone: '+919876543211', first_name: 'Priya', last_name: 'Patel', role: 'user', preferred_language: 'en', city: 'Delhi', state: 'Delhi', is_email_verified: true, is_phone_verified: true, is_active: true },
    { email: 'amit.kumar@gmail.com', phone: '+919876543212', first_name: 'Amit', last_name: 'Kumar', role: 'user', preferred_language: 'hi', city: 'Bangalore', state: 'Karnataka', is_email_verified: true, is_phone_verified: false, is_active: true },
    { email: 'sneha.reddy@gmail.com', phone: '+919876543213', first_name: 'Sneha', last_name: 'Reddy', role: 'user', preferred_language: 'te', city: 'Hyderabad', state: 'Telangana', is_email_verified: true, is_phone_verified: true, is_active: true },
    { email: 'vikram.singh@gmail.com', phone: '+919876543214', first_name: 'Vikram', last_name: 'Singh', role: 'user', preferred_language: 'hi', city: 'Jaipur', state: 'Rajasthan', is_email_verified: false, is_phone_verified: true, is_active: true },
    // Lawyers
    { email: 'adv.arjun.mehta@gmail.com', phone: '+919876543220', first_name: 'Arjun', last_name: 'Mehta', role: 'lawyer', preferred_language: 'en', city: 'Mumbai', state: 'Maharashtra', is_email_verified: true, is_phone_verified: true, is_active: true },
    { email: 'adv.kavita.iyer@gmail.com', phone: '+919876543221', first_name: 'Kavita', last_name: 'Iyer', role: 'lawyer', preferred_language: 'en', city: 'Chennai', state: 'Tamil Nadu', is_email_verified: true, is_phone_verified: true, is_active: true },
    { email: 'adv.rajesh.gupta@gmail.com', phone: '+919876543222', first_name: 'Rajesh', last_name: 'Gupta', role: 'lawyer', preferred_language: 'hi', city: 'Delhi', state: 'Delhi', is_email_verified: true, is_phone_verified: true, is_active: true },
    { email: 'adv.neha.sharma@gmail.com', phone: '+919876543223', first_name: 'Neha', last_name: 'Sharma', role: 'lawyer', preferred_language: 'hi', city: 'Lucknow', state: 'Uttar Pradesh', is_email_verified: true, is_phone_verified: true, is_active: true },
    { email: 'adv.sanjay.desai@gmail.com', phone: '+919876543224', first_name: 'Sanjay', last_name: 'Desai', role: 'lawyer', preferred_language: 'mr', city: 'Pune', state: 'Maharashtra', is_email_verified: true, is_phone_verified: true, is_active: true },
    // Admin
    { email: 'raunakj884@gmail.com', phone: '+919876543299', first_name: 'Raunak', last_name: 'Admin', role: 'admin', preferred_language: 'en', city: 'Mumbai', state: 'Maharashtra', is_email_verified: true, is_phone_verified: true, is_active: true },
  ];

  const { data: userData, error: userError } = await supabase.from('users').upsert(users, { onConflict: 'email' }).select();
  if (userError) {
    console.error('❌ Users error:', userError.message);
    return;
  }
  console.log(`✅ Users seeded: ${userData.length}`);

  // Create a map of email to user ID for later use
  const userMap = {};
  userData.forEach(u => { userMap[u.email] = u.id; });

  // ========================================
  // SEED LAWYERS
  // ========================================
  console.log('👨‍⚖️ Seeding lawyer profiles...');

  const lawyers = [
    {
      user_id: userMap['adv.arjun.mehta@gmail.com'],
      bar_council_number: 'MAH/1234/2010',
      bar_council_state: 'Maharashtra',
      specialization: 'criminal',
      experience_years: 14,
      bio: 'Senior advocate with 14+ years of experience specializing in criminal defense and constitutional matters. Successfully handled over 500 cases including high-profile criminal trials. Former Additional Public Prosecutor.',
      consultation_fee: 2500,
      is_verified: true,
      verification_status: 'verified',
      profile_photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=arjun',
      rating: 4.80,
      total_reviews: 45,
      total_consultations: 120,
      is_available: true,
      office_city: 'Mumbai',
      office_state: 'Maharashtra',
      office_address: '401, Maker Chambers IV, Nariman Point',
      office_pincode: '400021'
    },
    {
      user_id: userMap['adv.kavita.iyer@gmail.com'],
      bar_council_number: 'TN/5678/2012',
      bar_council_state: 'Tamil Nadu',
      specialization: 'family',
      experience_years: 12,
      bio: 'Compassionate family law specialist helping clients navigate divorce, custody, and domestic matters with sensitivity. Known for out-of-court settlements and mediation.',
      consultation_fee: 2000,
      is_verified: true,
      verification_status: 'verified',
      profile_photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=kavita',
      rating: 4.90,
      total_reviews: 62,
      total_consultations: 180,
      is_available: true,
      office_city: 'Chennai',
      office_state: 'Tamil Nadu',
      office_address: '23, Cathedral Road, Gopalapuram',
      office_pincode: '600086'
    },
    {
      user_id: userMap['adv.rajesh.gupta@gmail.com'],
      bar_council_number: 'DEL/9012/2008',
      bar_council_state: 'Delhi',
      specialization: 'property',
      experience_years: 16,
      bio: 'Expert in property law with extensive experience in real estate transactions, land disputes, and RERA matters. Advisor to multiple real estate developers.',
      consultation_fee: 3000,
      is_verified: true,
      verification_status: 'verified',
      profile_photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rajesh',
      rating: 4.70,
      total_reviews: 38,
      total_consultations: 95,
      is_available: true,
      office_city: 'Delhi',
      office_state: 'Delhi',
      office_address: '45, Connaught Place, Block B',
      office_pincode: '110001'
    },
    {
      user_id: userMap['adv.neha.sharma@gmail.com'],
      bar_council_number: 'UP/3456/2015',
      bar_council_state: 'Uttar Pradesh',
      specialization: 'corporate',
      experience_years: 9,
      bio: 'Young and dynamic corporate lawyer specializing in startup law, venture capital, and M&A transactions. Legal advisor to 20+ startups.',
      consultation_fee: 1500,
      is_verified: true,
      verification_status: 'verified',
      profile_photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=neha',
      rating: 4.60,
      total_reviews: 28,
      total_consultations: 65,
      is_available: true,
      office_city: 'Lucknow',
      office_state: 'Uttar Pradesh',
      office_address: '12, Hazratganj, Lucknow',
      office_pincode: '226001'
    },
    {
      user_id: userMap['adv.sanjay.desai@gmail.com'],
      bar_council_number: 'MAH/7890/2011',
      bar_council_state: 'Maharashtra',
      specialization: 'labour',
      experience_years: 13,
      bio: 'Labour law expert with extensive experience representing both employers and employees. Former legal advisor to Labour Department.',
      consultation_fee: 1800,
      is_verified: true,
      verification_status: 'verified',
      profile_photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sanjay',
      rating: 4.50,
      total_reviews: 33,
      total_consultations: 88,
      is_available: true,
      office_city: 'Pune',
      office_state: 'Maharashtra',
      office_address: '78, FC Road, Shivajinagar',
      office_pincode: '411005'
    }
  ];

  const { data: lawyerData, error: lawyerError } = await supabase.from('lawyers').upsert(lawyers, { onConflict: 'user_id' }).select();
  if (lawyerError) {
    console.error('❌ Lawyers error:', lawyerError.message);
  } else {
    console.log(`✅ Lawyers seeded: ${lawyerData.length}`);
  }

  // Create lawyer map
  const lawyerMap = {};
  if (lawyerData) {
    lawyerData.forEach(l => { lawyerMap[l.user_id] = l.id; });
  }

  // ========================================
  // SEED CONSULTATIONS
  // ========================================
  console.log('📅 Seeding consultations...');

  const now = new Date();
  const futureDate1 = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const futureDate2 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const pastDate1 = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const pastDate2 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const pastDate3 = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  
  const consultations = [
    // Completed consultations
    {
      user_id: userMap['rahul.sharma@gmail.com'],
      lawyer_id: lawyerMap[userMap['adv.arjun.mehta@gmail.com']],
      booking_date: pastDate1.toISOString().split('T')[0],
      booking_time: '10:00:00',
      scheduled_start: new Date(pastDate1.setHours(10, 0, 0, 0)).toISOString(),
      scheduled_end: new Date(pastDate1.setHours(10, 30, 0, 0)).toISOString(),
      status: 'completed',
      consultation_type: 'video',
      amount: 2500,
      payment_status: 'success',
      meeting_link: 'https://meet.nyaaysaathi.com/consult-1111',
      user_notes: 'Need help with a criminal case regarding false accusations.'
    },
    {
      user_id: userMap['priya.patel@gmail.com'],
      lawyer_id: lawyerMap[userMap['adv.kavita.iyer@gmail.com']],
      booking_date: pastDate2.toISOString().split('T')[0],
      booking_time: '14:00:00',
      scheduled_start: new Date(pastDate2.setHours(14, 0, 0, 0)).toISOString(),
      scheduled_end: new Date(pastDate2.setHours(14, 30, 0, 0)).toISOString(),
      status: 'completed',
      consultation_type: 'video',
      amount: 2000,
      payment_status: 'success',
      meeting_link: 'https://meet.nyaaysaathi.com/consult-2222',
      user_notes: 'Divorce proceedings and child custody discussion.'
    },
    {
      user_id: userMap['amit.kumar@gmail.com'],
      lawyer_id: lawyerMap[userMap['adv.rajesh.gupta@gmail.com']],
      booking_date: pastDate3.toISOString().split('T')[0],
      booking_time: '11:00:00',
      scheduled_start: new Date(pastDate3.setHours(11, 0, 0, 0)).toISOString(),
      scheduled_end: new Date(pastDate3.setHours(11, 30, 0, 0)).toISOString(),
      status: 'completed',
      consultation_type: 'audio',
      amount: 3000,
      payment_status: 'success',
      meeting_link: 'https://meet.nyaaysaathi.com/consult-3333',
      user_notes: 'Property dispute with neighbor regarding boundary wall.'
    },
    // Upcoming consultations
    {
      user_id: userMap['sneha.reddy@gmail.com'],
      lawyer_id: lawyerMap[userMap['adv.neha.sharma@gmail.com']],
      booking_date: futureDate1.toISOString().split('T')[0],
      booking_time: '15:00:00',
      scheduled_start: new Date(futureDate1.setHours(15, 0, 0, 0)).toISOString(),
      scheduled_end: new Date(futureDate1.setHours(15, 30, 0, 0)).toISOString(),
      status: 'confirmed',
      consultation_type: 'video',
      amount: 1500,
      payment_status: 'success',
      meeting_link: 'https://meet.nyaaysaathi.com/consult-4444',
      user_notes: 'Need advice on startup incorporation and funding agreement.'
    },
    {
      user_id: userMap['vikram.singh@gmail.com'],
      lawyer_id: lawyerMap[userMap['adv.sanjay.desai@gmail.com']],
      booking_date: futureDate2.toISOString().split('T')[0],
      booking_time: '10:30:00',
      scheduled_start: new Date(futureDate2.setHours(10, 30, 0, 0)).toISOString(),
      scheduled_end: new Date(futureDate2.setHours(11, 0, 0, 0)).toISOString(),
      status: 'confirmed',
      consultation_type: 'chat',
      amount: 1800,
      payment_status: 'success',
      meeting_link: 'https://meet.nyaaysaathi.com/consult-5555',
      user_notes: 'Wrongful termination case - need legal options.'
    }
  ];

  const { data: consultData, error: consultError } = await supabase.from('consultations').insert(consultations).select();
  if (consultError) {
    console.error('❌ Consultations error:', consultError.message);
  } else {
    console.log(`✅ Consultations seeded: ${consultData.length}`);
  }

  // ========================================
  // SEED REVIEWS
  // ========================================
  console.log('⭐ Seeding reviews...');

  if (consultData && consultData.length >= 3) {
    const reviews = [
      {
        consultation_id: consultData[0].id,
        user_id: userMap['rahul.sharma@gmail.com'],
        lawyer_id: lawyerMap[userMap['adv.arjun.mehta@gmail.com']],
        rating: 5,
        review_text: 'Excellent lawyer! Very knowledgeable about criminal law. Explained everything clearly and helped me understand my options. Highly recommended!',
        is_verified: true
      },
      {
        consultation_id: consultData[1].id,
        user_id: userMap['priya.patel@gmail.com'],
        lawyer_id: lawyerMap[userMap['adv.kavita.iyer@gmail.com']],
        rating: 5,
        review_text: 'Very compassionate and understanding. Made a difficult divorce process much easier. Great at mediation and always available for queries.',
        is_verified: true
      },
      {
        consultation_id: consultData[2].id,
        user_id: userMap['amit.kumar@gmail.com'],
        lawyer_id: lawyerMap[userMap['adv.rajesh.gupta@gmail.com']],
        rating: 4,
        review_text: 'Good knowledge of property laws. Helped resolve my boundary dispute efficiently. Could improve on response time.',
        is_verified: true
      }
    ];

    const { data: reviewData, error: reviewError } = await supabase.from('reviews').insert(reviews).select();
    if (reviewError) {
      console.error('❌ Reviews error:', reviewError.message);
    } else {
      console.log(`✅ Reviews seeded: ${reviewData.length}`);
    }
  }

  // ========================================
  // SEED CASES
  // ========================================
  console.log('📁 Seeding cases...');

  const cases = [
    {
      user_id: userMap['rahul.sharma@gmail.com'],
      case_title: 'Property Inheritance Dispute',
      case_number: 'CS/2024/1234',
      court_name: 'City Civil Court, Mumbai',
      case_type: 'property',
      status: 'active',
      next_hearing_date: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      user_id: userMap['priya.patel@gmail.com'],
      case_title: 'Divorce Petition',
      case_number: 'HMA/2024/5678',
      court_name: 'Family Court, Delhi',
      case_type: 'family',
      status: 'active',
      next_hearing_date: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      user_id: userMap['amit.kumar@gmail.com'],
      case_title: 'Consumer Complaint - Defective Product',
      case_number: 'CC/2024/9012',
      court_name: 'District Consumer Forum, Bangalore',
      case_type: 'consumer',
      status: 'pending',
      next_hearing_date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      user_id: userMap['sneha.reddy@gmail.com'],
      case_title: 'Employment Termination Appeal',
      case_number: 'LA/2024/3456',
      court_name: 'Labour Court, Hyderabad',
      case_type: 'labour',
      status: 'active',
      next_hearing_date: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  const { data: caseData, error: caseError } = await supabase.from('cases').insert(cases).select();
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
  console.log('   • raunakj884@gmail.com');
  console.log('─────────────────────────────────────────');
}

seed().catch(console.error);
