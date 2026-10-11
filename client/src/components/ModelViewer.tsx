import { useEffect } from "react";

interface ModelViewerProps {
  src: string;
  alt: string;
  className?: string;
}

// A 3D model the student can turn with a finger or the mouse, and zoom by pinching or scrolling.
// The viewer's code is only downloaded when a page actually shows a model, so other pages stay fast.
export default function ModelViewer({ src, alt, className = "model-viewer" }: ModelViewerProps) {
  useEffect(() => {
    void import("@google/model-viewer");
  }, []);

  return (
    <model-viewer
      src={src}
      alt={alt}
      className={className}
      camera-controls
      auto-rotate
      touch-action="pan-y"
      shadow-intensity="1"
    />
  );
}