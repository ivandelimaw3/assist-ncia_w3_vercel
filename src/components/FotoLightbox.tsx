import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Maximize2 } from "lucide-react";

type Props = {
  fotos: string[];
  startIndex?: number;
  onClose: () => void;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.25;

export function FotoLightbox({ fotos, startIndex = 0, onClose }: Props) {
  const [index, setIndex] = useState(startIndex);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  function reset() {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  function next() {
    setIndex((i) => (i + 1) % fotos.length);
    reset();
  }
  function prev() {
    setIndex((i) => (i - 1 + fotos.length) % fotos.length);
    reset();
  }

  function zoomIn() {
    setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)));
  }
  function zoomOut() {
    setZoom((z) => {
      const nz = Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2));
      if (nz === 1) setOffset({ x: 0, y: 0 });
      return nz;
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "+" || e.key === "=") zoomIn();
      else if (e.key === "-" || e.key === "_") zoomOut();
      else if (e.key === "0") reset();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fotos.length, onClose]);

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  }

  function onMouseDown(e: React.MouseEvent) {
    if (zoom <= 1) return;
    e.preventDefault();
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    setDragging(true);
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setOffset({ x: dragRef.current.ox + dx, y: dragRef.current.oy + dy });
  }
  function endDrag() {
    dragRef.current = null;
    setDragging(false);
  }

  function onDoubleClick() {
    if (zoom === 1) {
      setZoom(2.5);
    } else {
      reset();
    }
  }

  if (!fotos.length) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center select-none"
      onClick={onClose}
      onWheel={onWheel}
    >
      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/70 to-transparent z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-white/90 text-sm font-medium">
          {fotos.length > 1 ? `${index + 1} / ${fotos.length}` : "Foto"}
          <span className="ml-3 text-white/60 text-xs">{Math.round(zoom * 100)}%</span>
        </div>
        <div className="flex items-center gap-1">
          <IconBtn onClick={zoomOut} title="Diminuir (-)" disabled={zoom <= MIN_ZOOM}>
            <ZoomOut className="h-5 w-5" />
          </IconBtn>
          <IconBtn onClick={zoomIn} title="Ampliar (+)" disabled={zoom >= MAX_ZOOM}>
            <ZoomIn className="h-5 w-5" />
          </IconBtn>
          <IconBtn onClick={reset} title="Redefinir (0)">
            <RotateCcw className="h-5 w-5" />
          </IconBtn>
          <IconBtn
            onClick={() => {
              const a = document.createElement("a");
              a.href = fotos[index];
              a.target = "_blank";
              a.rel = "noopener";
              a.click();
            }}
            title="Abrir em nova aba"
          >
            <Maximize2 className="h-5 w-5" />
          </IconBtn>
          <IconBtn onClick={onClose} title="Fechar (Esc)">
            <X className="h-5 w-5" />
          </IconBtn>
        </div>
      </div>

      {/* Navegação lateral */}
      {fotos.length > 1 && (
        <>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white/80 hover:text-white bg-black/30 hover:bg-black/50 rounded-full p-2 transition"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            aria-label="Anterior"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white/80 hover:text-white bg-black/30 hover:bg-black/50 rounded-full p-2 transition"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            aria-label="Próxima"
          >
            <ChevronRight className="h-7 w-7" />
          </button>
        </>
      )}

      {/* Imagem */}
      <div
        className="w-full h-full flex items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onDoubleClick={onDoubleClick}
        style={{
          cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "zoom-in",
        }}
      >
        <img
          src={fotos[index]}
          alt={`Foto ${index + 1} de ${fotos.length}`}
          draggable={false}
          className="max-w-[92vw] max-h-[88vh] object-contain rounded-md shadow-2xl transition-transform duration-100 will-change-transform"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            transformOrigin: "center center",
          }}
        />
      </div>

      {/* Hint inferior */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-xs bg-black/40 px-3 py-1.5 rounded-full"
        onClick={(e) => e.stopPropagation()}
      >
        Scroll = zoom · Duplo clique = ampliar · Arrastar = mover · ← → = navegar
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-md p-2 transition"
    >
      {children}
    </button>
  );
}
