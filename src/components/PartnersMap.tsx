import React, { useState, useMemo } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useAdvancedMarkerRef } from '@vis.gl/react-google-maps';
import { Partner } from '../types';
import { useLanguage } from '../utils/LanguageContext';
import { MapPin, Phone, User, Store, ExternalLink, RefreshCw, ZoomIn } from 'lucide-react';

const API_KEY =
  (typeof process !== 'undefined' ? process.env?.GOOGLE_MAPS_PLATFORM_KEY : null) ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

interface PartnersMapProps {
  partners: Partner[];
  formatCurrency: (value: number) => string;
}

// Coordinate parsing helper
export function parseCoordinates(locStr: string): { lat: number; lng: number } | null {
  if (!locStr) return null;
  // Match standard decimal coordinates "36.7525, 3.04197" or inside a URL like "@36.7525,3.0419"
  const regex = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/;
  const match = locStr.match(regex);
  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }
  return null;
}

export default function PartnersMap({ partners, formatCurrency }: PartnersMapProps) {
  const { language } = useLanguage();
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 36.7525, lng: 3.04197 }); // defaulted to Algiers center
  const [mapZoom, setMapZoom] = useState<number>(10);

  // Filter partners with valid geographic coordinates
  const partnersWithCoords = useMemo(() => {
    return partners
      .map(p => {
        const coords = p.location ? parseCoordinates(p.location) : null;
        return { ...p, coords };
      })
      .filter((p): p is Partner & { coords: { lat: number; lng: number } } => p.coords !== null);
  }, [partners]);

  // Handle center and highlight action
  const handleFocusPartner = (p: Partner & { coords: { lat: number; lng: number } }) => {
    setMapCenter(p.coords);
    setMapZoom(14);
    setSelectedPartnerId(p.id);
  };

  if (!hasValidKey) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-2xl mx-auto shadow-2xs space-y-6 select-none leading-relaxed">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center">
            <MapPin className="w-6 h-6" />
          </div>
          <h2 className="text-base font-extrabold text-slate-900 font-sans">
            {language === 'ar' ? 'مفتاح ترخيص خرائط جوجل مطلوب' : 'Clef d\'API Google Maps requise'}
          </h2>
          <p className="text-xs text-slate-400">
            {language === 'ar' 
              ? 'تتطلب هذه الميزة تكوين مفتاح API صالح لمنصة خرائط جوجل.' 
              : 'Pour afficher la carte interactive, assurez-vous d\'associer votre clef de licence Google Maps.'}
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg space-y-3 text-xs">
          <p className="font-bold text-slate-800">
            {language === 'ar' ? 'خطوات التفعيل السريع :' : 'Instructions d\'activation rapide :'}
          </p>
          <ol className="list-decimal list-inside space-y-2 text-slate-650 font-medium">
            <li>
              <a 
                href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-semibold"
              >
                {language === 'ar' ? 'اضغط هنا للحصول على مفتاح API من جوجل' : 'Obtenez une clef API certifiée Google'}
              </a>
            </li>
            <li>
              {language === 'ar' 
                ? 'افتح الإعدادات (أيقونة الترس ⚙️ في الزاوية العلوية اليمنى من شاشتك).' 
                : 'Ouvrez les paramètres généraux (icône engrenage ⚙️ en haut à droite).'}
            </li>
            <li>
              {language === 'ar' 
                ? 'اختر خيار Secrets أو مفاتيح البيئة.' 
                : 'Sélectionnez l\'onglet Secrets.'}
            </li>
            <li>
              {language === 'ar' 
                ? 'أضف متغيراً جديداً باسم GOOGLE_MAPS_PLATFORM_KEY والصق كود الـ API الخاص بك.' 
                : 'Créez une variable nommée GOOGLE_MAPS_PLATFORM_KEY et collez-y votre clef.'}
            </li>
          </ol>
          <p className="text-[10px] text-rose-600 font-bold bg-rose-50 p-2 rounded">
            ⚠️ {language === 'ar' 
              ? 'سيعاد بناء النظام تلقائياً بعد إضافة المفتاح دون الحاجة لتحديث الصفحة يدوياً.' 
              : 'Le système s\'actualisera automatiquement et chargera la carte dès l\'enregistrement du secret.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[500px]">
      
      {/* Sidebar - Partners List with Valid Location */}
      <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-4">
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 font-mono mb-2">
            {language === 'ar' ? 'الشركاء المفعلون على الخريطة' : 'Partenaires localisés'} ({partnersWithCoords.length})
          </h3>
          <p className="text-[11px] text-slate-400 leading-tight mb-4">
            {language === 'ar' 
              ? 'قائمة العملاء والموردين الذين يملكون إحداثيات صحيحة في النظام.' 
              : 'Liste des contacts disposant de coordonnées GPS valides dans leur fiche.'}
          </p>
          
          <div className="max-h-[380px] overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
            {partnersWithCoords.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                <MapPin className="w-8 h-8 stroke-1 mx-auto mb-2 text-slate-350" />
                <p>{language === 'ar' ? 'لا يوجد أي شريك بإحداثيات صحيحة حالياً.' : 'Aucun partenaire n\'a de coordonnées valides.'}</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {language === 'ar' 
                    ? 'قم بتعديل بيانات الشريك وأدخل إحداثيات جغرافية (مثال: 36.75, 3.04)' 
                    : 'Modifiez une fiche pour y ajouter des coordonnées GPS (Ex : 36.75, 3.04)'}
                </p>
              </div>
            ) : (
              partnersWithCoords.map(p => {
                const absBalance = Math.abs(p.currentBalance);
                const isSelected = selectedPartnerId === p.id;
                return (
                  <div 
                    key={p.id}
                    onClick={() => handleFocusPartner(p)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer relative group ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50/40 shadow-3xs' 
                        : 'border-slate-150 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-1">
                      <div>
                        <span className={`text-[8px] px-1 py-0.5 rounded uppercase font-black tracking-wider ${
                          p.type === 'client' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-indigo-100 text-indigo-805'
                        }`}>
                          {p.type === 'client' ? (language === 'ar' ? 'عميل' : 'Client') : (language === 'ar' ? 'مورد' : 'Fournisseur')}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 mt-1 group-hover:text-blue-600 transition-colors">
                          {p.name}
                        </h4>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-mono font-black text-slate-850">
                          {formatCurrency(absBalance)}
                        </span>
                        <span className="block text-[8px] text-slate-400 font-bold">
                          {p.currentBalance !== 0 ? (language === 'ar' ? 'مستحق' : 'Solde') : (language === 'ar' ? 'مستقر' : 'À jour')}
                        </span>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500 truncate mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{p.address || (language === 'ar' ? 'لا يوجد عنوان نصي' : 'Aucune adresse texte')}</span>
                    </p>

                    <button 
                      type="button"
                      className="absolute bottom-2 right-2 p-1 bg-white border border-slate-200 rounded text-slate-500 hover:text-blue-600 hover:border-blue-300 opacity-0 group-hover:opacity-100 transition-all shadow-3xs flex items-center justify-center"
                      title={language === 'ar' ? 'تركيز الخريطة' : 'Centrer la carte'}
                    >
                      <ZoomIn className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150 text-[10px] text-slate-400 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span>
            {language === 'ar' 
              ? 'خرائط تفاعلية لمتابعة جغرافية الزبائن وتنسيق الشحن والمبيعات.' 
              : 'Cartographie géolocalisée pour harmoniser vos livraisons et tournées de ventes.'}
          </span>
        </div>
      </div>

      {/* Map display block */}
      <div className="lg:col-span-8 bg-slate-900 rounded-xl overflow-hidden border border-slate-800 min-h-[450px] lg:min-h-[500px] relative shadow-md">
        <APIProvider apiKey={API_KEY} version="weekly">
          <Map
            center={mapCenter}
            zoom={mapZoom}
            onCenterChanged={(ev) => setMapCenter(ev.detail.center)}
            onZoomChanged={(ev) => setMapZoom(ev.detail.zoom)}
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
            gestureHandling="cooperative"
            disableDefaultUI={false}
          >
            {partnersWithCoords.map(p => (
              <MarkerWithInfoWindow 
                key={p.id} 
                partner={p} 
                isSelected={selectedPartnerId === p.id}
                onSelect={() => setSelectedPartnerId(p.id)}
                onClose={() => {
                  if (selectedPartnerId === p.id) setSelectedPartnerId(null);
                }}
                formatCurrency={formatCurrency}
                language={language}
              />
            ))}
          </Map>
        </APIProvider>
      </div>

    </div>
  );
}

// Sub-component handling Interactive Marker & InfoWindow mapping correctly
interface MarkerWithInfoWindowProps {
  key?: string;
  partner: Partner & { coords: { lat: number; lng: number } };
  isSelected: boolean;
  onSelect: () => void;
  onClose: () => void;
  formatCurrency: (value: number) => string;
  language: string;
}

function MarkerWithInfoWindow({ 
  partner, 
  isSelected, 
  onSelect, 
  onClose, 
  formatCurrency, 
  language 
}: MarkerWithInfoWindowProps) {
  const [markerRef, marker] = useAdvancedMarkerRef();

  // Pin colors: blue for clients, purple for suppliers
  const pinBackground = partner.type === 'client' ? '#1D4ED8' : '#4338CA';
  const glyphText = partner.type === 'client' ? 'C' : 'F';

  return (
    <>
      <AdvancedMarker 
        ref={markerRef} 
        position={partner.coords} 
        onClick={onSelect}
        title={partner.name}
      >
        <Pin 
          background={pinBackground} 
          borderColor="#ffffff" 
          glyphColor="#ffffff" 
          glyph={glyphText}
          scale={isSelected ? 1.2 : 1.0}
        />
      </AdvancedMarker>
      {isSelected && (
        <InfoWindow 
          anchor={marker} 
          onCloseClick={onClose}
          headerContent={
            <div className="font-sans font-bold text-xs text-slate-900 border-b border-slate-100 pb-1 flex items-center justify-between w-full min-w-[200px]">
              <span>{partner.name}</span>
              <span className={`text-[8px] px-1 py-0.5 rounded font-black ${
                partner.type === 'client' ? 'bg-blue-50 text-blue-700' : 'bg-indigo-50 text-indigo-700'
              }`}>
                {partner.type === 'client' ? (language === 'ar' ? 'زبون' : 'Client') : (language === 'ar' ? 'مورد' : 'Fournisseur')}
              </span>
            </div>
          }
        >
          <div className="font-sans text-[11px] text-slate-700 space-y-2 p-1 leading-relaxed">
            {partner.address && (
              <p className="flex items-start gap-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>{partner.address}</span>
              </p>
            )}

            {partner.phone && (
              <p className="flex items-center gap-1 font-mono font-semibold">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{partner.phone}</span>
              </p>
            )}

            <div className="bg-slate-50 p-1.5 rounded flex items-center justify-between">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">
                {language === 'ar' ? 'الرصيد المالي :' : 'Solde :'}
              </span>
              <span className={`font-mono font-bold font-black ${
                partner.currentBalance !== 0 
                  ? partner.type === 'client' 
                    ? 'text-amber-600' 
                    : 'text-rose-600'
                  : 'text-slate-500'
              }`}>
                {formatCurrency(Math.abs(partner.currentBalance))}
              </span>
            </div>

            {partner.location && partner.location.startsWith('http') && (
              <a
                href={partner.location}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
                className="flex items-center justify-center gap-1 w-full bg-blue-600 hover:bg-blue-700 text-white rounded py-1 px-2 font-bold font-sans text-[10px] transition-colors shadow-3xs"
              >
                <ExternalLink className="w-3 h-3 text-white" />
                <span>{language === 'ar' ? 'ملاحة سريعة خرائط Google' : 'Navigation Google Maps'}</span>
              </a>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
}
