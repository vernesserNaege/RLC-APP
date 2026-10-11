import { useRef, useState } from "react";
import { mediaUrl, uploadFile } from "../../api";
import ModelViewer from "../../components/ModelViewer";

type Kind = "image" | "model";

const ACCEPT: Record<Kind, string> = {
  image: "image/jpeg,image/png,image/webp,image/gif",
  model: ".glb,model/gltf-binary",
};
const HINT: Record<Kind, string> = {
  image: "JPG, PNG, WebP or GIF, up to 5 MB",
  model: ".glb file, up to 20 MB",
};

interface MediaFieldProps {
  label: string;
  kind: Kind;
  value: string | null; // the link, or null when there is none
  onChange: (url: string | null) => void;
  className?: string;
}

// Upload / Replace / Remove for one picture or 3D model, with a preview.
// Uploading saves the file right away; the module itself is saved with the Save button.
export default function MediaField({ label, kind, value, onChange, className = "" }: MediaFieldProps) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      onChange((await uploadFile(file, kind)).url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (input.current) input.current.value = ""; // so the same file can be picked again
    }
  }

  return (
    <div className={`admin-field media-field ${className}`}>
      {label}
      {value &&
        (kind === "image" ? (
          <img className="media-preview" src={mediaUrl(value)} alt={`${label} preview`} />
        ) : (
          <ModelViewer className="media-preview-model" src={mediaUrl(value)} alt={`${label} preview`} />
        ))}
      <div className="media-actions">
        <button type="button" className="table-action" onClick={() => input.current?.click()} disabled={uploading}>
          {uploading ? "Uploading..." : value ? "Replace" : "Upload"}
        </button>
        {value && (
          <button type="button" className="table-action danger" onClick={() => onChange(null)} disabled={uploading}>
            Remove
          </button>
        )}
        <span className="media-hint">{HINT[kind]}</span>
      </div>
      {error && <div className="admin-error">{error}</div>}
      <input ref={input} type="file" accept={ACCEPT[kind]} hidden onChange={(e) => upload(e.target.files?.[0])} />
    </div>
  );
}