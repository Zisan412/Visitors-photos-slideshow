import { ImagePlus, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PhotoImage } from './ui.jsx';

export default function PhotoPicker({ photos, files, onFilesChange, onRemovePhoto }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [previews, setPreviews] = useState([]);
  useEffect(() => {
    const nextPreviews = files.map(file => ({ file, src: URL.createObjectURL(file) }));
    setPreviews(nextPreviews);
    return () => nextPreviews.forEach(photo => URL.revokeObjectURL(photo.src));
  }, [files]);

  function addFiles(fileList) {
    const selected = Array.from(fileList || []).filter(file => file.type.startsWith('image/'));
    if (!selected.length) return;
    onFilesChange([...files, ...selected]);
  }

  function removeNewFile(index) {
    onFilesChange(files.filter((file, fileIndex) => fileIndex !== index));
  }

  return (
    <section className="photo-picker">
      <div
        className={`dropzone${dragging ? ' dropzone--active' : ''}`}
        onDragOver={event => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={event => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }}
      >
        <span className="dropzone__icon"><ImagePlus size={22} /></span>
        <div><strong>Drop your photos here</strong><span>or browse from your device · JPG, PNG, WEBP · up to 10 MB each, 10 at a time</span></div>
        <button type="button" className="button button--secondary" onClick={() => inputRef.current?.click()}>
          <Upload size={15} /> Browse files
        </button>
        <input ref={inputRef} className="visually-hidden" type="file" accept="image/*" multiple onChange={event => { addFiles(event.target.files); event.target.value = ''; }} />
      </div>
      {(photos.length > 0 || previews.length > 0) && (
        <div className="picker-grid">
          {photos.map(photo => (
            <div className="picker-photo" key={photo.id}>
              <PhotoImage photo={{ ...photo, src: photo.imageUrl }} />
              <button type="button" className="picker-photo__remove" onClick={() => onRemovePhoto(photo)} aria-label={`Remove ${photo.name}`}><X size={15} /></button>
            </div>
          ))}
          {previews.map(({ file, src }, index) => (
            <div className="picker-photo" key={`${file.name}-${file.lastModified}-${index}`}>
              <img src={src} alt={file.name} />
              <button type="button" className="picker-photo__remove" onClick={() => removeNewFile(index)} aria-label={`Remove ${file.name}`}><X size={15} /></button>
            </div>
          ))}
          <button type="button" className="picker-add" onClick={() => inputRef.current?.click()}><ImagePlus size={19} /><span>Add more photos</span></button>
        </div>
      )}
    </section>
  );
}
