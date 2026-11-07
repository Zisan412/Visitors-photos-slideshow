import { Link, useNavigate, useParams } from 'react-router-dom';
import SlideshowPlayer from '../components/SlideshowPlayer.jsx';
import { useAppData } from '../hooks/useAppData.jsx';

export default function SlideshowPage() {
  const { id } = useParams();
  const { folders } = useAppData();
  const navigate = useNavigate();
  const folder = folders.find(item => item.id === id);

  if (!folder || !folder.photos.length) {
    return <main className="not-found"><h1>No photos to show</h1><Link to={folder ? `/folders/${id}` : '/dashboard'}>Back to folder</Link></main>;
  }

  return <SlideshowPlayer title={folder.name} photos={folder.photos} duration={folder.duration} onClose={() => navigate(`/folders/${id}`)} />;
}
