import { BookOpen, Layers, Shield } from 'lucide-react';
import { APP_VERSION } from '../../constants/version.ts';
import { useDeckStore } from '../../store/deckStore.ts';

interface NavbarProps {
  currentTab: 'collection' | 'deck';
  onTabChange: (tab: 'collection' | 'deck') => void;
}

export function Navbar({ currentTab, onTabChange }: NavbarProps) {
  const activeDeckId = useDeckStore((s) => s.activeDeckId);
  const activeDeck = useDeckStore((s) => s.decks.find((d) => d.id === activeDeckId));

  const mainCount = activeDeck ? activeDeck.mainDeck.reduce((s, c) => s + c.count, 0) : 0;
  const lifeCount = activeDeck ? activeDeck.lifeDeck.reduce((s, c) => s + c.count, 0) : 0;

  return (
    <>
      {/* Top Navbar (Desktop & Tablet) */}
      <header className="sticky top-0 z-40 bg-[#090a0f]/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-700 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-950/40 text-white font-extrabold text-sm font-['Kanit']">
              BOTC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base text-slate-100 font-['Kanit'] tracking-wide">
                  Talingchan <span className="text-rose-500 font-medium">Count</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                  v{APP_VERSION}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium hidden sm:block">
                Battle of Talingchan • tcgcount.com
              </div>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 bg-[#121522] p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => onTabChange('collection')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'collection'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              สมุดสะสมการ์ด (Collection)
            </button>

            <button
              onClick={() => onTabChange('deck')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'deck'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-4 h-4" />
              ระบบจัดเด็ค (Deck Builder)
            </button>
          </nav>

          {/* Right: Active Deck Status Indicator */}
          <div className="flex items-center gap-2">
            {activeDeck ? (
              <button
                onClick={() => onTabChange('deck')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#121522] hover:bg-[#181c2e] border border-slate-800 text-xs transition-colors"
                title="คลิกเพื่อเปิดดูเด็คที่กำลังใช้งาน"
              >
                <Shield className="w-3.5 h-3.5 text-rose-400" />
                <span className="font-semibold text-slate-200 max-w-[100px] sm:max-w-[140px] truncate">
                  {activeDeck.name}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                    mainCount === 50 && lifeCount === 5
                      ? 'bg-emerald-950/80 text-emerald-400'
                      : 'bg-amber-950/80 text-amber-300'
                  }`}
                >
                  {mainCount}/50
                </span>
              </button>
            ) : (
              <button
                onClick={() => onTabChange('deck')}
                className="text-xs px-3 py-1.5 rounded-xl bg-[#121522] hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              >
                + สร้างเด็ค
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Fixed for mobile thumbs) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090a0f]/95 backdrop-blur-lg border-t border-slate-800/90 px-4 py-2 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => onTabChange('collection')}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all ${
            currentTab === 'collection' ? 'text-rose-500 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px]">สมุดสะสม</span>
        </button>

        <button
          onClick={() => onTabChange('deck')}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all ${
            currentTab === 'deck' ? 'text-rose-500 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-[10px]">จัดเด็ค</span>
        </button>
      </div>
    </>
  );
}
