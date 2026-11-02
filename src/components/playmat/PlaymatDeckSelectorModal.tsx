import { useState } from 'react';
import { X, Layers, Play } from 'lucide-react';
import type { Deck } from '../../types/deck.ts';
import { STARTER_DECK_PRESETS } from '../../constants/starterDecks.ts';

interface PlaymatDeckSelectorModalProps {
  customDecks: Deck[];
  currentP1Deck: Deck;
  currentP2Deck: Deck;
  onClose: () => void;
  onApplyDecks: (p1Deck: Deck, p2Deck: Deck) => void;
}

export function PlaymatDeckSelectorModal({
  customDecks,
  currentP1Deck,
  currentP2Deck,
  onClose,
  onApplyDecks,
}: PlaymatDeckSelectorModalProps) {
  const allAvailableDecks: Deck[] = [...customDecks, ...STARTER_DECK_PRESETS];
  const [p1Id, setP1Id] = useState(currentP1Deck.id);
  const [p2Id, setP2Id] = useState(currentP2Deck.id);

  function handleConfirm() {
    const d1 = allAvailableDecks.find((d) => d.id === p1Id) || STARTER_DECK_PRESETS[0];
    const d2 = allAvailableDecks.find((d) => d.id === p2Id) || STARTER_DECK_PRESETS[1];
    onApplyDecks(d1, d2);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#121522] border border-slate-700 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
        data-testid="playmat-deck-selector-modal"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-rose-500" />
            <h3 className="text-base font-extrabold text-white">
              เลือกเด็คสำหรับโหมดซ้อม (P1 vs P2)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Player 1 Deck */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-blue-400 block">
              🔵 เด็คฝั่ง Player 1 (ฝั่งคุณ):
            </label>
            <select
              data-testid="select-p1-deck"
              value={p1Id}
              onChange={(e) => setP1Id(e.target.value)}
              className="w-full bg-[#1a1f33] border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-blue-500"
            >
              {customDecks.length > 0 && (
                <optgroup label="เด็คที่คุณจัดไว้ (Custom Decks)">
                  {customDecks.map((d) => {
                    const mainCount = d.mainDeck.reduce((s, c) => s + c.count, 0);
                    const lifeCount = d.lifeDeck.reduce((s, c) => s + c.count, 0);
                    return (
                      <option key={d.id} value={d.id}>
                        {d.name} ({mainCount} Main / {lifeCount} Life)
                      </option>
                    );
                  })}
                </optgroup>
              )}
              <optgroup label="เด็คพร้อมเล่น (Starter Deck Presets)">
                {STARTER_DECK_PRESETS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} (50 Main / 5 Life)
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Player 2 Deck */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-rose-400 block">
              🔴 เด็คฝั่ง Player 2 (คู่ซ้อม):
            </label>
            <select
              data-testid="select-p2-deck"
              value={p2Id}
              onChange={(e) => setP2Id(e.target.value)}
              className="w-full bg-[#1a1f33] border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-rose-500"
            >
              {customDecks.length > 0 && (
                <optgroup label="เด็คที่คุณจัดไว้ (Custom Decks)">
                  {customDecks.map((d) => {
                    const mainCount = d.mainDeck.reduce((s, c) => s + c.count, 0);
                    const lifeCount = d.lifeDeck.reduce((s, c) => s + c.count, 0);
                    return (
                      <option key={d.id} value={d.id}>
                        {d.name} ({mainCount} Main / {lifeCount} Life)
                      </option>
                    );
                  })}
                </optgroup>
              )}
              <optgroup label="เด็คพร้อมเล่น (Starter Deck Presets)">
                {STARTER_DECK_PRESETS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} (50 Main / 5 Life)
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            data-testid="btn-confirm-apply-decks"
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/50 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" /> เริ่มเกมด้วยเด็คนี้
          </button>
        </div>
      </div>
    </div>
  );
}

