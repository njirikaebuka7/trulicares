import { Router } from 'express';
import { query } from '../db.js';

/** Public blog/resources endpoints — only published posts. */
const router = Router();

// GET /api/resources — published posts (optional ?category=)
router.get('/', async (req, res) => {
  try {
    const { category } = req.query as any;
    const params: any[] = [];
    let where = `WHERE status = 'published'`;
    if (category && category !== 'All') { params.push(category); where += ` AND category = $${params.length}`; }
    const result = await query(
      `SELECT id, title, slug, excerpt, featured_image, category, author_name, read_time, published_at
       FROM blog_posts ${where}
       ORDER BY published_at DESC NULLS LAST, created_at DESC
       LIMIT 100`,
      params
    );
    res.json({ posts: result.rows });
  } catch (err) {
    console.error('Public resources error:', err);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

// GET /api/resources/:slug — single published post
router.get('/:slug', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, title, slug, excerpt, content, featured_image, category, tags,
              seo_title, seo_description, author_name, read_time, published_at
       FROM blog_posts WHERE slug = $1 AND status = 'published'`,
      [req.params.slug]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    res.json({ post: result.rows[0] });
  } catch (err) {
    console.error('Public resource error:', err);
    res.status(500).json({ error: 'Failed to fetch resource' });
  }
});

export default router;
