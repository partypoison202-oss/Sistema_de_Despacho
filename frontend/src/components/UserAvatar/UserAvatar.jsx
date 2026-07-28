import React, { useState } from 'react';
import { getProfileImageUrl } from '../../utils/imageUrl';

export default function UserAvatar({ fotoUrl, nombre = '', size = 40, className = '', style = {} }) {
  const [hasError, setHasError] = useState(false);

  const imageUrl = getProfileImageUrl(fotoUrl);
  const initial = (nombre && typeof nombre === 'string' && nombre.trim().length > 0)
    ? nombre.trim().charAt(0).toUpperCase()
    : '?';

  if (!imageUrl || hasError) {
    return (
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
          ...style
        }}
      >
        {initial}
      </div>
    );
  }

  return (
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
        ...style
      }}
    />
  );
}
