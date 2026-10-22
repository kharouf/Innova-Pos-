import React, { useState, useRef, useEffect } from 'react';
import { Camera, RotateCcw, X, Upload, CheckCircle2, AlertTriangle, Sparkles, Loader2, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ExpiryDateCameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDateExtracted: (date: string, rawText?: string) => void;
  language: 'fr' | 'ar';
  productName?: string;
  initialDate?: string;
}

export const ExpiryDateCameraScannerModal: React.FC<ExpiryDateCameraScannerModalProps> = ({
  isOpen,
  onClose,
  onDateExtracted,
  language,
  productName,
  initialDate
}) => {
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [extractionResult, setExtractionResult] = useState<{
    found: boolean;
    date: string;
    rawText: string;
    confidence: string;
    description: string;
  } | null>(null);
  const [editedDate, setEditedDate] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Play audio feedback
  const playBeep = (type: 'success' | 'error' = 'success') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch {
      // AudioContext may be blocked or unsupported
    }
  };

  // Start Camera Stream
  const startCamera = async (facing: 'environment' | 'user' = facingMode) => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setErrorMessage(null);

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(e => console.log('Video play error:', e));
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setErrorMessage(
        language === 'ar'
          ? 'تعذر الوصول إلى الكاميرا. يرجى التأكد من منح الإذن أو استخدام خيار تحميل صورة.'
          : 'Impossible d\'accéder à la caméra. Vérifiez les autorisations ou importez une photo.'
      );
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setExtractionResult(null);
      setErrorMessage(null);
      setEditedDate(initialDate || '');
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const handleToggleFacingMode = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Send photo to backend for AI OCR Extraction
  const analyzeImage = async (dataUrl: string) => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    setExtractionResult(null);

    try {
      const response = await fetch('/api/extract-expiry-date', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de l\'analyse');
      }

      setExtractionResult(data);
      if (data.found && data.date) {
        setEditedDate(data.date);
        playBeep('success');
      } else {
        playBeep('error');
      }
    } catch (err: any) {
      console.error('Analysis error:', err);
      setErrorMessage(
        language === 'ar'
          ? `فشل تحليل الصورة: ${err.message || 'خطأ غير متوقع'}`
          : `Échec de l'analyse : ${err.message || 'Erreur inconnue'}`
      );
      playBeep('error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Capture frame from live video
  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);
    stopCamera();
    analyzeImage(dataUrl);
  };

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCapturedImage(dataUrl);
        stopCamera();
        analyzeImage(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setExtractionResult(null);
    setErrorMessage(null);
    startCamera(facingMode);
  };

  const handleConfirm = () => {
    if (!editedDate) {
      alert(language === 'ar' ? 'يرجى تحديد أو إدخال تاريخ صالح' : 'Veuillez renseigner une date valide');
      return;
    }
    onDateExtracted(editedDate, extractionResult?.rawText);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md no-print">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden text-slate-800"
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-rose-700 via-rose-600 to-rose-800 p-4 text-white flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-sm border border-white/20">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black tracking-tight">
                    {language === 'ar'
                      ? 'مسح تاريخ الصلاحية بالكاميرا (ذكاء اصطناعي)'
                      : 'Scanner la Date d\'Expiration (IA)'}
                  </h3>
                  <span className="bg-white/25 text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-200" />
                    AI Vision
                  </span>
                </div>
                {productName && (
                  <p className="text-[11px] text-rose-100 font-medium truncate max-w-[280px] mt-0.5">
                    {productName}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors cursor-pointer text-white"
              title={language === 'ar' ? 'إغلاق' : 'Fermer'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Viewport / Body */}
          <div className="p-4 bg-slate-900 flex flex-col items-center justify-center relative min-h-[320px] max-h-[460px] overflow-hidden">
            {capturedImage ? (
              /* Preview Mode */
              <div className="relative w-full max-w-[340px] aspect-[4/3] rounded-2xl overflow-hidden border-2 border-slate-700 shadow-2xl bg-black flex items-center justify-center">
                <img
                  src={capturedImage}
                  alt="Captured expiry date"
                  className="w-full h-full object-contain"
                />

                {/* AI Analyzing Overlay */}
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center gap-3 text-white p-4">
                    <div className="relative flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full border-4 border-rose-500/30 border-t-rose-500 animate-spin" />
                      <Sparkles className="w-6 h-6 text-rose-400 absolute animate-pulse" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-xs font-bold text-rose-200 tracking-wide">
                        {language === 'ar'
                          ? 'جاري فحص وقراءة تاريخ الصلاحية...'
                          : 'Analyse & reconnaissance de la date par l\'IA...'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {language === 'ar'
                          ? 'البحث عن DLC, EXP, تاريخ الانتهاء...'
                          : 'Détection EXP, DLC, DLUO, Best Before...'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Live Camera Stream */
              <div className="relative w-full max-w-[340px] aspect-[4/3] rounded-2xl overflow-hidden border-2 border-rose-500/60 shadow-2xl bg-black flex items-center justify-center group">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />

                {/* Packaging Target Reticle */}
                <div className="absolute inset-6 border-2 border-dashed border-rose-400/80 rounded-xl pointer-events-none flex flex-col items-center justify-center">
                  {/* Scanning Laser Animation */}
                  <motion.div
                    className="w-full h-0.5 bg-rose-400 shadow-[0_0_12px_#f43f5e]"
                    animate={{ y: [-70, 70, -70] }}
                    transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                  />
                  <span className="absolute bottom-2 bg-black/60 backdrop-blur-xs text-white text-[9.5px] font-bold px-2 py-0.5 rounded-full pointer-events-none">
                    {language === 'ar' ? 'ضع تاريخ الانتهاء هنا' : 'Placez la date ici'}
                  </span>
                </div>

                {/* Camera controls overlay */}
                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleToggleFacingMode}
                    className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-xl backdrop-blur-md transition-all cursor-pointer border border-white/20"
                    title={language === 'ar' ? 'تبديل الكاميرا' : 'Changer de caméra'}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="mt-3 w-full max-w-sm bg-rose-500/20 border border-rose-500/40 text-rose-200 p-2.5 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="leading-tight">{errorMessage}</span>
              </div>
            )}

            {/* Instruction footnote */}
            {!capturedImage && (
              <div className="mt-2.5 max-w-sm text-center space-y-1">
                <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                  {language === 'ar'
                    ? 'وجه الكاميرا نحو مكان التاريخ المطبوع على الغطاء أو العبوة ثم انقر زر التقاط'
                    : 'Pointez la caméra vers l\'inscription de date sur le produit puis déclenchez.'}
                </p>
                <p className="text-[9.5px] text-rose-300/90 font-mono">
                  {language === 'ar'
                    ? '💡 يدعم تنسيق الحليب والمواد الغذائية (Vitalait / Délice): يستخرج "01 01 27" ويتجاهل تاريخ الصنع (DF)'
                    : '💡 Supporte le format Vitalait / Délice : extrait "01 01 27" et ignore la date de fabrication (DF)'}
                </p>
              </div>
            )}
          </div>

          {/* Results Card (when analyzed) */}
          {extractionResult && (
            <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
              {extractionResult.found && extractionResult.date ? (
                <div className="bg-emerald-50 border-2 border-emerald-500/50 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-800 font-black text-xs sm:text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>{language === 'ar' ? 'تم التعرف على تاريخ الصلاحية بنجاح!' : 'Date d\'expiration reconnue avec succès !'}</span>
                    </div>
                    {extractionResult.confidence && (
                      <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        {extractionResult.confidence === 'high' ? '⭐ Haute' : 'Moyenne'}
                      </span>
                    )}
                  </div>

                  {extractionResult.rawText && (
                    <div className="bg-white/80 border border-emerald-200 rounded-lg px-2.5 py-1 text-[11px] font-mono text-emerald-900 flex items-center justify-between">
                      <span className="text-slate-500 font-sans">{language === 'ar' ? 'النص المقروء:' : 'Texte détecté :'}</span>
                      <strong className="tracking-wide">"{extractionResult.rawText}"</strong>
                    </div>
                  )}

                  {extractionResult.description && (
                    <p className="text-[10.5px] text-slate-600 font-sans italic">
                      💡 {extractionResult.description}
                    </p>
                  )}

                  {/* Confirmed / Editable Date Field */}
                  <div className="pt-2 border-t border-emerald-200/60 flex items-center gap-3">
                    <label className="text-xs font-bold text-slate-700 shrink-0 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      <span>{language === 'ar' ? 'التاريخ المعتمد :' : 'Date retenue :'}</span>
                    </label>
                    <input
                      type="date"
                      value={editedDate}
                      onChange={(e) => setEditedDate(e.target.value)}
                      className="flex-1 bg-white border border-emerald-400 rounded-xl px-3 py-1.5 text-sm font-bold font-mono text-slate-900 shadow-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 space-y-2 text-amber-900 text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>
                      {language === 'ar'
                        ? 'لم يتم العثور على تاريخ واضح في الصورة'
                        : 'Aucune date d\'expiration lisible détectée'}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    {language === 'ar'
                      ? 'تأكد من أن الأرقام واضحة وغير مشوشة، يمكنك التقاط صورة أخرى أو إدخال التاريخ مباشرة أدناه:'
                      : 'Assurez-vous que l\'impression est nette et lisible. Vous pouvez reprendre une photo ou saisir la date manuellement ci-dessous :'}
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <label className="text-xs font-bold text-slate-700 shrink-0">
                      {language === 'ar' ? 'إدخال التاريخ يدويًا :' : 'Saisie manuelle :'}
                    </label>
                    <input
                      type="date"
                      value={editedDate}
                      onChange={(e) => setEditedDate(e.target.value)}
                      className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
            {capturedImage ? (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  disabled={isAnalyzing}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{language === 'ar' ? 'إعادة التقاط' : 'Reprendre'}</span>
                </button>

                <div className="flex items-center gap-2 flex-1 justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Annuler'}
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isAnalyzing || !editedDate}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center gap-1.5 border-b-2 border-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{language === 'ar' ? 'تطبيق التاريخ ✓' : 'Appliquer la date ✓'}</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    title={language === 'ar' ? 'تحميل صورة من الملفات' : 'Importer une image'}
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-600" />
                    <span>{language === 'ar' ? 'رفع صورة' : 'Importer'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Annuler'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCapture}
                  className="flex-1 max-w-[240px] px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2 border-b-2 border-rose-900"
                >
                  <Camera className="w-4 h-4" />
                  <span>{language === 'ar' ? 'التقاط وقراءة التاريخ 📸' : 'Capturer & Analyser 📸'}</span>
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
