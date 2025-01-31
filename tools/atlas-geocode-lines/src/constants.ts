import path from 'path';

export const ATLAS_LINE_URL = 'https://tools.odpch.ch/data/actual_date_line_versions_LATEST.csv';
export const OJP_LIR_CACHE_PATH = path.resolve('./ojp_lir_cache.json');
export const ATLAS_STOPS_GEOJSON_PATH = path.resolve('./atlas_stops.geojson');

export let DEBUG_slnid: string | null = null;
// DEBUG_slnid = 'ch:1:slnid:1025759';

export let DEBUG_Output_Names = false
// DEBUG_Output_Names = true

export let DEBUG_Row: string | null = 'Zone Seymaz-Voirons (Choulex, Gy, Jussy, Meinier, Presinge, Puplinge Collonge-Bellerive, Thônex, Vandoeuvres. Annemasse, Juvigny, Machilly, Saint-Cergues)'
DEBUG_Row = null

export const STOP_NAME_SEPARATOR = ' |SEP| ';

interface SeparatorData {
  regexp: RegExp,
  description: string,
  example: string,
  replace: string
}

export const PSEUDO_SEPARATORS_DATA: SeparatorData[] = [
  // order matters, keep general pseudo-separators on top
  {
    regexp: RegExp(/([a-zäöü]{2}), ([A-Z][a-zäöü]{1})/g),
    description: 'comma ,',
    example: 'Belmont, Bussigny-près-Lausanne, Chavannes-près-Renens, Crissier, Ecublens',
    replace: '$1' + STOP_NAME_SEPARATOR + '$2',
  },
  {
    regexp: RegExp(/([a-zäöü]{3})-([A-Z])/g),
    description: 'dash -',
    example: 'Romanshorn-Immenstaad-Hagnau-Altnau-Güttingen',
    replace: '$1' + STOP_NAME_SEPARATOR + '$2',
  },
  {
    regexp: RegExp(/([a-zäöü]{3})\/([A-Z])/g),
    description: 'slash /',
    example: 'Kriens Busschleife - Pilatus-Bahnen/Sidhalde/Sonnenberg',
    replace: '$1' + STOP_NAME_SEPARATOR + '$2',
  },
];

// Isolate stop names that can be split by the pseudoseparators above
export const SEPARATOR_WORDS_TO_IGNORE = [
  'Le Locle-Col-des-Roches',
  'St-Gervais-les-Bains',
  'Yverdon-les-Bains',
  'Lancy-Pont-Rouge',
  'Vers-Chez-les-Blanc',
  'Zone du Haut-Plateau',
  'Escher-Wyss-Platz',
  'Lancy-Port-Rouge',
  'Lancy-Pont-R.',
  'Biel/Bienne',
];

export const STOP_NAMES_LOOKUP = [
  'Schinznach Dorf', // Schinznach Dorf-Thalheim -> adds space -
];

