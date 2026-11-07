import { ArrowLeft, Maximize, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

export default function SlideshowPlayer({ title, photos, duration, onClose }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [controls, setControls] = useState(true);
  const currentIndex = photos.length ? index % photos.length : 0;

  const next = useCallback(() => {
    if (photos.length) setIndex(current => (current + 1) % photos.length);
  }, [photos.length]);
  const previous = useCallback(() => {
    if (photos.length) setIndex(current => (current - 1 + photos.length) % photos.length);
  }, [photos.length]);

  useEffect(() => {
    if (!playing || !photos.length) return undefined;
    const timer = window.setInterval(next, duration * 1000);
    return () => window.clearInterval(timer);
  }, [playing, next, duration, photos.length]);

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'ArrowRight') next();
      if (event.key === 'ArrowLeft') previous();
      if (event.code === 'Space') { event.preventDefault(); setPlaying(value => !value); }
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, previous, onClose]);

  useEffect(() => {
    if (!playing) {
      setControls(true);
      return undefined;
    }
    if (!controls) return undefined;
    const timer = window.setTimeout(() => setControls(false), 3500);
    return () => window.clearTimeout(timer);
  }, [playing, controls, index]);

  return (
    <main className={`slideshow${controls ? '' : ' slideshow--quiet'}`} onMouseMove={() => setControls(true)} onTouchStart={() => setControls(true)}>
      <img className="slideshow__image" src={photos[currentIndex].imageUrl} alt={photos[currentIndex].name} />
      <div className="slideshow__shade" />
      <header className="slideshow__top">
        <button onClick={onClose} aria-label="Close slideshow"><X size={20} /></button>
        <div><strong>{title}</strong><span>{photos.length} photos</span></div>
        <button aria-label="Toggle fullscreen" onClick={() => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()}><Maximize size={18} /></button>
      </header>
      <button className="slide-arrow slide-arrow--previous" onClick={previous} aria-label="Previous photo"><SkipBack size={22} /></button>
      <button className="slide-arrow slide-arrow--next" onClick={next} aria-label="Next photo"><SkipForward size={22} /></button>
      <footer className="slideshow__controls">
        <button onClick={previous} aria-label="Previous photo"><ArrowLeft size={19} /></button>
        <button className="play-control" onClick={() => setPlaying(value => !value)} aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}>{playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}</button>
        <button onClick={next} aria-label="Next photo"><ArrowLeft className="flip-icon" size={19} /></button>
        <span className="slideshow__counter">{String(currentIndex + 1).padStart(2, '0')} <i /> {String(photos.length).padStart(2, '0')}</span>
        <div className="progress-track"><span style={{ width: `${((currentIndex + 1) / photos.length) * 100}%` }} /></div>
        <span className="slideshow__speed">{duration}s each</span>
      </footer>
    </main>
  );
}
