import { ImagePlus, Trash2, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import * as api from "../lib/api";
import { cn } from "../lib/utils";

export default function ImagePickerModal({ open, current, onSelect, onClose }) {
  const { projectId } = useApp();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open || !projectId) return;
    setLoading(true);
    setError(null);
    api
      .listProjectImages(projectId)
      .then(setImages)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, projectId]);

  if (!open) return null;

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const res = await api.uploadProjectImage(projectId, file);
      onSelect(res.path);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-elev shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 font-semibold">
            <ImagePlus size={18} className="text-accent" />
            Elegir imagen
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-dim hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-border px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border-strong bg-white/5 px-3 py-2 text-sm font-semibold hover:bg-white/10">
              <Upload size={16} />
              {uploading ? "Subiendo…" : "Cargar imagen"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={onFile}
              />
            </label>
            {current ? (
              <button
                type="button"
                onClick={() => {
                  onSelect(null);
                  onClose();
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-500/25"
              >
                <Trash2 size={16} />
                Quitar de la tarjeta
              </button>
            ) : null}
          </div>
          <p className="mt-1.5 text-xs text-mute">
            Se guarda en Supabase Storage (<code>project-assets</code>). Quitar
            solo desvincula la imagen de esta tarea (no borra el archivo del
            proyecto).
          </p>
          {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-sm text-dim">Cargando…</p>
          ) : images.length === 0 ? (
            <p className="text-sm text-dim">No hay imágenes en este proyecto.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {images.map((img) => (
                <button
                  key={img.path}
                  type="button"
                  onClick={() => {
                    onSelect(img.path);
                    onClose();
                  }}
                  className={cn(
                    "group overflow-hidden rounded-xl border bg-black/30 text-left transition",
                    current === img.path || current === img.name
                      ? "border-accent ring-2 ring-accent/30"
                      : "border-border hover:border-border-strong"
                  )}
                >
                  <div className="aspect-square bg-black/40">
                    <img
                      src={img.url}
                      alt={img.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="truncate px-2 py-1.5 font-mono text-[10px] text-mute">
                    {img.name}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
