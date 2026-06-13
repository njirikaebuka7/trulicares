import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Loader2, ExternalLink, ImageIcon } from 'lucide-react';
import { admin as adminApi } from '@/lib/api';
import { cn } from '@/utils/cn';

interface Post {
  id: string; title: string; slug: string; excerpt?: string; content?: string;
  featured_image?: string; category?: string; tags?: string[]; status: string;
  seo_title?: string; seo_description?: string; author_name?: string; read_time?: string;
  published_at?: string; updated_at?: string;
}

const EMPTY = {
  title: '', slug: '', excerpt: '', content: '', featuredImage: '', category: '',
  tags: '', seoTitle: '', seoDescription: '', authorName: '', readTime: '', status: 'draft',
};

/** Full in-app blog/resources CMS: list + create/edit/delete + publish. */
export default function AdminContent() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [editing, setEditing] = useState<null | 'new' | Post>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 3_000_000) { alert('Image too large (max 3 MB).'); return; }
    setUploading(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const r: any = await adminApi.blogUploadImage(dataUrl);
      setForm((f: any) => ({ ...f, featuredImage: r.url }));
    } catch (e: any) {
      alert(e?.message || 'Image upload failed');
    } finally { setUploading(false); }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r: any = await adminApi.blogList({ status: statusFilter === 'all' ? undefined : statusFilter });
      setPosts(r.posts || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(EMPTY); setEditing('new'); };
  const openEdit = async (p: Post) => {
    try {
      const r: any = await adminApi.blogGet(p.id);
      const post = r.post;
      setForm({
        title: post.title || '', slug: post.slug || '', excerpt: post.excerpt || '',
        content: post.content || '', featuredImage: post.featured_image || '',
        category: post.category || '', tags: (post.tags || []).join(', '),
        seoTitle: post.seo_title || '', seoDescription: post.seo_description || '',
        authorName: post.author_name || '', readTime: post.read_time || '', status: post.status || 'draft',
      });
      setEditing(post);
    } catch { /* ignore */ }
  };

  const save = async (publish?: boolean) => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        status: publish ? 'published' : form.status,
      };
      if (editing === 'new') await adminApi.blogCreate(payload);
      else if (editing) await adminApi.blogUpdate(editing.id, payload);
      setEditing(null);
      load();
    } catch (e: any) {
      alert(e?.message || 'Failed to save post');
    } finally { setSaving(false); }
  };

  const remove = async (p: Post) => {
    if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    try { await adminApi.blogDelete(p.id); load(); } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Content / Resources</h2>
          <p className="text-sm text-gray-500">Create and publish blog posts &amp; guides.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold">
            <option value="all">All</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </select>
          <button onClick={openNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full text-sm active:scale-95">
            <Plus className="w-4 h-4" /> New Post
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : posts.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">No posts yet. Create your first one.</div>
        ) : posts.map((p) => (
          <div key={p.id} className="flex items-center gap-4 p-4 border-b border-gray-50 last:border-0">
            <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
              {p.featured_image ? (
                <img
                  src={p.featured_image}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <ImageIcon className="w-5 h-5 text-gray-300" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900 truncate">{p.title}</p>
              <p className="text-xs text-gray-400 truncate">/{p.slug} · {p.category || 'Uncategorized'}</p>
            </div>
            <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold uppercase shrink-0',
              p.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
              {p.status}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {p.status === 'published' && (
                <a href={`/resources/${p.slug}`} target="_blank" rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-gray-700"><ExternalLink className="w-4 h-4" /></a>
              )}
              <button onClick={() => openEdit(p)} className="p-2 text-gray-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => remove(p)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Editor modal */}
      {editing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !saving && setEditing(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">{editing === 'new' ? 'New Post' : 'Edit Post'}</h3>
              <button onClick={() => setEditing(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4">
              {[
                { k: 'title', label: 'Title', ph: 'Post title' },
                { k: 'slug', label: 'Slug (optional — auto from title)', ph: 'my-post-slug' },
                { k: 'category', label: 'Category', ph: 'Child Care' },
                { k: 'authorName', label: 'Author', ph: 'Author name' },
                { k: 'readTime', label: 'Read time', ph: '5 min read' },
                { k: 'tags', label: 'Tags (comma-separated)', ph: 'nanny, hiring' },
                { k: 'seoTitle', label: 'SEO title', ph: 'SEO title' },
                { k: 'seoDescription', label: 'SEO meta description', ph: 'Meta description' },
              ].map((f) => (
                <div key={f.k}>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{f.label}</label>
                  <input value={form[f.k]} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} placeholder={f.ph}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-400" />
                </div>
              ))}
              {/* Featured image: upload (preferred) with preview, or paste a URL */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Featured image</label>
                <div className="flex items-start gap-3">
                  <div className="w-28 h-20 shrink-0 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                    {form.featuredImage ? (
                      <img
                        src={form.featuredImage}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold cursor-pointer',
                      uploading ? 'bg-gray-100 text-gray-400' : 'bg-red-50 text-red-700 hover:bg-red-100'
                    )}>
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                      {uploading ? 'Uploading…' : 'Upload image'}
                      <input type="file" accept="image/*" className="hidden" disabled={uploading}
                        onChange={(e) => handleImageUpload(e.target.files?.[0])} />
                    </label>
                    <input value={form.featuredImage} onChange={(e) => setForm({ ...form, featuredImage: e.target.value })}
                      placeholder="…or paste an image URL"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-400" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Excerpt</label>
                <textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} rows={2}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-400 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Content</label>
                <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={8}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-400 resize-none" />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setEditing(null)} disabled={saving} className="px-5 py-2 rounded-full font-semibold text-gray-600 hover:bg-gray-100 text-sm">Cancel</button>
              <button onClick={() => save(false)} disabled={saving || !form.title} className="px-5 py-2 rounded-full font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Draft'}
              </button>
              <button onClick={() => save(true)} disabled={saving || !form.title} className="px-5 py-2 rounded-full font-semibold bg-emerald-600 hover:bg-emerald-700 text-white text-sm disabled:opacity-50">
                Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
