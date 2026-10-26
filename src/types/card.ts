export type CardType = 
  | 'Avatar'
  | 'Magic'
  | 'Land Magic'
  | 'Modification'
  | 'Life Card'
  | 'React Magic';

export type CardColor = 
  | 'RED'
  | 'BLUE'
  | 'GREEN'
  | 'BLACK'
  | 'WHITE'
  | 'YELLOW'
  | 'COLORLESS';

export type Rarity = 
  | 'Common'
  | 'Rare'
  | 'Super_rare'
  | 'Ultra_rare'
  | 'Secret_rare'
  | 'Promo';

export type FinishKey = 'normal' | 'foil' | 'secret';

export interface TalingchanCard {
  id: string;               // e.g. "BT01-001"
  name: string;             // e.g. "นนทก นิ้วเพชร"
  setCode: string;          // e.g. "BT01"
  setName: string;          // e.g. "Welcome ตลิ่งชัน"
  collectorNumber: string;  // e.g. "001"
  cardType: CardType;
  color: CardColor;
  symbol: string;           // Tribe/Symbol e.g. "ยักษ์", "เปรต", "เทพ", "มนุษย์"
  soi: number;              // ซอย เช่น 1, 2, 3
  cost: number | null;
  gems: number | null;
  power: number | null;
  rarity: Rarity;
  isOnlyOne: boolean;       // สัญลักษณ์ Only 1
  isBiased: boolean;        // สัญลักษณ์ ลำเอียง (Banned in tournament)
  isCollab: boolean;        // สัญลักษณ์ โดนใจ
  illustrator: string;
  effect: string;
  rarityVariants: string[];
  finishes: FinishKey[];
  imageUrl?: string;
}

export interface TalingchanSet {
  code: string;
  name: string;
  type: 'Booster' | 'Starter';
  releasedAt: string | null;
  cardCount: number;
}

export function rarityLabel(rarity: string): string {
  return rarity.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function cardDisplayName(card: Pick<TalingchanCard, 'id' | 'name'>): string {
  return `${card.name} (${card.id})`;
}
