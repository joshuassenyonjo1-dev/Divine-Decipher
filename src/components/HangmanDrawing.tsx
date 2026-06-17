import React from 'react';

interface HangmanDrawingProps {
  remainingGuesses: number;
  maxGuesses?: number;
  isGameOver: boolean;
  hasWon: boolean;
}

export default function HangmanDrawing({
  remainingGuesses,
  maxGuesses = 6,
  isGameOver,
  hasWon
}: HangmanDrawingProps) {
  const misses = maxGuesses - remainingGuesses;
  const isLost = isGameOver && !hasWon;

  // Render individual body parts conditional on misses
  // SVG coordinates: Origin at top-left, box is 300x350
  // Gallows loop is centered at X: 191, Y: 120

  // Head
  const renderHead = misses >= 1 && (
    <circle
      cx={isLost ? "186" : "191"}
      cy={isLost ? "144" : "140"}
      r="17"
      id="hm-part-head"
      className="stroke-amber-600 dark:stroke-amber-400 stroke-[4.5] fill-stone-100 dark:fill-stone-900 transition-all duration-1000"
    />
  );

  // Torso / Body (Drawn as a path to allow organic curved spinal slouching in the limp state)
  const torsoD = isLost
    ? "M 191 161 C 185 185, 184 210, 187 230"
    : "M 191 157 L 191 230";

  const renderTorso = misses >= 2 && (
    <path
      d={torsoD}
      id="hm-part-torso"
      className="stroke-amber-600 dark:stroke-amber-400 stroke-[4] stroke-linecap-round fill-none transition-all duration-1000"
    />
  );

  // Left Arm
  const leftArmX1 = isLost ? 187 : 191;
  const leftArmY1 = isLost ? 180 : 180;
  const leftArmX2 = isLost ? 178 : 161;
  const leftArmY2 = isLost ? 223 : 210;

  const renderLeftArm = misses >= 3 && (
    <g id="hm-part-left-arm-group" className="transition-all duration-1000">
      <line
        x1={leftArmX1}
        y1={leftArmY1}
        x2={leftArmX2}
        y2={leftArmY2}
        className="stroke-amber-600 dark:stroke-amber-400 stroke-[4] stroke-linecap-round transition-all duration-1000"
      />
      {/* Hand detail for high-quality stick-art */}
      <circle
        cx={leftArmX2}
        cy={leftArmY2}
        r="3.5"
        className="fill-amber-600 dark:fill-amber-400 stroke-none transition-all duration-1000"
      />
    </g>
  );

  // Right Arm
  const rightArmX1 = isLost ? 187 : 191;
  const rightArmY1 = isLost ? 180 : 180;
  const rightArmX2 = isLost ? 194 : 221;
  const rightArmY2 = isLost ? 223 : 210;

  const renderRightArm = misses >= 4 && (
    <g id="hm-part-right-arm-group" className="transition-all duration-1000">
      <line
        x1={rightArmX1}
        y1={rightArmY1}
        x2={rightArmX2}
        y2={rightArmY2}
        className="stroke-amber-600 dark:stroke-amber-400 stroke-[4] stroke-linecap-round transition-all duration-1000"
      />
      {/* Hand detail */}
      <circle
        cx={rightArmX2}
        cy={rightArmY2}
        r="3.5"
        className="fill-amber-600 dark:fill-amber-400 stroke-none transition-all duration-1000"
      />
    </g>
  );

  // Left Leg
  const leftLegX1 = isLost ? 187 : 191;
  const leftLegY1 = isLost ? 230 : 230;
  const leftLegX2 = isLost ? 180 : 166;
  const leftLegY2 = isLost ? 285 : 280;

  const renderLeftLeg = misses >= 5 && (
    <g id="hm-part-left-leg-group" className="transition-all duration-1000">
      <line
        x1={leftLegX1}
        y1={leftLegY1}
        x2={leftLegX2}
        y2={leftLegY2}
        className="stroke-amber-600 dark:stroke-amber-400 stroke-[4] stroke-linecap-round transition-all duration-1000"
      />
      {/* Foot detail: flat ground alignment when normal, hanging relaxed when limp */}
      {isLost ? (
        <line
          x1={leftLegX2}
          y1={leftLegY2}
          x2={leftLegX2 - 2}
          y2={leftLegY2 + 8}
          className="stroke-amber-600 dark:stroke-amber-400 stroke-[3] stroke-linecap-round"
        />
      ) : (
        <line
          x1={leftLegX2}
          y1={leftLegY2}
          x2={leftLegX2 - 10}
          y2={leftLegY2}
          className="stroke-amber-600 dark:stroke-amber-400 stroke-[3] stroke-linecap-round"
        />
      )}
    </g>
  );

  // Right Leg
  const rightLegX1 = isLost ? 187 : 191;
  const rightLegY1 = isLost ? 230 : 230;
  const rightLegX2 = isLost ? 191 : 216;
  const rightLegY2 = isLost ? 285 : 280;

  const renderRightLeg = misses >= 6 && (
    <g id="hm-part-right-leg-group" className="transition-all duration-1000">
      <line
        x1={rightLegX1}
        y1={rightLegY1}
        x2={rightLegX2}
        y2={rightLegY2}
        className="stroke-amber-600 dark:stroke-amber-400 stroke-[4] stroke-linecap-round transition-all duration-1000"
      />
      {/* Foot detail */}
      {isLost ? (
        <line
          x1={rightLegX2}
          y1={rightLegY2}
          x2={rightLegX2 + 3}
          y2={rightLegY2 + 8}
          className="stroke-amber-600 dark:stroke-amber-400 stroke-[3] stroke-linecap-round"
        />
      ) : (
        <line
          x1={rightLegX2}
          y1={rightLegY2}
          x2={rightLegX2 + 10}
          y2={rightLegY2}
          className="stroke-amber-600 dark:stroke-amber-400 stroke-[3] stroke-linecap-round"
        />
      )}
    </g>
  );

  // Closed dead face (only if game is fully lost) with shifting coordinates
  const renderLossFace = isLost && (
    <g id="hm-part-face-dead" className="stroke-red-600 dark:stroke-red-400 stroke-[2] transition-all duration-1000">
      {/* Left X eye (centered relative to slumped head) */}
      <line x1="177" y1="141" x2="183" y2="147" />
      <line x1="183" y1="141" x2="177" y2="147" />
      {/* Right X eye */}
      <line x1="189" y1="141" x2="195" y2="147" />
      <line x1="195" y1="141" x2="189" y2="147" />
      {/* Frown */}
      <path d="M 181 154 Q 186 150 191 154" fill="transparent" />
    </g>
  );

  // Normal or worried face (only during active play)
  const renderActiveFace = misses > 0 && !isLost && !hasWon && (
    <g id="hm-part-face-active" className="stroke-amber-700 dark:stroke-amber-300 stroke-[2] transition-all duration-500">
      {/* Eyebrows showing concern */}
      {misses >= 3 && (
        <g className="stroke-amber-700 dark:stroke-amber-300 stroke-[1.5]">
          <line x1="181" y1="131" x2="186" y2="133" />
          <line x1="201" y1="131" x2="196" y2="133" />
        </g>
      )}
      {/* Eyes */}
      <circle cx="184" cy="136" r="1.5" className="fill-amber-700 dark:fill-amber-300 stroke-none" />
      <circle cx="198" cy="136" r="1.5" className="fill-amber-700 dark:fill-amber-300 stroke-none" />
      {/* Worried mouth depending on level of danger */}
      {misses <= 3 ? (
        <line x1="186" y1="146" x2="196" y2="146" className="stroke-[2] stroke-linecap-round" />
      ) : (
        <path d="M 186 148 Q 191 143 196 148" fill="transparent" className="stroke-[2] stroke-linecap-round" />
      )}
      {/* Cold sweat bead when highly endangered */}
      {misses === 5 && (
        <path d="M 203 138 Q 204 144 202 144 Q 200 144 201 140 Z" className="fill-sky-400 dark:fill-sky-305 stroke-none" />
      )}
    </g>
  );

  // Relieved/happy face when successfully deciphered the word
  const renderWonFace = misses >= 1 && hasWon && (
    <g id="hm-part-face-won" className="stroke-amber-750 dark:stroke-amber-300 stroke-[2.2] transition-all duration-700">
      {/* Relieved arc-eyes (^ ^) */}
      <path d="M 180 137 Q 184 132 188 137" fill="transparent" className="stroke-linecap-round" />
      <path d="M 194 137 Q 198 132 202 137" fill="transparent" className="stroke-linecap-round" />
      {/* Soft relaxed smile */}
      <path d="M 184 144 Q 191 150 198 144" fill="transparent" className="stroke-linecap-round" />
    </g>
  );

  return (
    <div className="relative w-full max-w-[280px] mx-auto aspect-[3/4] bg-stone-50 dark:bg-stone-900/40 p-4 rounded-xl border border-stone-200/60 dark:border-stone-800/80 shadow-md flex items-center justify-center">
      <svg
        viewBox="0 0 300 350"
        className="w-full h-full max-h-[310px] select-none"
        id="hangman-svg"
      >
        {/* --- STATIC GALLOWS (Beautiful wooden-charcoal style) --- */}
        {/* Ground/Base */}
        <line
          x1="30"
          y1="320"
          x2="230"
          y2="320"
          id="gallows-base"
          className="stroke-stone-700 dark:stroke-stone-300 stroke-[8] stroke-linecap-round"
        />

        {/* Vertical Post */}
        <line
          x1="90"
          y1="320"
          x2="90"
          y2="40"
          id="gallows-post"
          className="stroke-stone-700 dark:stroke-stone-300 stroke-[8] stroke-linecap-round"
        />

        {/* Horizontal Beam */}
        <line
          x1="86"
          y1="44"
          x2="194"
          y2="44"
          id="gallows-beam"
          className="stroke-stone-700 dark:stroke-stone-300 stroke-[8] stroke-linecap-round"
        />

        {/* Diagonal Support Strut */}
        <line
          x1="90"
          y1="100"
          x2="140"
          y2="44"
          id="gallows-strut"
          className="stroke-stone-700 dark:stroke-stone-300 stroke-[6] stroke-linecap-round"
        />

        {/* Rope / Noose */}
        <line
          x1="191"
          y1="44"
          x2="191"
          y2="120"
          id="gallows-rope"
          className="stroke-amber-800 dark:stroke-amber-600 stroke-[3.5] stroke-linecap-round"
        />

        {/* Hanger Noose Ring */}
        <circle
          cx="191"
          cy="121"
          r="4"
          id="gallows-noose-ring"
          className="fill-amber-950 stroke-none"
        />

        {/* --- DYNAMIC DECIPHER CHARACTER (With rotation group for a gentle swinging motion when active/lost) --- */}
        <g 
          className={`transition-transform duration-1000 ${
            misses >= 1 && !hasWon ? 'animate-swing' : ''
          }`}
          style={{ transformOrigin: '191px 120px' }}
        >
          {/* Render individual child parts */}
          {renderHead}
          {renderTorso}
          {renderLeftArm}
          {renderRightArm}
          {renderLeftLeg}
          {renderRightLeg}
          {renderLossFace}
          {renderActiveFace}
          {renderWonFace}
        </g>
      </svg>
    </div>
  );
}
