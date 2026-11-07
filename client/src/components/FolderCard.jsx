import { ArrowUpRight, Clock3, Image, MoreHorizontal, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './ui.jsx';

export default function FolderCard({ folder, onDelete }) {
  const cover = folder.photos[0];
  return (
    <article className="folder-card">
      <Link to={`/folders/${folder.id}`} className="folder-card__cover" aria-label={`Open ${folder.name}`}>
        {cover ? <img src={cover.imageUrl} alt={cover.name} loading="lazy" /> : <span className="folder-card__empty-cover">No photos yet</span>}
        {folder.photos.length > 1 && (
          <span className="folder-card__stack">{folder.photos.length} photos</span>
        )}
      </Link>
      <div className="folder-card__body">
        <div className="folder-card__top">
          <div className="folder-card__title">
            <h2>{folder.name}</h2>
            <p><Image size={14} /> {folder.photos.length} photos</p>
          </div>
          <details className="menu">
            <summary aria-label="Folder options"><MoreHorizontal size={19} /></summary>
            <div className="menu__popover">
              <Button variant="menu-danger" onClick={() => onDelete(folder.id)}>
                <Trash2 size={15} /> Delete folder
              </Button>
            </div>
          </details>
        </div>
        <div className="folder-card__footer">
          <span>{new Date(folder.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          <span><Clock3 size={14} /> {folder.duration}s / photo</span>
          <Link to={`/folders/${folder.id}`} aria-label={`Open folder ${folder.name}`}><ArrowUpRight size={17} /></Link>
        </div>
      </div>
    </article>
  );
}
