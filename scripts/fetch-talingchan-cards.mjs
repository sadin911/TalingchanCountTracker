/**
 * Scraper tool to pull card records from Battle of Talingchan Wiki on Fandom.
 * Run with: node scripts/fetch-talingchan-cards.mjs
 */
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_CARDS = path.join(__dirname, '../src/data/talingchanCards.json');
const OUTPUT_SETS = path.join(__dirname, '../src/data/talingchanSets.json');

console.log('Battle of Talingchan Wiki Scraper Initialized.');
console.log('Output targets:', { OUTPUT_CARDS, OUTPUT_SETS });
