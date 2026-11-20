import { ArrowLeft, ArrowRight, MonitorPlay, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiBaseUrl } from '../api.js';
import SlideshowPlayer from '../components/SlideshowPlayer.jsx';
import { Button } from '../components/ui.jsx';
import { useAppData } from '../hooks/useAppData.jsx';

export default function DisplayPage() {
  const { folders, refreshFolders, showToast } = useAppData();
  const [selected, setSelected] = useState('all');
  const [playing, setPlaying] = useState(false);
  const [live, setLive] = useState('connecting');

  const allPhotos = useMemo(() => folders.flatMap(folder => folder.photos), [folders]);
  const selectedFolder = folders.find(folder => folder.id === selected);
  const photosToShow = selected === 'all' ? allPhotos : selectedFolder?.photos || [];
  const slideshowTitle = selected === 'all' ? 'All your photos' : selectedFolder?.name || 'Your photos';
  const slideshowDuration = selectedFolder?.duration || 5;

  useEffect(() => {
    if (selected !== 'all' && !selectedFolder) setSelected('all');
  }, [selected, selectedFolder]);

  const handleUpdate = useCallback(async () => {
    try {
      await refreshFolders();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }, [refreshFolders, showToast]);

  useEffect(() => {
    const source = new EventSource(`${apiBaseUrl}/events`, { withCredentials: true });
    source.onopen = () => {
      setLive('connected');
      handleUpdate();
    };
    source.onmessage = handleUpdate;
    source.onerror = () => setLive('reconnecting');
    return () => source.close();
  }, [handleUpdate]);

  if (playing && photosToShow.length) {
    return <SlideshowPlayer title={slideshowTitle} photos={photosToShow} duration={slideshowDuration} onClose={() => setPlaying(false)} />;
  }

  return (
    <main className="display-page">
      <Link className="back-link" to="/dashboard"><ArrowLeft size={15} /> Back to your library</Link>
      <div className="display-heading"><span className="eyebrow"><MonitorPlay size={14} /> FRAME ON THE BIG SCREEN</span><h1>Your photos, <em>in their element.</em></h1><p>Choose a collection and start a slideshow on this screen. New photos sync automatically.</p></div>
      <section className="display-card">
        <span className="display-card__icon"><MonitorPlay size={21} /></span>
        <div className="display-card__content">
          <span className="eyebrow">YOUR ACCOUNT LIBRARY</span>
          <h2>Make this screen a photo frame</h2>
          <p>Sign in on this laptop or TV with the same account. Your folders and photos stay up to date automatically.</p>
          <label className="field display-select">
            <span className="field__label">Photos to display</span>
            <select className="field__input" value={selected} onChange={event => setSelected(event.target.value)}>
              <option value="all">All photos · {allPhotos.length}</option>
              {folders.map(folder => <option value={folder.id} key={folder.id}>{folder.name} · {folder.photos.length}</option>)}
            </select>
          </label>
          <div className="display-card__actions">
            <Button onClick={() => setPlaying(true)} disabled={!photosToShow.length}><MonitorPlay size={16} /> Start slideshow <ArrowRight size={15} /></Button>
            <span className="display-sync"><i className={`status-dot status-dot--${live}`} />{live === 'connected' ? 'Live updates on' : live === 'reconnecting' ? 'Reconnecting…' : 'Connecting…'}</span>
          </div>
          {!photosToShow.length && <p className="display-empty">No photos yet. Add photos to a folder, and they’ll show up here.</p>}
        </div>
      </section>
      <section className="display-preview">
        <div><h2>Ready to display</h2><span>{photosToShow.length} {photosToShow.length === 1 ? 'photo' : 'photos'} · {selected === 'all' ? 'all folders' : selectedFolder?.name}</span></div>
        <div className="display-preview__grid">
          {photosToShow.slice(0, 6).map(photo => <img src={photo.imageUrl} alt={photo.name} key={photo.id} />)}
          {photosToShow.length === 0 && <span className="display-preview__empty"><WifiOff size={17} /> Waiting for photos</span>}
        </div>
      </section>
    </main>
  );
}
