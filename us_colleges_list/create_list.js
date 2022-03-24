const csvtojson = require('csvtojson');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const Url = require('url');

const EXCEPTIONS = require('./exceptions');
const ADDITIONS = require('./additions');

const COLLEGE_SCORECARD = require('../dist/college_scorecard_database');

const INSTITUTION_CAMPUS_CSV_PATH = process.argv[2];

if (!INSTITUTION_CAMPUS_CSV_PATH) {
  console.error(`usage: node ${path.basename(process.argv[1])} <InstitutionCampus.csv>`);
  console.error('Obtain data from Department of Education DAPIP website');
  process.exit(1);
}

const exceptionsLookup = _.keyBy(EXCEPTIONS, 'id');

const collegeScorecardLookupByIpedsId = _.keyBy(COLLEGE_SCORECARD, 'id');
const collegeScorecardLookupByOpe8Id = _.keyBy(COLLEGE_SCORECARD, 'ope8Id');

(async function run() {
  const json = await csvtojson().fromFile(path.resolve(INSTITUTION_CAMPUS_CSV_PATH));
  const parentInstitutionLookup = _.countBy(json, 'ParentDapipId');

  const schools = new Map();

  json.forEach((object) => {
    const id = object.DapipId;
    const { IpedsUnitIds : ipedsId, OpeId : opeId, LocationName : locationName, LocationType : locationType, Address : address } = object;

    const exception = exceptionsLookup[id];

    if (locationType !== 'Institution' && (!exception)) return;

    let name = locationName;

    const [ stateAndZip, city, ...rest ] = _.chain(address).split(/, */).reverse().value();
    const street = rest.join(', ');
    const [ state ] = stateAndZip.split(' ');

    const ope8Id = _.padStart(opeId, 8, '0');
    const collegeScorecard = collegeScorecardLookupByIpedsId[ipedsId] || collegeScorecardLookupByOpe8Id[ope8Id];

    const numLocations = parentInstitutionLookup[id] || 0;

    if (!collegeScorecard && !exception && !ipedsId && !opeId && numLocations <= 5) {
      return;
    }

    if (collegeScorecard && !collegeScorecard.operating) {
      return;
    }

    let { url, alias, population : collegeScorecardPopulation } = collegeScorecard || {};
    let population;

    if (exception) {
      if (exception.name) {
        ({ name } = exception);
      }
      if (exception.url) {
        ({ url } = exception);
      }
      if (exception.population) {
        ({ population } = exception);
      }
    }

    if (/\S\?\S/.test(name)) {
      name = _.replace(name, /(\S)\?(\S)/, `$1'$2`); // fix question mark quotes
    }

    if (/\s\?\s/.test(name)) {
      name = _.replace(name, /\s\?\s/, ' - '); // fix question mark hyphens
    }

    let domain = Url.parse(/^http/.test(url) ? url : `http://${url || ''}`).hostname || undefined;

    if (/\.com$/.test(domain)) {
      return;
    }

    if (domain) {
      domain = _.replace(domain, /^www\./, '');
    }

    if (alias) {
      alias = _.replace(alias, /\|/g, '');
    } else if (domain) {
      alias = _.chain(domain).split('.').reverse().get(1).toUpper().value();
    }

    if (!population && collegeScorecardPopulation) {
      population = collegeScorecardPopulation.total;
    }

    const entry = {
      id,
      name,
      street,
      city,
      state,
      domain : domain || undefined,
      alias : alias || undefined,
      population : population || undefined,
    };

    schools.set(id, entry);
  });

  _.each(ADDITIONS, (school) => {
    if (!schools.has(school.id)) {
      schools.set(school.id, school);
    }
  });

  const output = [ ...schools.values() ];

  console.log(`Total ${output.length} institutions`);
  fs.writeFileSync(path.join(__dirname, '../dist/us_institutions.json'), JSON.stringify(output, null, 2));
}());
