import { useState, useMemo } from 'react';
import type { TalingchanCard, CardColor, CardType, TalingchanSet } from '../../types/card.ts';
import cardDataRaw from '../../data/talingchanCards.json';
import setDataRaw from '../../data/talingchanSets.json';
import { FilterBar } from './FilterBar.tsx';
import { SetProgressView } from './SetProgressView.tsx';
import { CardGrid } from './CardGrid.tsx';
import { CardDetailModal } from './CardDetailModal.tsx';

const cards: TalingchanCard[] = cardDataRaw as TalingchanCard[];
const sets: TalingchanSet[] = setDataRaw as TalingchanSet[];

export function CollectionPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColor, setSelectedColor] = useState<CardColor | null>(null);
  const [selectedType, setSelectedType] = useState<CardType | null>(null);
  const [selectedSet, setSelectedSet] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'number' | 'cost' | 'power' | 'name'>('number');
  const [activeModalCard, setActiveModalCard] = useState<TalingchanCard | null>(null);

  // Filter & Sort
  const filteredCards = useMemo(() => {
    let result = cards;

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.effect.toLowerCase().includes(q) ||
          c.symbol.toLowerCase().includes(q)
      );
    }

    // Set filter
    if (selectedSet !== 'ALL') {
      result = result.filter((c) => c.setCode === selectedSet);
    }

    // Color filter
    if (selectedColor) {
      result = result.filter((c) => c.color === selectedColor);
    }

    // Type filter
    if (selectedType) {
      result = result.filter((c) => c.cardType === selectedType);
    }

    // Sort
    return [...result].sort((a, b) => {
      if (sortBy === 'cost') {
        const costA = a.cost ?? -1;
        const costB = b.cost ?? -1;
        return costB - costA;
      }
      if (sortBy === 'power') {
        const powA = a.power ?? -1;
        const powB = b.power ?? -1;
        return powB - powA;
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name, 'th');
      }
      // default: number / ID
      return a.id.localeCompare(b.id);
    });
  }, [searchQuery, selectedSet, selectedColor, selectedType, sortBy]);

  const activeSetObj = useMemo(() => {
    if (selectedSet === 'ALL') return null;
    return sets.find((s) => s.code === selectedSet) || null;
  }, [selectedSet]);

  return (
    <div className="space-y-4">
      {/* Set Progress Overview */}
      <SetProgressView currentSet={activeSetObj} allCards={cards} />

      {/* Filter and Search Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedColor={selectedColor}
        onColorChange={setSelectedColor}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        selectedSet={selectedSet}
        onSetChange={setSelectedSet}
        sets={sets}
        sortBy={sortBy}
        onSortChange={setSortBy}
        totalVisible={filteredCards.length}
      />

      {/* Card Grid */}
      <CardGrid cards={filteredCards} onSelectCard={(card) => setActiveModalCard(card)} />

      {/* Card Detail Modal */}
      <CardDetailModal card={activeModalCard} onClose={() => setActiveModalCard(null)} />
    </div>
  );
}
