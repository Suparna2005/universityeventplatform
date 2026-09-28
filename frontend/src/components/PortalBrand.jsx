import React from 'react';

const PortalBrand = ({ portal = 'University Portal' }) => (
  <div className="portal-brand-lockup" aria-label={`Brainware ${portal}`}>
    <img
      className="portal-brand-mark"
      src="https://www.brainwareuniversity.ac.in/images/bwu-logo.svg"
      alt="Brainware University official logo"
    />
    <div className="portal-brand-copy">
      <strong>BRAINWARE</strong>
      <span>{portal}</span>
    </div>
  </div>
);

export default PortalBrand;
