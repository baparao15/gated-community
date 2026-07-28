import { useRef, useState } from 'react';
import { Camera, ImagePlus, UploadCloud, X } from 'lucide-react';

const MAX_FILE_MB = 8;
const MAX_FILES = 6;

// Shared, friendly image picker used by the maintenance and marketplace dialogs.
// Supports camera capture + gallery + drag-and-drop, validates type/size, and shows
// live previews with a remove button. `highlight` gently nudges the user when the rest
// of the form was auto-filled (e.g. by the voice assistant) and only a photo is left.
export default function ImageUploader({ images, setImages, highlight = false, hint }) {
  const galleryRef = useRef(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;
    const valid = [];
    let rejected = '';
    for (const file of incoming) {
      if (!file.type.startsWith('image/')) { rejected = 'Only image files are allowed.'; continue; }
      if (file.size > MAX_FILE_MB * 1024 * 1024) { rejected = `Each photo must be under ${MAX_FILE_MB}MB.`; continue; }
      valid.push(file);
    }
    const room = MAX_FILES - images.length;
    if (valid.length > room) rejected = `You can attach up to ${MAX_FILES} photos.`;
    setError(rejected);
    if (room > 0) setImages([...images, ...valid.slice(0, room)]);
  };

  const removeAt = (index) => { setError(''); setImages(images.filter((_, i) => i !== index)); };
  const atLimit = images.length >= MAX_FILES;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className={`text-sm font-bold ${highlight ? 'text-brand-600' : ''}`}>
          {highlight ? 'Almost done — just add a photo' : 'Photos'}
          <span className="ml-1 font-medium text-earth-400">({images.length}/{MAX_FILES})</span>
        </span>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        className={`rounded-2xl border-2 border-dashed p-4 transition ${
          dragging ? 'border-brand-500 bg-brand-50'
          : highlight ? 'border-brand-400 bg-brand-50/60'
          : 'border-earth-300 bg-earth-50/50 dark:border-earth-700 dark:bg-earth-800/40'
        }`}
      >
        <div className="grid grid-cols-2 gap-2">
          <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-earth-200 bg-white p-3 text-sm font-bold text-earth-700 transition hover:border-brand-300 hover:text-brand-600 dark:border-earth-700 dark:bg-earth-900 dark:text-earth-100 ${atLimit ? 'pointer-events-none opacity-40' : ''}`}>
            <Camera size={18} /> Camera
            <input className="hidden" type="file" accept="image/*" capture="environment" disabled={atLimit} onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
          </label>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            disabled={atLimit}
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-earth-200 bg-white p-3 text-sm font-bold text-earth-700 transition hover:border-brand-300 hover:text-brand-600 disabled:pointer-events-none disabled:opacity-40 dark:border-earth-700 dark:bg-earth-900 dark:text-earth-100"
          >
            <ImagePlus size={18} /> Gallery
          </button>
          <input ref={galleryRef} className="hidden" type="file" multiple accept="image/*" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
        </div>

        {!images.length && (
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-earth-400">
            <UploadCloud size={15} /> or drag &amp; drop images here
          </div>
        )}

        {!!images.length && (
          <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
            {images.map((file, index) => (
              <div key={`${file.name}-${index}`} className="group relative aspect-square overflow-hidden rounded-xl border border-earth-200 dark:border-earth-700">
                <img src={URL.createObjectURL(file)} alt={file.name} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                  aria-label="Remove photo"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
      {!error && hint && <p className="mt-2 text-xs text-earth-400">{hint}</p>}
    </div>
  );
}
