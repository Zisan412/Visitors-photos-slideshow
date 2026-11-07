import { ArrowLeft, ImagePlus, Pencil, Play, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, PhotoImage } from '../components/ui.jsx';
import { useAppData } from '../hooks/useAppData.jsx';
import { api } from '../api.js';

export default function FolderDetailsPage() {
  const { id } = useParams();
  const { folders, setFolders, showToast } = useAppData();
  const navigate = useNavigate();
  const folder = folders.find(item => item.id === id);
  if (!folder) return <div className="not-found"><h1>Folder not found</h1><Button as={Link} to="/dashboard" variant="secondary">Back to dashboard</Button></div>;

  async function removePhoto(photo) {
    if (window.confirm(`Remove "${photo.name}" from this folder?`)) {
      try {
        await api.delete(`/folders/${id}/photos/${photo.id}`);
        setFolders(current => current.map(item => item.id === id ? { ...item, photos: item.photos.filter(image => image.id !== photo.id) } : item));
        showToast('Photo removed.');
      } catch (error) {
        showToast(error.message, 'error');
      }
    }
  }
  async function deleteFolder() {
    if (window.confirm(`Delete "${folder.name}" and all its photos?`)) {
      try {
        await api.delete(`/folders/${id}`);
        setFolders(current => current.filter(item => item.id !== id));
        showToast('Folder deleted.');
        navigate('/dashboard');
      } catch (error) {
        showToast(error.message, 'error');
      }
    }
  }

  return (
    <div className="details-page">
      <Link className="back-link" to="/dashboard"><ArrowLeft size={15} /> All folders</Link>
      <section className="details-hero"><div><span className="eyebrow">{new Date(folder.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span><h1>{folder.name}</h1><p>{folder.photos.length} {folder.photos.length === 1 ? 'photo' : 'photos'} <span>·</span> {folder.duration} seconds per photo</p></div><div className="details-actions">{folder.photos.length ? <Button as={Link} to={`/folders/${id}/slideshow`}><Play size={16} fill="currentColor" /> Start slideshow</Button> : <Button disabled><Play size={16} fill="currentColor" /> Add photos to start</Button>}<Button as={Link} to={`/folders/${id}/edit`} variant="secondary"><Pencil size={15} /> Edit folder</Button><button className="icon-button danger-icon" onClick={deleteFolder} aria-label="Delete folder"><Trash2 size={17} /></button></div></section>
      <div className="photo-section-heading"><div><h2>Photos in this folder</h2><span>{folder.photos.length} images</span></div><Button as={Link} to={`/folders/${id}/edit`} variant="secondary"><ImagePlus size={16} /> Add photos</Button></div>
      {folder.photos.length ? <div className="photo-grid">{folder.photos.map((photo, index) => <article className="photo-tile" key={photo.id}><PhotoImage photo={photo} /><div className="photo-tile__overlay"><span>{String(index + 1).padStart(2, '0')}</span><button aria-label={`Remove ${photo.name}`} onClick={() => removePhoto(photo)}><Trash2 size={16} /></button></div><p>{photo.name}</p></article>)}</div> : <div className="empty-state empty-state--compact"><span className="empty-state__icon"><ImagePlus size={24} /></span><h3>No photos in this folder yet</h3><p>Add some photos to make your slideshow come to life.</p><Button as={Link} to={`/folders/${id}/edit`}><ImagePlus size={16} /> Add photos</Button></div>}
    </div>
  );
}
