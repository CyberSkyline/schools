const csvtojson = require('csvtojson');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');

const OVERRIDES = require('./overrides');

const PUBLIC_CSV_PATH = process.argv[2];
const ELSI_EXPORT_CSV_PATH = process.argv[3];
const PRIVATE_CSV_PATH = process.argv[4];

if (!PUBLIC_CSV_PATH || !ELSI_EXPORT_CSV_PATH || !PRIVATE_CSV_PATH) {
  console.error(`usage: node ${path.basename(process.argv[1])} <NCES_CCD.csv> <NCES_ElSi_export.csv> <NCES_PSS.csv>`);
  console.error('Obtain data from Department of Education NCES, see README for details');
  process.exit(1);
}

const LOWER_CASE_WORDS = new Set([ 'and', 'as', 'but', 'for', 'if', 'nor', 'or', 'so', 'yet', 'a', 'an', 'the', 'at', 'by', 'for', 'in', 'of', 'off', 'on', 'per', 'to', 'up', 'via' ]);

function processName(input) {
  let name = input;
  if (/\S\?\S/.test(name)) {
    name = _.replace(name, /(\S)\?(\S)/, `$1'$2`); // fix question mark quotes
  }

  if (/\s\?\s/.test(name)) {
    name = _.replace(name, /\s\?\s/, ' - '); // fix question mark hyphens
  }

  if (/^[A-Z'".,:()0-9\-/\\ ]+$/.test(name)) { // fix names in all caps
    name = _.chain(name)
      .split(/\s+/g)
      .map((word, i) => {
        const lower = _.toLower(word);
        return LOWER_CASE_WORDS.has(lower) ? lower : _.upperFirst(lower);
      })
      .join(' ')
      .value()
    ;
  }

  return name;
}

(async function run() {
  const schools = new Map();
  const overridesLookup = _.keyBy(OVERRIDES, 'id');

  console.log('Starting Public Schools');

  const publicSchools = await csvtojson().fromFile(path.resolve(PUBLIC_CSV_PATH));

  const elsiFile = fs.readFileSync(path.resolve(ELSI_EXPORT_CSV_PATH), 'utf-8').replace(/ELSI.*^School Name/ms, 'School Name').replace(/^Data Source:.*/ms, '');
  const elsi = await csvtojson({}).fromString(elsiFile);
  const elsiHeaders = _.keys(_.first(elsi));
  const schoolIdHeader = _.find(elsiHeaders, (header) => /School ID/.test(header));
  const populationHeader = _.find(elsiHeaders, (header) => /Total Students/.test(header));

  if (!schoolIdHeader || !populationHeader) {
    console.error('Could not find school ID or total enrollment header in the NCES_ElSi_export file');
    process.exit(1);
  }

  const publicPopulationLookup = _.chain(elsi)
    .keyBy((obj) => _.trim(obj[schoolIdHeader], '="'))
    .mapValues((obj) => parseInt(obj[populationHeader], 10))
    .value()
  ;

  _.each(publicSchools, (object) => {
    const {
      NCESSCH : id,
      SCH_NAME,
      LSTREET1 : street1,
      LSTREET2 : street2,
      LSTREET3 : street3,
      LCITY : city,
      LSTATE : state,
      LZIP : zip,
      LEA_NAME : agency,
      G_9_OFFERED : g9,
      G_10_OFFERED : g10,
      G_11_OFFERED : g11,
      G_12_OFFERED : g12,
      SY_STATUS_TEXT : status,
    } = object;

    const population = publicPopulationLookup[id] || 0;

    const override = overridesLookup[id];
    if (!override) {
      if (!_.includes([ g9, g10, g11, g12 ], 'Yes')) return;
      if (status === 'Closed') return;
      if (population < 10) return;
    }

    const name = processName(SCH_NAME);

    const entry = {
      id,
      name,
      street : `${street1} ${street2} ${street3}`.trim(),
      city : processName(city),
      state,
      zip,
      agency,
      population,
      type : 'PUBLIC',
    };

    if (override) {
      _.assign(entry, override);
    }

    if (schools.has(id)) {
      console.log(`[DUP] School with duplicate ID exists: ${id} - ${name}`);
    }

    schools.set(id, entry);
  });
  console.log('Finished Public Schools');
  const totalPublic = schools.size;

  console.log('Starting Private Schools');
  const privateSchools = await csvtojson({ eol : '\n' }).fromFile(path.resolve(PRIVATE_CSV_PATH));

  _.each(privateSchools, (object) => {
    const {
      PPIN : id,
      PINST,
      PADDRS : street,
      PCITY : city,
      PSTABB : state,
      PZIP : zip,
      P265 : g9,
      P275 : g10,
      P285 : g11,
      P295 : g12,
      NUMSTUDS : numStudents,
    } = object;

    const population = parseInt(numStudents, 10) || 0;

    if (!_.includes([ g9, g10, g11, g12 ], '1')) return;
    if (population < 10) return;

    const name = processName(PINST);

    const entry = {
      id,
      name,
      street,
      city : processName(city),
      state,
      zip,
      population,
      type : 'PRIVATE',
    };

    if (schools.has(id)) {
      console.log(`[DUP] School with duplicate ID exists: ${id} - ${name}`);
    }

    schools.set(id, entry);
  });

  _.each(OVERRIDES, (school) => {
    if (!schools.has(school.id)) {
      schools.set(school.id, school);
    }
  });

  console.log('Finished Private Schools');
  const totalPrivate = schools.size - totalPublic;

  const output = [ ...schools.values() ];

  console.log(`Total ${output.length} Institutions | ${totalPublic} Public | ${totalPrivate} Private`);
  fs.writeFileSync(path.join(__dirname, '../dist/us_high_schools.json'), JSON.stringify(output, null, 2));
}());
