import type { CSSProperties } from "react";
import { HERO_SMOKE_PARTICLES } from "./heroSmokeParticles.js";

export function HeroCharacter() {
  return (
    <div
      className="hero__character-wrap"
      onDragStart={(e) => e.preventDefault()}
    >
      <div className="hero__smoke-field">
        {HERO_SMOKE_PARTICLES.map((p, i) => (
          <span
            key={i}
            className="smoke-particle"
            style={
              {
                "--x": p.x,
                "--y": p.y,
                "--size": p.size,
                "--duration": p.duration,
                "--delay": p.delay,
                "--drift-x": p.driftX,
                "--drift-y": p.driftY,
                "--peak-opacity": String(p.peakOpacity),
              } as CSSProperties
            }
          />
        ))}
        <div className="smoke-layer smoke-layer--1" />
        <div className="smoke-layer smoke-layer--2" />
        <div className="smoke-layer smoke-layer--3" />
        <div className="smoke-layer smoke-layer--4" />
      </div>
      <div className="hero__character">
        <div className="hero__character-figure">
          <img
            src="/landing/character.png"
            alt=""
            className="hero__character-img"
            draggable={false}
          />
          <button
            type="button"
            className="hero__character-seam"
            aria-label="Grieta roja"
          />
          <div className="hero__character-seam-bloom" aria-hidden="true" />
          <div className="hero__character-ground" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
