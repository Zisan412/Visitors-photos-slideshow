import { ArrowLeft, Check, ChevronDown, Clock3, Folder, ImagePlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PhotoPicker from '../components/PhotoPicker.jsx';
import { Button, Field } from '../components/ui.jsx';
import { useAppData } from '../hooks/useAppData.jsx';
import { api } from '../api.js';

export default function FolderEditorPage() {
  const { id } = useParams();
  const { folders, setFolders, foldersLoaded, showToast } = useAppData();
  const navigate = useNavigate();
  const existing = folders.find(folder => folder.id === id);
  const [createdFolderId, setCreatedFolderId] = useState(null);
  const targetFolder = existing || folders.find(folder => folder.id === createdFolderId);
  const [name, setName] = useState('');
  const [duration, setDuration] = useState(5);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingStage, setSavingStage] = useState('saving');

  useEffect(() => {
    if (!id) {
      setName('');
      setDuration(5);
      setFiles([]);
      setCreatedFolderId(null);
      return;
    }
    const folder = folders.find(item => item.id === id);
    if (folder) {
      setName(folder.name);
      setDuration(folder.duration);
      setFiles([]);
    }
  }, [id]);

  useEffect(() => {
    if (id && foldersLoaded && !existing) {
      navigate('/dashboard', { replace: true });
    }
  }, [id, existing, foldersLoaded, navigate]);

  async function removeExistingPhoto(photo) {
    try {
      await api.delete(`/folders/${id}/photos/${photo.id}`);
      setFolders(current => current.map(folder => folder.id === id
        ? { ...folder, photos: folder.photos.filter(item => item.id !== photo.id) }
        : folder));
      showToast('Photo removed.');
    } catch (issue) {
      setError(issue.message);
    }
  }

  async function save(event) {
    event.preventDefault();
    if (!targetFolder && files.length === 0) {
      setError('Add at least one photo to create a folder.');
      return;
    }
    setSaving(true);
    setSavingStage('saving');
    setError('');
    try {
      let folder = targetFolder;
      if (folder) {
        const result = await api.patch(`/folders/${folder.id}`, { name: name.trim(), duration: Number(duration) });
        folder = result.folder;
        setFolders(current => current.map(item => item.id === folder.id ? folder : item));
      } else {
        const result = await api.post('/folders', { name: name.trim(), duration: Number(duration) });
        folder = result.folder;
        setCreatedFolderId(folder.id);
        setFolders(current => [folder, ...current]);
      }

      if (files.length) {
        setSavingStage('uploading');
        const formData = new FormData();
        files.forEach(file => formData.append('photos', file));
        const result = await api.post(`/folders/${folder.id}/photos`, formData);
        folder = result.folder;
        setFolders(current => current.map(item => item.id === folder.id ? folder : item));
      }
      showToast(targetFolder ? 'Folder updated.' : 'Folder created.');
      navigate(`/folders/${folder.id}`);
    } catch (issue) {
      setError(issue.message);
    } finally {
      setSaving(false);
      setSavingStage('saving');
    }
  }

  const photoCount = (existing?.photos.length || 0) + files.length;

  return (
    <div className="editor-page">
      <Link className="back-link" to={existing ? `/folders/${id}` : '/dashboard'}><ArrowLeft size={15} /> {existing ? 'Back to folder' : 'Back to your folders'}</Link>
      <div className="editor-heading"><span className="eyebrow">{existing ? 'MAKE IT YOURS' : 'A NEW COLLECTION'}</span><h1>{existing ? 'Edit your folder' : 'Create a new folder'}</h1><p>Gather the photos you want to revisit, all in one place.</p></div>
      <form className="editor-layout" onSubmit={save} aria-busy={saving}>
        <div className="editor-main">
          <section className="form-card"><div className="form-card__heading"><span className="step-number">01</span><div><h2>Add your photos</h2><p>Choose the photos you want to include in this collection.</p></div></div><PhotoPicker photos={existing?.photos || []} files={files} onFilesChange={setFiles} onRemovePhoto={removeExistingPhoto} disabled={saving} /></section>
          <section className="form-card"><div className="form-card__heading"><span className="step-number">02</span><div><h2>Give it a name</h2><p>Make it personal — you can always change it later.</p></div></div><Field label="Folder name" id="folder-name" value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Summer in Lisbon" maxLength="60" required disabled={saving} /><div className="duration-setting"><div className="duration-setting__icon"><Clock3 size={17} /></div><div><strong>Slideshow speed</strong><span>How long each photo stays on screen</span></div><label className="select-wrap"><select value={duration} onChange={event => setDuration(event.target.value)} aria-label="Slideshow duration" disabled={saving}>{[3, 5, 7, 10, 15].map(value => <option value={value} key={value}>{value} seconds</option>)}</select><ChevronDown size={14} /></label></div></section>
        </div>
        <aside className="editor-sidebar"><div className="summary-card"><span className="summary-card__icon"><Folder size={18} /></span><h3>Your collection</h3><p>A quick look before you save.</p><div className="summary-card__preview">{existing?.photos.slice(0, 3).map(photo => <img src={photo.imageUrl} alt="" key={photo.id} />)}{photoCount === 0 && <ImagePlus size={18} />}</div><div className="summary-row"><span>Photos added</span><strong>{photoCount}</strong></div><div className="summary-row"><span>Slideshow speed</span><strong>{duration}s each</strong></div><div className="summary-row"><span>Storage</span><strong>Private to you <Check size={13} /></strong></div>{error && <p className="form-error" role="alert">{error}</p>}<Button type="submit" className="save-button" disabled={saving} aria-busy={saving}>{saving ? savingStage === 'uploading' ? 'Uploading photos…' : 'Saving folder…' : 'Save folder'} {!saving && <Check size={16} />}</Button><Button as={Link} to={existing ? `/folders/${id}` : '/dashboard'} variant="secondary" className="cancel-button">Cancel</Button><p className="summary-note">Your photos are saved to your account.</p></div></aside>
      </form>
    </div>
  );
}
