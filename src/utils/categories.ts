import { Product } from '../types';

export interface CategoryDefinition {
  id: string;
  nameFr: string;
  nameAr: string;
  fullName: string;
  icon: string;
  color: string;
  badgeBg: string;
  badgeText: string;
}

export const CANONICAL_CATEGORIES: CategoryDefinition[] = [
  {
    id: 'boissons',
    nameFr: 'Boissons & Eaux',
    nameAr: 'مشروبات ومياه',
    fullName: 'Boissons / مشروبات',
    icon: '🥤',
    color: 'sky',
    badgeBg: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    badgeText: 'text-sky-700 dark:text-sky-300'
  },
  {
    id: 'produits_laitiers',
    nameFr: 'Produits Laitiers',
    nameAr: 'مشتقات الحليب والألبان',
    fullName: 'Produits Laitiers',
    icon: '🥛',
    color: 'blue',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    badgeText: 'text-blue-700 dark:text-blue-300'
  },
  {
    id: 'cereales_pates',
    nameFr: 'Céréales & Pâtes',
    nameAr: 'عجائن وكسكسي',
    fullName: 'Céréales & Pâtes',
    icon: '🍝',
    color: 'amber',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    badgeText: 'text-amber-700 dark:text-amber-300'
  },
  {
    id: 'conserves_epicerie',
    nameFr: 'Conserves & Épicerie',
    nameAr: 'مصبرات ومواد غذائية',
    fullName: 'Conserves & Épicerie',
    icon: '🥫',
    color: 'rose',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    badgeText: 'text-rose-700 dark:text-rose-300'
  },
  {
    id: 'huiles_epices',
    nameFr: 'Huiles & Épices',
    nameAr: 'زيوت وتوابل',
    fullName: 'Huiles & Épices',
    icon: '🫒',
    color: 'emerald',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    badgeText: 'text-emerald-700 dark:text-emerald-300'
  },
  {
    id: 'cafe_the_biscuits',
    nameFr: 'Café, Thé & Biscuits',
    nameAr: 'قهوة، شاي وحلويات',
    fullName: 'Café, Thé & Biscuits',
    icon: '☕',
    color: 'yellow',
    badgeBg: 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
    badgeText: 'text-yellow-800 dark:text-yellow-300'
  },
  {
    id: 'hygiene_nettoyage',
    nameFr: 'Hygiène & Nettoyage',
    nameAr: 'مواد التنظيف والنظافة',
    fullName: 'Hygiène & Nettoyage',
    icon: '🧼',
    color: 'teal',
    badgeBg: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    badgeText: 'text-teal-700 dark:text-teal-300'
  },
  {
    id: 'tabac',
    nameFr: 'Tabac & Cigarettes',
    nameAr: 'سجائر ودخان',
    fullName: 'Tabac / دخان',
    icon: '🚬',
    color: 'zinc',
    badgeBg: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
    badgeText: 'text-zinc-700 dark:text-zinc-300'
  },
  {
    id: 'carburant',
    nameFr: 'Carburant & Essence',
    nameAr: 'بنزين ومحروقات',
    fullName: 'Carburant / بنزين',
    icon: '⛽',
    color: 'violet',
    badgeBg: 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800',
    badgeText: 'text-violet-700 dark:text-violet-300'
  },
  {
    id: 'recharge_telecom',
    nameFr: 'Recharge Télécom',
    nameAr: 'تذاكر شحن الهاتف',
    fullName: 'Recharge & Télécom',
    icon: '📱',
    color: 'indigo',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    badgeText: 'text-indigo-700 dark:text-indigo-300'
  },
  {
    id: 'boulangerie_patisserie',
    nameFr: 'Boulangerie & Pâtisserie',
    nameAr: 'مخبزة وحلويات',
    fullName: 'Boulangerie & Pâtisserie',
    icon: '🥐',
    color: 'orange',
    badgeBg: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    badgeText: 'text-orange-700 dark:text-orange-300'
  },
  {
    id: 'fruits_legumes',
    nameFr: 'Fruits & Légumes',
    nameAr: 'خضر وغلال',
    fullName: 'Fruits & Légumes',
    icon: '🍎',
    color: 'lime',
    badgeBg: 'bg-lime-50 dark:bg-lime-950/40 text-lime-700 dark:text-lime-300 border-lime-200 dark:border-lime-800',
    badgeText: 'text-lime-700 dark:text-lime-300'
  },
  {
    id: 'viandes_poissons',
    nameFr: 'Viandes & Poissons',
    nameAr: 'لحوم وأسماك',
    fullName: 'Viandes & Poissons',
    icon: '🥩',
    color: 'red',
    badgeBg: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    badgeText: 'text-red-700 dark:text-red-300'
  },
  {
    id: 'produits_professionnels',
    nameFr: 'Produits Professionnels',
    nameAr: 'مستلزمات مهنية',
    fullName: 'Produits Professionnels',
    icon: '📦',
    color: 'purple',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    badgeText: 'text-purple-700 dark:text-purple-300'
  },
  {
    id: 'general',
    nameFr: 'Général / Divers',
    nameAr: 'عام ومتنوع',
    fullName: 'Général',
    icon: '📁',
    color: 'slate',
    badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    badgeText: 'text-slate-700 dark:text-slate-300'
  }
];

