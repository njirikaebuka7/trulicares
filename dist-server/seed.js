import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from './db.js';
async function q(text, params) {
    return pool.query(text, params);
}
async function seed() {
    console.log('🌱 Seeding database...');
    // ── Users ─────────────────────────────────────────────────────────────────
    const adminPwd = await bcrypt.hash('Admin@123', 12);
    const famPwd = await bcrypt.hash('Family@123', 12);
    const cgPwd = await bcrypt.hash('Care@123', 12);
    // Admin
    const adminR = await q(`
    INSERT INTO users (name, email, password_hash, role, status)
    VALUES ($1,$2,$3,'admin','active')
    ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name RETURNING id
  `, ['Admin User', 'admin@trulicares.com', adminPwd]);
    const adminId = adminR.rows[0].id;
    console.log('✓ Admin user:', adminId);
    // Families
    const fam1R = await q(`
    INSERT INTO users (name, email, password_hash, role, status)
    VALUES ($1,$2,$3,'family','active')
    ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name RETURNING id
  `, ['Jennifer Martinez', 'jennifer.m@email.com', famPwd]);
    const fam1Id = fam1R.rows[0].id;
    const fam2R = await q(`
    INSERT INTO users (name, email, password_hash, role, status)
    VALUES ($1,$2,$3,'family','active')
    ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name RETURNING id
  `, ['Robert Kim', 'robert.k@email.com', famPwd]);
    const fam2Id = fam2R.rows[0].id;
    const fam3R = await q(`
    INSERT INTO users (name, email, password_hash, role, status)
    VALUES ($1,$2,$3,'family','active')
    ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name RETURNING id
  `, ['Amanda Chen', 'amanda.c@email.com', famPwd]);
    const fam3Id = fam3R.rows[0].id;
    console.log('✓ Family users');
    // Caregivers
    const caregivers = [
        {
            name: 'Sarah Johnson', email: 'sarah@example.com', photoUrl: 'https://randomuser.me/api/portraits/women/65.jpg',
            bio: 'Experienced nanny with 8+ years caring for children of all ages. CPR certified and passionate about early childhood development.',
            specialties: ['child-care'], hourlyRateMin: 18, hourlyRateMax: 25,
            rating: 4.9, reviewCount: 47, location: 'Brooklyn, NY',
            verified: true, backgroundChecked: true, yearsExperience: 8, availability: 'Full-time',
            serviceZips: ['11201', '11215', '11217', '11231', '11238'],
            jobTitle: 'Child Care Specialist', languages: ['English', 'Spanish'],
            education: 'BA Early Childhood Education, Hunter College',
            certifications: ['CPR Certified', 'First Aid', 'Child Development Certificate'],
        },
        {
            name: 'Maria Santos', email: 'maria@example.com', photoUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
            bio: 'Certified nursing assistant specializing in senior care. Compassionate and reliable with excellent references.',
            specialties: ['senior-care'], hourlyRateMin: 20, hourlyRateMax: 30,
            rating: 4.8, reviewCount: 35, location: 'Manhattan, NY',
            verified: true, backgroundChecked: true, yearsExperience: 12, availability: 'Part-time',
            serviceZips: ['10001', '10003', '10011', '10014', '10023', '10036'],
            jobTitle: 'Senior Care Specialist', languages: ['English', 'Portuguese'],
            education: 'Associate\'s Degree in Nursing, BMCC',
            certifications: ['CNA Certified', 'CPR Certified', 'Dementia Care Specialist'],
        },
        {
            name: 'James Williams', email: 'james@example.com', photoUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
            bio: 'Dedicated adult care professional with behavioral health experience. Patient, empathetic, and goal-oriented.',
            specialties: ['adult-care'], hourlyRateMin: 22, hourlyRateMax: 32,
            rating: 4.7, reviewCount: 28, location: 'Queens, NY',
            verified: true, backgroundChecked: false, yearsExperience: 6, availability: 'Full-time',
            serviceZips: ['11101', '11102', '11103', '11354', '11375', '11201'],
            jobTitle: 'Adult Care Professional', languages: ['English'],
            education: 'BS Psychology, Queens College',
            certifications: ['CPR Certified', 'Mental Health First Aid'],
        },
        {
            name: 'Priya Patel', email: 'priya@example.com', photoUrl: 'https://randomuser.me/api/portraits/women/74.jpg',
            bio: 'Professional cleaning specialist with attention to detail. Eco-friendly products available. Residential and commercial.',
            specialties: ['cleaning'], hourlyRateMin: 25, hourlyRateMax: 40,
            rating: 4.9, reviewCount: 62, location: 'Jersey City, NJ',
            verified: true, backgroundChecked: true, yearsExperience: 10, availability: 'Flexible',
            serviceZips: ['07302', '07306', '07310', '07030', '10001'],
            jobTitle: 'Professional Cleaner', languages: ['English', 'Hindi', 'Gujarati'],
            education: 'Professional Cleaning & Hospitality Certificate',
            certifications: ['Eco-Cleaning Certified', 'Mold Remediation Trained'],
        },
        {
            name: 'Emma Davis', email: 'emma@example.com', photoUrl: 'https://randomuser.me/api/portraits/women/47.jpg',
            bio: 'Warm and attentive babysitter who loves engaging kids in creative activities. First aid trained.',
            specialties: ['child-care'], hourlyRateMin: 15, hourlyRateMax: 22,
            rating: 4.6, reviewCount: 19, location: 'Hoboken, NJ',
            verified: true, backgroundChecked: true, yearsExperience: 4, availability: 'Evenings & Weekends',
            serviceZips: ['07030', '07302', '07306', '11201'],
            jobTitle: 'Babysitter & Nanny', languages: ['English', 'French'],
            education: 'BA Psychology, Stevens Institute',
            certifications: ['CPR Certified', 'First Aid'],
        },
        {
            name: 'David Kim', email: 'david@example.com', photoUrl: 'https://randomuser.me/api/portraits/men/62.jpg',
            bio: 'Geriatric care specialist with a warm bedside manner. Fluent in English and Korean. Specialized in dementia support.',
            specialties: ['senior-care', 'adult-care'], hourlyRateMin: 24, hourlyRateMax: 36,
            rating: 4.8, reviewCount: 41, location: 'Flushing, NY',
            verified: false, backgroundChecked: false, yearsExperience: 9, availability: 'Full-time',
            serviceZips: ['11354', '11355', '11367', '11375', '11101'],
            jobTitle: 'Geriatric Care Specialist', languages: ['English', 'Korean'],
            education: 'BS Gerontology, Queens College',
            certifications: ['CNA Certified', 'Dementia Care Specialist', 'CPR Certified'],
        },
        {
            name: 'Lisa Thompson', email: 'lisa@example.com', photoUrl: 'https://randomuser.me/api/portraits/women/89.jpg',
            bio: 'Deep-cleaning expert with 7 years of residential and Airbnb turnover experience. Highly detail-oriented.',
            specialties: ['cleaning'], hourlyRateMin: 28, hourlyRateMax: 45,
            rating: 4.5, reviewCount: 33, location: 'Newark, NJ',
            verified: false, backgroundChecked: false, yearsExperience: 7, availability: 'Weekdays',
            serviceZips: ['07101', '07102', '07103', '07104', '07302'],
            jobTitle: 'Deep Cleaning Specialist', languages: ['English'],
            education: 'Hospitality Management Certificate',
            certifications: ['OSHA Safety Certified'],
        },
    ];
    const cgIds = [];
    for (const cg of caregivers) {
        const userR = await q(`
      INSERT INTO users (name, email, password_hash, role, status, photo_url)
      VALUES ($1,$2,$3,'caregiver','active',$4)
      ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name, photo_url=EXCLUDED.photo_url RETURNING id
    `, [cg.name, cg.email, cgPwd, cg.photoUrl]);
        const cgId = userR.rows[0].id;
        cgIds.push(cgId);
        await q(`
      INSERT INTO caregiver_profiles (
        user_id, bio, specialties, hourly_rate_min, hourly_rate_max,
        rating, review_count, location, verified, background_checked,
        years_experience, availability, service_zips,
        job_title, languages, education, certifications
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      ON CONFLICT (user_id) DO UPDATE SET
        bio=EXCLUDED.bio, specialties=EXCLUDED.specialties,
        hourly_rate_min=EXCLUDED.hourly_rate_min, hourly_rate_max=EXCLUDED.hourly_rate_max,
        rating=EXCLUDED.rating, review_count=EXCLUDED.review_count,
        location=EXCLUDED.location, verified=EXCLUDED.verified, background_checked=EXCLUDED.background_checked,
        years_experience=EXCLUDED.years_experience, availability=EXCLUDED.availability,
        service_zips=EXCLUDED.service_zips, job_title=EXCLUDED.job_title,
        languages=EXCLUDED.languages, education=EXCLUDED.education, certifications=EXCLUDED.certifications
    `, [
            cgId, cg.bio, cg.specialties, cg.hourlyRateMin, cg.hourlyRateMax,
            cg.rating, cg.reviewCount, cg.location, cg.verified, cg.backgroundChecked,
            cg.yearsExperience, cg.availability, cg.serviceZips,
            cg.jobTitle, cg.languages, cg.education, cg.certifications,
        ]);
    }
    console.log('✓ Caregivers seeded:', cgIds.length);
    // ── Care Requests ─────────────────────────────────────────────────────────
    const req1R = await q(`
    INSERT INTO care_requests (family_id, care_type, details, location, zip, status)
    VALUES ($1,'child-care',$2,'Brooklyn, NY','11201','matched')
    RETURNING id
  `, [fam1Id, JSON.stringify({ numberOfChildren: 2, childrenAges: [3, 6], schedule: 'Mon–Fri 8am–5pm', budget: '$18–$25/hr' })]);
    const req1Id = req1R.rows[0].id;
    const req2R = await q(`
    INSERT INTO care_requests (family_id, care_type, details, location, zip, status)
    VALUES ($1,'senior-care',$2,'Manhattan, NY','10001','matching')
    RETURNING id
  `, [fam1Id, JSON.stringify({ age: 78, schedule: 'Part-time, weekdays', budget: '$20–$28/hr' })]);
    const req2Id = req2R.rows[0].id;
    console.log('✓ Care requests');
    // ── Matches ───────────────────────────────────────────────────────────────
    await q(`
    INSERT INTO matches (request_id, caregiver_id, family_id, status, near_you, messaging_unlocked)
    VALUES ($1,$2,$3,'accepted',true,true)
    ON CONFLICT (caregiver_id, family_id) DO NOTHING
  `, [req1Id, cgIds[0], fam1Id]); // Sarah + Jennifer
    await q(`
    INSERT INTO matches (request_id, caregiver_id, family_id, status, near_you, messaging_unlocked)
    VALUES ($1,$2,$3,'accepted',true,false)
    ON CONFLICT (caregiver_id, family_id) DO NOTHING
  `, [req1Id, cgIds[4], fam1Id]); // Emma + Jennifer
    await q(`
    INSERT INTO matches (request_id, caregiver_id, family_id, status, near_you, messaging_unlocked)
    VALUES ($1,$2,$3,'pending',false,false)
    ON CONFLICT (caregiver_id, family_id) DO NOTHING
  `, [req2Id, cgIds[1], fam1Id]); // Maria + Jennifer
    await q(`
    INSERT INTO matches (request_id, caregiver_id, family_id, status, near_you, messaging_unlocked)
    VALUES ($1,$2,$3,'pending',true,false)
    ON CONFLICT (caregiver_id, family_id) DO NOTHING
  `, [req1Id, cgIds[0], fam2Id]); // Sarah + Robert
    console.log('✓ Matches');
    // ── Conversations + Messages ───────────────────────────────────────────────
    const conv1R = await q(`
    INSERT INTO conversations (family_id, caregiver_id)
    VALUES ($1,$2) ON CONFLICT (family_id,caregiver_id) DO UPDATE SET updated_at=NOW() RETURNING id
  `, [fam1Id, cgIds[0]]);
    const conv1Id = conv1R.rows[0].id;
    await q(`INSERT INTO messages (conversation_id,sender_id,content) VALUES ($1,$2,$3)`, [conv1Id, cgIds[0], "Hi! Thank you for reaching out. I'd love to learn more about your family's needs."]);
    await q(`INSERT INTO messages (conversation_id,sender_id,content) VALUES ($1,$2,$3)`, [conv1Id, fam1Id, "Great! We have two kids, ages 3 and 6. Looking for full-time care starting next month."]);
    await q(`UPDATE conversations SET updated_at=NOW() WHERE id=$1`, [conv1Id]);
    const conv2R = await q(`
    INSERT INTO conversations (family_id, caregiver_id)
    VALUES ($1,$2) ON CONFLICT (family_id,caregiver_id) DO UPDATE SET updated_at=NOW() RETURNING id
  `, [fam1Id, cgIds[4]]);
    const conv2Id = conv2R.rows[0].id;
    await q(`INSERT INTO messages (conversation_id,sender_id,content) VALUES ($1,$2,$3)`, [conv2Id, cgIds[4], "Hello! I saw your care request and I'd be happy to help. When can we chat?"]);
    await q(`UPDATE conversations SET updated_at=NOW() WHERE id=$1`, [conv2Id]);
    const conv3R = await q(`
    INSERT INTO conversations (family_id, caregiver_id)
    VALUES ($1,$2) ON CONFLICT (family_id,caregiver_id) DO UPDATE SET updated_at=NOW() RETURNING id
  `, [fam1Id, cgIds[1]]);
    const conv3Id = conv3R.rows[0].id;
    await q(`INSERT INTO messages (conversation_id,sender_id,content) VALUES ($1,$2,$3)`, [conv3Id, cgIds[1], "Good morning! I'm available for the schedule you mentioned. Let me know!"]);
    await q(`UPDATE conversations SET updated_at=NOW() WHERE id=$1`, [conv3Id]);
    // Caregiver-side conversations
    const conv4R = await q(`
    INSERT INTO conversations (family_id, caregiver_id)
    VALUES ($1,$2) ON CONFLICT (family_id,caregiver_id) DO UPDATE SET updated_at=NOW() RETURNING id
  `, [fam2Id, cgIds[0]]);
    const conv4Id = conv4R.rows[0].id;
    await q(`INSERT INTO messages (conversation_id,sender_id,content) VALUES ($1,$2,$3)`, [conv4Id, fam2Id, "Hi! We loved your profile and wanted to reach out about our child care needs."]);
    await q(`INSERT INTO messages (conversation_id,sender_id,content) VALUES ($1,$2,$3)`, [conv4Id, cgIds[0], "Thank you for reaching out! I'd love to learn more about your children."]);
    await q(`INSERT INTO messages (conversation_id,sender_id,content) VALUES ($1,$2,$3)`, [conv4Id, fam2Id, "We have twins, age 4. Looking for someone reliable 3 days a week. Are you available?"]);
    await q(`UPDATE conversations SET updated_at=NOW() WHERE id=$1`, [conv4Id]);
    const conv5R = await q(`
    INSERT INTO conversations (family_id, caregiver_id)
    VALUES ($1,$2) ON CONFLICT (family_id,caregiver_id) DO UPDATE SET updated_at=NOW() RETURNING id
  `, [fam3Id, cgIds[0]]);
    const conv5Id = conv5R.rows[0].id;
    await q(`INSERT INTO messages (conversation_id,sender_id,content) VALUES ($1,$2,$3)`, [conv5Id, fam3Id, "Hello! We're looking for senior care support for my mother — 3 days per week."]);
    await q(`INSERT INTO messages (conversation_id,sender_id,content) VALUES ($1,$2,$3)`, [conv5Id, cgIds[0], "I'd be happy to help! Could you tell me more about your mother's daily needs?"]);
    await q(`UPDATE conversations SET updated_at=NOW() WHERE id=$1`, [conv5Id]);
    console.log('✓ Conversations & messages');
    // ── Schedule ──────────────────────────────────────────────────────────────
    await q(`
    INSERT INTO schedules (caregiver_id,family_id,family_name,service,date_label,time_label,location,status)
    VALUES ($1,$2,$3,'Child Care','Today','8:00 AM – 5:00 PM','Brooklyn, NY','confirmed')
  `, [cgIds[0], fam1Id, 'Jennifer Martinez']);
    await q(`
    INSERT INTO schedules (caregiver_id,family_id,family_name,service,date_label,time_label,location,status)
    VALUES ($1,$2,$3,'Child Care','Tomorrow','8:00 AM – 5:00 PM','Brooklyn, NY','confirmed')
  `, [cgIds[0], fam1Id, 'Jennifer Martinez']);
    await q(`
    INSERT INTO schedules (caregiver_id,family_id,family_name,service,date_label,time_label,location,status)
    VALUES ($1,$2,$3,'Senior Care','May 10, 2026','9:00 AM – 1:00 PM','Manhattan, NY','pending')
  `, [cgIds[1], fam1Id, 'Jennifer Martinez']);
    console.log('✓ Schedules');
    // ── Reviews ───────────────────────────────────────────────────────────────
    await q(`
    INSERT INTO reviews (caregiver_id,family_id,rating,text,service)
    VALUES ($1,$2,5,'Sarah is absolutely wonderful with our kids. They adore her!','Child Care')
    ON CONFLICT DO NOTHING
  `, [cgIds[0], fam1Id]);
    await q(`
    INSERT INTO reviews (caregiver_id,family_id,rating,text,service)
    VALUES ($1,$2,5,'Reliable, professional, and so great with children.','Child Care')
    ON CONFLICT DO NOTHING
  `, [cgIds[0], fam2Id]);
    await q(`
    UPDATE caregiver_profiles SET
      rating=(SELECT AVG(rating)::decimal(3,2) FROM reviews WHERE caregiver_id=$1),
      review_count=(SELECT COUNT(*) FROM reviews WHERE caregiver_id=$1)
    WHERE user_id=$1
  `, [cgIds[0]]);
    console.log('✓ Reviews');
    // ── Payments ─────────────────────────────────────────────────────────────
    await q(`
    INSERT INTO payments (user_id,amount_cents,currency,description,status)
    VALUES ($1,22500,'usd','Child Care – Sarah Johnson','succeeded')
  `, [fam1Id]);
    await q(`
    INSERT INTO payments (user_id,amount_cents,currency,description,status)
    VALUES ($1,999,'usd','Messaging Unlock – Emma Davis','succeeded')
  `, [fam1Id]);
    await q(`
    INSERT INTO payments (user_id,amount_cents,currency,description,status)
    VALUES ($1,22500,'usd','Child Care – Sarah Johnson','succeeded')
  `, [fam1Id]);
    console.log('✓ Payments');
    // ── Notifications ─────────────────────────────────────────────────────────
    await q(`
    INSERT INTO notifications (user_id,type,title,content)
    VALUES ($1,'match','New Match Found','Sarah Johnson accepted your request')
  `, [fam1Id]);
    await q(`
    INSERT INTO notifications (user_id,type,title,content)
    VALUES ($1,'match','New Match Found','New match found for Senior Care')
  `, [fam1Id]);
    await q(`
    INSERT INTO notifications (user_id,type,title,content)
    VALUES ($1,'job_request','New Job Request','Jennifer Martinez is looking for Child Care')
  `, [cgIds[0]]);
    await q(`
    INSERT INTO notifications (user_id,type,title,content)
    VALUES ($1,'job_request','New Job Request','Robert Kim is looking for Child Care')
  `, [cgIds[0]]);
    console.log('✓ Notifications');
    // ── Reports ───────────────────────────────────────────────────────────────
    const michael = await q(`
    INSERT INTO users (name, email, password_hash, role, status)
    VALUES ('Michael Torres','michael.t@email.com',$1,'family','suspended')
    ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name RETURNING id
  `, [famPwd]);
    const michaelId = michael.rows[0].id;
    await q(`
    INSERT INTO reports (type,reported_user_id,reporter_id,description,evidence,status,priority)
    VALUES ('Inappropriate Message',$1,$2,$3,$4,'open','high')
  `, [michaelId, cgIds[0],
        'Sarah Johnson reported receiving threatening messages from Michael Torres after she declined his care request.',
        ['Screenshot_chat_May3.png', 'Screenshot_chat_May4.png']]);
    await q(`
    INSERT INTO reports (type,reported_user_id,reporter_id,description,evidence,status,priority)
    VALUES ('Fake Profile',$1,$2,$3,$4,'under_review','medium')
  `, [null, fam1Id,
        'Jennifer Martinez flagged a caregiver profile that appears to use stock photos.',
        ['ReverseImageSearch_result.pdf']]);
    await q(`
    INSERT INTO reports (type,reported_user_id,reporter_id,description,evidence,status,priority)
    VALUES ('No-show',$1,$2,$3,$4,'resolved','low')
  `, [cgIds[2], fam2Id,
        'Robert Kim reported that James Williams confirmed a booking but did not show up.',
        ['BookingConfirmation_Apr28.pdf']]);
    console.log('✓ Reports');
    // ── Verification Queue ────────────────────────────────────────────────────
    await q(`
    INSERT INTO verification_queue (caregiver_id,specialty,experience,documents,background_check,status)
    VALUES ($1,'Senior Care, Adult Care','9 years',$2,'pending','pending')
    ON CONFLICT DO NOTHING
  `, [cgIds[5], ['ID Verified', 'References Submitted']]);
    await q(`
    INSERT INTO verification_queue (caregiver_id,specialty,experience,documents,background_check,status)
    VALUES ($1,'Cleaning Services','7 years',$2,'not_started','pending')
    ON CONFLICT DO NOTHING
  `, [cgIds[6], ['ID Verified']]);
    console.log('✓ Verification queue');
    console.log('\n✅ Seeding complete!');
    console.log('\n📋 Test accounts:');
    console.log('  Admin:    admin@trulicares.com   / Admin@123');
    console.log('  Family:   jennifer.m@email.com   / Family@123');
    console.log('  Family:   robert.k@email.com     / Family@123');
    console.log('  Caregiver: sarah@example.com     / Care@123');
    console.log('  Caregiver: maria@example.com     / Care@123');
    await pool.end();
}
seed().catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
});
