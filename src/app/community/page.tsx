'use client';

import { useEffect, useState, useRef } from 'react';
import { api, type CommunityPost, type CommunityComment, type CommunityUserType, type CommunityPostType } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

function roleLabel(t: CommunityUserType): string {
  if (t === 'admin') return 'Admin';
  if (t === 'recruiter') return 'Recruiter';
  return 'Candidate';
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return 'Just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  return d.toLocaleDateString();
}

/** Resolve image URL: backend returns /uploads/community/... so prepend API origin when needed. */
function imageUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('http')) return url;
  const base = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || window.location.origin) : process.env.NEXT_PUBLIC_API_URL || '';
  return base ? `${base.replace(/\/$/, '')}${url.startsWith('/') ? url : `/${url}`}` : url;
}

/** Extract #hashtags from text (alphanumeric + underscore). */
function extractHashtags(text: string): string[] {
  const set = new Set<string>();
  const re = /#([a-zA-Z0-9_]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) set.add(m[1]);
  return [...set];
}

export default function CommunityPage() {
  const [user, setUser] = useState<{ id: string; type: CommunityUserType; name: string | null; email: string } | null>(null);
  const [stats, setStats] = useState<{ profileViewers: number; postImpressions: number } | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [postType, setPostType] = useState<CommunityPostType>('post');
  const [newTitle, setNewTitle] = useState('');
  const [newImages, setNewImages] = useState<string[]>([]);
  const [newHashtags, setNewHashtags] = useState<string[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkImage, setNewLinkImage] = useState('');
  const [hashtagInput, setHashtagInput] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [sortBy, setSortBy] = useState<'top' | 'recent'>('top');
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommunityComment[]>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [likeLoading, setLikeLoading] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadUser = () => {
    api.communityMe().then((r) => setUser(r.user)).catch(() => setUser(null));
  };

  const loadStats = () => {
    api.communityMeStats().then(setStats).catch(() => setStats({ profileViewers: 0, postImpressions: 0 }));
  };

  const loadPosts = () =>
    api
      .communityGetPosts(30, 0)
      .then((r) => setPosts(r.posts))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load feed'));

  useEffect(() => {
    loadUser();
    loadPosts().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user) loadStats();
    else setStats(null);
  }, [user]);

  const loadComments = (postId: string) => {
    api.communityGetComments(postId).then((r) => {
      setCommentsByPost((prev) => ({ ...prev, [postId]: r.comments }));
    });
  };

  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else {
        next.add(postId);
        if (!commentsByPost[postId]) loadComments(postId);
      }
      return next;
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setError('');
    setImageUploading(true);
    try {
      for (let i = 0; i < Math.min(files.length, 10 - newImages.length); i++) {
        const r = await api.communityUploadImage(files[i]);
        setNewImages((prev) => [...prev, r.url].slice(0, 10));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setImageUploading(false);
      e.target.value = '';
    }
  };

  const addHashtag = () => {
    const t = hashtagInput.replace(/^#/, '').trim().slice(0, 100);
    if (t && !newHashtags.includes(t)) {
      setNewHashtags((prev) => [...prev, t].slice(0, 30));
      setHashtagInput('');
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    setError('');
    setSubmitLoading(true);
    try {
      const fromContent = extractHashtags(newContent);
      const allHashtags = [...new Set([...newHashtags, ...fromContent])].slice(0, 30);
      const r = await api.communityCreatePost({
        content: newContent.trim(),
        postType,
        title: postType === 'article' && newTitle.trim() ? newTitle.trim() : undefined,
        images: newImages.length ? newImages : undefined,
        hashtags: allHashtags.length ? allHashtags : undefined,
        linkUrl: newLinkUrl.trim() || undefined,
        linkTitle: newLinkTitle.trim() || undefined,
        linkImage: newLinkImage.trim() || undefined,
      });
      setPosts((prev) => [r.post, ...prev]);
      setNewContent('');
      setNewTitle('');
      setNewImages([]);
      setNewHashtags([]);
      setNewLinkUrl('');
      setNewLinkTitle('');
      setNewLinkImage('');
      setComposerOpen(false);
      loadStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to post');
    } finally {
      setSubmitLoading(false);
    }
  };

  const openComposer = (mode: 'post' | 'article' | 'photo') => {
    setPostType(mode === 'article' ? 'article' : 'post');
    setComposerOpen(true);
    if (mode === 'photo') setTimeout(() => fileInputRef.current?.click(), 100);
  };

  const sortedPosts = [...posts].sort((a, b) => {
    if (sortBy === 'recent') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    const scoreA = a.likeCount + a.commentCount * 2;
    const scoreB = b.likeCount + b.commentCount * 2;
    return scoreB - scoreA || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleLike = async (postId: string) => {
    if (!user) return;
    setLikeLoading((prev) => new Set(prev).add(postId));
    try {
      const r = await api.communityToggleLike(postId);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, likeCount: p.likeCount + (r.liked ? 1 : -1), likedByMe: r.liked } : p
        )
      );
    } finally {
      setLikeLoading((prev) => {
        const s = new Set(prev);
        s.delete(postId);
        return s;
      });
    }
  };

  const handleAddComment = async (postId: string) => {
    const content = (commentInput[postId] || '').trim();
    if (!content || !user) return;
    setError('');
    try {
      const r = await api.communityAddComment(postId, content);
      setCommentsByPost((prev) => ({ ...prev, [postId]: [...(prev[postId] || []), r.comment] }));
      setCommentInput((prev) => ({ ...prev, [postId]: '' }));
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add comment');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Delete this post?')) return;
    try {
      await api.communityDeletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const postImages = (post: CommunityPost) => post.images && post.images.length > 0 ? post.images : [];
  const postHashtags = (post: CommunityPost) => post.hashtags && post.hashtags.length > 0 ? post.hashtags : [];
  const userInitial = user ? (user.name || user.email || '?').charAt(0).toUpperCase() : '?';
  const headline = user ? roleLabel(user.type) : '';

  return (
    <div className="min-h-screen bg-[var(--surface-light)] text-[var(--surface-light-fg)]">
      <div className="mx-auto flex max-w-5xl gap-6 px-4 py-6">
        {/* Left: Profile card + stats (LinkedIn-style) */}
        <aside className="hidden w-72 shrink-0 lg:block">
          {user && (
            <Card className="overflow-hidden rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] shadow-sm">
              <div className="h-14 bg-gradient-to-br from-[var(--accent)] to-[#5b21b6]" />
              <div className="px-4 pb-4">
                <div className="-mt-8 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-[var(--surface-light-card)] bg-[var(--accent-muted)] text-2xl font-bold text-[var(--accent)]">
                    {userInitial}
                  </div>
                </div>
                <h2 className="mt-3 text-center text-lg font-bold text-[var(--surface-light-fg)]">{user.name || user.email || 'You'}</h2>
                <p className="text-center text-sm text-[var(--surface-light-muted)]">{headline}</p>
                <div className="mt-4 space-y-2 border-t border-[var(--surface-light-border)] pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--surface-light-muted)]">Profile viewers</span>
                    <span className="font-semibold text-[var(--surface-light-fg)]">{stats?.profileViewers ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--surface-light-muted)]">Post impressions</span>
                    <span className="font-semibold text-[var(--surface-light-fg)]">{stats?.postImpressions ?? 0}</span>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </aside>

        {/* Main: Start a post + feed */}
        <main className="min-w-0 flex-1 max-w-2xl">
          {error && (
            <div className="mb-4 rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error-text)]">
              {error}
            </div>
          )}

          {user && (
            <>
              {/* Mobile: compact profile + stats */}
              <div className="mb-4 flex items-center justify-between rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-4 shadow-sm lg:hidden">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-muted)] text-lg font-bold text-[var(--accent)]">{userInitial}</div>
                  <div>
                    <p className="font-semibold text-[var(--surface-light-fg)]">{user.name || user.email || 'You'}</p>
                    <p className="text-xs text-[var(--surface-light-muted)]">{headline}</p>
                  </div>
                </div>
                <div className="flex gap-4 text-center text-sm">
                  <div>
                    <p className="font-semibold text-[var(--surface-light-fg)]">{stats?.profileViewers ?? 0}</p>
                    <p className="text-xs text-[var(--surface-light-muted)]">Profile viewers</p>
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--surface-light-fg)]">{stats?.postImpressions ?? 0}</p>
                    <p className="text-xs text-[var(--surface-light-muted)]">Post impressions</p>
                  </div>
                </div>
              </div>

              {/* Compact "Start a post" bar (LinkedIn-style) */}
              <Card className="mb-4 rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-muted)] text-lg font-semibold text-[var(--accent)]">
                    {userInitial}
                  </div>
                  <button
                    type="button"
                    onClick={() => openComposer('post')}
                    className="min-w-0 flex-1 rounded-full border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-4 py-2.5 text-left text-sm text-[var(--surface-light-muted)] transition hover:border-[var(--surface-light-fg)]/30 hover:bg-[var(--surface-light)]"
                  >
                    Start a post
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-[var(--surface-light-border)] pt-3">
                  <button
                    type="button"
                    onClick={() => openComposer('photo')}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--surface-light-muted)] transition hover:bg-[var(--surface-light)]"
                  >
                    <svg className="h-5 w-5 text-[#0a66c2]" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 3l1.5 2-6 8L5 13l3-4 2 3 3-4z" /></svg>
                    Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => openComposer('article')}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--surface-light-muted)] transition hover:bg-[var(--surface-light)]"
                  >
                    <svg className="h-5 w-5 text-[#b24020]" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" /></svg>
                    Write article
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--surface-light-muted)] transition hover:bg-[var(--surface-light)]"
                    title="Coming soon"
                  >
                    <svg className="h-5 w-5 text-[#0a66c2]" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M8 5v14l11-7z" /></svg>
                    Video
                  </button>
                </div>
              </Card>

              {/* Expanded composer (when opened) */}
              {composerOpen && (
                <Card className="mb-4 rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-4 shadow-sm">
                  <form onSubmit={handleCreatePost} className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setPostType('post')} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${postType === 'post' ? 'bg-[var(--accent)] text-white' : 'text-[var(--surface-light-muted)] hover:bg-[var(--surface-light)]'}`}>Post</button>
                        <button type="button" onClick={() => setPostType('article')} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${postType === 'article' ? 'bg-[var(--accent)] text-white' : 'text-[var(--surface-light-muted)] hover:bg-[var(--surface-light)]'}`}>Article</button>
                      </div>
                      <button type="button" onClick={() => setComposerOpen(false)} className="text-[var(--surface-light-muted)] hover:text-[var(--surface-light-fg)]" aria-label="Close">×</button>
                    </div>
                    {postType === 'article' && (
                      <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Article title" maxLength={500} className="w-full rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-4 py-2.5 text-[var(--surface-light-fg)] placeholder-[var(--surface-light-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]" />
                    )}
                    <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder={postType === 'article' ? 'Write your article…' : "What's on your mind? Use #hashtags."} rows={postType === 'article' ? 6 : 3} className="w-full resize-none rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-4 py-3 text-[var(--surface-light-fg)] placeholder-[var(--surface-light-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]" maxLength={50000} />
                    {newImages.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {newImages.map((url, i) => (
                          <div key={i} className="relative aspect-square overflow-hidden rounded-xl bg-[var(--surface-light)]">
                            <img src={imageUrl(url)} alt="" className="h-full w-full object-cover" />
                            <button type="button" onClick={() => setNewImages((prev) => prev.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80" aria-label="Remove"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <input type="file" ref={fileInputRef} accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" multiple onChange={handleImageSelect} />
                      <button type="button" onClick={() => fileInputRef.current?.click()} disabled={imageUploading || newImages.length >= 10} className="rounded-lg border border-[var(--surface-light-border)] px-3 py-1.5 text-sm font-medium text-[var(--surface-light-muted)] hover:bg-[var(--surface-light)] disabled:opacity-50">{imageUploading ? 'Uploading…' : 'Add image'}</button>
                      {newHashtags.map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-muted)] px-2.5 py-0.5 text-sm font-medium text-[var(--accent)]">#{tag} <button type="button" onClick={() => setNewHashtags((prev) => prev.filter((t) => t !== tag))} className="hover:opacity-80" aria-label="Remove">×</button></span>
                      ))}
                      <input type="text" value={hashtagInput} onChange={(e) => setHashtagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHashtag())} placeholder="#hashtag" className="w-24 rounded border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-2 py-1 text-sm placeholder-[var(--surface-light-muted)] focus:border-[var(--accent)] focus:outline-none" />
                      <button type="button" onClick={addHashtag} className="text-sm text-[var(--accent)] hover:underline">Add tag</button>
                    </div>
                    <details className="rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light)] px-3 py-2">
                      <summary className="cursor-pointer text-sm font-medium text-[var(--surface-light-muted)]">Add link preview (optional)</summary>
                      <div className="mt-3 space-y-2">
                        <input type="url" value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} placeholder="Link URL" className="w-full rounded-lg border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none" />
                        <input type="text" value={newLinkTitle} onChange={(e) => setNewLinkTitle(e.target.value)} placeholder="Link title" className="w-full rounded-lg border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none" />
                        <input type="url" value={newLinkImage} onChange={(e) => setNewLinkImage(e.target.value)} placeholder="Link image URL (optional)" className="w-full rounded-lg border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none" />
                      </div>
                    </details>
                    <div className="flex justify-end">
                      <Button type="submit" disabled={submitLoading || !newContent.trim()}>{submitLoading ? 'Posting…' : postType === 'article' ? 'Publish article' : 'Post'}</Button>
                    </div>
                  </form>
                </Card>
              )}
            </>
          )}

          {!user && (
            <div className="mb-6 rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] px-4 py-3 text-center text-sm text-[var(--surface-light-muted)]">
              Sign in as admin, recruiter, or candidate to post, like, and comment.
            </div>
          )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)]/20 border-t-[var(--accent)]" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--surface-light-fg)]">Feed</h2>
              <div className="flex items-center gap-1 text-sm text-[var(--surface-light-muted)]">
                <span>Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'top' | 'recent')}
                  className="rounded-lg border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-2 py-1 text-[var(--surface-light-fg)] focus:border-[var(--accent)] focus:outline-none"
                >
                  <option value="top">Top</option>
                  <option value="recent">Recent</option>
                </select>
              </div>
            </div>
            {sortedPosts.length === 0 && (
              <Card className="rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] p-8 text-center text-[var(--surface-light-muted)] shadow-sm">
                No posts yet. Be the first to share something!
              </Card>
            )}
            {sortedPosts.map((post) => (
              <Card key={post.id} className="overflow-hidden rounded-2xl border border-[var(--surface-light-border)] bg-[var(--surface-light-card)] shadow-sm">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-muted)] text-lg font-semibold text-[var(--accent)]">
                        {(post.authorName || post.authorEmail || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--surface-light-fg)]">{post.authorName || post.authorEmail || 'Someone'}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--surface-light-muted)]">
                          <span
                            className={`rounded px-1.5 py-0.5 font-medium ${
                              post.authorType === 'admin'
                                ? 'bg-[var(--accent)] text-white'
                                : post.authorType === 'recruiter'
                                  ? 'bg-[var(--success-bg)] text-[var(--success-text)]'
                                  : 'bg-[var(--surface-light-muted)] text-[var(--surface-light-fg)]'
                            }`}
                          >
                            {roleLabel(post.authorType)}
                          </span>
                          {post.postType === 'article' && <span className="rounded bg-[var(--surface-light)] px-1.5 py-0.5">Article</span>}
                          <span>{timeAgo(post.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    {user && user.id === post.authorId && user.type === post.authorType && (
                      <button type="button" onClick={() => handleDeletePost(post.id)} className="text-xs text-[var(--error-text)] hover:underline">
                        Delete
                      </button>
                    )}
                  </div>

                  {post.postType === 'article' && post.title && (
                    <h2 className="mt-3 text-lg font-semibold text-[var(--surface-light-fg)]">{post.title}</h2>
                  )}
                  <p className="mt-3 whitespace-pre-wrap text-[var(--surface-light-fg)]">{post.content}</p>

                  {postImages(post).length > 0 && (
                    <div className={`mt-3 grid gap-1 overflow-hidden rounded-xl ${postImages(post).length === 1 ? 'grid-cols-1' : postImages(post).length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
                      {postImages(post).map((url, i) => (
                        <a key={i} href={imageUrl(url)} target="_blank" rel="noopener noreferrer" className="block aspect-square overflow-hidden bg-[var(--surface-light)]">
                          <img src={imageUrl(url)} alt="" className="h-full w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}

                  {postHashtags(post).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {postHashtags(post).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-[var(--accent-muted)] px-2.5 py-0.5 text-sm font-medium text-[var(--accent)]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {post.linkUrl && (
                    <a
                      href={post.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 flex overflow-hidden rounded-xl border border-[var(--surface-light-border)] bg-[var(--surface-light)] no-underline transition hover:border-[var(--accent)]"
                    >
                      {post.linkImage && (
                        <div className="h-24 w-32 shrink-0 bg-[var(--surface-light-muted)]">
                          <img src={post.linkImage} alt="" className="h-full w-full object-cover" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 p-3">
                        <p className="font-medium text-[var(--surface-light-fg)]">{post.linkTitle || 'Link'}</p>
                        <p className="truncate text-xs text-[var(--surface-light-muted)]">{post.linkUrl}</p>
                      </div>
                    </a>
                  )}

                  <div className="mt-4 flex items-center gap-4 border-t border-[var(--surface-light-border)] pt-3">
                    <button
                      type="button"
                      onClick={() => user && handleLike(post.id)}
                      disabled={!user || likeLoading.has(post.id)}
                      className={`flex items-center gap-1.5 text-sm font-medium ${post.likedByMe ? 'text-[var(--accent)]' : 'text-[var(--surface-light-muted)] hover:text-[var(--accent)]'}`}
                    >
                      <span>{post.likedByMe ? '♥' : '♡'}</span>
                      <span>{post.likeCount}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleComments(post.id)}
                      className="text-sm font-medium text-[var(--surface-light-muted)] hover:text-[var(--accent)]"
                    >
                      {post.commentCount} comment{post.commentCount !== 1 ? 's' : ''}
                    </button>
                  </div>
                </div>

                {expandedComments.has(post.id) && (
                  <div className="border-t border-[var(--surface-light-border)] bg-[var(--surface-light)]/50 px-4 py-4">
                    {(commentsByPost[post.id] || []).map((c) => (
                      <div key={c.id} className="mb-3 flex gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-light-muted)] text-xs font-semibold text-[var(--surface-light-fg)]">
                          {(c.authorName || c.authorEmail || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1 rounded-lg bg-[var(--surface-light-card)] px-3 py-2">
                          <p className="text-xs font-medium text-[var(--surface-light-muted)]">
                            {c.authorName || c.authorEmail} · {roleLabel(c.authorType)} · {timeAgo(c.createdAt)}
                          </p>
                          <p className="mt-0.5 text-sm text-[var(--surface-light-fg)]">{c.content}</p>
                        </div>
                      </div>
                    ))}
                    {user && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={commentInput[post.id] || ''}
                          onChange={(e) => setCommentInput((prev) => ({ ...prev, [post.id]: e.target.value }))}
                          placeholder="Write a comment…"
                          className="flex-1 rounded-lg border border-[var(--surface-light-border)] bg-[var(--surface-light-input)] px-3 py-2 text-sm text-[var(--surface-light-fg)] placeholder-[var(--surface-light-muted)]"
                          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAddComment(post.id))}
                        />
                        <Button size="md" onClick={() => handleAddComment(post.id)} disabled={!(commentInput[post.id] || '').trim()}>
                          Reply
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
        </main>
      </div>
    </div>
  );
}
