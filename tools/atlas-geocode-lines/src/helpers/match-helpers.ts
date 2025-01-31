import { STOP_NAME_SEPARATOR, PSEUDO_SEPARATORS_DATA, SEPARATOR_WORDS_TO_IGNORE, STOP_NAMES_LOOKUP } from "../constants";

export class MatchHelpers {
  public static splitValuesStep1(inputNameS: string): string[] {
    // DEBUG
    // inputNameS = 'Chur Bahnhofplatz-Benerpark-Boletta-City West';

    let inputS = inputNameS.trim();

    // check if uneeded separators are next to the stop_names
    STOP_NAMES_LOOKUP.forEach(stopNameLookup => {
      const regexp = new RegExp('(' + stopNameLookup + ')-\s?([A-Z][a-zäöü])', 'g');
      inputS = inputS.replaceAll(regexp, '$1' + STOP_NAME_SEPARATOR + '$2');
    });

    inputS = inputS.replaceAll(' - ', STOP_NAME_SEPARATOR);
    inputS = inputS.replaceAll(' / ', STOP_NAME_SEPARATOR);
    inputS = inputS.replaceAll(' /- ', STOP_NAME_SEPARATOR);
    // (Airolo -) Biasca      -> Airolo |SEP| Biasca
    inputS = inputS.replaceAll(/\(([^\)]+?)-\)/g, '$1' + STOP_NAME_SEPARATOR);
    // Biasca (- Almens)      -> Biasca |SEP| Almens
    inputS = inputS.replaceAll(/\(-\s?([A-Z][^\)]+?)\)/g, STOP_NAME_SEPARATOR + '$1');
    // Aarau- Wildegg         -> Aarau |SEP| Wildegg
    inputS = inputS.replaceAll(/([a-z]{2})-\s([A-Z])/g, '$1' + STOP_NAME_SEPARATOR + '$2');
    // Möhlin -Zeiningen -Wegenstetten    -> Möhlin |SEP| Zeiningen |SEP| Wegenstetten
    inputS = inputS.replaceAll(/([a-zäöü]{2})\s-([A-Z][a-zäöü])/g, '$1' + STOP_NAME_SEPARATOR + '$2');
    // Aigle -) Ollon VD      -> Aigle |SEP| Ollon VD - // no start paranthese in orig string
    inputS = inputS.replaceAll(' -) ', STOP_NAME_SEPARATOR);
    inputS = inputS.replaceAll(' | ', STOP_NAME_SEPARATOR);
    // Chamby-Musée (Chemin de fer-musée / Vevey - Blonay seulement des courses uniques)
    // -> Chamby-Musée |SEP| Chemin de fer-musée / Vevey ...
    inputS = inputS.replaceAll(/\s\(([^\)]{5,})\)/g, STOP_NAME_SEPARATOR + '$1');

    // replace double or more |SEP| |SEP| 
    const sepEscaped = STOP_NAME_SEPARATOR.trim().replaceAll('|', '\\|');
    const multipleSepRegex = new RegExp(`(${sepEscaped}\\s*){2,}`, 'g');
    inputS = inputS.replaceAll(multipleSepRegex, STOP_NAME_SEPARATOR.trim() + ' ');

    const inputParts = inputS.split(STOP_NAME_SEPARATOR);

    return inputParts;
  }

  public static splitValues(slnid: string, inputNameS: string, namePartStep1: string): string[] {
    // inputNameS is original row - passed it here for debugging
    
    // => in this step we need namePartStep1
    let inputS = namePartStep1.trim();

    SEPARATOR_WORDS_TO_IGNORE.forEach((sepWordToIgnore, idx) => {
      inputS = inputS.replace(sepWordToIgnore, 'SEPWORDIGNORE_' + idx);
    });

    for (const sepData of PSEUDO_SEPARATORS_DATA) {
      const separatorMatches = inputS.match(sepData.regexp);
      if (separatorMatches === null) {
        continue;
      }

      if (separatorMatches.length < 2) {
        continue;
      }

      inputS = inputS.replace(sepData.regexp, sepData.replace);
      
      console.log();
      console.log('      DEBUG SEP: ' + sepData.description);
      console.log('         slnid    ->' + slnid);
      console.log('         orig     ->' + inputNameS);
      console.log('         origPart ->' + namePartStep1);
      console.log('         withSep  ->' + inputS);
      console.log();

      // ignore the other pseudo-separators,to avoid double matching / split
      break;
    }

    SEPARATOR_WORDS_TO_IGNORE.forEach((sepWordToIgnore, idx) => {
      inputS = inputS.replace('SEPWORDIGNORE_' + idx, sepWordToIgnore);
    });

    // replace double or more |SEP| |SEP| 
    const sepEscaped = STOP_NAME_SEPARATOR.trim().replaceAll('|', '\\|');
    const multipleSepRegex = new RegExp(`(${sepEscaped}\\s*){2,}`, 'g');
    inputS = inputS.replaceAll(multipleSepRegex, STOP_NAME_SEPARATOR.trim() + ' ');

    const newInputParts: string[] = [];
    const inputParts = inputS.split(STOP_NAME_SEPARATOR);
    inputParts.forEach(inputPartStep1S => {
      const inputPart = MatchHelpers.massageName(inputPartStep1S);
      if (inputPart === null) {
        return;
      }

      if (inputPart.indexOf('SEP') > -1) {
        console.log();
        console.log('leftovers SEP in string');
        console.log('      slnid        ->' + slnid);
        console.log('  inputNameS       =>' + namePartStep1);
        console.log('  inputS           =>' + inputS);
        console.log('  inputPartStep1S  =>' + inputPartStep1S);
        console.log('  inputPart        =>' + inputPart);
        console.log();
        process.exit();
      }

      newInputParts.push(inputPart);
    });

    return newInputParts;
  }

  private static massageName(nameS: string): string | null {
    let name = nameS.trim();

    name = name.replace('(Sommer)', '')
    name = name.replace('(Winter)', '')
    name = name.replace('CBT', '')
    name = name.replace('GBT', '')
    name = name.replace('GBR', '')
    name = name.replace('Österreich', '')
    name = name.replace('Italien', '')
  
    // (Nachtbus N33)     -> ''
    // name = name.replace(/\(Nachtbus[^\)]*\)/, '')
    // Bahnhof (Ortsbus Linie Blau -> ''
    name = name.replace(/\(Ortsbus Linie.*$/, '')
    // FLF Ortsbus | ...  -> ''
    name = name.replace('FLF Ortsbus | ', '')
    // Nachtangebot ...   -> ''
    name = name.replace(/^Nachtangebot.*$/, '')
    // PubliCar  -> ''
    name = name.replace(/^PubliCar\s/, '')
    name = name.replace(/^Publicar\s/, '')
    // N16 Fribourg   -> Fribourg
    name = name.replace(/^N[0-9]{1,}\s?/, '')
    name = name.replace(/^N[0-9]{1,}$/, '')
    // Zone Champagne (Aire-la-Ville  -> ''
    name = name.replace(/^Zone.*$/, '')
    // Concession de zone pour le territoire de la localité de Vercorin
    name = name.replace(/^Concession de zone.*$/, '')
    // Diverse vom ZVV bestellte Zus... 
    name = name.replace(/^Diverse vom.*$/, '')
  
    name = name.replace(/^Actuellement hors service.*$/, '')
    name = name.replace(/Einzelkurse.*$/, '')
    name = name.replace('Bahnergänzungskurs', '')
    name = name.replace(/Nightjet auf div.*$/, '')
    name = name.replace(/Eurocity auf div.*$/, '')
    name = name.replace(/TGV auf verschiedenen.*$/, '')
    name = name.replace(/Bacino svizzero.*$/, '')
    name = name.replace('seulement des courses uniques', '')
    name = name.replace('hors zones foraines', '')
    name = name.replace('in alle Richtungen', '')
  
    name = name.replace('Nachtangebot', '')
    name = name.replace('Bus alpin', '')
    name = name.replace('Bustaxi', '')
    name = name.replace('abends', '')
    name = name.replace('morgens', '')
    name = name.replace('Autofähre', '')
    name = name.replace('Fähre', '')
    name = name.replace('Bahnersatz', '')
    name = name.replace('ligne expresse', '')
    name = name.replace('Schneehüenerstock-Express', '')
    name = name.replace('Eiger Express', '')
    name = name.replace('Bergstation', '')
    name = name.replace('Hexpress', '')

    name = name.replace('Querfahrten', '')
    name = name.replace('Night Express', '')
    name = name.replace('Museumslinie', '')
    name = name.replace('Nachttaxi', '')
    name = name.replace('Shuttle', '')
    name = name.replace(/Nachtstern.*/, '')
    name = name.replace(/: Ligne.*/, '')
    name = name.replace(/Ski-Bus.*/, '')
    name = name.replace(/Navette.*/, '')
    name = name.replace(/Noctam.*/, '')
    name = name.replace(/Bus\s.*/, '')
    name = name.replace('Navettes hiver', '')
    name = name.replace('navette de ski', '')
    name = name.replace('FUN.Z', '')
    name = name.replace('PB.Z', '')
    name = name.replace('FlemXpress', '')
    name = name.replace('Bus da ', '')
    name = name.replace('Bus local ', '')
    name = name.replace('par Zones industrielles', '')
    name = name.replace('Bus urbain sur appel de ', '')
    name = name.replace('Bus-Taxi ', '')
    name = name.replace('Minifunic', '')
    name = name.replace('Historische Postautolinie', '')
    name = name.replace('Sportanlage', '')
    name = name.replace('Sportanlagen', '')
    
    // Anything with bus
    name = name.replace(/[A-Z][a-zäöü]{1,}[bB]us/, '')
    name = name.replace('(bus)', '')
    
    name = name.replace('Bahnergänzungskurs', '')
    name = name.replace('Bodensee', '')
    name = name.replace('Spitzenverkehrsbahn', '')
    // name = name.replace('OrtsBus', '')
    name = name.replace('funi', '')
    name = name.replace('Rundkurs', '')
    name = name.replace('Abendrundkurs', '')
    name = name.replace('Aletsch-Express', '')
    name = name.replace('Mobinight', '')
    name = name.replace('alle Kurse', '')
    name = name.replace('Direkt', '')
    name = name.replace('via Autobahn', '')
    name = name.replace(/Chemin de fer.*/, '')
    name = name.replace(/Sommerbetrieb.*/, '')
    name = name.replace(/course de renfort.*/, '')
    name = name.replace(/Transport urbain.*/, '')
    name = name.replace(/Traversée de la Rade.*/, '')
    name = name.replace(/Siedlungsgebiet.*/, '')
    name = name.replace('Stade de Genève', '')
    name = name.replace('Stadt- und Hafen', '')
    // Brunni-Linie
    name = name.replace(/[A-Z][a-z]{1,}-Linie/, '')
    
    name = name.replace(/Linie\s.*/, '')
    
    name = name.replace(/URBABUS.*/, '')
    name = name.replace(/Matin.*/, '')
    name = name.replace('* ', ' ')

    // """"Chalchofa""""  -> Chalchofa
    name = name.replace(/^"{1,}/, '');
    name = name.replace(/"{1,}$/, '');
    // /                  -> empty
    name = name.replace(/^[\/,][\s]*/, '');

    // Lac 1       -> ''
    name = name.replace(/Lac\s[0-9]{1,}/, '');

    // 2 Sektionen        -> empty
    name = name.replace(/[0-9]\sSektionen/, '');
    name = name.replace(/[0-9]\sSektion/, '');
    name = name.replace(/[0-9].\sSektion/, '');
    name = name.replace(/[0-9]\ssections?/, '');
    name = name.replace(/[0-9]\ssezioni?/, '');

    // parantheses cleanup
    name = name.replace('()', '');
    // (Almens)   -> Almens
    name = name.replace(/^\(([^\)]+?)\)$/, '$1');
    // (N14)   -> ''
    name = name.replace(/\(N[0-9]{1,}\)$/, '');

    // (272)   -> ''
    name = name.replace(/\([0-9]{1,}\)$/, '');
    // REKA (  -> '' (letfovers, data issues)
    name = name.replace(/\($/, '');

    // N36
    name = name.replace(/N[0-9]{1,}/, '');

    // starts with S10 ...
    name = name.replace(/^S[0-9]+?\s/, '');
    // multiple spaces
    name = name.replaceAll(/[\s]{2,}/g, ' ');
    
    // all starting small letters -> ''
    //     gare
    //     gare (
    //     hôpital
    //     plage
    //     posta
    name = name.replace(/^[a-z].*$/, '');
  
    // final cleanup
    // name = name.replace(/^\|[^a-zA-Z]*/, '');

    // Tirano (IT) is matched as POI
    name = name.replace('(IT)', '(I)')

    name = name.trim();

    // strip ( , | or , from end 
    // TODO - shall we use [a-zA-Z\(] ?
    name = name.replace(/[\|\,\/:\*\s]$/, '');
    
    name = name.trim();
    if (name === '') {
      return null;
    }

    // if (nameS === 'Breite bei Nürensdorf') {
    //   console.log(nameS);
    //   console.log(name);
    // }

    return name;
  }
}
