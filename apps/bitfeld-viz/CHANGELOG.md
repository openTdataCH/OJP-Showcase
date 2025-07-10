# CHANGELOG bitfeld-viz

URL: https://tools.odpch.ch/bitfeld-viz/

----

10.July.2024
- adds future timetables from https://www.oev-info.ch/de/fahrplan-aktuell/fahrplanwissen/fahrplanjahr-und-wechsel

23.September.2024
- first version
    - support two bitfeld formats:
        - [HRDF Bitfeld](https://opentransportdata.swiss/en/cookbook/kalender/) - [example](https://tools.odpch.ch/bitfeld-viz/?bitfeld=DF3E1C39F3E7CF9F3E7CF9F3E7CF0F3E7CF9B3A7C79F3E7CF9F3E7CF9F3A7CF9F3E7CF9F307CF9F3E7CF9F3E7CF9F600)
        - raw bit (`0`, `1`) strings - [example](https://tools.odpch.ch/bitfeld-viz/?bitfeld=https://tools.odpch.ch/bitfeld-viz/?bitfeld=1010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010)
    - allow to choose the public transport dateframe
