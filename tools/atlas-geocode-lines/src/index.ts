import fs from 'fs';

import * as OJP from 'ojp-sdk'; 
import * as OJP_Types from 'ojp-shared-types';

import { Feature, Point } from 'geojson';

import { ATLAS_LINE_CSV_PATH, ATLAS_STOPS_GEOJSON_PATH, OJP_LIR_CACHE_PATH, DEBUG_slnid, DEBUG_Output_Names, DEBUG_Row, OJP_STAGE_CONFIG, OJP_REQUESTS_SLEEP_MS } from './constants';
import { AtlasLineDataController, AtlasStopGeoJSONFeature, AtlasStopsFeatureCollection } from './shared/controllers/atlas-data';

import { MatchHelpers } from './helpers/match-helpers';
import DateHelpers from './shared/helpers/date-helpers';

interface AtlasLookupStopName {
  slnid: string
  name: string
  routeDescription: string
}

function debugStopNames(atlasLookupStopNames: AtlasLookupStopName[]) {
  console.log('============================================');
  console.log('DEBUG atlasLookupStopNames');

  const mapStopNameLookup: Record<string, AtlasLookupStopName> = {};
  atlasLookupStopNames.forEach(el => {
    if (el.name in mapStopNameLookup) {
      return;
    }

    mapStopNameLookup[el.name] = el;
  });

  let stopNames = Object.keys(mapStopNameLookup);
  stopNames.sort();
  console.log('... mapped ' + atlasLookupStopNames.length + ' items to ' + stopNames.length + ' unique');
  
  stopNames.forEach(stopName => {
    console.log(stopName.padEnd(50, ' ') + '|->| ' + mapStopNameLookup[stopName].routeDescription);
  });

  console.log('END.DEBUG atlasLookupStopNames');
  console.log('============================================');

  process.exit(0);
}

async function computeStopNames(): Promise<AtlasLookupStopName[]> {
  const atlasLookupStopNames: AtlasLookupStopName[] = [];

  const atlasCSV_s = fs.readFileSync(ATLAS_LINE_CSV_PATH, 'utf8');
  const atlasController = new AtlasLineDataController();
  await atlasController.loadFromCSV(atlasCSV_s);

  console.log('... parsed CSV');

  for (const sboid in atlasController.mapAgencyRows) {
    const atlasRouteRows = atlasController.mapAgencyRows[sboid];

    atlasRouteRows.forEach((atlasRouteRow, idx) => {
      if (DEBUG_slnid !== null) {
        if (atlasRouteRow.slnid !== DEBUG_slnid) {
          return;
        }

        console.log('DEBUG slnid:');
        console.log('- description:' + atlasRouteRow.description);
      }

      const nameRow = atlasRouteRow.description.trim();

      if (DEBUG_Row && DEBUG_Row === nameRow) {
        console.log('DEBUG NAME on for:' + atlasRouteRow.slnid);
        console.log(' - nameRow: ' + nameRow);
      }

      // STEP1 - split by known separators ' - ', ' -/ ', etc
      const namePartsStep1 = MatchHelpers.splitValuesStep1(nameRow);
      namePartsStep1.forEach(namePartStep1 => {
        if (DEBUG_Row && DEBUG_Row === nameRow) {
          console.log('   - DEBUG namePartStep1: ' + namePartStep1);
        }

        // STEP2 - split by non-standard separators
        const nameParts = MatchHelpers.splitValues(atlasRouteRow.slnid, nameRow, namePartStep1);
        nameParts.forEach(namePart => {
          if (DEBUG_Row && DEBUG_Row === nameRow) {
            console.log('              - namePart: ' + namePart);
          }

          const atlasLookupStopName: AtlasLookupStopName = {
            slnid: atlasRouteRow.slnid,
            name: namePart,
            routeDescription: atlasRouteRow.description,
          };
          atlasLookupStopNames.push(atlasLookupStopName);
        });
      });

      if (DEBUG_Row && DEBUG_Row === nameRow) {
        console.log('END DEBUG');
        process.exit()
      }
    });
  }

  console.log('... massaged stopNames in ' + atlasLookupStopNames.length + ' lookups');

  return Promise.resolve(atlasLookupStopNames);
}

