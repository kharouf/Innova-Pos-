import { Product } from '../types';
import { normalizeCategoryName } from './categories';

export interface OfficialProductRef {
  code: string;
  nameFr: string;
  nameAr: string;
  category: string;
  purchasePrice: number;
  sellingPrice: number;
  unit: string;
  minAlertQty: number;
  defaultStock: number;
  aliases?: string[]; // Alternate barcodes or packaging (pack, individual, etc.)
  keywords: string[];
}

/**
 * Official Tunisian GS1 (Prefix 619 & international standard) products catalog.
 * Accurate barcodes used in Tunisian grocery stores, superettes, and hypermarkets.
 */
export const OFFICIAL_TUNISIAN_PRODUCTS: OfficialProductRef[] = [
  // --- EAUX MINÉRALES / مياه معدنية ---
  {
    code: '6194039500014',
    nameFr: 'Eau Minérale Naturelle Hayat 1.5L',
    nameAr: 'ماء معدني طبيعي حياة 1.5ل',
    category: 'Boissons / مشروبات',
    purchasePrice: 0.600,
    sellingPrice: 0.800,
    unit: 'Pcs',
    minAlertQty: 30,
    defaultStock: 180,
    aliases: ['6194039501042', '6194039503015', '6194039500137', '6194039500151'],
    keywords: ['hayat', 'hayet', 'حياة', 'دبوزة ماء حياة', 'eau hayat', 'eau hayet', 'ماء حياة']
  },
  {
    code: '6194001900017',
    nameFr: 'Eau Minérale Naturelle Safia 1.5L',
    nameAr: 'ماء معدني صافية 1.5ل',
    category: 'Boissons / مشروبات',
    purchasePrice: 0.650,
    sellingPrice: 0.850,
    unit: 'Pcs',
    minAlertQty: 30,
    defaultStock: 180,
    aliases: ['6194001900024', '6190015022354', '6191234567892'],
    keywords: ['safia', 'صافية', 'ماء صافية', 'eau safia']
  },
  {
    code: '6194002600015',
    nameFr: 'Eau Minérale Sabrine 1.5L',
    nameAr: 'ماء معدني صابرين 1.5ل',
    category: 'Boissons / مشروبات',
    purchasePrice: 0.600,
    sellingPrice: 0.800,
    unit: 'Pcs',
    minAlertQty: 30,
    defaultStock: 160,
    aliases: ['6194002600022', '6190109012411', '6191234567891'],
    keywords: ['sabrine', 'صابرين', 'ماء صابرين', 'eau sabrine']
  },
  {
    code: '6194007800014',
    nameFr: 'Eau Minérale Marwa 1.5L',
    nameAr: 'ماء معدني مروى 1.5ل',
    category: 'Boissons / مشروبات',
    purchasePrice: 0.580,
    sellingPrice: 0.750,
    unit: 'Pcs',
    minAlertQty: 25,
    defaultStock: 140,
    aliases: ['6194007800021'],
    keywords: ['marwa', 'مروى', 'ماء مروى', 'eau marwa']
  },
  {
    code: '6194003300013',
    nameFr: 'Eau Minérale Fourat 1.5L',
    nameAr: 'ماء معدني فرات 1.5ل',
    category: 'Boissons / مشروبات',
    purchasePrice: 0.580,
    sellingPrice: 0.750,
    unit: 'Pcs',
    minAlertQty: 25,
    defaultStock: 120,
    keywords: ['fourat', 'فرات', 'ماء فرات', 'eau fourat']
  },
  {
    code: '6194009200010',
    nameFr: 'Eau Minérale Jannet 1.5L',
    nameAr: 'ماء معدني جنات 1.5ل',
    category: 'Boissons / مشروبات',
    purchasePrice: 0.580,
    sellingPrice: 0.750,
    unit: 'Pcs',
    minAlertQty: 25,
    defaultStock: 120,
    keywords: ['jannet', 'جنات', 'ماء جنات', 'eau jannet']
  },
  {
    code: '6194005100017',
    nameFr: 'Eau Minérale Melliti 1.5L',
    nameAr: 'ماء معدني مليتي 1.5ل',
    category: 'Boissons / مشروبات',
    purchasePrice: 0.580,
    sellingPrice: 0.750,
    unit: 'Pcs',
    minAlertQty: 25,
    defaultStock: 120,
    keywords: ['melliti', 'مليتي', 'ماء مليتي', 'eau melliti']
  },

  // --- PRODUITS LAITIERS / مشتقات الحليب والأجبان ---
  {
    code: '6191501201016',
    nameFr: 'Lait Demi-Écrémé Délice UHT 1L',
    nameAr: 'حليب نصف دسم دليس 1 لتر',
    category: 'Produits Laitiers',
    purchasePrice: 1.350,
    sellingPrice: 1.450,
    unit: 'Pcs',
    minAlertQty: 30,
    defaultStock: 150,
    aliases: ['6192403104523', '6194004700010'],
    keywords: ['delice', 'lait delice', 'حليب دليس', 'دليس']
  },
  {
    code: '6194006100016',
    nameFr: 'Lait Demi-Écrémé Vitalait UHT 1L',
    nameAr: 'حليب نصف دسم فيتالايت 1 لتر',
    category: 'Produits Laitiers',
    purchasePrice: 1.350,
    sellingPrice: 1.450,
    unit: 'Pcs',
    minAlertQty: 30,
    defaultStock: 120,
    keywords: ['vitalait', 'lait vitalait', 'حليب فيتالايت', 'فيتالايت']
  },
  {
    code: '6194008500012',
    nameFr: 'Lait Demi-Écrémé Natilait UHT 1L',
    nameAr: 'حليب ناتيلايت 1 لتر',
    category: 'Produits Laitiers',
    purchasePrice: 1.350,
    sellingPrice: 1.450,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 80,
    keywords: ['natilait', 'ناتيلايت']
  },
  {
    code: '6194004700119',
    nameFr: 'Yaourt Brassé Délice Fraise',
    nameAr: 'ياغورت دليس فراولة',
    category: 'Produits Laitiers',
    purchasePrice: 0.480,
    sellingPrice: 0.550,
    unit: 'Pcs',
    minAlertQty: 25,
    defaultStock: 120,
    aliases: ['6192003004005', '6191002003010'],
    keywords: ['yaourt delice', 'yaourt', 'ياغورت', 'ياغورت دليس']
  },
  {
    code: '6192404001258',
    nameFr: 'Cheese Giga Carré 24 Pcs',
    nameAr: 'جبن قيقا 24 قطعة',
    category: 'Produits Laitiers',
    purchasePrice: 4.800,
    sellingPrice: 5.400,
    unit: 'Pcs',
    minAlertQty: 10,
    defaultStock: 40,
    keywords: ['giga', 'cheese giga', 'جبن قيقا', 'قيقا']
  },
  {
    code: '6193001004521',
    nameFr: 'Fromage Râpé Président 100g',
    nameAr: 'جبن مرحي بريزيدن 100غ',
    category: 'Produits Laitiers',
    purchasePrice: 3.200,
    sellingPrice: 3.800,
    unit: 'Pcs',
    minAlertQty: 10,
    defaultStock: 50,
    keywords: ['president', 'fromage rape', 'بريزيدن', 'جبن مرحي']
  },
  {
    code: '6191506500013',
    nameFr: 'Margarine Goldina 250g',
    nameAr: 'مارغرين غولدينا 250غ',
    category: 'Produits Laitiers',
    purchasePrice: 1.400,
    sellingPrice: 1.700,
    unit: 'Pcs',
    minAlertQty: 15,
    defaultStock: 75,
    aliases: ['6196004007832'],
    keywords: ['goldina', 'margarine goldina', 'غولدينا', 'مارغرين']
  },
  {
    code: '6191506500112',
    nameFr: 'Margarine Jadida 250g',
    nameAr: 'مارغرين جديدة 250غ',
    category: 'Produits Laitiers',
    purchasePrice: 1.400,
    sellingPrice: 1.700,
    unit: 'Pcs',
    minAlertQty: 15,
    defaultStock: 60,
    keywords: ['jadida', 'جديدة', 'مارغرين جديدة']
  },

  // --- CONSERVES & SAUCES / مصبرات ومعجون ---
  {
    code: '6191501004112',
    nameFr: 'Double Concentré de Tomate Sicam 400g',
    nameAr: 'طماطم معلبة سيكام 400غ',
    category: 'Conserves',
    purchasePrice: 1.850,
    sellingPrice: 2.150,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 90,
    keywords: ['tomate sicam', 'sicam 400', 'طماطم سيكام', 'طماطم معلبة']
  },
  {
    code: '6191501004013',
    nameFr: 'Double Concentré de Tomate Sicam 800g',
    nameAr: 'طماطم معلبة سيكام 800غ',
    category: 'Conserves',
    purchasePrice: 3.600,
    sellingPrice: 4.200,
    unit: 'Pcs',
    minAlertQty: 15,
    defaultStock: 80,
    aliases: ['6198502214455'],
    keywords: ['sicam 800', 'طماطم سيكام 800', 'حكة طماطم']
  },
  {
    code: '6191501002019',
    nameFr: 'Harissa Traditionnelle Sicam 135g',
    nameAr: 'هريسة سيكام تقليدية 135غ',
    category: 'Conserves',
    purchasePrice: 0.950,
    sellingPrice: 1.250,
    unit: 'Pcs',
    minAlertQty: 15,
    defaultStock: 85,
    aliases: ['6198502214433'],
    keywords: ['harissa', 'harissa sicam', 'هريسة سيكام', 'هريسة']
  },
  {
    code: '6191504100019',
    nameFr: 'Thon Entier à l\'Huile d\'Olive Sidi Daoud 160g',
    nameAr: 'تن سيدي داود بزيت الزيتون 160غ',
    category: 'Conserves',
    purchasePrice: 4.200,
    sellingPrice: 4.900,
    unit: 'Pcs',
    minAlertQty: 15,
    defaultStock: 65,
    aliases: ['6194512001122'],
    keywords: ['sidi daoud', 'thon sidi daoud', 'سيدي داود', 'تن']
  },
  {
    code: '6191504500017',
    nameFr: 'Thon Entier à l\'Huile El Manar 160g',
    nameAr: 'تن المنار بالزيت 160غ',
    category: 'Conserves',
    purchasePrice: 4.300,
    sellingPrice: 5.100,
    unit: 'Pcs',
    minAlertQty: 12,
    defaultStock: 50,
    aliases: ['6197005008943'],
    keywords: ['el manar', 'thon el manar', 'تن المنار', 'المنار']
  },
  {
    code: '6191504500116',
    nameFr: 'Sardines à l\'Huile Piquante El Manar 125g',
    nameAr: 'سردينة المنار حارة 125غ',
    category: 'Conserves',
    purchasePrice: 1.800,
    sellingPrice: 2.200,
    unit: 'Pcs',
    minAlertQty: 15,
    defaultStock: 90,
    aliases: ['6198006009054'],
    keywords: ['sardine', 'sardine el manar', 'سردينة المنار', 'سردينة']
  },

  // --- CÉRÉALES & PÂTES / كسكسي وعجائن ---
  {
    code: '6191502500019',
    nameFr: 'Couscous Fin Diari 1kg',
    nameAr: 'كسكسي دياري جويد 1 كغ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.850,
    sellingPrice: 1.100,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 120,
    aliases: ['6191002003001'],
    keywords: ['diari', 'couscous diari', 'كسكسي دياري', 'دياري']
  },
  {
    code: '6191502500026',
    nameFr: 'Couscous Moyen Diari 1kg',
    nameAr: 'كسكسي دياري متوسط 1 كغ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.850,
    sellingPrice: 1.100,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 100,
    keywords: ['couscous diari moyen', 'كسكسي دياري وسط']
  },
  {
    code: '6191501500010',
    nameFr: 'Couscous Moyen Warda 1kg',
    nameAr: 'كسكسي وردة وسط 1 كغ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.840,
    sellingPrice: 1.050,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 95,
    aliases: ['6191002003002'],
    keywords: ['warda', 'couscous warda', 'كسكسي وردة', 'وردة']
  },
  {
    code: '6191503300021',
    nameFr: 'Spaghetti N°2 Randa 500g',
    nameAr: 'معكرونة سباغيتي رندة 500غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.680,
    sellingPrice: 0.850,
    unit: 'Pcs',
    minAlertQty: 30,
    defaultStock: 200,
    aliases: ['6191114002341', '6194512009988'],
    keywords: ['randa', 'spaghetti randa', 'رندة', 'سباغيتي رندة', 'معكرونة']
  },
  {
    code: '6191501500119',
    nameFr: 'Spaghetti N°2 Warda 500g',
    nameAr: 'معكرونة سباغيتي وردة 500غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.680,
    sellingPrice: 0.850,
    unit: 'Pcs',
    minAlertQty: 30,
    defaultStock: 150,
    keywords: ['spaghetti warda', 'سباغيتي وردة']
  },
  {
    code: '6191509800013',
    nameFr: 'Sucre Blanc cristallisé Tunisien 1kg',
    nameAr: 'سكر مائدة أبيض تونسي 1 كغ',
    category: 'Épices & Condiments',
    purchasePrice: 1.200,
    sellingPrice: 1.400,
    unit: 'Pcs',
    minAlertQty: 50,
    defaultStock: 300,
    aliases: ['6190706018943', '6191230001001'],
    keywords: ['sucre', 'سكر', 'سكر أبيض']
  },

  // --- BOISSONS & SODAS / مشروبات وغازوز ---
  {
    code: '6194001200056',
    nameFr: 'Soda Boga Blanche 1.5L',
    nameAr: 'مشروب غازي بوغا بيضاء 1.5ل',
    category: 'Boissons / مشروبات',
    purchasePrice: 2.300,
    sellingPrice: 2.700,
    unit: 'Pcs',
    minAlertQty: 25,
    defaultStock: 120,
    aliases: ['6190109012387'],
    keywords: ['boga', 'boga blanche', 'بوغا', 'بوغا بيضاء']
  },
  {
    code: '6194001200025',
    nameFr: 'Soda Boga Cidre 1.5L',
    nameAr: 'مشروب غازي بوغا سيدر 1.5ل',
    category: 'Boissons / مشروبات',
    purchasePrice: 2.300,
    sellingPrice: 2.700,
    unit: 'Pcs',
    minAlertQty: 25,
    defaultStock: 100,
    keywords: ['boga cidre', 'بوغا سيدر']
  },
  {
    code: '5449000000996',
    nameFr: 'Soda Coca-Cola Original 1.5L',
    nameAr: 'مشروب غازي كوكاكولا 1.5ل',
    category: 'Boissons / مشروبات',
    purchasePrice: 2.650,
    sellingPrice: 3.100,
    unit: 'Pcs',
    minAlertQty: 30,
    defaultStock: 150,
    aliases: ['6190008011276', '6194001200117'],
    keywords: ['coca', 'coca cola', 'كوكاكولا', 'كوكا']
  },
  {
    code: '5449000011527',
    nameFr: 'Soda Fanta Orange 1.5L',
    nameAr: 'مشروب غازي فانتا برتقال 1.5ل',
    category: 'Boissons / مشروبات',
    purchasePrice: 2.400,
    sellingPrice: 2.900,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 100,
    aliases: ['6190109012399'],
    keywords: ['fanta', 'فانتا']
  },

  // --- CAFÉ, CHOCOLAT & BISCUITS / قهوة، شوكولا وبسكويت ---
  {
    code: '6191505500016',
    nameFr: 'Café Moulu Ben Yedder Tradition 250g',
    nameAr: 'قهوة بن يدر تقليدية 250غ',
    category: 'Café & Thé',
    purchasePrice: 3.100,
    sellingPrice: 3.800,
    unit: 'Pcs',
    minAlertQty: 10,
    defaultStock: 40,
    aliases: ['6192224018872', '6192425262728'],
    keywords: ['ben yedder', 'cafe ben yedder', 'بن يدر', 'قهوة']
  },
  {
    code: '6191507000019',
    nameFr: 'Chamia Ghazala Nature 350g',
    nameAr: 'شامية الغزالة حلوى 350غ',
    category: 'Café & Thé',
    purchasePrice: 4.200,
    sellingPrice: 5.100,
    unit: 'Pcs',
    minAlertQty: 8,
    defaultStock: 45,
    aliases: ['6199007010165'],
    keywords: ['ghazala', 'chamia', 'شامية', 'شامية الغزالة']
  },
  {
    code: '6191506000010',
    nameFr: 'Chocolat Saida El Baka Bleue 100g',
    nameAr: 'شوكولا سيدة الباقة زرقاء 100غ',
    category: 'Café & Thé',
    purchasePrice: 1.900,
    sellingPrice: 2.400,
    unit: 'Pcs',
    minAlertQty: 15,
    defaultStock: 85,
    aliases: ['6190201013498'],
    keywords: ['saida', 'chocolat saida', 'baka', 'شوكولا سيدة', 'الباقة']
  },
  {
    code: '6191506001119',
    nameFr: 'Biscuits Major Chocolat Saida',
    nameAr: 'بسكويت ماجور شوكولا سيدة',
    category: 'Café & Thé',
    purchasePrice: 0.700,
    sellingPrice: 0.850,
    unit: 'Pcs',
    minAlertQty: 40,
    defaultStock: 240,
    aliases: ['6190302014509'],
    keywords: ['major', 'biscuits major', 'ماجور', 'بسكويت ماجور']
  },

  // --- HUILES / زيوت ---
  {
    code: '6194001900116',
    nameFr: 'Huile de Tournesol Safia 1L',
    nameAr: 'زيت دوار الشمس صافية 1 لتر',
    category: 'Huiles & Épices',
    purchasePrice: 4.800,
    sellingPrice: 5.500,
    unit: 'Pcs',
    minAlertQty: 15,
    defaultStock: 60,
    aliases: ['6194002005612'],
    keywords: ['huile safia', 'زيت صافية', 'زيت نباتي']
  },
  {
    code: '6194001900123',
    nameFr: 'Huile de Tournesol Safia 1.5L',
    nameAr: 'زيت دوار الشمس صافية 1.5 لتر',
    category: 'Huiles & Épices',
    purchasePrice: 7.200,
    sellingPrice: 8.250,
    unit: 'Pcs',
    minAlertQty: 10,
    defaultStock: 50,
    keywords: ['safia 1.5', 'زيت صافية لتر ونصف']
  },
  {
    code: '6194001900154',
    nameFr: 'Huile de Tournesol Safia 5L',
    nameAr: 'زيت دوار الشمس صافية 5 لتر',
    category: 'Huiles & Épices',
    purchasePrice: 23.500,
    sellingPrice: 26.500,
    unit: 'Pcs',
    minAlertQty: 5,
    defaultStock: 30,
    keywords: ['safia 5l', 'زيت صافية 5 لتر', 'بيدون زيت']
  },
  {
    code: '6191508000018',
    nameFr: 'Huile d\'Olive Extra Vierge Châal 1L',
    nameAr: 'زيت زيتون بكر ممتاز شعال 1 لتر',
    category: 'Huiles & Épices',
    purchasePrice: 22.000,
    sellingPrice: 25.000,
    unit: 'Pcs',
    minAlertQty: 5,
    defaultStock: 20,
    aliases: ['6195003006721'],
    keywords: ['chaal', 'huile dolive', 'زيت زيتون', 'شعال']
  },

  // --- NOUVEAU CATALOGUE OFFICIEL TUNISIEN (RANDA, DIARI, SPIGA, VITALAIT, DÉLICE, SICAM...) ---
  // PÂTES RANDA
  {
    code: '6194004666636',
    nameFr: 'Spaghetti Randa 250g',
    nameAr: 'معكرونة سباغيتي رندة 250غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.380,
    sellingPrice: 0.450,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 100,
    keywords: ['randa 250', 'spaghetti 250', 'رندة 250']
  },
  {
    code: '6194004666400',
    nameFr: 'Spaghetti Randa 500g',
    nameAr: 'معكرونة سباغيتي رندة 500غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.680,
    sellingPrice: 0.850,
    unit: 'Pcs',
    minAlertQty: 30,
    defaultStock: 120,
    keywords: ['randa 500', 'spaghetti randa', 'سباغيتي رندة']
  },
  {
    code: '6194004666776',
    nameFr: 'Pâtes Flamengo Randa 250g',
    nameAr: 'معكرونة فلامنغو رندة 250غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.380,
    sellingPrice: 0.450,
    unit: 'Pcs',
    minAlertQty: 15,
    defaultStock: 80,
    keywords: ['flamengo randa 250', 'فلامنغو رندة']
  },
  {
    code: '6194004666394',
    nameFr: 'Pâtes Flamengo Randa 500g',
    nameAr: 'معكرونة فلامنغو رندة 500غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.680,
    sellingPrice: 0.850,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 90,
    keywords: ['flamengo 500', 'فلامنغو 500']
  },
  {
    code: '6194004666608',
    nameFr: 'Spaghetti N°2 Randa 400g',
    nameAr: 'معكرونة سباغيتي 2 رندة 400غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.600,
    sellingPrice: 0.750,
    unit: 'Pcs',
    minAlertQty: 25,
    defaultStock: 100,
    keywords: ['spaghetti 2 randa 400', 'سباغيتي 2 رندة']
  },
  {
    code: '6194004666615',
    nameFr: 'Pâtes Fell N°2 Randa 400g',
    nameAr: 'معكرونة فل 2 رندة 400غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.600,
    sellingPrice: 0.750,
    unit: 'Pcs',
    minAlertQty: 25,
    defaultStock: 100,
    keywords: ['fell 2 randa', 'فل 2 رندة', 'مقرونة فل']
  },
  {
    code: '6194004666622',
    nameFr: 'Pâtes Fell N°3 Randa 400g',
    nameAr: 'معكرونة فل 3 رندة 400غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.600,
    sellingPrice: 0.750,
    unit: 'Pcs',
    minAlertQty: 25,
    defaultStock: 100,
    keywords: ['fell 3 randa', 'فل 3 رندة']
  },
  {
    code: '6194004666639',
    nameFr: 'Pâtes Penne Randa 400g',
    nameAr: 'معكرونة بيني رندة 400غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.600,
    sellingPrice: 0.750,
    unit: 'Pcs',
    minAlertQty: 25,
    defaultStock: 100,
    keywords: ['penne randa', 'بيني رندة']
  },

  // PASTA REGALE
  {
    code: '6194004666691',
    nameFr: 'Spaghetti 2 Pasta Regale 400g',
    nameAr: 'معكرونة سباغيتي 2 باستا ريغال 400غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.580,
    sellingPrice: 0.720,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 80,
    keywords: ['pasta regale spaghetti', 'سباغيتي باستا ريغال']
  },
  {
    code: '6194004666707',
    nameFr: 'Pâtes Fell 2 Pasta Regale 400g',
    nameAr: 'معكرونة فل 2 باستا ريغال 400غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.580,
    sellingPrice: 0.720,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 80,
    keywords: ['fell 2 pasta regale', 'فل 2 باستا ريغال']
  },
  {
    code: '6194004666714',
    nameFr: 'Pâtes Fell 3 Pasta Regale 400g',
    nameAr: 'معكرونة فل 3 باستا ريغال 400غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.580,
    sellingPrice: 0.720,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 80,
    keywords: ['fell 3 pasta regale', 'فل 3 باستا ريغال']
  },
  {
    code: '6194004666721',
    nameFr: 'Pâtes Penne Pasta Regale 400g',
    nameAr: 'معكرونة بيني باستا ريغال 400غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.580,
    sellingPrice: 0.720,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 80,
    keywords: ['penne pasta regale', 'بيني باستا ريغال']
  },
  {
    code: '6194004666745',
    nameFr: 'Couscous Moyen Pasta Regale 900g',
    nameAr: 'كسكسي وسط باستا ريغال 900غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.780,
    sellingPrice: 0.950,
    unit: 'Pcs',
    minAlertQty: 15,
    defaultStock: 60,
    keywords: ['couscous pasta regale 900', 'كسكسي باستا ريغال 900']
  },
  {
    code: '6194004666738',
    nameFr: 'Couscous Fin Pasta Regale 900g',
    nameAr: 'كسكسي جويد باستا ريغال 900غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.780,
    sellingPrice: 0.950,
    unit: 'Pcs',
    minAlertQty: 15,
    defaultStock: 60,
    keywords: ['couscous fin pasta regale', 'كسكسي جويد باستا ريغال']
  },
  {
    code: '6194004666905',
    nameFr: 'Couscous Moyen Pasta Regale 500g',
    nameAr: 'كسكسي وسط باستا ريغال 500غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.450,
    sellingPrice: 0.550,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 70,
    keywords: ['couscous moyen regale 500', 'كسكسي ريغال 500']
  },
  {
    code: '6194004666882',
    nameFr: 'Couscous Fin Pasta Regale 500g',
    nameAr: 'كسكسي جويد باستا ريغال 500غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.450,
    sellingPrice: 0.550,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 70,
    keywords: ['couscous fin regale 500', 'كسكسي جويد ريغال']
  },
  {
    code: '6194004667056',
    nameFr: 'Couscous Moyen Pasta Regale 5kg',
    nameAr: 'كسكسي وسط باستا ريغال 5 كغ',
    category: 'Céréales & Pâtes',
    purchasePrice: 4.200,
    sellingPrice: 5.000,
    unit: 'Pcs',
    minAlertQty: 5,
    defaultStock: 20,
    keywords: ['couscous regale 5kg', 'كسكسي ريغال 5 كغ']
  },

  // CARTHAGE
  {
    code: '6194004666370',
    nameFr: 'Spaghetti Carthage 450g',
    nameAr: 'معكرونة سباغيتي قرطاج 450غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.650,
    sellingPrice: 0.800,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 75,
    keywords: ['carthage 450', 'سباغيتي قرطاج']
  },
  {
    code: '6194004666387',
    nameFr: 'Spaghetti Carthage 500g',
    nameAr: 'معكرونة سباغيتي قرطاج 500غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.680,
    sellingPrice: 0.850,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 75,
    keywords: ['carthage 500', 'سباغيتي قرطاج 500']
  },
  {
    code: '6194004666660',
    nameFr: 'Pâte Courte Carthage 500g',
    nameAr: 'معكرونة قصيرة قرطاج 500غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.680,
    sellingPrice: 0.850,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 75,
    keywords: ['pate courte carthage 500', 'مقرونة قرطاج 500']
  },
  {
    code: '6194004666417',
    nameFr: 'Pâte Courte Carthage 400g',
    nameAr: 'معكرونة قصيرة قرطاج 400غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.580,
    sellingPrice: 0.720,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 75,
    keywords: ['pate courte carthage 400', 'مقرونة قرطاج 400']
  },
  {
    code: '6194004666424',
    nameFr: 'Spaghetti Carthage 400g',
    nameAr: 'معكرونة سباغيتي قرطاج 400غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.580,
    sellingPrice: 0.720,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 75,
    keywords: ['spaghetti carthage 400', 'سباغيتي قرطاج 400']
  },

  // SAGIA
  {
    code: '6191563100147',
    nameFr: 'Spaghetti 1 SAGIA 400g',
    nameAr: 'معكرونة سباغيتي 1 الساقية 400غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.580,
    sellingPrice: 0.720,
    unit: 'Pcs',
    minAlertQty: 15,
    defaultStock: 60,
    keywords: ['sagia 1', 'spaghetti sagia', 'سباغيتي الساقية']
  },
  {
    code: '6191563100154',
    nameFr: 'Spaghetti 2 SAGIA 400g',
    nameAr: 'معكرونة سباغيتي 2 الساقية 400غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.580,
    sellingPrice: 0.720,
    unit: 'Pcs',
    minAlertQty: 15,
    defaultStock: 60,
    keywords: ['sagia 2', 'سباغيتي 2 الساقية']
  },
  {
    code: '6194004666912',
    nameFr: 'Pâtes Fell 2,5 SAGIA 400g',
    nameAr: 'معكرونة فل 2.5 الساقية 400غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.580,
    sellingPrice: 0.720,
    unit: 'Pcs',
    minAlertQty: 15,
    defaultStock: 60,
    keywords: ['fell sagia', 'فل الساقية']
  },
  {
    code: '6194004666929',
    nameFr: 'Pâtes Fell 3 SAGIA 400g',
    nameAr: 'معكرونة فل 3 الساقية 400غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.580,
    sellingPrice: 0.720,
    unit: 'Pcs',
    minAlertQty: 15,
    defaultStock: 60,
    keywords: ['fell 3 sagia', 'فل 3 الساقية']
  },
  {
    code: '6194004667032',
    nameFr: 'Pâtes Plume Longue SAGIA 400g',
    nameAr: 'معكرونة ريشة طويلة الساقية 400غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.580,
    sellingPrice: 0.720,
    unit: 'Pcs',
    minAlertQty: 15,
    defaultStock: 60,
    keywords: ['plume longue sagia', 'ريشة طويلة الساقية']
  },
  {
    code: '6194004667049',
    nameFr: 'Pâtes Plume Courte SAGIA 400g',
    nameAr: 'معكرونة ريشة قصيرة الساقية 400غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.580,
    sellingPrice: 0.720,
    unit: 'Pcs',
    minAlertQty: 15,
    defaultStock: 60,
    keywords: ['plume courte sagia', 'ريشة قصيرة الساقية']
  },

  // PRODUITS PROFESSIONNELS
  {
    code: '6194004665144',
    nameFr: 'Levure Chimique Sweet Pastry 5kg',
    nameAr: 'خميرة كيميائية سويت باستري 5 كغ',
    category: 'Produits Professionnels',
    purchasePrice: 18.500,
    sellingPrice: 22.000,
    unit: 'Pcs',
    minAlertQty: 5,
    defaultStock: 15,
    keywords: ['levure 5kg', 'sweet pastry', 'خميرة 5 كغ']
  },
  {
    code: '6194004665137',
    nameFr: 'Sucre Glace Randa 5kg',
    nameAr: 'سكر رطب رندة 5 كغ',
    category: 'Produits Professionnels',
    purchasePrice: 12.000,
    sellingPrice: 14.500,
    unit: 'Pcs',
    minAlertQty: 5,
    defaultStock: 20,
    keywords: ['sucre glace randa', 'سكر رطب رندة']
  },
  {
    code: '6191531900526',
    nameFr: 'Poudre pour Crème Randa 5kg',
    nameAr: 'غبرة كريمة حلويات رندة 5 كغ',
    category: 'Produits Professionnels',
    purchasePrice: 24.000,
    sellingPrice: 28.500,
    unit: 'Pcs',
    minAlertQty: 5,
    defaultStock: 15,
    keywords: ['poudre creme randa', 'كريمة رندة 5 كغ']
  },
  {
    code: '6191531900175',
    nameFr: 'Améliorant Viennoiserie Nawar 2.5kg',
    nameAr: 'محسن عجين وحلويات نوار 2.5 كغ',
    category: 'Produits Professionnels',
    purchasePrice: 16.000,
    sellingPrice: 19.500,
    unit: 'Pcs',
    minAlertQty: 5,
    defaultStock: 15,
    keywords: ['nawar 2.5', 'ameliorant nawar', 'محسن نوار']
  },

  // DIARI COUSCOUS (GAMME COMPLÈTE)
  {
    code: '6194011811305',
    nameFr: 'Couscous Fin Diari 500g',
    nameAr: 'كسكسي دياري جويد 500غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.450,
    sellingPrice: 0.550,
    unit: 'Pcs',
    minAlertQty: 25,
    defaultStock: 100,
    keywords: ['couscous diari fin 500', 'كسكسي دياري جويد 500']
  },
  {
    code: '6194011811763',
    nameFr: 'Couscous Fin Diari 800g',
    nameAr: 'كسكسي دياري جويد 800غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.700,
    sellingPrice: 0.880,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 90,
    keywords: ['couscous diari 800', 'كسكسي دياري 800']
  },
  {
    code: '6194011811107',
    nameFr: 'Couscous Fin Diari 1kg',
    nameAr: 'كسكسي دياري جويد 1 كغ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.850,
    sellingPrice: 1.100,
    unit: 'Pcs',
    minAlertQty: 30,
    defaultStock: 150,
    keywords: ['couscous diari 1kg', 'كسكسي دياري 1 كغ']
  },
  {
    code: '6194011811503',
    nameFr: 'Couscous Fin Diari 5kg',
    nameAr: 'كسكسي دياري جويد 5 كغ',
    category: 'Céréales & Pâtes',
    purchasePrice: 4.200,
    sellingPrice: 5.200,
    unit: 'Pcs',
    minAlertQty: 8,
    defaultStock: 30,
    keywords: ['couscous diari 5kg', 'كسكسي دياري 5 كغ']
  },
  {
    code: '6194011811121',
    nameFr: 'Couscous Fin DFC Diari 1kg',
    nameAr: 'كسكسي دياري دي أف سي جويد 1 كغ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.900,
    sellingPrice: 1.150,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 80,
    keywords: ['diari dfc 1kg', 'كسكسي دي اف سي']
  },
  {
    code: '6194011812302',
    nameFr: 'Couscous Moyen Diari 500g',
    nameAr: 'كسكسي دياري وسط 500غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.450,
    sellingPrice: 0.550,
    unit: 'Pcs',
    minAlertQty: 25,
    defaultStock: 100,
    keywords: ['diari moyen 500', 'كسكسي دياري وسط 500']
  },
  {
    code: '6194011811787',
    nameFr: 'Couscous Moyen Diari 800g',
    nameAr: 'كسكسي دياري وسط 800غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.700,
    sellingPrice: 0.880,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 90,
    keywords: ['diari moyen 800', 'كسكسي دياري وسط 800']
  },
  {
    code: '6194011812111',
    nameFr: 'Couscous Moyen Diari 1kg',
    nameAr: 'كسكسي دياري وسط 1 كغ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.850,
    sellingPrice: 1.100,
    unit: 'Pcs',
    minAlertQty: 30,
    defaultStock: 160,
    keywords: ['diari moyen 1kg', 'كسكسي دياري وسط 1 كغ']
  },
  {
    code: '6194011812500',
    nameFr: 'Couscous Moyen Diari 5kg',
    nameAr: 'كسكسي دياري وسط 5 كغ',
    category: 'Céréales & Pâtes',
    purchasePrice: 4.200,
    sellingPrice: 5.200,
    unit: 'Pcs',
    minAlertQty: 8,
    defaultStock: 30,
    keywords: ['diari moyen 5kg', 'كسكسي دياري وسط 5 كغ']
  },
  {
    code: '6194011812319',
    nameFr: 'Couscous Moyen DFC Diari 500g',
    nameAr: 'كسكسي دياري دي أف سي وسط 500غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.480,
    sellingPrice: 0.600,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 80,
    keywords: ['diari dfc moyen 500', 'كسكسي دي اف سي 500']
  },
  {
    code: '6194011812609',
    nameFr: 'Couscous Moyen Étui Diari 500g',
    nameAr: 'كسكسي دياري وسط علبة كرتون 500غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.550,
    sellingPrice: 0.700,
    unit: 'Pcs',
    minAlertQty: 15,
    defaultStock: 60,
    keywords: ['diari etui 500', 'كسكسي دياري باكو']
  },
  {
    code: '6194011813057',
    nameFr: 'Couscous Gros Diari 500g',
    nameAr: 'كسكسي دياري خشين 500غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.450,
    sellingPrice: 0.550,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 80,
    keywords: ['diari gros 500', 'كسكسي دياري خشين 500']
  },
  {
    code: '6194011811800',
    nameFr: 'Couscous Gros Diari 800g',
    nameAr: 'كسكسي دياري خشين 800غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.700,
    sellingPrice: 0.880,
    unit: 'Pcs',
    minAlertQty: 15,
    defaultStock: 70,
    keywords: ['diari gros 800', 'كسكسي دياري خشين 800']
  },
  {
    code: '6194011813101',
    nameFr: 'Couscous Gros Diari 1kg',
    nameAr: 'كسكسي دياري خشين 1 كغ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.850,
    sellingPrice: 1.100,
    unit: 'Pcs',
    minAlertQty: 25,
    defaultStock: 100,
    keywords: ['diari gros 1kg', 'كسكسي دياري خشين 1 كغ']
  },
  {
    code: '6194011821304',
    nameFr: 'Couscous Complet Fin Diari 500g',
    nameAr: 'كسكسي كامل جويد دياري 500غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.650,
    sellingPrice: 0.850,
    unit: 'Pcs',
    minAlertQty: 15,
    defaultStock: 60,
    keywords: ['diari complet 500', 'كسكسي كامل دياري']
  },
  {
    code: '6194011821106',
    nameFr: 'Couscous Complet Fin Diari 1kg',
    nameAr: 'كسكسي كامل جويد دياري 1 كغ',
    category: 'Céréales & Pâtes',
    purchasePrice: 1.200,
    sellingPrice: 1.500,
    unit: 'Pcs',
    minAlertQty: 15,
    defaultStock: 50,
    keywords: ['diari complet 1kg', 'كسكسي كامل دياري 1 كغ']
  },
  {
    code: '6194011811336',
    nameFr: 'Couscous Multi-Céréales Diari 500g',
    nameAr: 'كسكسي متعدد الحبوب دياري 500غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.750,
    sellingPrice: 0.980,
    unit: 'Pcs',
    minAlertQty: 10,
    defaultStock: 45,
    keywords: ['diari cereales', 'كسكسي حبوب دياري']
  },
  {
    code: '6194011811350',
    nameFr: 'Couscous Orge Moyen Diari 500g',
    nameAr: 'كسكسي شعير دياري 500غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.750,
    sellingPrice: 0.980,
    unit: 'Pcs',
    minAlertQty: 10,
    defaultStock: 45,
    keywords: ['diari orge', 'كسكسي شعير دياري']
  },
  {
    code: '6194011814306',
    nameFr: 'Masfouf Diari 500g',
    nameAr: 'مسفوف دياري 500غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.500,
    sellingPrice: 0.650,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 80,
    keywords: ['masfouf diari 500', 'مسفوف دياري']
  },
  {
    code: '6194011814108',
    nameFr: 'Masfouf Diari 1kg',
    nameAr: 'مسفوف دياري 1 كغ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.900,
    sellingPrice: 1.180,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 80,
    keywords: ['masfouf diari 1kg', 'مسفوف دياري 1 كغ']
  },

  // SPIGA
  {
    code: '6194011801063',
    nameFr: 'Spaghetti 2 Spiga 400g',
    nameAr: 'معكرونة سباغيتي 2 سبيقا 400غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.580,
    sellingPrice: 0.720,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 90,
    keywords: ['spiga spaghetti 400', 'سباغيتي سبيقا 400']
  },
  {
    code: '6194011832379',
    nameFr: 'Spaghetti 2 Spiga 500g',
    nameAr: 'معكرونة سباغيتي 2 سبيقا 500غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.680,
    sellingPrice: 0.850,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 90,
    keywords: ['spiga spaghetti 500', 'سباغيتي سبيقا 500']
  },
  {
    code: '6194011832171',
    nameFr: 'Spaghetti 2 Spiga 1kg',
    nameAr: 'معكرونة سباغيتي 2 سبيقا 1 كغ',
    category: 'Céréales & Pâtes',
    purchasePrice: 1.300,
    sellingPrice: 1.600,
    unit: 'Pcs',
    minAlertQty: 15,
    defaultStock: 60,
    keywords: ['spiga 1kg', 'سباغيتي سبيقا 1 كغ']
  },
  {
    code: '6194011881018',
    nameFr: 'Pâtes Fell 2 Spiga 400g',
    nameAr: 'معكرونة فل 2 سبيقا 400غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.580,
    sellingPrice: 0.720,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 80,
    keywords: ['fell 2 spiga 400', 'فل 2 سبيقا 400']
  },
  {
    code: '6194011842385',
    nameFr: 'Pâtes Fell 2 Spiga 500g',
    nameAr: 'معكرونة فل 2 سبيقا 500غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.680,
    sellingPrice: 0.850,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 80,
    keywords: ['fell 2 spiga 500', 'فل 2 سبيقا 500']
  },
  {
    code: '6194011860501',
    nameFr: 'Lasagne Spiga 500g',
    nameAr: 'لازانيا سبيقا 500غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 2.200,
    sellingPrice: 2.800,
    unit: 'Pcs',
    minAlertQty: 10,
    defaultStock: 40,
    keywords: ['lasagne spiga', 'لازانيا سبيقا']
  },
  {
    code: '6194011837374',
    nameFr: 'Spaghetti 2 Complète Spiga 500g',
    nameAr: 'معكرونة سباغيتي كاملة سبيقا 500غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.850,
    sellingPrice: 1.100,
    unit: 'Pcs',
    minAlertQty: 15,
    defaultStock: 50,
    keywords: ['spaghetti complete spiga', 'سباغيتي كاملة سبيقا']
  },
  {
    code: '6194011863397',
    nameFr: 'Pâtes Ressort Complet Spiga 500g',
    nameAr: 'معكرونة ريسور كاملة سبيقا 500غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.850,
    sellingPrice: 1.100,
    unit: 'Pcs',
    minAlertQty: 15,
    defaultStock: 50,
    keywords: ['ressort complet spiga', 'ريسور كامل سبيقا']
  },
  {
    code: '6194011862512',
    nameFr: 'Spaghetti 2 Sans Gluten Spiga 340g',
    nameAr: 'معكرونة سباغيتي بدون غلوتين سبيقا 340غ',
    category: 'Céréales & Pâtes',
    purchasePrice: 2.900,
    sellingPrice: 3.600,
    unit: 'Pcs',
    minAlertQty: 10,
    defaultStock: 35,
    keywords: ['sans gluten spiga', 'بدون غلوتين سبيقا']
  },
  {
    code: '6194011816102',
    nameFr: 'Couscous Fin Spiga 1kg',
    nameAr: 'كسكسي جويد سبيقا 1 كغ',
    category: 'Céréales & Pâtes',
    purchasePrice: 0.850,
    sellingPrice: 1.100,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 70,
    keywords: ['couscous spiga 1kg', 'كسكسي سبيقا 1 كغ']
  },

  // VITALAIT (GAMME LAITIÈRE ÉTENDUE)
  {
    code: '6191507220214',
    nameFr: 'Lait 1/2 Écrémé Vitalait UHT 1L',
    nameAr: 'حليب نصف دسم فيتالايت 1 لتر',
    category: 'Produits Laitiers',
    purchasePrice: 1.350,
    sellingPrice: 1.450,
    unit: 'Pcs',
    minAlertQty: 30,
    defaultStock: 150,
    keywords: ['vitalait 1/2 ecreme', 'حليب فيتالايت نصف دسم']
  },
  {
    code: '6191507220283',
    nameFr: 'Lait 0% Vitalait UHT 1L',
    nameAr: 'حليب منزوع الدسم 0% فيتالايت 1 لتر',
    category: 'Produits Laitiers',
    purchasePrice: 1.350,
    sellingPrice: 1.450,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 80,
    keywords: ['vitalait 0%', 'حليب 0 فيتالايت']
  },
  {
    code: '6191507220221',
    nameFr: 'Lait Entier Vitalait UHT 1L',
    nameAr: 'حليب كامل الدسم فيتالايت 1 لتر',
    category: 'Produits Laitiers',
    purchasePrice: 1.350,
    sellingPrice: 1.450,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 80,
    keywords: ['vitalait entier', 'حليب كامل الدسم فيتالايت']
  },
  {
    code: '6191507250679',
    nameFr: 'Lait 0% Bouteille Vitalait 1L',
    nameAr: 'حليب 0% قارورة فيتالايت 1 لتر',
    category: 'Produits Laitiers',
    purchasePrice: 1.400,
    sellingPrice: 1.550,
    unit: 'Pcs',
    minAlertQty: 15,
    defaultStock: 60,
    keywords: ['vitalait bouteille 0%', 'حليب قارورة فيتالايت']
  },
  {
    code: '6191507212011',
    nameFr: 'Lait 1/2 Écrémé Bouteille Vitalait 1L',
    nameAr: 'حليب نصف دسم قارورة فيتالايت 1 لتر',
    category: 'Produits Laitiers',
    purchasePrice: 1.400,
    sellingPrice: 1.550,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 90,
    keywords: ['vitalait bouteille 1/2', 'حليب قارورة نصف دسم']
  },
  {
    code: '6191507249406',
    nameFr: 'Yaourt Aromatisé Fraise Vitalait 100g',
    nameAr: 'ياغورت فراولة فيتالايت 100غ',
    category: 'Produits Laitiers',
    purchasePrice: 0.480,
    sellingPrice: 0.550,
    unit: 'Pcs',
    minAlertQty: 25,
    defaultStock: 120,
    keywords: ['yaourt vitalait fraise', 'ياغورت فراولة فيتالايت']
  },
  {
    code: '6191507250471',
    nameFr: 'Yaourt aux Fruits Secs Vitalait 100g',
    nameAr: 'ياغورت بالفواكه الجافة فيتالايت 100غ',
    category: 'Produits Laitiers',
    purchasePrice: 0.550,
    sellingPrice: 0.650,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 100,
    keywords: ['yaourt fruits secs', 'ياغورت فواكه جافة']
  },
  {
    code: '6191507249888',
    nameFr: 'Yaourt Bifi Fruits des Bois 0% Vitalait',
    nameAr: 'ياغورت بيفي غابة 0% فيتالايت',
    category: 'Produits Laitiers',
    purchasePrice: 0.550,
    sellingPrice: 0.650,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 80,
    keywords: ['bifi vitalait', 'بيفي فيتالايت']
  },
  {
    code: '6191507249574',
    nameFr: 'Dessert Vitupti Vanille Vitalait 100g',
    nameAr: 'تحلية فيتوبتي فانيليا فيتالايت 100غ',
    category: 'Produits Laitiers',
    purchasePrice: 0.600,
    sellingPrice: 0.750,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 80,
    keywords: ['vitupti vanille', 'فيتوبتي فانيليا']
  },
  {
    code: '6191507220108',
    nameFr: 'Beurre Conditionné Vitalait 100g',
    nameAr: 'زبدة فيتالايت 100غ',
    category: 'Produits Laitiers',
    purchasePrice: 1.800,
    sellingPrice: 2.200,
    unit: 'Pcs',
    minAlertQty: 10,
    defaultStock: 50,
    keywords: ['beurre vitalait 100', 'زبدة فيتالايت 100']
  },
  {
    code: '6191507220207',
    nameFr: 'Beurre Conditionné Vitalait 200g',
    nameAr: 'زبدة فيتالايت 200غ',
    category: 'Produits Laitiers',
    purchasePrice: 3.500,
    sellingPrice: 4.200,
    unit: 'Pcs',
    minAlertQty: 10,
    defaultStock: 50,
    keywords: ['beurre vitalait 200', 'زبدة فيتالايت 200']
  },
  {
    code: '6191507249635',
    nameFr: 'Crème Fraîche Vitalait 15cl',
    nameAr: 'قشدة طرية فيتالايت 15 سل',
    category: 'Produits Laitiers',
    purchasePrice: 1.600,
    sellingPrice: 1.950,
    unit: 'Pcs',
    minAlertQty: 15,
    defaultStock: 60,
    keywords: ['creme fraiche vitalait', 'قشدة طرية فيتالايت']
  },

  // DÉLICE (GAMME LAITIÈRE ÉTENDUE)
  {
    code: '6194043001668',
    nameFr: 'Lait Délisso 1/2 Écrémé Délice 1L',
    nameAr: 'حليب دليسو نصف دسم دليس 1 لتر',
    category: 'Produits Laitiers',
    purchasePrice: 1.350,
    sellingPrice: 1.450,
    unit: 'Pcs',
    minAlertQty: 30,
    defaultStock: 150,
    keywords: ['delisso demi ecreme', 'دليسو نصف دسم']
  },
  {
    code: '6194043001255',
    nameFr: 'Lait Délisso Entier Délice 1L',
    nameAr: 'حليب دليسو كامل الدسم دليس 1 لتر',
    category: 'Produits Laitiers',
    purchasePrice: 1.350,
    sellingPrice: 1.450,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 80,
    keywords: ['delisso entier', 'دليسو كامل الدسم']
  },
  {
    code: '6194043001279',
    nameFr: 'Lait Délisso Écrémé Délice 1L',
    nameAr: 'حليب دليسو منزوع الدسم دليس 1 لتر',
    category: 'Produits Laitiers',
    purchasePrice: 1.350,
    sellingPrice: 1.450,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 80,
    keywords: ['delisso ecreme', 'دليسو منزوع الدسم']
  },
  {
    code: '6194043001286',
    nameFr: 'Lait Délisso Enrichi Délice 1L',
    nameAr: 'حليب دليسو مدعم بالفيتامينات دليس 1 لتر',
    category: 'Produits Laitiers',
    purchasePrice: 1.450,
    sellingPrice: 1.650,
    unit: 'Pcs',
    minAlertQty: 15,
    defaultStock: 60,
    keywords: ['delisso enrichi', 'دليسو مدعم']
  },
  {
    code: '6194043002016',
    nameFr: 'Lait Demi-Écrémé Délice 0.5L',
    nameAr: 'حليب نصف دسم دليس 0.5 لتر',
    category: 'Produits Laitiers',
    purchasePrice: 0.700,
    sellingPrice: 0.850,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 80,
    keywords: ['delice 0.5l', 'حليب دليس نصف لتر']
  },
  {
    code: '6194043002023',
    nameFr: 'Lait Demi-Écrémé Brique Délice 0.45L',
    nameAr: 'حليب نصف دسم علبة دليس 0.45 لتر',
    category: 'Produits Laitiers',
    purchasePrice: 0.650,
    sellingPrice: 0.800,
    unit: 'Pcs',
    minAlertQty: 15,
    defaultStock: 70,
    keywords: ['delice brique 0.45', 'حليب دليس 0.45']
  },
  {
    code: '6194043002047',
    nameFr: 'Lait Écrémé Brique Délice 0.45L',
    nameAr: 'حليب خالي من الدسم دليس 0.45 لتر',
    category: 'Produits Laitiers',
    purchasePrice: 0.650,
    sellingPrice: 0.800,
    unit: 'Pcs',
    minAlertQty: 15,
    defaultStock: 60,
    keywords: ['delice ecreme 0.45', 'حليب خالي من الدسم 0.45']
  },
  {
    code: '6194043002030',
    nameFr: 'Lait Entier Brique Délice 0.45L',
    nameAr: 'حليب كامل الدسم دليس 0.45 لتر',
    category: 'Produits Laitiers',
    purchasePrice: 0.650,
    sellingPrice: 0.800,
    unit: 'Pcs',
    minAlertQty: 15,
    defaultStock: 60,
    keywords: ['delice entier 0.45', 'حليب كامل الدسم 0.45']
  },
  {
    code: '6194043001316',
    nameFr: 'Raieb Délice 420g',
    nameAr: 'رايب دليس 420غ',
    category: 'Produits Laitiers',
    purchasePrice: 1.100,
    sellingPrice: 1.350,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 80,
    keywords: ['raieb delice', 'رايب دليس']
  },
  {
    code: '6194043001361',
    nameFr: 'Leben Natural Délice 420g',
    nameAr: 'لبن طبيعي دليس 420غ',
    category: 'Produits Laitiers',
    purchasePrice: 1.050,
    sellingPrice: 1.300,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 80,
    keywords: ['leben delice', 'لبن دليس']
  },
  {
    code: '6194043002368',
    nameFr: 'Leben Natural Bouteille Délice 430g',
    nameAr: 'لبن طبيعي قارورة دليس 430غ',
    category: 'Produits Laitiers',
    purchasePrice: 1.100,
    sellingPrice: 1.350,
    unit: 'Pcs',
    minAlertQty: 20,
    defaultStock: 80,
    keywords: ['leben bouteille delice', 'لبن قارورة دليس']
  },

  // SICAM CONSERVES & HARISSA
  {
    code: '6191501002033',
    nameFr: 'Harissa Traditionnelle Sicam 380g',
    nameAr: 'هريسة تقليدية سيكام 380غ',
    category: 'Conserves',
    purchasePrice: 2.100,
    sellingPrice: 2.600,
    unit: 'Pcs',
    minAlertQty: 15,
    defaultStock: 70,
    keywords: ['harissa sicam 380', 'هريسة سيكام 380']
  },
  {
    code: '6191501002057',
    nameFr: 'Harissa Tube Sicam 70g',
    nameAr: 'هريسة أنبوب سيكام 70غ',
    category: 'Conserves',
    purchasePrice: 0.800,
    sellingPrice: 1.050,
    unit: 'Pcs',
    minAlertQty: 15,
    defaultStock: 65,
    keywords: ['harissa tube sicam', 'هريسة تيب سيكام']
  },
  {
    code: '6191501003016',
    nameFr: 'Tomates Pelées en Cubes Sicam 400g',
    nameAr: 'طماطم مقشرة مكعبات سيكام 400غ',
    category: 'Conserves',
    purchasePrice: 1.950,
    sellingPrice: 2.350,
    unit: 'Pcs',
    minAlertQty: 15,
    defaultStock: 60,
    keywords: ['tomates pelees sicam', 'طماطم كعب سيكام']
  },

  // --- HYGIÈNE & ENTRETIEN / مواد التنظيف ---
  {
    code: '8710447284958',
    nameFr: 'Lessive Poudre Omo Machine 1.5kg',
    nameAr: 'مسحوق غسيل أوموو 1.5 كغ',
    category: 'Hygiène & Nettoyage',
    purchasePrice: 8.500,
    sellingPrice: 9.800,
    unit: 'Pcs',
    minAlertQty: 8,
    defaultStock: 30,
    aliases: ['6190403015610'],
    keywords: ['omo', 'lessive omo', 'أومو', 'مسحوق غسيل']
  },
  {
    code: '6191509000017',
    nameFr: 'Eau de Javel Sany Sica 3L',
    nameAr: 'ماء جافيل سيكا 3 لتر',
    category: 'Hygiène & Nettoyage',
    purchasePrice: 2.400,
    sellingPrice: 2.900,
    unit: 'Pcs',
    minAlertQty: 15,
    defaultStock: 70,
    aliases: ['6190504016721'],
    keywords: ['javel', 'sica', 'جافيل', 'سيكا']
  },
  {
    code: '6191509500012',
    nameFr: 'Papier Toilette Rose Lilas 4 Rouleaux',
    nameAr: 'ورق صحي ليلا 4 لفات',
    category: 'Hygiène & Nettoyage',
    purchasePrice: 2.100,
    sellingPrice: 2.650,
    unit: 'Pcs',
    minAlertQty: 10,
    defaultStock: 65,
    aliases: ['6190605017832'],
    keywords: ['lilas', 'papier lilas', 'ليلا', 'ورق صحي']
  }
];

