import React, { useState } from 'react';
import { getProfileImageUrl } from '../../utils/imageUrl';
import './UserAvatar.css';

export default function UserAvatar({
  fotoUrl,
  nombre = '',
  size = 40,
  className = '',
  style = {},
  isOnline = undefined,
  showStatus = false,
}) {
  const [hasError, setHasError] = useState(false);

  const imageUrl = getProfileImageUrl(fotoUrl);
  const initial = (nombre && typeof nombre === 'string' && nombre.trim().length > 0)
    ? nombre.trim().charAt(0).toUpperCase()
    : '?';

  const shouldRenderBadge = showStatus || isOnline !== undefined;
  const badgeSize = Math.max(10, Math.min(18, Math.round(size * 0.28)));

  const avatarContent = (!imageUrl || hasError) ? (
    <div
      className={`user-avatar-initials ${className}`}
      title={nombre}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        borderRadius: '50%',
        background: '#c29b53',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: `${Math.max(12, Math.round(size * 0.45))}px`,
        userSelect: 'none',
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  ) : (
    <img
      src={imageUrl}
      alt={nombre}
      className={`user-avatar-img ${className}`}
      onError={() => setHasError(true)}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        borderRadius: '50%',
        objectFit: 'cover',
        display: 'block',
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
    />
  );

  return (
    <div
      className="user-avatar-wrapper"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        borderRadius: '50%',
        ...style,
      }}
      title={`${nombre}${shouldRenderBadge ? (isOnline ? ' (En línea)' : ' (Sin conexión)') : ''}`}
    >
      {avatarContent}
      {shouldRenderBadge && (
        <span
          className={`user-avatar-badge ${isOnline ? 'user-avatar-badge--online' : 'user-avatar-badge--offline'}`}
          style={{
            width: `${badgeSize}px`,
            height: `${badgeSize}px`,
          }}
          aria-label={isOnline ? 'En línea' : 'Sin conexión'}
        />
      )}
    </div>
  );
}