/**
 * Normalizes any category string into its canonical counterpart, eliminating all duplicates
 * such as "Boissons", "boisson", "boisson مشروبات" -> "Boissons / مشروبات",
 * "Pâtes", "Couscous" -> "Céréales & Pâtes", etc.
 */
export function normalizeCategoryName(raw?: string): string {
  if (!raw || typeof raw !== 'string') return 'Général';
  const trimmed = raw.trim();
  if (!trimmed) return 'Général';

  const lower = trimmed.toLowerCase();

  // 1. Boissons / مشروبات (Handles "boisson", "boissons", "boisson مشروبات", "Boissons / مشروبات", "eaux", "eau minerale", "soda", "jus")
  if (
    lower.includes('boisson') ||
    lower.includes('مشروب') ||
    lower.includes('مياه') ||
    lower.includes('eau min') ||
    lower.includes('eau ') ||
    lower === 'eau' ||
    lower === 'eaux' ||
    lower.includes('soda') ||
    lower.includes('jus') ||
    lower.includes('jus & boisson') ||
    lower.includes('boisson fra') ||
    lower.includes('عصير')
  ) {
    return 'Boissons / مشروبات';
  }

  // 2. Produits Laitiers (Handles "Produits Laitiers", "produits laitiers", "laitier", "lait", "fromage", "yaourt", "حليب")
  if (
    lower.includes('lait') ||
    lower.includes('fromage') ||
    lower.includes('yaourt') ||
    lower.includes('yogurt') ||
    lower.includes('raieb') ||
    lower.includes('leben') ||
    lower.includes('margarine') ||
    lower.includes('beurre') ||
    lower.includes('حليب') ||
    lower.includes('لبن') ||
    lower.includes('رايب') ||
    lower.includes('جبن') ||
    lower.includes('ياغورت') ||
    lower.includes('مشتقات الحليب')
  ) {
    return 'Produits Laitiers';
  }

  // 3. Céréales & Pâtes (Handles "Pâtes", "pates", "couscous", "céréales & pâtes", "spaghetti", "semoule", "farine", "عجين")
  if (
    lower.includes('pâte') ||
    lower.includes('pate') ||
    lower.includes('spaghetti') ||
    lower.includes('macaroni') ||
    lower.includes('couscous') ||
    lower.includes('semoule') ||
    lower.includes('farine') ||
    lower.includes('céréale') ||
    lower.includes('cereale') ||
    lower.includes('عجين') ||
    lower.includes('كسكسي') ||
    lower.includes('معكرونة') ||
    lower.includes('سباغيتي') ||
    lower.includes('سميد') ||
    lower.includes('فارينة') ||
    lower.includes('طحين')
  ) {
    return 'Céréales & Pâtes';
  }

  // 4. Conserves & Épicerie (Handles "Conserves", "Épicerie", "Conserves & Épicerie", "harissa", "thon", "tomate", "مصبرات")
  if (
    lower.includes('conserve') ||
    lower.includes('harissa') ||
    lower.includes('thon') ||
    lower.includes('sardine') ||
    lower.includes('tomate double') ||
    lower.includes('concentré de tomate') ||
    lower.includes('double concentr') ||
    lower.includes('épicerie') ||
    lower.includes('epicerie') ||
    lower.includes('مصبرات') ||
    lower.includes('تصبير') ||
    lower.includes('هريسة') ||
    lower.includes('طماطم معلبة') ||
    lower.includes('تن') ||
    lower.includes('سردينة')
  ) {
    return 'Conserves & Épicerie';
  }

  // 5. Huiles & Épices (Handles "Huiles", "Épices", "Épices & Condiments", "Huiles & Épices", "sucre", "sel", "زيت", "توابل")
  if (
    lower.includes('huile') ||
    lower.includes('épice') ||
    lower.includes('epice') ||
    lower.includes('condiment') ||
    lower.includes('sucre') ||
    lower.includes('sel ') ||
    lower === 'sel' ||
    lower.includes('poivre') ||
    lower.includes('زيت') ||
    lower.includes('توابل') ||
    lower.includes('بهارات') ||
    lower.includes('سكر') ||
    lower.includes('ملح')
  ) {
    return 'Huiles & Épices';
  }

  // 6. Café, Thé & Biscuits (Handles "Café & Thé", "Biscuits", "Chocolat", "Chamia", "حلويات", "قهوة", "شاي")
  if (
    lower.includes('café') ||
    lower.includes('cafe') ||
    lower.includes('thé') ||
    lower.includes('the') ||
    lower.includes('biscuit') ||
    lower.includes('chocolat') ||
    lower.includes('chamia') ||
    lower.includes('confiserie') ||
    lower.includes('gaufrette') ||
    lower.includes('cake') ||
    lower.includes('قهوة') ||
    lower.includes('شاي') ||
    lower.includes('شامية') ||
    lower.includes('بسكويت') ||
    lower.includes('شوكولا') ||
    lower.includes('حلويات')
  ) {
    return 'Café, Thé & Biscuits';
  }

  // 7. Hygiène & Nettoyage (Handles "Hygiène", "Nettoyage", "Entretien", "Javel", "Lessive", "Omo", "Lilas", "مواد التنظيف")
  if (
    lower.includes('javel') ||
    lower.includes('lessive') ||
    lower.includes('omo') ||
    lower.includes('lilas') ||
    lower.includes('savon') ||
    lower.includes('shampoing') ||
    lower.includes('hygiène') ||
    lower.includes('hygiene') ||
    lower.includes('nettoyage') ||
    lower.includes('entretien') ||
    lower.includes('détergent') ||
    lower.includes('detergent') ||
    lower.includes('نظافة') ||
    lower.includes('تنظيف') ||
    lower.includes('جافيل') ||
    lower.includes('صابون') ||
    lower.includes('غسيل')
  ) {
    return 'Hygiène & Nettoyage';
  }

  // 8. Tabac / دخان
  if (
    lower.includes('tabac') ||
    lower.includes('cigarette') ||
    lower.includes('دخان') ||
    lower.includes('سجائر') ||
    lower.includes('تبغ')
  ) {
    return 'Tabac / دخان';
  }

  // 9. Carburant / بنزين
  if (
    lower.includes('carburant') ||
    lower.includes('benzine') ||
    lower.includes('essence') ||
    lower.includes('gasoil') ||
    lower.includes('بنزين') ||
    lower.includes('محروقات') ||
    lower.includes('مازوت')
  ) {
    return 'Carburant / بنزين';
  }

  // 10. Recharge & Télécom / شحن
  if (
    lower.includes('recharge') ||
    lower.includes('telecom') ||
    lower.includes('télécom') ||
    lower.includes('ooredoo') ||
    lower.includes('orange') ||
    lower.includes('شحن') ||
    lower.includes('تليكوم')
  ) {
    return 'Recharge & Télécom';
  }

  // 11. Boulangerie & Pâtisserie / مخبزة
  if (
    lower.includes('boulangerie') ||
    lower.includes('pâtisserie') ||
    lower.includes('patisserie') ||
    lower.includes('pain') ||
    lower.includes('croissant') ||
    lower.includes('مخبزة') ||
    lower.includes('خبز')
  ) {
    return 'Boulangerie & Pâtisserie';
  }

  // 12. Fruits & Légumes / خضر وغلال
  if (
    lower.includes('fruit') ||
    lower.includes('légume') ||
    lower.includes('legume') ||
    lower.includes('غلال') ||
    lower.includes('خضر') ||
    lower.includes('فواكه')
  ) {
    return 'Fruits & Légumes';
  }

  // 13. Viandes & Poissons / لحوم وأسماك
  if (
    lower.includes('viande') ||
    lower.includes('poisson') ||
    lower.includes('poulet') ||
    lower.includes('لحوم') ||
    lower.includes('لحم') ||
    lower.includes('سمك') ||
    lower.includes('دجاج')
  ) {
    return 'Viandes & Poissons';
  }

  // 14. Produits Professionnels / مستلزمات مهنية
  if (
    lower.includes('professionnel') ||
    lower.includes('sweet pastry') ||
    lower.includes('nawar') ||
    lower.includes('glacage') ||
    lower.includes('glaçage') ||
    lower.includes('fourrage') ||
    lower.includes('nappage') ||
    lower.includes('pâte à glacer') ||
    lower.includes('fondant') ||
    lower.includes('مهنية')
  ) {
    return 'Produits Professionnels';
  }

  // 15. General
  if (
    lower === 'général' ||
    lower === 'general' ||
    lower === 'autre' ||
    lower === 'autres' ||
    lower === 'divers' ||
    lower === 'عام' ||
    lower === 'غير مصنف'
  ) {
    return 'Général';
  }

  // If already an existing canonical string, return canonical
  const match = CANONICAL_CATEGORIES.find(
    c => c.fullName.toLowerCase() === lower || c.nameFr.toLowerCase() === lower || c.nameAr.toLowerCase() === lower
  );
  if (match) return match.fullName;

  return trimmed;
}

/**
 * Returns the icon and visual metadata associated with a given category.
 */
export function getCategoryMetadata(categoryName?: string): CategoryDefinition {
  const normalized = normalizeCategoryName(categoryName);
  const found = CANONICAL_CATEGORIES.find(c => c.fullName === normalized);
  if (found) return found;

  return {
    id: 'custom',
    nameFr: normalized,
    nameAr: normalized,
    fullName: normalized,
    icon: '📁',
    color: 'slate',
    badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    badgeText: 'text-slate-700 dark:text-slate-300'
  };
}

/**
 * Deduplicates and harmonizes all categories in a list of products.
 */
export function deduplicateProductsCategories(products: Product[]): {
  updatedProducts: Product[];
  changedCount: number;
} {
  let changedCount = 0;
  const updatedProducts = (products || []).map(p => {
    const canonical = normalizeCategoryName(p.category);
    if (p.category !== canonical) {
      changedCount++;
      return { ...p, category: canonical };
    }
    return p;
  });

  return { updatedProducts, changedCount };
}