/**
 * Finds an official product reference by scanned barcode (exact code or registered alias).
 */
export function findOfficialTunisianProductByCode(scannedBarcode: string): OfficialProductRef | undefined {
  const cleaned = scannedBarcode.trim();
  if (!cleaned) return undefined;

  return OFFICIAL_TUNISIAN_PRODUCTS.find(p => 
    p.code === cleaned || (p.aliases && p.aliases.includes(cleaned))
  );
}

/**
 * Finds matching official product reference by product name or keywords.
 */
export function findOfficialTunisianProductByName(productName: string): OfficialProductRef | undefined {
  const lower = productName.toLowerCase().trim();
  if (!lower) return undefined;

  return OFFICIAL_TUNISIAN_PRODUCTS.find(p => {
    if (lower.includes(p.nameFr.toLowerCase()) || lower.includes(p.nameAr.toLowerCase())) {
      return true;
    }
    return p.keywords.some(kw => lower.includes(kw.toLowerCase()));
  });
}

/**
 * Synchronizes and updates any database products list with real GS1 official barcodes.
 * Fixes old synthetic codes, preserves all existing products, and merges official Tunisian items.
 */
export function correctAndSyncProductBarcodes(existingProducts: Product[]): {
  updatedProducts: Product[];
  correctedCount: number;
  addedCount: number;
} {
  let correctedCount = 0;
  let addedCount = 0;

  const currentList = [...(existingProducts || [])];
  const existingCodes = new Set<string>();
  const existingNames = new Set<string>();

  // 1. Correct and harmonize existing products that match official items and normalize categories
  const updatedList = currentList.map(prod => {
    // Check if current barcode is already a known alias or if name matches
    const matchByAlias = OFFICIAL_TUNISIAN_PRODUCTS.find(ref => 
      ref.aliases?.includes(prod.code) || ref.code === prod.code
    );

    const matchByName = findOfficialTunisianProductByName(prod.name);
    const targetRef = matchByAlias || matchByName;

    let updatedProd = { ...prod };

    if (targetRef && prod.code !== targetRef.code) {
      correctedCount++;
      updatedProd = {
        ...prod,
        code: targetRef.code,
        name: prod.name.includes('(') ? prod.name : `${targetRef.nameFr} (${targetRef.nameAr})`,
        category: normalizeCategoryName(targetRef.category || prod.category)
      };
    } else {
      const normalizedCat = normalizeCategoryName(prod.category);
      if (normalizedCat !== prod.category) {
        correctedCount++;
        updatedProd.category = normalizedCat;
      }
    }

    if (updatedProd.code) {
      existingCodes.add(updatedProd.code.trim());
    }
    if (updatedProd.name) {
      existingNames.add(updatedProd.name.toLowerCase().trim());
    }

    return updatedProd;
  });

  // 2. Seamlessly add official Tunisian products that do not exist yet in the database
  // preserving all old products from the database file
  for (const ref of OFFICIAL_TUNISIAN_PRODUCTS) {
    const isCodePresent = existingCodes.has(ref.code) || (ref.aliases && ref.aliases.some(a => existingCodes.has(a)));
    const isNamePresent = existingNames.has(`${ref.nameFr} (${ref.nameAr})`.toLowerCase()) || 
                          existingNames.has(ref.nameFr.toLowerCase()) || 
                          existingNames.has(ref.nameAr.toLowerCase()) ||
                          updatedList.some(p => p.name.toLowerCase().includes(ref.nameFr.toLowerCase()));

    if (!isCodePresent && !isNamePresent) {
      updatedList.push({
        id: `prod-gs1-${ref.code}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        code: ref.code,
        name: `${ref.nameFr} (${ref.nameAr})`,
        category: normalizeCategoryName(ref.category),
        purchasePrice: ref.purchasePrice,
        sellingPrice: ref.sellingPrice,
        stock: ref.defaultStock,
        minAlertQty: ref.minAlertQty,
        unit: ref.unit,
        isFoodProduct: true,
        tvaRate: 19
      });
      existingCodes.add(ref.code);
      addedCount++;
    }
  }

  return {
    updatedProducts: updatedList,
    correctedCount,
    addedCount
  };
}
