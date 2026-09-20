import React from 'react';
import { Sparkles, Edit3 } from 'lucide-react';

export type InnovaLogoStyle = 'shield' | 'hexagon' | 'orbit' | 'monogram' | 'custom';

export interface InnovaLogoProps {
  variant?: 'full' | 'stacked' | 'shield' | 'horizontal' | 'compact';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  textColor?: 'light' | 'dark' | 'auto';
  customLogo?: string;
  logoStyle?: InnovaLogoStyle;
  className?: string;
  editable?: boolean;
  onOpenCustomizer?: () => void;
  brandTitle?: string;
}

export default function InnovaLogo({
  variant = 'full',
  size = 'md',
  textColor = 'auto',
  customLogo,
  logoStyle = 'shield',
  className = '',
  editable = false,
  onOpenCustomizer,
  brandTitle
}: InnovaLogoProps) {
  // Dimension definitions for the emblem
  const shieldDimensions = {
    xs: 28,
    sm: 38,
    md: 48,
    lg: 60,
    xl: 78
  };

  const currentSize = shieldDimensions[size] || 48;

  // 1. Bouclier & Engrenage Émeraude (Vector Shield with Emerald Gear & Monogram - Strictly without ADMIN)
  const ShieldEmblem = (
    <svg 
      width={currentSize} 
      height={currentSize} 
      viewBox="0 0 240 240" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 drop-shadow-sm transition-transform duration-200 group-hover:scale-105"
    >
      {/* 1. Emerald Green Industrial Gear */}
      <g stroke="#00b074" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M 148 42 A 76 76 0 0 1 208 106 A 76 76 0 0 1 182 162" />
        <line x1="150" y1="36" x2="158" y2="24" />
        <line x1="178" y1="52" x2="190" y2="42" />
        <line x1="198" y1="76" x2="214" y2="70" />
        <line x1="208" y1="106" x2="224" y2="106" />
        <line x1="202" y1="134" x2="216" y2="140" />
        <line x1="184" y1="158" x2="196" y2="168" />
        <line x1="160" y1="178" x2="168" y2="192" />
      </g>

      {/* 2. Main Dark Navy Shield Body */}
      <path 
        d="M 120 22 
           C 180 22, 200 38, 200 88 
           C 200 152, 158 206, 120 226 
           C 82 206, 40 152, 40 88 
           C 40 38, 60 22, 120 22 Z" 
        fill="#072448" 
      />

      {/* 3. Inner Crisp White Shield Contour */}
      <path 
        d="M 120 34 
           C 168 34, 186 46, 186 88 
           C 186 142, 150 190, 120 208 
           C 90 190, 54 142, 54 88 
           C 54 46, 72 34, 120 34 Z" 
        fill="none" 
        stroke="#ffffff" 
        strokeWidth="4" 
        strokeLinejoin="round"
        strokeOpacity="0.95"
      />

      {/* 4. Inside Infographic Elements */}
      <g>
        <rect x="146" y="72" width="7" height="15" rx="1.5" fill="#00b074" />
        <rect x="158" y="64" width="7" height="23" rx="1.5" fill="#00b074" />
        <rect x="170" y="56" width="7" height="31" rx="1.5" fill="#00b074" />
        <line x1="144" y1="96" x2="182" y2="96" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="150" y1="105" x2="182" y2="105" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="166" cy="130" r="13" fill="#ffffff" />
        <path d="M 166 130 L 166 117 A 13 13 0 0 1 179 130 Z" fill="#072448" />
      </g>

      {/* 5. Stylized White Monogram */}
      <path 
        d="M 120 44 L 158 168 L 134 168 L 125 136 L 86 136 L 66 154 L 84 102 L 104 44 Z" 
        fill="#ffffff" 
      />
      <polygon points="84,133 136,133 144,156 72,156" fill="#00b074" />
      <polygon points="116,66 100,118 128,118" fill="#072448" />
    </svg>
  );

  // 2. Hexagone Cyber-Fintech (Modern Geometric Hexagon with Emerald Neon Accents)
  const HexagonEmblem = (
    <svg 
      width={currentSize} 
      height={currentSize} 
      viewBox="0 0 240 240" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 drop-shadow-sm transition-transform duration-200 group-hover:scale-105"
    >
      <defs>
        <linearGradient id="hexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#081e3d" />
          <stop offset="100%" stopColor="#030d1d" />
        </linearGradient>
        <linearGradient id="emeraldNeon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#00e676" />
        </linearGradient>
      </defs>
      {/* Outer Hexagon outline with rounded aesthetic */}
      <path 
        d="M 120 18 L 208 68 L 208 172 L 120 222 L 32 172 L 32 68 Z" 
        fill="url(#hexGrad)" 
        stroke="url(#emeraldNeon)" 
        strokeWidth="7" 
        strokeLinejoin="round" 
      />
      {/* Inner glowing core */}
      <path 
        d="M 120 38 L 190 78 L 190 162 L 120 202 L 50 162 L 50 78 Z" 
        fill="#071b34" 
        stroke="#38bdf8" 
        strokeWidth="2.5" 
        strokeOpacity="0.6"
        strokeLinejoin="round" 
      />
      {/* Dynamic Smart POS Monogram & Circuit Nodes */}
      <circle cx="120" cy="72" r="7" fill="#00e676" />
      <path d="M 120 79 L 120 115 M 120 115 L 85 138 M 120 115 L 155 138" stroke="#00e676" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="85" cy="138" r="6" fill="#38bdf8" />
      <circle cx="155" cy="138" r="6" fill="#38bdf8" />
      {/* Base POS register speed chevron */}
      <path d="M 82 172 L 120 152 L 158 172" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  // 3. Orbite Dynamique Retail (Dual Orbital Arc with Central Speed Core)
  const OrbitEmblem = (
    <svg 
      width={currentSize} 
      height={currentSize} 
      viewBox="0 0 240 240" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 drop-shadow-sm transition-transform duration-200 group-hover:scale-105"
    >
      <defs>
        <linearGradient id="orbBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0b1e36" />
          <stop offset="100%" stopColor="#05101e" />
        </linearGradient>
        <linearGradient id="orbGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00e676" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
      </defs>
      <rect width="240" height="240" rx="60" fill="url(#orbBg)" stroke="#1e3a5f" strokeWidth="4" />
      {/* Outer Speed Rings */}
      <circle cx="120" cy="120" r="88" stroke="url(#orbGlow)" strokeWidth="6" strokeDasharray="180 50" strokeLinecap="round" />
      <circle cx="120" cy="120" r="70" stroke="#38bdf8" strokeWidth="3.5" strokeDasharray="90 60" strokeLinecap="round" opacity="0.7" />
      {/* Central Flash & Letter I */}
      <path d="M 102 78 L 138 78 M 120 78 L 120 162 M 102 162 L 138 162" stroke="#ffffff" strokeWidth="12" strokeLinecap="round" />
      {/* Emerald Energy Satellite */}
      <circle cx="182" cy="74" r="10" fill="#00e676" />
      <circle cx="58" cy="166" r="8" fill="#38bdf8" />
    </svg>
  );

  // 4. Monogramme Épuré Minimaliste
  const MonogramEmblem = (
    <div 
      style={{ width: currentSize, height: currentSize }}
      className="rounded-xl bg-gradient-to-br from-[#0a2342] to-[#041122] border-2 border-emerald-500/40 flex items-center justify-center shadow-md shrink-0 relative overflow-hidden group-hover:border-emerald-400 transition-all"
    >
      <div className="absolute -top-3 -right-3 w-8 h-8 bg-emerald-500/20 rounded-full blur-sm"></div>
      <div className="flex items-center font-black font-display text-white tracking-tighter">
        <span className="text-emerald-400 text-lg sm:text-xl font-black">I</span>
        <span className="text-white text-base sm:text-lg font-bold">P</span>
      </div>
    </div>
  );

  // Determine which emblem to render based on props & custom logo
  const renderEmblem = () => {
    // If a custom logo image / data URL / URL is provided and valid
    if (customLogo && (customLogo.startsWith('data:') || customLogo.startsWith('http') || customLogo.startsWith('/') || customLogo.includes('.'))) {
      return (
        <div 
          style={{ width: currentSize, height: currentSize }} 
          className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-700/60 flex items-center justify-center shrink-0 shadow-md transition-transform group-hover:scale-105"
        >
          <img 
            src={customLogo} 
            alt="Logo INNOVA POS" 
            className="w-full h-full object-contain p-1"
            referrerPolicy="no-referrer"
          />
        </div>
      );
    }

    // Select emblem by logoStyle
    switch (logoStyle) {
      case 'hexagon':
        return HexagonEmblem;
      case 'orbit':
        return OrbitEmblem;
      case 'monogram':
        return MonogramEmblem;
      case 'shield':
      default:
        return ShieldEmblem;
    }
  };

  const selectedEmblem = renderEmblem();

  // If only the emblem is requested
  if (variant === 'shield') {
    return (
      <div 
        onClick={editable && onOpenCustomizer ? onOpenCustomizer : undefined}
        className={`inline-flex items-center justify-center relative group ${editable ? 'cursor-pointer' : ''} ${className}`}
        title={editable ? 'Cliquer pour changer le logo INNOVA POS' : undefined}
      >
        {selectedEmblem}
        {editable && (
          <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
            <Edit3 className="w-2.5 h-2.5" />
          </span>
        )}
      </div>
    );
  }

  // Text color styling based on background context
  const innovaColor = textColor === 'light' 
    ? 'text-white' 
    : textColor === 'dark' 
    ? 'text-[#072448]' 
    : 'text-[#072448] dark:text-white';

  const proColor = textColor === 'light'
    ? 'text-slate-100'
    : textColor === 'dark'
    ? 'text-[#072448]'
    : 'text-[#072448] dark:text-slate-100';

  // Stacked / Centered layout (Emblem on top, text below)
  if (variant === 'stacked') {
    return (
      <div 
        onClick={editable && onOpenCustomizer ? onOpenCustomizer : undefined}
        className={`inline-flex flex-col items-center select-none group relative ${editable ? 'cursor-pointer' : ''} ${className}`}
        title={editable ? 'Cliquer pour changer le logo INNOVA POS' : undefined}
      >
        <div className="relative">
          {selectedEmblem}
          {editable && (
            <span className="absolute -top-1 -right-1 bg-emerald-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
              <Edit3 className="w-3 h-3" />
            </span>
          )}
        </div>
        
        <div className="flex flex-col items-center text-center mt-2 leading-none">
          {/* Row 1: INNOVA or Custom Brand Title */}
          <div className="flex items-center tracking-tight">
            <span className={`font-black font-display tracking-tight uppercase ${innovaColor} ${
              size === 'xs' ? 'text-sm' : size === 'sm' ? 'text-base' : size === 'md' ? 'text-xl' : size === 'lg' ? 'text-2xl' : 'text-3xl'
            }`}>
              {brandTitle ? brandTitle : 'INNOV'}
            </span>
            {!brandTitle && (
              <svg 
                className={`inline-block ${
                  size === 'xs' ? 'w-3 h-3' : size === 'sm' ? 'w-3.5 h-3.5' : size === 'md' ? 'w-4.5 h-4.5' : size === 'lg' ? 'w-6 h-6' : 'w-7 h-7'
                }`} 
                viewBox="0 0 40 40" 
                fill="none"
              >
                <path d="M 6 36 L 20 6 L 34 36 L 26 36 L 20 18 L 14 36 Z" fill="#00b074" />
              </svg>
            )}
          </div>

          {/* Row 2: POS PRO */}
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`font-black uppercase tracking-widest text-[#00b074] ${
              size === 'xs' ? 'text-[9px]' : size === 'sm' ? 'text-[10px]' : size === 'md' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-base'
            }`}>
              POS
            </span>
            <span className={`font-black uppercase tracking-widest ${proColor} ${
              size === 'xs' ? 'text-[9px]' : size === 'sm' ? 'text-[10px]' : size === 'md' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-base'
            }`}>
              PRO
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Horizontal layout (Default 'full' & 'horizontal' & 'compact')
  return (
    <div 
      onClick={editable && onOpenCustomizer ? onOpenCustomizer : undefined}
      className={`inline-flex items-center gap-2.5 select-none group relative ${editable ? 'cursor-pointer hover:opacity-95' : ''} ${className}`}
      title={editable ? 'Cliquer pour changer le logo INNOVA POS' : undefined}
    >
      <div className="relative">
        {selectedEmblem}
        {editable && (
          <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
            <Edit3 className="w-2.5 h-2.5" />
          </span>
        )}
      </div>
      
      <div className="flex flex-col text-start leading-none justify-center">
        {/* Row 1: INNOVA or Custom Brand Title */}
        <div className="flex items-center">
          <span className={`font-black tracking-tight font-display uppercase ${innovaColor} ${
            size === 'xs' ? 'text-xs' : size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : size === 'lg' ? 'text-xl' : 'text-2xl'
          }`}>
            {brandTitle ? brandTitle : 'INNOV'}
          </span>
          {!brandTitle && (
            <svg 
              className={`inline-block ${
                size === 'xs' ? 'w-2.5 h-2.5' : size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-4.5 h-4.5' : 'w-6 h-6'
              }`} 
              viewBox="0 0 40 40" 
              fill="none"
            >
              <path d="M 6 36 L 20 6 L 34 36 L 26 36 L 20 18 L 14 36 Z" fill="#00b074" />
            </svg>
          )}
        </div>

        {/* Row 2: POS PRO (POS in emerald green, PRO in navy/white) */}
        <div className="flex items-center gap-1 mt-0.5">
          <span className={`font-black tracking-wider uppercase text-[#00b074] ${
            size === 'xs' ? 'text-[9px]' : size === 'sm' ? 'text-[11px]' : size === 'md' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-base'
          }`}>
            POS
          </span>
          <span className={`font-black tracking-wider uppercase ${proColor} ${
            size === 'xs' ? 'text-[9px]' : size === 'sm' ? 'text-[11px]' : size === 'md' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-base'
          }`}>
            PRO
          </span>
        </div>
      </div>
    </div>
  );
}
