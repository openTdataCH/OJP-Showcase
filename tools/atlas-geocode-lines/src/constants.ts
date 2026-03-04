import path from 'path';
import * as OJP from 'ojp-sdk'; 

const DATA_PATH = path.resolve('./data');

export const ATLAS_LINE_CSV_PATH = (DATA_PATH + '/actual_date_line_versions_LATEST.csv');
export const OJP_LIR_CACHE_PATH = (DATA_PATH + '/ojp_lir_cache.json');
export const ATLAS_STOPS_GEOJSON_PATH = (DATA_PATH + '/atlas_stops.geojson');

export const OJP_STAGE_CONFIG: OJP.HTTPConfig = {
  url: 'https://api.opentransportdata.swiss/ojp20',
  authToken: '', // override with another key
};

// sleep interval between 2 OJP requests, the default key is limited to 50requests / minute
// @see https://opentransportdata.swiss/en/limits-and-costs/
export const OJP_REQUESTS_SLEEP_MS = 1200;

export let DEBUG_slnid: string | null = null;
// DEBUG_slnid = 'ch:1:slnid:1025759';

export let DEBUG_Output_Names = false
// DEBUG_Output_Names = true

export let DEBUG_Row: string | null = 'Solothurn - Oberdorf - Moutier'
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

export const ADJUST_GEOCODER_REQUESTS: Record<string, string> = {
  // S21: Oberdorf is matched to Oberdorf BL, we need the one in SO
  'Solothurn - Oberdorf - Moutier': 'Solothurn - Oberdorf SO - Moutier',
  // S25: Muri is matched to Muri bei Bern, we need Muri AG
  'Muri - Brugg': 'Muri AG - Brugg',
  // S30 need an extra station from Italy to be matched correctly
  'Ranzo-S.Abbondio - Grenze*': 'Ranzo-S.Abbondio - Gallarate',
  // ICE needs a station from DE
  'Basel SBB - Deutschland': 'Basel SBB - Basel Bad Bf',
  'Zürich Seilbahn Rigiblick - Rigiblick': 'Zürich Seilbahn Rigiblick - Zürich, Rigiblick',
};

