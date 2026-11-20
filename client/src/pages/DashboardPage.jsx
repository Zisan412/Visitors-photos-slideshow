import { ArrowDown, ArrowUpRight, FolderPlus, ImagePlus, Search, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import FolderCard from '../components/FolderCard.jsx';
import { Button } from '../components/ui.jsx';
import { useAppData } from '../hooks/useAppData.jsx';
import { api } from '../api.js';

export default function DashboardPage() {
  const { folders, setFolders, user, foldersLoading, foldersError, refreshFolders, showToast } = useAppData();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [retrying, setRetrying] = useState(false);
  useEffect(() => {
    const openSearch = () => document.getElementById('folder-search')?.focus();
    const handleShortcut = event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openSearch();
      }
    };
    window.addEventListener('frame-search', openSearch);
    window.addEventListener('keydown', handleShortcut);
    return () => {
      window.removeEventListener('frame-search', openSearch);
      window.removeEventListener('keydown', handleShortcut);
    };
  }, []);
  const visibleFolders = useMemo(() => folders
    .filter(folder => folder.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => sort === 'oldest' ? new Date(a.createdAt) - new Date(b.createdAt) : new Date(b.createdAt) - new Date(a.createdAt)), [folders, query, sort]);

  async function deleteFolder(id) {
    const folder = folders.find(item => item.id === id);
    if (folder && window.confirm(`Delete "${folder.name}" and its photos?`)) {
      try {
        await api.delete(`/folders/${id}`);
        setFolders(current => current.filter(item => item.id !== id));
        showToast('Folder deleted.');
      } catch (error) {
        showToast(error.message, 'error');
      }
    }
  }

  async function retryLoading() {
    setRetrying(true);
    try {
      await refreshFolders();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setRetrying(false);
    }
  }

  return (
    <>
      <section className="welcome-strip">
        <div><span className="eyebrow"><Sparkles size={14} /> YOUR LITTLE PHOTO LIBRARY</span><h1>Good afternoon, {user?.name?.split(' ')[0] || 'friend'} <span>✳</span></h1><p>All your favorite moments, gathered in one place.</p></div>
        <div className="welcome-strip__count"><strong>{folders.length.toString().padStart(2, '0')}</strong><span>curated collections</span></div>
      </section>
      <section className="dashboard-section">
        <div className="section-heading">
          <div><span className="eyebrow">YOUR COLLECTIONS</span><h2>My Photo Folders <span className="count-pill">{folders.length}</span></h2></div>
          <Button as={Link} to="/folders/new"><ImagePlus size={16} /> Create new folder <ArrowUpRight size={15} /></Button>
        </div>
        <div className="library-toolbar">
          <label className="search-field"><Search size={16} /><input id="folder-search" aria-label="Search folders" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search folders…" /><kbd>Ctrl / ⌘ K</kbd></label>
          <button className="sort-button" aria-label={sort === 'newest' ? 'Sort oldest first' : 'Sort newest first'} aria-pressed={sort === 'oldest'} onClick={() => setSort(value => value === 'newest' ? 'oldest' : 'newest')}>Date created <ArrowDown size={15} className={sort === 'oldest' ? 'sort-reverse' : ''} /></button>
        </div>
        {foldersLoading || retrying ? (
          <div className="empty-state" role="status" aria-live="polite"><span className="loading-spinner" /><h3>Loading your folders…</h3></div>
        ) : foldersError ? (
          <div className="empty-state" role="alert"><h3>We couldn’t load your folders</h3><p>{foldersError}</p><Button variant="secondary" onClick={retryLoading} disabled={retrying}>{retrying ? 'Trying again…' : 'Try again'}</Button></div>
        ) : visibleFolders.length > 0 ? (
          <div className="folder-grid">{visibleFolders.map(folder => <FolderCard key={folder.id} folder={folder} onDelete={deleteFolder} />)}</div>
        ) : (
          <div className="empty-state"><span className="empty-state__icon"><FolderPlus size={25} /></span><h3>{query ? 'No folders found' : 'Your library is ready for its first story'}</h3><p>{query ? 'Try another search or clear the search field.' : 'Create a folder and add the photos you want to keep close.'}</p>{!query && <Button as={Link} to="/folders/new"><ImagePlus size={16} /> Create your first folder</Button>}</div>
        )}
      </section>
    </>
  );
}
