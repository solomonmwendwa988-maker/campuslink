import { useEffect, useState } from 'react';
type AvatarProps = { initials: string; large?: boolean; image?: string; imagePosition?: number };
export function Avatar({ initials, large = false, image, imagePosition = 50 }: AvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => { setImageFailed(false); }, [image]);
  const showImage = Boolean(image && !imageFailed);
  return <div className={`avatar ${large ? 'avatar-lg' : ''} ${showImage ? 'avatar-with-image' : ''}`} aria-label={initials} title={initials}>
    {showImage ? <img src={image} alt="" loading="lazy" onError={() => setImageFailed(true)} style={{ objectPosition: `${imagePosition}% center` }} /> : initials || 'CL'}
  </div>;
}
