/**
 * Dynamic logo generator for Superettes.
 * Generates a high-quality, professional SVG logo matching the user's provided samples
 * (e.g., green/red circular curves, customized big initial letter, detailed grocery cart,
 * elegant horizontal separator lines, split-color brand name text, dual tapered underlines,
 * and a cursive slogan: "Proche de vous, chaque jour !").
 */

interface LogoOptions {
  tagline?: string;
  primaryColor?: string; // e.g. green '#007d32'
  secondaryColor?: string; // e.g. red '#d61c22'
  includeWhiteBg?: boolean; // Whether to include a solid white canvas for contrast
}

/**
 * Extracts the primary brand word from a full store name.
 * e.g., "Supérette Touati" -> "TOUATI", "Kharouf Super Market" -> "KHAROUF"
 */
export function extractBrandName(storeName: string): string {
  if (!storeName || !storeName.trim()) return 'COMMERCE';
  
  const cleanName = storeName.trim();
  
  // Regex to match "Superette", "Supérette", "Supperette", "Supperet", "Alimentation", "Epicerie", "Épicerie" at the beginning, case-insensitive
  // with optional trailing spaces, hyphen, apostrophe or symbols
  const prefixRegex = /^(sup[eé]ret[t]?e?|supperet[t]?e?|alimentation|épicerie|epicerie|magasin|mini)\s*['-]?\s*/i;
  
  let brand = cleanName.replace(prefixRegex, '');
  
  // If the entire name was removed (e.g. user just typed "Supérette"), restore it
  if (!brand.trim()) {
    brand = cleanName;
  }
  
  return brand.trim().toUpperCase();
}

/**
 * Generates a clean, fully customized SVG string as a Data URL.
 */
export function generateSuperetteLogo(storeName: string, options: LogoOptions = {}): string {
  const brandName = extractBrandName(storeName);
  const firstLetter = brandName.charAt(0) || 'S';
  
  const tagline = options.tagline || 'Proche de vous, chaque jour !';
  const green = options.primaryColor || '#007d32';
  const red = options.secondaryColor || '#d61c22';
  const includeBg = options.includeWhiteBg ?? true;
  
  // Adjust font size dynamically to fit the brand name nicely inside the viewport
  let brandFontSize = 72;
  let brandLetterSpacing = 2;
  if (brandName.length > 10) {
    brandFontSize = Math.max(34, Math.floor(720 / brandName.length));
    brandLetterSpacing = 1;
  } else if (brandName.length > 6) {
    brandFontSize = Math.max(48, Math.floor(640 / brandName.length));
  }

  // Create the inline SVG string
  const svgString = `
<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Google Fonts import for premium typography -->
    <style type="text/css">
      @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@700&amp;family=Montserrat:ital,wght@0,800;0,900;1,900&amp;display=swap');
      
      .text-sup {
        font-family: 'Montserrat', sans-serif;
        font-weight: 800;
        font-size: 26px;
        fill: #004b1e;
        letter-spacing: 5px;
      }
      .text-brand {
        font-family: 'Montserrat', sans-serif;
        font-weight: 900;
        font-style: italic;
        text-anchor: middle;
      }
      .text-tagline {
        font-family: 'Caveat', cursive, 'Brush Script MT', sans-serif;
        font-weight: 700;
        font-size: 28px;
        fill: ${red};
        text-anchor: middle;
      }
      .text-initial {
        font-family: 'Montserrat', sans-serif;
        font-weight: 900;
        font-style: italic;
      }
    </style>
    
    <!-- Gradients -->
    <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${green}" />
      <stop offset="100%" stop-color="#004b1e" />
    </linearGradient>
    
    <!-- Split Gradient for the brand text: Left half green, Right half red -->
    <linearGradient id="splitGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="50%" stop-color="${green}" />
      <stop offset="50%" stop-color="${red}" />
    </linearGradient>
  </defs>

  ${includeBg ? `<rect width="512" height="512" fill="#ffffff" rx="32" />` : ''}

  <!-- BACKGROUND CIRCLE SWOOSHES -->
  <!-- Top green swoop -->
  <path d="M 150 135 C 190 50, 370 50, 420 135" fill="none" stroke="${green}" stroke-width="8" stroke-linecap="round" />
  <!-- Bottom red swoop -->
  <path d="M 405 175 C 445 255, 410 330, 310 355" fill="none" stroke="${red}" stroke-width="6" stroke-linecap="round" />

  <!-- LARGE BACKDROP INITIAL LETTER -->
  <g transform="translate(10, 5)">
    <!-- Red flanking shadow for 3D effect -->
    <text x="283" y="247" class="text-initial" font-size="195" fill="${red}" opacity="0.85">
      ${firstLetter}
    </text>
    <!-- Main green gradient letter -->
    <text x="275" y="245" class="text-initial" font-size="195" fill="url(#greenGrad)">
      ${firstLetter}
    </text>
  </g>

  <!-- THE DETAILED GROCERY SHOPPING CART (LEFT FOREGROUND) -->
  <g id="shopping-cart" transform="translate(25, 10)">
    <!-- Groceries (Rendered behind cart basket wires but in front of letter) -->
    <!-- Lettuce (Green Leaves) -->
    <path d="M 148 160 C 135 140, 138 115, 153 115 C 168 115, 172 135, 168 160 Z" fill="#4caf50" />
    <path d="M 136 150 C 122 135, 125 120, 136 118 C 146 116, 150 132, 148 150 Z" fill="#81c784" />
    <!-- Salad Details -->
    <path d="M 150 155 C 145 140, 142 125, 148 120" fill="none" stroke="#2e7d32" stroke-width="2" />
    <path d="M 158 150 C 158 135, 162 128, 165 130" fill="none" stroke="#2e7d32" stroke-width="2" />

    <!-- Ketchup Bottle (Red) -->
    <path d="M 172 165 L 172 128 C 172 122, 178 122, 178 112 L 188 112 C 188 122, 194 122, 194 128 L 194 165 Z" fill="${red}" />
    <rect x="179" y="107" width="8" height="5" rx="1.5" fill="#ffd54f" />
    <rect x="174" y="132" width="18" height="18" fill="#ffffff" opacity="0.9" rx="1" />
    <circle cx="183" cy="141" r="3" fill="${red}" />

    <!-- Juice Bottle (Yellow) -->
    <path d="M 198 170 L 195 138 C 195 135, 201 133, 201 128 L 210 128 C 210 133, 216 135, 216 138 L 213 170 Z" fill="#ffb300" />
    <rect x="202" y="124" width="7" height="4" rx="1" fill="#4caf50" /> <!-- green cap -->

    <!-- Bread / Baguette (Golden brown) -->
    <g transform="rotate(28 225 145)">
      <rect x="210" y="110" width="24" height="65" rx="12" fill="#d7ccc8" stroke="#8d6e63" stroke-width="1.5" />
      <line x1="216" y1="122" x2="228" y2="128" stroke="#8d6e63" stroke-width="3.5" stroke-linecap="round" />
      <line x1="220" y1="137" x2="232" y2="143" stroke="#8d6e63" stroke-width="3.5" stroke-linecap="round" />
      <line x1="224" y1="152" x2="236" y2="158" stroke="#8d6e63" stroke-width="3.5" stroke-linecap="round" />
    </g>

    <!-- Shopping Cart Wire Frame -->
    <!-- Green Handle -->
    <path d="M 95 140 L 125 145 L 132 165" fill="none" stroke="${green}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" />
    
    <!-- Basket Outer Rim -->
    <path d="M 132 165 L 248 180 C 251 180, 252 183, 250 186 L 228 238 C 226 242, 222 242, 218 242 L 142 242 C 137 242, 133 238, 133 233 L 132 165 Z" fill="none" stroke="${green}" stroke-width="9" stroke-linejoin="round" />
    
    <!-- Grid wires (Vertical) -->
    <line x1="156" y1="168" x2="160" y2="242" stroke="${green}" stroke-width="4.5" />
    <line x1="181" y1="171" x2="183" y2="242" stroke="${green}" stroke-width="4.5" />
    <line x1="206" y1="174" x2="204" y2="242" stroke="${green}" stroke-width="4.5" />
    <line x1="230" y1="178" x2="220" y2="240" stroke="${green}" stroke-width="4.5" />
    
    <!-- Grid wires (Horizontal) -->
    <line x1="132" y1="190" x2="244" y2="201" stroke="${green}" stroke-width="4.5" />
    <line x1="133" y1="215" x2="236" y2="222" stroke="${green}" stroke-width="4.5" />

    <!-- Lower chassis / support bars -->
    <path d="M 142 242 L 148 258 L 215 258" fill="none" stroke="${green}" stroke-width="9.5" stroke-linecap="round" stroke-linejoin="round" />

    <!-- Shiny Wheels -->
    <circle cx="154" cy="274" r="14" fill="#004b1e" stroke="${green}" stroke-width="4" />
    <circle cx="154" cy="274" r="5" fill="#ffffff" />
    <circle cx="206" cy="274" r="14" fill="#004b1e" stroke="${green}" stroke-width="4" />
    <circle cx="206" cy="274" r="5" fill="#ffffff" />
  </g>

  <!-- MID-LINE BRAND SEPARATOR -->
  <g transform="translate(0, 10)">
    <!-- Left horizontal line -->
    <line x1="45" y1="341" x2="165" y2="341" stroke="${green}" stroke-width="4" stroke-linecap="round" />
    <!-- Middle "SUPÉRETTE" label -->
    <text x="256" y="350" class="text-sup" text-anchor="middle">SUPÉRETTE</text>
    <!-- Right horizontal line -->
    <line x1="347" y1="341" x2="467" y2="341" stroke="${green}" stroke-width="4" stroke-linecap="round" />
  </g>

  <!-- MAIN BRAND TEXT WITH SPLIT COLOR (GREEN/RED) -->
  <text x="256" y="426" class="text-brand" font-size="${brandFontSize}" fill="url(#splitGrad)" letter-spacing="${brandLetterSpacing}">
    ${brandName}
  </text>

  <!-- DUAL SWOOSH UNDERLINES (GREEN & RED TAPERED COVERS) -->
  <!-- Green Swoosh Underline -->
  <path d="M 75 448 Q 256 476 437 448 Q 256 461 75 448" fill="${green}" />
  <!-- Red Swoosh Underline -->
  <path d="M 95 454 Q 256 480 417 454 Q 256 465 95 454" fill="${red}" />

  <!-- TAGLINE / SLOGAN -->
  <text x="256" y="492" class="text-tagline">
    ${tagline}
  </text>
</svg>
`.trim();

  // Return the SVG as a Data URL
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
}
