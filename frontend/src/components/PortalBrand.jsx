import React, { useState } from 'react';
import { Brain } from 'lucide-react';

const PortalBrand = ({ portal = 'University Portal' }) => {
  const [logoUnavailable, setLogoUnavailable] = useState(false);

  return (
    <div className="portal-brand-lockup" aria-label={`Brainware ${portal}`}>
      {logoUnavailable ? (
        <Brain className="portal-brand-mark portal-brand-fallback" aria-hidden="true" />
      ) : (
        <img
          className="portal-brand-mark"
          src="https://www.brainwareuniversity.ac.in/images/bwu-logo.svg"
          alt="Brainware University official logo"
          onError={() => setLogoUnavailable(true)}
        />
      )}
      <div className="portal-brand-copy">
        <strong>BRAINWARE</strong>
        <span>{portal}</span>
      </div>
    </div>
  );
};

export default PortalBrand;
