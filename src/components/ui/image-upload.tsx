import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Camera, X, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onImageChange: (url: string | null) => void;
  folder: string;
  fallback?: string;
  variant?: 'avatar' | 'logo';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

const sizeClasses = {
  sm: 'h-16 w-16',
  md: 'h-24 w-24',
  lg: 'h-32 w-32',
};

export function ImageUpload({
  currentImageUrl,
  onImageChange,
  folder,
  fallback = '?',
  variant = 'avatar',
  size = 'md',
  disabled = false,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5 Mo');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      onImageChange(publicUrl);
      toast.success('Image mise à jour');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    onImageChange(null);
    toast.success('Image supprimée');
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        {variant === 'avatar' ? (
          <Avatar className={cn(sizeClasses[size], 'border-2 border-border')}>
            {currentImageUrl ? (
              <AvatarImage src={currentImageUrl} alt="Photo de profil" />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {fallback}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className={cn(
            sizeClasses[size],
            'rounded-lg border-2 border-border bg-muted flex items-center justify-center overflow-hidden'
          )}>
            {currentImageUrl ? (
              <img 
                src={currentImageUrl} 
                alt="Logo" 
                className="w-full h-full object-contain"
              />
            ) : (
              <Building2 className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
        )}

        {!disabled && (
          <div className={cn(
            'absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1',
            variant === 'avatar' ? 'rounded-full' : 'rounded-lg'
          )}>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </Button>
            {currentImageUrl && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={handleRemove}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || uploading}
      />

      {!disabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Upload...
            </>
          ) : (
            <>
              <Camera className="mr-2 h-4 w-4" />
              {currentImageUrl ? 'Changer' : 'Ajouter une photo'}
            </>
          )}
        </Button>
      )}
    </div>
  );
}