function readOrCreateJSONFile(filePath: string, initialData = {}) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data || '{}');
    } else {
      fs.writeFileSync(filePath, JSON.stringify(initialData, null, 2));
      return initialData;
    }
  } catch (error) {
    console.error('Error handling JSON file:', error);
    return null;
  }
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function placeResultAsGeoJSON_Feature(placeResult: OJP_Types.PlaceResultSchema): Feature<Point> {
  const coordinates = [placeResult.place.geoPosition.longitude, placeResult.place.geoPosition.latitude];

  const feature: Feature<Point> = {
    type: 'Feature',
    properties: {

    },
    geometry: {
      type: 'Point',
      coordinates: coordinates,
    }
  };

  if (feature.properties) {
    feature.properties['stopPlace.locationName'] = placeResult.place.name.text;

    const stopPlaceRef = placeResult.place.stopPlace?.stopPlaceRef ?? null;
    if (stopPlaceRef === null) {
      const stopPointRef = placeResult.place.stopPoint?.stopPointRef ?? null;
      if (stopPointRef !== null) {
        feature.properties['stopPlace.stopPlaceRef'] = stopPointRef;
        feature.properties['stopPlace.stopPlaceName'] = placeResult.place.stopPoint?.stopPointName ?? '';  
      }
    } else {
      feature.properties['stopPlace.stopPlaceRef'] = stopPlaceRef;
      feature.properties['stopPlace.stopPlaceName'] = placeResult.place.stopPlace?.stopPlaceName?.text ?? '';
    }
  }

  return feature;
}

async function geocodeStopNames(atlasLookupStopNames: AtlasLookupStopName[]) {
  const lookupOJP_Cache = readOrCreateJSONFile(OJP_LIR_CACHE_PATH);

  const stopNamesSet = new Set<string>();
  atlasLookupStopNames.forEach(atlasLookupStopName => {
    stopNamesSet.add(atlasLookupStopName.name);
  });

  const ojpSDK = OJP.SDK.create('atlas-geocode-lines', OJP_STAGE_CONFIG, 'en');

  let stopNameIdx = 0;
  for (const stopName of stopNamesSet) {
    stopNameIdx += 1;
    
    if (stopName in lookupOJP_Cache) {
      // console.log('- ' + stopNameIdx + ': ' + stopName + ' is already in cache');
      continue;
    }

    console.log('- ' + stopNameIdx + ': ' + stopName + ' OJP...');

    const lirRequest = OJP.LocationInformationRequest.initWithLocationName(stopName, ['stop'], 10);
    const lirResponse = await lirRequest.fetchResponse(ojpSDK);
    if (!lirResponse.ok) {
      console.log('whoops ERROR: 429?');
      console.log();
      process.exit(1);      
    }

    const features = lirResponse.value.placeResult.map(el => placeResultAsGeoJSON_Feature(el));

    console.log('  - found ' + features.length);

    lookupOJP_Cache[stopName] = features;
    fs.writeFileSync(OJP_LIR_CACHE_PATH, JSON.stringify(lookupOJP_Cache, null, 2));

    await wait(OJP_REQUESTS_SLEEP_MS); // default key is limited to 50 requests / min
  }

  console.log('... writing to geocoder cache');
  console.log(OJP_LIR_CACHE_PATH);
  console.log();

  fs.writeFileSync(OJP_LIR_CACHE_PATH, JSON.stringify(lookupOJP_Cache, null, 2));
}

