import React, { useState, useRef, useEffect } from 'react';
import { BranchMeta } from '../types';
import { useLanguage } from '../utils/LanguageContext';
import { 
  Building2, 
  ChevronDown, 
  Check, 
  Plus, 
  Settings, 
  ArrowRightLeft, 
  BarChart3,
  MapPin,
  Sparkles
} from 'lucide-react';

interface BranchSelectorProps {
  branches: BranchMeta[];
  currentBranchId: string;
  onSwitchBranch: (branchId: string) => void;
  onOpenManager: () => void;
  onOpenStockTransfer: () => void;
  onOpenGlobalOverview: () => void;
  variant?: 'header' | 'sidebar' | 'mobile';
}

export default function BranchSelector({
  branches,
  currentBranchId,
  onSwitchBranch,
  onOpenManager,
  onOpenStockTransfer,
  onOpenGlobalOverview,
  variant = 'header'
}: BranchSelectorProps) {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeBranch: BranchMeta = branches.find(b => b.id === currentBranchId) || {
    id: currentBranchId,
    name: 'الفرع الرئيسي',
    createdAt: '',
    city: undefined,
    address: undefined,
    phone: undefined
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (variant === 'sidebar') {
    return (
      <div className="px-4 py-2 border-b border-slate-800 space-y-1.5" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            <span>{language === 'ar' ? 'الفرع النشط' : 'Branche Active'}</span>
          </span>
          <button
            type="button"
            onClick={onOpenManager}
            className="text-blue-400 hover:text-blue-300 transition-colors text-[9px] cursor-pointer"
            title={language === 'ar' ? 'إدارة الفروع' : 'Gérer'}
          >
            {language === 'ar' ? 'إدارة الفروع' : 'Gérer'}
          </button>
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between gap-2 p-2 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-white text-xs font-bold transition-all cursor-pointer text-start shadow-xs"
          >
            <div className="min-w-0">
              <span className="truncate block font-bold text-slate-100">
                🏢 {activeBranch.name}
              </span>
              {activeBranch.city && (
                <span className="text-[9.5px] text-slate-500 block truncate">
                  📍 {activeBranch.city}
                </span>
              )}
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 z-50 space-y-1 text-xs">
              <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-0.5">
                {branches.map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      onSwitchBranch(b.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-start transition-colors cursor-pointer ${
                      b.id === currentBranchId 
                        ? 'bg-blue-600/20 text-blue-300 font-bold' 
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="truncate">🏢 {b.name}</span>
                    {b.id === currentBranchId && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                  </button>
                ))}
              </div>

              <div className="pt-1 border-t border-slate-800 flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenManager();
                  }}
                  className="w-full flex items-center gap-1.5 p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-950/30 rounded-lg text-[11px] font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'إضافة أو إدارة الفروع' : 'Gérer / Nouvelle Branche'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenStockTransfer();
                  }}
                  className="w-full flex items-center gap-1.5 p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/30 rounded-lg text-[11px] font-bold cursor-pointer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'تحويل بضاعة بين الفروع' : 'Transfert de Stock'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Header / Topbar Variant
  return (
    <div className="relative" ref={dropdownRef} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 py-1.5 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-250 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-98 select-none"
        title={language === 'ar' ? 'تبديل وإدارة الفروع' : 'Changer de Succursale'}
      >
        <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-2xs">
          <Building2 className="w-3.5 h-3.5" />
        </div>

        <div className="text-start min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate max-w-[130px] font-bold text-slate-900 dark:text-white block leading-tight">
              {activeBranch.name}
            </span>
            <span className="px-1.5 py-0.2 bg-blue-600 text-white rounded text-[8.5px] font-bold uppercase shrink-0">
              {language === 'ar' ? 'فرع' : 'POS'}
            </span>
          </div>
          {activeBranch.city && (
            <span className="text-[9px] text-slate-400 dark:text-slate-500 block truncate font-medium">
              📍 {activeBranch.city}
            </span>
          )}
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 rtl:left-0 rtl:right-auto mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 space-y-2 text-xs animate-in fade-in zoom-in-95">
          <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {language === 'ar' ? 'الفروع المسجلة' : 'Succursales disponibles'} ({branches.length})
            </span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenGlobalOverview();
              }}
              className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <BarChart3 className="w-3 h-3" />
              <span>{language === 'ar' ? 'التقرير الموحد' : 'Rapport'}</span>
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-1">
            {branches.map(b => {
              const isSelected = b.id === currentBranchId;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    onSwitchBranch(b.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-start transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold truncate">🏢 {b.name}</span>
                      {b.isMain && (
                        <span className="text-[8px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold">
                          {language === 'ar' ? 'رئيسي' : 'Siège'}
                        </span>
                      )}
                    </div>
                    {b.address && (
                      <span className="text-[9.5px] text-slate-400 block truncate mt-0.5">
                        {b.address} {b.city ? `(${b.city})` : ''}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 space-y-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenStockTransfer();
              }}
              className="w-full flex items-center gap-2 p-2 bg-indigo-50/60 dark:bg-indigo-950/30 hover:bg-indigo-100/60 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
              <span>{language === 'ar' ? '🔄 تحويل بضاعة بين الفروع' : '🔄 Transfert de Stock'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenManager();
              }}
              className="w-full flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-slate-500" />
                <span>{language === 'ar' ? '⚙️ إدارة وتعديل الفروع' : '⚙️ Gestion des Branches'}</span>
              </span>
              <Plus className="w-3.5 h-3.5 text-blue-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
