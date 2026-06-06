const { Client } = require('pg');

const articles = [
  {
    category: 'Child Care',
    title: '10 Questions to Ask When Hiring a Nanny',
    excerpt: 'Finding the right nanny is crucial. Here are the essential questions every parent should ask during the interview process to ensure a safe and nurturing fit.',
    readTime: '5 min read',
    author: 'Femi Oloyede',
    type: 'article',
    image: '/src/assets/blog-nanny-interview.jpg',
  },
  {
    category: 'Senior Care',
    title: 'Signs Your Aging Parent May Need Additional Care',
    excerpt: 'Recognizing when a parent needs help can be challenging. Learn the early warning signs — from missed medications to social withdrawal — so you can act with confidence.',
    readTime: '7 min read',
    author: 'Dr. James Chen',
    type: 'article',
    image: '/src/assets/blog-senior-signs.jpg',
  },
  {
    category: 'Child Care',
    title: 'How to Prepare Your Child for a New Caregiver',
    excerpt: 'Transitioning to a new caregiver can be tough for kids. Follow these child-psychologist-approved tips to build trust and make it smoother for everyone.',
    readTime: '4 min read',
    author: 'Emma Davis',
    type: 'guide',
    image: '/src/assets/blog-child-transition.jpg',
  },
  {
    category: 'Cleaning',
    title: 'Spring Cleaning Checklist: Room by Room',
    excerpt: 'A comprehensive, expert-backed guide to deep cleaning your home — with printable checklists and pro tips for every room from kitchen to bathroom.',
    readTime: '8 min read',
    author: 'Lisa Thompson',
    type: 'guide',
    image: '/src/assets/blog-spring-cleaning.jpg',
  },
  {
    category: 'Adult Care',
    title: 'Understanding Behavioral Support Services',
    excerpt: 'What to know about behavioral health services and how to find the right provider for your loved one. A clear guide for families navigating adult care.',
    readTime: '6 min read',
    author: 'Dr. Maria Santos',
    type: 'article',
    image: null,
  },
  {
    category: 'Senior Care',
    title: 'Creating a Safe Home Environment for Seniors',
    excerpt: 'An expert guide on home modifications that can help prevent falls, improve accessibility, and keep aging loved ones safe and comfortable at home.',
    readTime: '10 min read',
    author: 'TruliCares Team',
    type: 'guide',
    image: null,
  },
];

const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function run() {
  const client = new Client('postgresql://postgres.ybgqmzxdpjvwcgclsgnx:EbukaNjirika2026@aws-1-us-west-1.pooler.supabase.com:6543/postgres');
  await client.connect();

  try {
    for (const a of articles) {
      const slug = slugify(a.title);
      // Check if it already exists
      const exist = await client.query('SELECT id FROM blog_posts WHERE slug = $1', [slug]);
      if (exist.rows.length === 0) {
        await client.query(`
          INSERT INTO blog_posts (title, slug, excerpt, content, featured_image, category, tags,
                                 seo_title, seo_description, author_name, read_time,
                                 status, published_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'published', NOW())
        `, [
          a.title,
          slug,
          a.excerpt,
          '',
          a.image,
          a.category,
          ['migration'],
          a.title,
          a.excerpt,
          a.author,
          a.readTime
        ]);
        console.log('Inserted', a.title);
      } else {
        console.log('Exists', a.title);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
