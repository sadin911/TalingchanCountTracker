import { BookOpen, Layers, Shield, Swords } from 'lucide-react';
import { APP_VERSION } from '../../constants/version.ts';
import { useDeckStore } from '../../store/deckStore.ts';
import { AccountMenu } from './AccountMenu.tsx';

export type AppTab = 'collection' | 'deck' | 'playmat';

interface NavbarProps {
  currentTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

export function Navbar({ currentTab, onTabChange }: NavbarProps) {
  const activeDeckId = useDeckStore((s) => s.activeDeckId);
  const activeDeck = useDeckStore((s) => s.decks.find((d) => d.id === activeDeckId));

  const mainCount = activeDeck ? activeDeck.mainDeck.reduce((s, c) => s + c.count, 0) : 0;
  const lifeCount = activeDeck ? activeDeck.lifeDeck.reduce((s, c) => s + c.count, 0) : 0;

  return (
    <>
      {/* Top Navbar (Desktop & Tablet) */}
      <header className="sticky top-0 z-40 w-full max-w-full bg-[#090a0f]/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4 min-w-0">
          {/* Logo & Branding */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-rose-700 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-950/40 text-white font-extrabold text-xs sm:text-sm font-['Kanit'] shrink-0">
              BOTC
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-extrabold text-sm sm:text-base text-slate-100 font-['Kanit'] tracking-wide truncate">
                  Talingchan <span className="text-rose-500 font-medium">Count</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono shrink-0">
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
              data-testid="nav-tab-collection"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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
              data-testid="nav-tab-deck"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentTab === 'deck'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-4 h-4" />
              ระบบจัดเด็ค (Deck Builder)
            </button>

            <button
              onClick={() => onTabChange('playmat')}
              data-testid="nav-tab-playmat"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentTab === 'playmat'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Swords className="w-4 h-4" />
              โหมดซ้อม (Playmat)
            </button>
          </nav>

          {/* Right: Active Deck Status Indicator + Account Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {activeDeck ? (
              <button
                onClick={() => onTabChange('deck')}
                className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-xl bg-[#121522] hover:bg-[#181c2e] border border-slate-800 text-xs transition-colors cursor-pointer"
                title="คลิกเพื่อเปิดดูเด็คที่กำลังใช้งาน"
              >
                <Shield className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="font-semibold text-slate-200 max-w-[70px] sm:max-w-[130px] truncate hidden xs:inline sm:inline">
                  {activeDeck.name}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0 ${
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
                className="text-xs px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#121522] hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                + สร้างเด็ค
              </button>
            )}

            <AccountMenu />
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090a0f]/95 backdrop-blur-lg border-t border-slate-800/90 px-4 py-2 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => onTabChange('collection')}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all ${
            currentTab === 'collection'
              ? 'text-rose-500 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px]">สมุดสะสม</span>
        </button>

        <button
          onClick={() => onTabChange('deck')}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all ${
            currentTab === 'deck'
              ? 'text-rose-500 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-[10px]">จัดเด็ค</span>
        </button>

        <button
          onClick={() => onTabChange('playmat')}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all ${
            currentTab === 'playmat'
              ? 'text-rose-500 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Swords className="w-5 h-5" />
          <span className="text-[10px]">โหมดซ้อม</span>
        </button>
      </div>
    </>
  );
}
