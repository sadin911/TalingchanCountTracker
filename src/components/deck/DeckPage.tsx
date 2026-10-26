import { useState } from 'react';
import { Plus, Trash2, Edit2, Download, Upload, ShoppingBag, Search, Layers, Heart, Check } from 'lucide-react';
import { useDeckStore } from '../../store/deckStore.ts';
import type { TalingchanCard } from '../../types/card.ts';
import cardDataRaw from '../../data/talingchanCards.json';
import { DeckTray } from './DeckTray.tsx';
import { DeckAnalytics } from './DeckAnalytics.tsx';
import { MissingCardsModal } from './MissingCardsModal.tsx';
import { exportDeckToText, importDeckFromText } from '../../utils/deckExportImport.ts';

const allCards = cardDataRaw as TalingchanCard[];

export function DeckPage() {
  const decks = useDeckStore((s) => s.decks);
  const activeDeckId = useDeckStore((s) => s.activeDeckId);
  const setActiveDeck = useDeckStore((s) => s.setActiveDeck);
  const createDeck = useDeckStore((s) => s.createDeck);
  const deleteDeck = useDeckStore((s) => s.deleteDeck);
  const renameDeck = useDeckStore((s) => s.renameDeck);
  const addCardToMain = useDeckStore((s) => s.addCardToMain);
  const addCardToLife = useDeckStore((s) => s.addCardToLife);
  const importDeck = useDeckStore((s) => s.importDeck);

  const [isCreatingDeck, setIsCreatingDeck] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTextValue, setImportTextValue] = useState('');
  const [exportCopied, setExportCopied] = useState(false);
  const [cardSearchQuery, setCardSearchQuery] = useState('');

  const activeDeck = decks.find((d) => d.id === activeDeckId) || decks[0] || null;

  function handleCreateDeck() {
    if (!newDeckName.trim()) return;
    const newId = createDeck(newDeckName.trim());
    setActiveDeck(newId);
    setNewDeckName('');
    setIsCreatingDeck(false);
  }

  function handleSaveRename() {
    if (activeDeck && editNameValue.trim()) {
      renameDeck(activeDeck.id, editNameValue.trim());
      setIsEditingName(false);
    }
  }

  function handleExport() {
    if (!activeDeck) return;
    const text = exportDeckToText(activeDeck);
    navigator.clipboard.writeText(text);
    setExportCopied(true);
    setTimeout(() => setExportCopied(false), 2000);
  }

  function handleImport() {
    if (!importTextValue.trim()) return;
    const parsed = importDeckFromText(importTextValue);
    const newId = importDeck(parsed);
    setActiveDeck(newId);
    setImportTextValue('');
    setShowImportModal(false);
  }

  // Quick card search for adding directly into deck
  const searchedCards = cardSearchQuery.trim()
    ? allCards
        .filter(
          (c) =>
            c.name.toLowerCase().includes(cardSearchQuery.toLowerCase()) ||
            c.id.toLowerCase().includes(cardSearchQuery.toLowerCase()) ||
            c.symbol.toLowerCase().includes(cardSearchQuery.toLowerCase())
        )
        .slice(0, 10)
    : [];

  return (
    <div className="space-y-4">
      {/* 1. Header Toolbar */}
      <div className="bg-[#121522] border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Deck Selector and title */}
        <div className="flex items-center gap-2 flex-wrap">
          {decks.length > 0 ? (
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={editNameValue}
                    onChange={(e) => setEditNameValue(e.target.value)}
                    className="bg-[#1a1f33] border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-rose-500"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveRename}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold"
                  >
                    บันทึก
                  </button>
                  <button
                    onClick={() => setIsEditingName(false)}
                    className="px-2 py-1.5 text-slate-400 hover:text-slate-200 text-xs"
                  >
                    ยกเลิก
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <select
                    value={activeDeck?.id}
                    onChange={(e) => setActiveDeck(e.target.value)}
                    className="bg-[#1a1f33] border border-slate-700/80 rounded-xl px-3 py-1.5 text-sm font-bold text-slate-100 focus:outline-none focus:border-rose-500 cursor-pointer max-w-[200px] truncate"
                  >
                    {decks.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => {
                      if (activeDeck) {
                        setEditNameValue(activeDeck.name);
                        setIsEditingName(true);
                      }
                    }}
                    title="แก้ไขชื่อเด็ค"
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      if (activeDeck && confirm(`ต้องการลบเด็ค "${activeDeck.name}" หรือไม่?`)) {
                        deleteDeck(activeDeck.id);
                      }
                    }}
                    title="ลบเด็คนี้"
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <span className="text-sm text-slate-400">ยังไม่มีเด็คในระบบ</span>
          )}

          {/* Create Deck Button */}
          {isCreatingDeck ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="ชื่อเด็คใหม่..."
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
                className="bg-[#1a1f33] border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-rose-500"
                autoFocus
              />
              <button
                onClick={handleCreateDeck}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold"
              >
                สร้าง
              </button>
              <button
                onClick={() => setIsCreatingDeck(false)}
                className="px-2 py-1.5 text-slate-400 hover:text-slate-200 text-xs"
              >
                ยกเลิก
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsCreatingDeck(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-rose-300 font-semibold text-xs border border-slate-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> สร้างเด็คใหม่
            </button>
          )}
        </div>

        {/* Right: Actions (Check Missing, Export, Import) */}
        {activeDeck && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowMissingModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 font-semibold text-xs border border-rose-500/40 transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5" /> เช็คการ์ดที่ขาด
            </button>

            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-colors"
            >
              {exportCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
              {exportCopied ? 'คัดลอกแล้ว' : 'ส่งออก Text'}
            </button>

            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" /> นำเข้าเด็ค
            </button>
          </div>
        )}
      </div>

      {activeDeck ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* Main & Life Tray Column (2 cols wide on desktop) */}
          <div className="lg:col-span-2 space-y-4">
            <DeckTray deck={activeDeck} />

            {/* Quick Card Search & Add Tray */}
            <div className="bg-[#121522] border border-slate-800/80 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                <h4 className="text-xs font-bold text-slate-300 font-['Prompt']">
                  ค้นหาการ์ดด่วนเพื่อเพิ่มเข้าเด็ค
                </h4>
              </div>

              <input
                type="text"
                placeholder="พิมพ์ชื่อการ์ด, รหัส (เช่น BT01-001) หรือเผ่า..."
                value={cardSearchQuery}
                onChange={(e) => setCardSearchQuery(e.target.value)}
                className="w-full bg-[#1a1f33] border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />

              {searchedCards.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-60 overflow-y-auto">
                  {searchedCards.map((card) => {
                    const inMain = activeDeck.mainDeck.find((c) => c.id === card.id)?.count || 0;
                    const inLife = activeDeck.lifeDeck.find((c) => c.id === card.id)?.count || 0;
                    return (
                      <div
                        key={card.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-[#181c2e] border border-slate-800 text-xs"
                      >
                        <div className="truncate mr-2">
                          <div className="font-semibold text-slate-200 truncate">{card.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {card.cardType} • {card.id}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            disabled={inMain >= 4}
                            onClick={() => addCardToMain(activeDeck.id, card)}
                            className="flex items-center gap-0.5 px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          >
                            <Layers className="w-3 h-3" /> +Main ({inMain})
                          </button>
                          <button
                            disabled={inLife >= 1}
                            onClick={() => addCardToLife(activeDeck.id, card)}
                            className="flex items-center gap-0.5 px-2 py-1 rounded bg-pink-600/80 hover:bg-pink-500 text-white font-bold text-[10px] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          >
                            <Heart className="w-3 h-3" /> +Life
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Analytics Column (1 col wide on desktop) */}
          <div className="space-y-4">
            <DeckAnalytics deck={activeDeck} />
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-[#121522] rounded-3xl border border-slate-800/80 my-8 space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
            <Layers className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-100 font-['Prompt']">ยังไม่มีเด็คใดๆ ในระบบ</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            สร้างเด็คแรกของคุณเพื่อเริ่มจัดสำรับสำหรับการแข่งขัน Battle of Talingchan ได้เลย
          </p>
          <button
            onClick={() => {
              const newId = createDeck('เด็คเริ่มต้น');
              setActiveDeck(newId);
            }}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-rose-600/30 transition-all"
          >
            + สร้างเด็คแรกทันที
          </button>
        </div>
      )}

      {/* Missing Cards Modal */}
      {showMissingModal && activeDeck && (
        <MissingCardsModal deck={activeDeck} onClose={() => setShowMissingModal(false)} />
      )}

      {/* Import Deck Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-[#121522] border border-slate-700/80 rounded-3xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-100 font-['Prompt']">
              นำเข้าเด็ค (Import Deck List)
            </h3>
            <p className="text-xs text-slate-400">
              วางข้อความรายการเด็ค (รูปแบบ Text เช่น <code>4x นนทก นิ้วเพชร (BT01-001)</code>)
            </p>
            <textarea
              rows={8}
              value={importTextValue}
              onChange={(e) => setImportTextValue(e.target.value)}
              placeholder="=== MAIN DECK ===&#10;4x นนทก นิ้วเพชร (BT01-001)&#10;&#10;=== LIFE DECK ===&#10;1x จิตวิญญาณแห่งตลิ่งชัน (BT01-006)"
              className="w-full bg-[#181c2e] border border-slate-700 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-rose-500"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleImport}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl"
              >
                นำเข้าเด็คนี้
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
