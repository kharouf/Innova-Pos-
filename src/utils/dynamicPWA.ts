/**
 * Dynamic PWA & Favicon updater for INNOVA POS
 * Dynamically updates document.title, favicon (<link rel="icon">),
 * Apple Touch Icon (<link rel="apple-touch-icon">), and PWA Web Manifest (<link rel="manifest">)
 * so that when the application is installed on Mobile (iOS/Android) or PC (Chrome/Edge/Desktop),
 * it displays the custom Store Logo and Name.
 */

let dynamicManifestBlobUrl: string | null = null;

/**
 * Converts an Emoji character into a high-resolution PNG Data URL via HTML5 Canvas.
 */
export function emojiToIconDataUrl(emoji: string, size = 192): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Background circle/rounded rect with dark slate background
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, size * 0.22);
    ctx.fill();

    // Emoji centered
    ctx.font = `${Math.floor(size * 0.58)}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, size / 2, size / 2 + (size * 0.04));

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.debug('Failed to render emoji icon to canvas:', err);
    return '';
  }
}

/**
 * Updates all browser and PWA icons and metadata in real-time.
 */
export function updateDynamicAppBranding(storeName?: string, storeLogo?: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const appName = (storeName && storeName.trim()) ? storeName.trim() : 'INNOVA POS PRO';
  const shortName = (storeName && storeName.trim()) ? storeName.trim().substring(0, 15) : 'InnovaPOS';

  // 1. Update Document Title
  document.title = `${appName} - INNOVA POS`;

  // 2. Determine the icon URL to use
  let iconHref = '/app-icon.svg';
  let iconType = 'image/svg+xml';

  if (storeLogo && storeLogo.trim()) {
    const cleanLogo = storeLogo.trim();
    if (cleanLogo.startsWith('data:image/svg+xml')) {
      iconHref = cleanLogo;
      iconType = 'image/svg+xml';
    } else if (cleanLogo.startsWith('data:image/')) {
      iconHref = cleanLogo;
      iconType = 'image/png';
    } else if (cleanLogo.startsWith('http') || cleanLogo.startsWith('/')) {
      iconHref = cleanLogo;
      iconType = cleanLogo.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
    } else if (cleanLogo.length <= 8) {
      // It's an emoji (e.g. '🛒', '🥐', '💊')
      const renderedEmojiUrl = emojiToIconDataUrl(cleanLogo, 192);
      if (renderedEmojiUrl) {
        iconHref = renderedEmojiUrl;
        iconType = 'image/png';
      }
    }
  }

  // 3. Update or create Favicon <link rel="icon">
  let faviconLink = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!faviconLink) {
    faviconLink = document.createElement('link');
    faviconLink.rel = 'icon';
    document.head.appendChild(faviconLink);
  }
  faviconLink.type = iconType;
  faviconLink.href = iconHref;

  // 4. Update or create Apple Touch Icon <link rel="apple-touch-icon"> for iOS homescreen
  let appleTouchLink = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
  if (!appleTouchLink) {
    appleTouchLink = document.createElement('link');
    appleTouchLink.rel = 'apple-touch-icon';
    document.head.appendChild(appleTouchLink);
  }
  appleTouchLink.href = iconHref;

  // 5. Update dynamic Web App Manifest for mobile and PC install dialogs
  try {
    const manifestJson = {
      name: appName,
      short_name: shortName,
      description: `Point de Vente & Gestion Commerciale - ${appName}`,
      start_url: "/",
      display: "standalone",
      background_color: "#0f172a",
      theme_color: "#0f172a",
      orientation: "portrait",
      icons: [
        {
          src: iconHref,
          sizes: "192x192 512x512",
          type: iconType
        },
        {
          src: iconHref,
          sizes: "any",
          type: iconType,
          purpose: "any maskable"
        }
      ],
      categories: ["business", "finance", "productivity"]
    };

    const manifestBlob = new Blob([JSON.stringify(manifestJson)], { type: 'application/json' });
    if (dynamicManifestBlobUrl) {
      URL.revokeObjectURL(dynamicManifestBlobUrl);
    }
    dynamicManifestBlobUrl = URL.createObjectURL(manifestBlob);

    let manifestLink = document.querySelector<HTMLLinkElement>("link[rel='manifest']");
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }
    manifestLink.href = dynamicManifestBlobUrl;
  } catch (err) {
    console.debug('Dynamic manifest generation skipped:', err);
  }
}
