export function buildHorseSpriteSvg(bodyHex = '#a0522d', saddleHex = '#888888'): string {
  const body = bodyHex || '#a0522d';
  const saddle = saddleHex || '#888888';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32" shape-rendering="crispEdges">
    <rect x="4" y="16" width="4" height="9" rx="1" fill="#2a2a2a"/>
    <rect x="10" y="11" width="26" height="13" rx="3" fill="${body}"/>
    <rect x="18" y="13" width="9" height="6" rx="1" fill="${saddle}"/>
    <rect x="13" y="23" width="3" height="7" fill="${body}"/>
    <rect x="17" y="23" width="3" height="7" fill="${body}"/>
    <rect x="27" y="23" width="3" height="7" fill="${body}"/>
    <rect x="31" y="23" width="3" height="7" fill="${body}"/>
    <rect x="34" y="12" width="3" height="9" fill="${body}"/>
    <polygon points="37,12 44,10 44,18 37,16" fill="${body}"/>
    <rect x="37" y="9" width="2" height="2" fill="#2a2a2a"/>
    <rect x="42" y="12" width="1" height="1" fill="#ffffff"/>
  </svg>`;
}

export function horseSpriteDataUri(bodyHex = '#a0522d', saddleHex = '#888888'): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(buildHorseSpriteSvg(bodyHex, saddleHex))}`;
}
