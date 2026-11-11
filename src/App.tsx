import { useState, useEffect } from 'react';
import { Navbar, type AppTab } from './components/layout/Navbar.tsx';
import { CollectionPage } from './components/collection/CollectionPage.tsx';
import { DeckPage } from './components/deck/DeckPage.tsx';
import { PlaymatPage } from './components/playmat/PlaymatPage.tsx';
import { APP_VERSION } from './constants/version.ts';

export default function App() {
  const [currentTab, setCurrentTab] = useState<AppTab>('collection');

  useEffect(() => {
    document.documentElement.dataset.gameMode = currentTab;
  }, [currentTab]);

  return (
    <div
      className={`w-full max-w-full overflow-x-hidden bg-[#090a0f] text-slate-100 flex flex-col font-['Prompt',sans-serif] ${
        currentTab === 'playmat' ? 'h-dvh overflow-hidden pb-14 md:pb-0' : 'min-h-screen'
      }`}
    >
      {/* Top Navbar & Mobile Bottom Bar */}
      <Navbar currentTab={currentTab} onTabChange={setCurrentTab} />

      {/* Main Content Area */}
      {currentTab === 'playmat' ? (
        <main className="flex-1 min-h-0 w-full max-w-full overflow-hidden flex flex-col">
          <PlaymatPage />
        </main>
      ) : (
        <>
          <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 py-4 pb-20 md:pb-8 overflow-x-hidden">
            {currentTab === 'collection' ? (
              <CollectionPage />
            ) : (
              <DeckPage onOpenPlaymat={() => setCurrentTab('playmat')} />
            )}
          </main>

          {/* Footer */}
          <footer className="border-t border-slate-800/80 bg-[#090a0f] py-6 text-center text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-4 space-y-1">
              <p>
                Talingchan Count Tracker v{APP_VERSION} • ออกแบบสำหรับแฟนการ์ดเกม{' '}
                <strong className="text-slate-400">Battle of Talingchan</strong> (PASULOL x Team YUK)
              </p>
              <p className="text-[11px] text-slate-600">
                ระบบภายใต้เครือข่าย <span className="text-rose-400 font-mono">talingchan.tcgcount.com</span> • สงวนลิขสิทธิ์เนื้อหาและภาพการ์ดโดยเจ้าของลิขสิทธิ์ทางการ
              </p>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
