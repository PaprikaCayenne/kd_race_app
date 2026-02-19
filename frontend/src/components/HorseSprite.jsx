import { horseSpriteDataUri } from '@/utils/horseSpriteSvg';

export default function HorseSprite({
  bodyHex,
  saddleHex,
  alt = 'Horse',
  className = 'w-8 h-8'
}) {
  return (
    <img
      src={horseSpriteDataUri(bodyHex, saddleHex)}
      alt={alt}
      className={className}
      loading="lazy"
    />
  );
}
