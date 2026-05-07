# Atlas Geocode Lines tool

This is a Node.js app that extracts stop names from [Atlas-Lines](https://data.opentransportdata.swiss/de/dataset/slnid-line) dataset and geocodes them against  [Location Information](https://opentransportdata.swiss/en/cookbook/ojplocationinformationrequest/) OJP Service.

The results are used in [Atlas-Lines compare GTFS-Routes](https://tools.odpch.ch/atlas-route-compare-gtfs/) app.

An [OJP](https://opentransportdata.swiss/en/cookbook/open-journey-planner-ojp/) authorization key is needed for geocoding. The key supplied with the [ojp-js](https://github.com/openTdataCH/ojp-js) SDK cant be guaranteed to be available for all requests. 
- see [constants.ts > OJP_STAGE_CONFIG](./src/constants.ts) for overriding the default key 
- a sleep value (in milliseconds) is used between OJP requests, see `OJP_REQUESTS_SLEEP_MS` constant
- by default, current OJP [key limits](https://opentransportdata.swiss/en/limits-and-costs/) allows 50 requests / minute
- the `OJP_REQUESTS_SLEEP_MS` value can be adjusted if the user key grants more requests

## Process

- latest Atlas-Lines CSV datset is read
- for each CSV row, the `description` field is parsed and split in stop names, the not-related geographical information is stripped out (i.e. information about the line)
- the stop names are sent to the LIR OJP service, the results are cached
- for each result the first entry is kept and a GeoJSON is built with the results.

### Geocoding Figures

At the moment (Jan 2025) there are:
- 3'500 Atlas-line rows
- the `description` generates ~5'000 unique stop names that can be geocoded 
- @see [stop names + description](https://gist.github.com/vasile/d03bffc29a0257838e642b23497646f7) example
- current geocoder rate (50 requests / min) requires 1-2hr for a fresh geocoding sequence
- the requests are cached and same stop name lookups can be read from the cache

## GeoJSON

Current GeoJSON https://tools.odpch.ch/data/atlas_stops.geojson

###  Feature Example

```
{
  "type": "Feature",
  "properties": {
    "stopId": "8576646",
    "stopName": "Bern, Bahnhof",
    "atlas.stopName": "Bern Bahnhof",
    "atlas.slnids": "ch:1:slnid:1026104 | ch:1:slnid:1026105 | ch:1:slnid:1026106 | ch:1:slnid:1026107 | ch:1:slnid:1026108 | ch:1:slnid:1026109 | ch:1:slnid:1026110 | ch:1:slnid:1026111 | ch:1:slnid:1026113 | ch:1:slnid:1026115 | ch:1:slnid:1026116 | ch:1:slnid:1026117 | ch:1:slnid:1026124 | ch:1:slnid:1026238 | ch:1:slnid:1026240 | ch:1:slnid:1026241 | ch:1:slnid:1026243 | ch:1:slnid:1026244 | ch:1:slnid:1026246 | ch:1:slnid:1026247 | ch:1:slnid:1026248 | ch:1:slnid:1026249 | ch:1:slnid:1026251 | ch:1:slnid:1026251 | ch:1:slnid:1026252 | ch:1:slnid:1026252 | ch:1:slnid:1026255 | ch:1:slnid:1026256",
    "atlas.description": "Bern Bahnhof - Eigerplatz - Weissenbühl"
  },
  "geometry": {
    "type": "Point",
    "coordinates": [
      7.44021,
      46.94811
    ]
  }
},
```

## Development

```
# install
$ npm install

# build
$ npm run build

# execute program
$ node --import=specifier-resolution-node/register dist/index.js
```

