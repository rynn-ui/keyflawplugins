import React from 'react';

/**
 * Keyflaw Toggle Switch
 * Pill toggle switch for boolean/switch parameters (e.g. "Round Cells")
 * matching Keyflaw / Keyflow Android UI design.
 */
export function KeyflawToggle({
  param,
  value,
  onChange
}) {
  const isChecked = Boolean(value === 1 || value === true || value === '1' || value === 1.0);

  const handleToggle = () => {
    onChange(isChecked ? 0.0 : 1.0);
  };

  return (
    <div 
      className="kf-toggle-row"
      onClick={handleToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleToggle();
        }
      }}
      title={`${param.label || param.key}: ${isChecked ? 'ON' : 'OFF'}`}
    >
      {/* Left Column: Parameter Label */}
      <div className="kf-toggle-label">
        <span>{param.label || param.key}</span>
      </div>

      {/* Right Column: Pill Toggle Switch */}
      <div className={`kf-switch-track ${isChecked ? 'checked' : ''}`}>
        <div className={`kf-switch-knob ${isChecked ? 'checked' : ''}`} />
      </div>
    </div>
  );
}