function updateAtlasLookup(atlasLookupStopNames: AtlasLookupStopName[]) {
  const geocoderCache = JSON.parse(fs.readFileSync(OJP_LIR_CACHE_PATH, 'utf-8') || '{}') as Record<string, Feature<Point>[]>;

  // map of stopNames with routes slnid, multiple routes can share same stop which was geocoded
  const mapStopNameRouteSLNIDs: Record<string, string[]> = {};

  const mapGeoJSON_Features: Record<string, AtlasStopGeoJSONFeature> = {};
  atlasLookupStopNames.forEach(lookupStopName => {
    if (!(lookupStopName.name in geocoderCache)) {
      console.log('ERROR - cant find feature for ' + lookupStopName.name);
      process.exit(1)
      return;
    }

    const features = geocoderCache[lookupStopName.name];
    if (features.length === 0) {
      console.log('ERROR - 0 features for ' + lookupStopName.name);
      process.exit(1)
      return;
    }

    // build a map to process the properties.atlas.slnids later
    if (!(lookupStopName.name in mapStopNameRouteSLNIDs)) {
      mapStopNameRouteSLNIDs[lookupStopName.name] = [];
    }
    mapStopNameRouteSLNIDs[lookupStopName.name].push(lookupStopName.slnid);

    // dont override the feature, process properties.atlas.slnids later
    if (lookupStopName.name in mapGeoJSON_Features) {
      return;
    }

    const lookupGeocoderFeature: Feature<Point> | null = (() => {
      const feature = features.find(el => {
        const stopRef: string | null = el.properties && (el.properties['stopPlace.stopPlaceRef'] ?? null);
        if (stopRef === null) {
          return false;
        }

        // try to find first swiss feature
        return stopRef.startsWith('85');
      }) ?? null;

      if (feature) {
        return feature;
      }

      // otherwise rely on first feature
      return features[0];
    })();

    const lookupGeocoderFeatureProperties = lookupGeocoderFeature.properties ?? null;
    if (lookupGeocoderFeatureProperties === null) {
      return;
    }

    const stopPlaceRef = lookupGeocoderFeatureProperties['stopPlace.stopPlaceRef'] ?? null;

    const atlasGeoJSON_Feature: AtlasStopGeoJSONFeature = {
      type: 'Feature',
      properties: {
        stopId: lookupGeocoderFeatureProperties['stopPlace.stopPlaceRef'],
        stopName: lookupGeocoderFeatureProperties['stopPlace.stopPlaceName'],
        'atlas.stopName': lookupStopName.name,
        'atlas.slnids': 'n/a', // process later
        'atlas.description': lookupStopName.routeDescription,
      },
      geometry: lookupGeocoderFeature.geometry,
    };

    mapGeoJSON_Features[lookupStopName.name] = atlasGeoJSON_Feature;
  });

  for (const name in mapGeoJSON_Features) {
    const routeSLNIDs = mapStopNameRouteSLNIDs[name];
    mapGeoJSON_Features[name].properties['atlas.slnids'] = routeSLNIDs.join(' | ');
  }

  if (DEBUG_slnid !== null) {
    atlasLookupStopNames.forEach(lookupStopName => {
      console.log(lookupStopName.name);
      
      const feature = mapGeoJSON_Features[lookupStopName.name];
      console.log('-> ' + feature.properties.stopName + '(' + feature.properties.stopId + ') - ' + feature.geometry.coordinates[1] + ',' + feature.geometry.coordinates[0]);      
    });

    console.log('debugSLNID IS NOT NULL - abort');
    process.exit();
  }

  const atlasGeoJSON: AtlasStopsFeatureCollection = {
    type: 'FeatureCollection',
    features: Object.values(mapGeoJSON_Features),
  };

  console.log('... writing to GeoJSON: ' + atlasGeoJSON.features.length + ' features');
  console.log(ATLAS_STOPS_GEOJSON_PATH);
  console.log();
  
  fs.writeFileSync(ATLAS_STOPS_GEOJSON_PATH, JSON.stringify(atlasGeoJSON, null, 2));
}

// Main function
async function main() {
  const dateStartF = DateHelpers.formatDateYMDHIS(new Date());
  console.log('START ' + dateStartF);
  console.log();

  if (DEBUG_slnid !== null) {
    console.log('SLNID debug: ' + DEBUG_slnid);
    console.log();
  }
  
  const stopNames = await computeStopNames();

  if (DEBUG_Output_Names) {
    debugStopNames(stopNames);
    process.exit()
  }

  await geocodeStopNames(stopNames);
  updateAtlasLookup(stopNames);
  
  const dateEndF = DateHelpers.formatDateYMDHIS(new Date());
  console.log();
  console.log('END: ' + dateEndF);
}

main();
