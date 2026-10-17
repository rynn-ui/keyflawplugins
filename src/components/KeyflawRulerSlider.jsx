import React, { useState, useRef, useEffect, useMemo } from 'react';

/**
 * Calculates ruler spacing and intervals based on parameter min/max.
 */
function getRulerConfig(min, max, step) {
  const range = Math.max(0.0001, max - min);

  let majorStep;
  let minorStep;
  let pxPerUnit;

  if (range <= 1.0) {
    majorStep = 0.2;
    minorStep = 0.04;
    pxPerUnit = 320;
  } else if (range <= 5.0) {
    majorStep = 1.0;
    minorStep = 0.2;
    pxPerUnit = 65;
  } else if (range <= 15.0) {
    majorStep = 2.0;
    minorStep = 0.5;
    pxPerUnit = 32;
  } else if (range <= 35.0) {
    majorStep = 5.0;
    minorStep = 1.0;
    pxPerUnit = 14;
  } else if (range <= 70.0) {
    majorStep = 10.0;
    minorStep = 2.0;
    pxPerUnit = 7.0;
  } else if (range <= 150.0) {
    majorStep = 20.0;
    minorStep = 5.0;
    pxPerUnit = 3.5;
  } else {
    // Dynamic interval for large ranges
    const rawStep = range / 5;
    const power = Math.floor(Math.log10(rawStep));
    const factor = rawStep / Math.pow(10, power);
    let nice = 1;
    if (factor > 7) nice = 10;
    else if (factor > 3) nice = 5;
    else if (factor > 1.5) nice = 2;
    majorStep = nice * Math.pow(10, power);
    minorStep = majorStep / 5;
    pxPerUnit = 70 / majorStep;
  }

  // Adjust if user specified larger step
  if (typeof step === 'number' && step > minorStep) {
    minorStep = step;
  }

  return { majorStep, minorStep, pxPerUnit };
}

/**
 * Format tick labels cleanly without floating point weirdness
 */
function formatTick(val, majorStep) {
  if (majorStep >= 1) {
    return Math.round(val).toString();
  }
  const decimals = majorStep < 0.1 ? 2 : 1;
  return Number(val.toFixed(decimals)).toString();
}

/**
 * Keyflaw Ruler Slider
 * Interactive horizontal ruler dial with center blue needle,
 * blue pill readout badge, and tick marks.
 */
