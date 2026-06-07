import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src', 'components', 'POS.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Use a regex matching the exact broken portion
const targetRegex = /onClick\(\) => \{\s*if\s*\(cart\.length\s*>\s*0\)\s*\{\s*const confirmClear\s*=\s*window\.confirm\(\s*language\s*===\s*'ar'\s*\?\s*'تنبيه:\s*تغيير\s*الوضع[\s\S]*?<div\s+className="space-y-3\s+max-h-56\s+overflow-y-auto\s+custom-scrollbar\s+pr-1\s+divide-y\s+divide-slate-150\/75">/;

if (targetRegex.test(content)) {
  console.log("Match found with multi-line regex! Performing replacement...");
  const replacement = `onClick={() => {
                  if (cart.length > 0) {
                    const confirmClear = window.confirm(
                      language === 'ar' 
                        ? 'تنبيه: تغيير الوضع سيقوم بإفراغ السلة الحالية. هل أنت متأكد؟' 
                        : 'Attention: Changer de mode videra le panier actuel. Continuer ?'
                    );
                    if (!confirmClear) return;
                    setCart([]);
                  }
                  setIsReturnMode(!isReturnMode);
                }}
                className={\`px-3 py-1 text-[10px] font-extrabold rounded-md uppercase tracking-wider cursor-pointer \${
                  isReturnMode 
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs' 
                    : 'bg-white border border-slate-250 hover:bg-slate-100 text-slate-700'
                }\`}
              >
                {language === 'ar' ? (isReturnMode ? 'عادي 🛒' : 'إرجاع ↩') : (isReturnMode ? 'NORMAL 🛒' : 'RETOUR ↩')}
              </button>
            </div>

            <div className="space-y-3 max-h-56 overflow-y-auto custom-scrollbar pr-1 divide-y divide-slate-150/75">`;

  content = content.replace(targetRegex, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Successfully fixed POS.tsx!");
} else {
  console.log("Error: Target regex pattern not found in POS.tsx");
}
