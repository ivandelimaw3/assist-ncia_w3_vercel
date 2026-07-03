import { useRef, useState } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/components/AuthProvider";
import { FotoLightbox } from "@/components/FotoLightbox";

type Props = {
  fotos: string[];
  onChange: (fotos: string[]) => void;
  max?: number;
};

const TARGET_W = 300;
const TARGET_H = 274;

// Redimensiona/recorta a imagem para 300x274 mantendo cobertura central
async function resizeImage(file: File): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = TARGET_W;
  canvas.height = TARGET_H;
  const ctx = canvas.getContext("2d")!;

  // cobertura (cover) centralizada
  const srcRatio = img.width / img.height;
  const dstRatio = TARGET_W / TARGET_H;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (srcRatio > dstRatio) {
    sw = img.height * dstRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / dstRatio;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, TARGET_W, TARGET_H);

  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9),
  );
}

export function FotosUpload({ fotos, onChange, max = 3 }: Props) {
  const { user } = useAuthContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const remaining = max - fotos.length;

  async function handleFiles(files: FileList | null) {
    if (!files || !user) return;
    if (remaining <= 0) {
      toast.error(`Máximo de ${max} fotos`);
      return;
    }
    const list = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const novos: string[] = [];
      for (const file of list) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} não é uma imagem`);
          continue;
        }
        const blob = await resizeImage(file);
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error } = await supabase.storage
          .from("os-fotos")
          .upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from("os-fotos").getPublicUrl(path);
        novos.push(data.publicUrl);
      }
      if (novos.length) {
        onChange([...fotos, ...novos]);
        toast.success(`${novos.length} foto(s) adicionada(s)`);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove(idx: number) {
    const url = fotos[idx];
    onChange(fotos.filter((_, i) => i !== idx));
    // tenta limpar do storage (ignora erro)
    try {
      const marker = "/os-fotos/";
      const i = url.indexOf(marker);
      if (i >= 0) {
        const path = url.slice(i + marker.length);
        await supabase.storage.from("os-fotos").remove([path]);
      }
    } catch {
      /* noop */
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {fotos.map((url, idx) => (
          <div
            key={url}
            className="relative group rounded-md overflow-hidden border border-border bg-muted"
            style={{ width: TARGET_W / 2, height: TARGET_H / 2 }}
          >
            <button
              type="button"
              onClick={() => setLightboxIndex(idx)}
              className="block w-full h-full"
            >
              <img
                src={url}
                alt={`Foto ${idx + 1}`}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
            </button>
            <button
              type="button"
              onClick={() => handleRemove(idx)}
              className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remover foto"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {fotos.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-border hover:border-primary hover:bg-accent/30 transition-colors text-muted-foreground"
            style={{ width: TARGET_W / 2, height: TARGET_H / 2 }}
          >
            {uploading ? (
              <span className="text-xs">Enviando...</span>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                <span className="text-xs">Adicionar foto</span>
                <span className="text-[10px]">300×274</span>
              </>
            )}
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <ImageIcon className="h-3 w-3" />
        {fotos.length}/{max} foto(s) — recortadas para 300×274
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {lightboxIndex !== null && (
        <FotoLightbox
          fotos={fotos}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