export function KeyflawRulerSlider({
  param,
  value,
  onChange,
  onReset
}) {
  const min = typeof param.min === 'number' ? param.min : 0;
  const max = typeof param.max === 'number' ? param.max : (min < 1 ? 1 : 100);
  const step = typeof param.step === 'number' && param.step > 0 ? param.step : (max - min <= 1 ? 0.01 : 1);
  const currentVal = typeof value === 'number' ? value : (param.default ?? min);

  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editVal, setEditVal] = useState(String(currentVal));
  const [trackWidth, setTrackWidth] = useState(280);

  const trackRef = useRef(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const lastYRef = useRef(0);
  const startValRef = useRef(0);
  const isPointerDownRef = useRef(false);
  const isScrubbingRef = useRef(false);
  const isScrollingRef = useRef(false);
  const isIntentLockedRef = useRef(false);
  const isBadgeClickRef = useRef(false);
  const activePointerIdRef = useRef(null);

  // Measure ruler width dynamically
  useEffect(() => {
    if (!trackRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setTrackWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(trackRef.current);
    return () => observer.disconnect();
  }, []);

  const { majorStep, minorStep, pxPerUnit } = useMemo(
    () => getRulerConfig(min, max, step),
    [min, max, step]
  );

  // Center position of the needle
  const centerX = trackWidth / 2;

  // Generate visible ticks around currentVal
  const ticks = useMemo(() => {
    const list = [];
    if (trackWidth <= 0 || pxPerUnit <= 0) return list;

    // Visible range in value units
    const halfWidthUnits = (trackWidth / 2 + 40) / pxPerUnit;
    const visibleMin = Math.max(min, currentVal - halfWidthUnits);
    const visibleMax = Math.min(max, currentVal + halfWidthUnits);

    // Starting tick
    const startMajor = Math.floor(visibleMin / majorStep) * majorStep;
    const endMajor = Math.ceil(visibleMax / majorStep) * majorStep;

    // Gather major ticks
    const majorSet = new Set();
    for (let t = startMajor; t <= endMajor + majorStep * 0.5; t += majorStep) {
      const roundedT = Number(t.toFixed(4));
      if (roundedT >= min - 0.0001 && roundedT <= max + 0.0001) {
        const x = centerX + (roundedT - currentVal) * pxPerUnit;
        majorSet.add(roundedT);
        list.push({
          val: roundedT,
          x,
          isMajor: true,
          label: formatTick(roundedT, majorStep)
        });
      }
    }

    // Gather minor ticks
    if (minorStep > 0 && pxPerUnit * minorStep >= 4) {
      const startMinor = Math.floor(visibleMin / minorStep) * minorStep;
      const endMinor = Math.ceil(visibleMax / minorStep) * minorStep;

      for (let t = startMinor; t <= endMinor + minorStep * 0.5; t += minorStep) {
        const roundedT = Number(t.toFixed(4));
        if (roundedT >= min - 0.0001 && roundedT <= max + 0.0001) {
          // Skip if this coincides with a major tick
          const isNearMajor = Array.from(majorSet).some(
            (maj) => Math.abs(maj - roundedT) < minorStep * 0.3
          );
          if (!isNearMajor) {
            const x = centerX + (roundedT - currentVal) * pxPerUnit;
            list.push({
              val: roundedT,
              x,
              isMajor: false
            });
          }
        }
      }
    }

    return list;
  }, [min, max, currentVal, majorStep, minorStep, pxPerUnit, trackWidth, centerX]);

  // Pointer Scrub Handlers (Ultra-responsive for touch & desktop)
  const handlePointerDown = (e) => {
    if (isEditing) return;
    if (e.button !== undefined && e.button !== 0) return;

    isPointerDownRef.current = true;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    lastYRef.current = e.clientY;
    startValRef.current = currentVal;
    activePointerIdRef.current = e.pointerId;
    isIntentLockedRef.current = false;
    isScrubbingRef.current = false;
    isScrollingRef.current = false;
    isBadgeClickRef.current = Boolean(e.target.closest('.kf-ruler-badge'));

    if (e.pointerType === 'mouse') {
      isIntentLockedRef.current = true;
      isScrubbingRef.current = true;
      setIsDragging(true);
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handlePointerMove = (e) => {
    if (!isPointerDownRef.current) return;
    if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) return;

    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    // Disambiguate scroll vs scrub on touch devices
    if (!isIntentLockedRef.current) {
      const dist = Math.hypot(dx, dy);
      if (dist < 6) return;

      if (e.pointerType === 'touch' && absY > absX * 1.1) {
        // Vertical swipe intent: scroll the parent parameter container
        isIntentLockedRef.current = true;
        isScrollingRef.current = true;
        isScrubbingRef.current = false;
      } else {
        // Horizontal scrub intent: slide the ruler dial
        isIntentLockedRef.current = true;
        isScrubbingRef.current = true;
        isScrollingRef.current = false;
        setIsDragging(true);
      }
    }

    if (isScrollingRef.current) {
      const scrollEl = trackRef.current?.closest('.parameters-scroll') || document.querySelector('.parameters-scroll');
      if (scrollEl) {
        const stepY = e.clientY - lastYRef.current;
        scrollEl.scrollTop -= stepY;
      }
      lastYRef.current = e.clientY;
      return;
    }

    if (isScrubbingRef.current) {
      // Dragging left moves higher numbers to center needle
      const deltaVal = -dx / pxPerUnit;
      let nextVal = startValRef.current + deltaVal;
      nextVal = Math.max(min, Math.min(max, nextVal));

      if (step > 0) {
        const inv = 1 / step;
        nextVal = Math.round(nextVal * inv) / inv;
      }

      onChange(nextVal);
    }
  };

  const handlePointerUp = (e) => {
    if (!isPointerDownRef.current) return;

    const wasScrubbing = isScrubbingRef.current;
    const wasScrolling = isScrollingRef.current;
    const wasBadge = isBadgeClickRef.current;
    const dist = Math.hypot(
      e.clientX - startXRef.current,
      e.clientY - startYRef.current
    );

    isPointerDownRef.current = false;
    isScrubbingRef.current = false;
    isScrollingRef.current = false;
    isIntentLockedRef.current = false;
    activePointerIdRef.current = null;
    setIsDragging(false);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}

    // Tap handling (small movement < 6px)
    if (!wasScrubbing && !wasScrolling && dist < 6) {
      if (wasBadge) {
        // Tap on badge opens direct numeric edit
        setEditVal(String(currentVal));
        setIsEditing(true);
      } else if (trackRef.current) {
        // Tap on ruler steps directly to clicked coordinate
        const rect = trackRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const distFromCenter = clickX - centerX;
        let targetVal = currentVal + distFromCenter / pxPerUnit;
        targetVal = Math.max(min, Math.min(max, targetVal));
        if (step > 0) {
          const inv = 1 / step;
          targetVal = Math.round(targetVal * inv) / inv;
        }
        onChange(targetVal);
      }
    }
  };

  const handlePointerCancel = (e) => {
    isPointerDownRef.current = false;
    isScrubbingRef.current = false;
    isScrollingRef.current = false;
    isIntentLockedRef.current = false;
    activePointerIdRef.current = null;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  const commitEdit = () => {
    const parsed = parseFloat(editVal);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onChange(clamped);
    }
    setIsEditing(false);
  };

  // Formatted display value in badge
  const displayValue = useMemo(() => {
    if (step >= 1) return Math.round(currentVal).toString();
    const decimals = step < 0.01 ? 3 : 2;
    return Number(currentVal.toFixed(decimals)).toString();
  }, [currentVal, step]);

  return (
    <div className={`kf-slider-row ${isDragging ? 'is-active' : ''}`}>
      {/* Left Column: Parameter Label */}
      <div className="kf-param-left">
        <span 
          className={`kf-param-name ${isDragging ? 'text-blue' : ''}`}
          title={`${param.label || param.key} (Default: ${param.default ?? min})`}
        >
          {param.label || param.key}
        </span>
      </div>

      {/* Right Column: Keyflaw Ruler Dial */}
      <div 
        ref={trackRef}
        className="kf-ruler-track"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {/* Center Blue Needle Line */}
        <div className="kf-ruler-needle" />

        {/* Center Blue Pill Badge (Supports both sliding by dragging and editing on tap) */}
        <div 
          className="kf-ruler-badge"
          title="Drag to slide • Tap to enter exact numeric value"
        >
          {isEditing ? (
            <input
              type="number"
              className="kf-ruler-input"
              value={editVal}
              autoFocus
              step={step}
              min={min}
              max={max}
              onPointerDown={(e) => e.stopPropagation()}
              onChange={(e) => setEditVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              onBlur={commitEdit}
            />
          ) : (
            <span className="kf-ruler-badge-text">{displayValue}</span>
          )}
        </div>

        {/* Ruler Tick Marks & Labels Tape */}
        <div className="kf-ruler-tape">
          {ticks.map((t, idx) => (
            <React.Fragment key={`${t.val}-${idx}`}>
              {t.isMajor ? (
                <>
                  <span 
                    className="kf-tick-number"
                    style={{ left: `${t.x}px` }}
                  >
                    {t.label}
                  </span>
                  <div 
                    className="kf-tick-line kf-major"
                    style={{ left: `${t.x}px` }}
                  />
                </>
              ) : (
                <div 
                  className="kf-tick-line kf-minor"
                  style={{ left: `${t.x}px` }}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
