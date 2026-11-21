type AvatarProps = { initials: string; large?: boolean; image?: string; imagePosition?: number };

export function Avatar({ initials, large = false, image, imagePosition = 50 }: AvatarProps) {
  return <div className={`avatar ${large ? 'avatar-lg' : ''} ${image ? 'avatar-with-image' : ''}`} aria-label={initials}>
    {image ? <img src={image} alt="" style={{ objectPosition: `${imagePosition}% center` }}/> : initials}
  </div>;
}
