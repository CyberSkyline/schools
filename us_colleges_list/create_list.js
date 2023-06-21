const csvtojson = require('csvtojson');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const Url = require('url');

const CAE = require('../dist/cae_designations');

const EXCEPTIONS = require('./exceptions');
const ADDITIONS = require('./additions');

const COLLEGE_SCORECARD = require('../dist/college_scorecard_database');

let INSTITUTION_CAMPUS_CSV_PATH = process.argv[2];

if (!INSTITUTION_CAMPUS_CSV_PATH) {
  try {
    const fileInCurrentDirectory = path.join(__dirname, './InstitutionCampus.csv');
    fs.statSync(fileInCurrentDirectory);
    INSTITUTION_CAMPUS_CSV_PATH = fileInCurrentDirectory;
  } catch (err) {
    console.error(`usage: node ${path.basename(process.argv[1])} <InstitutionCampus.csv>`);
    console.error('Obtain data from Department of Education DAPIP website');
    process.exit(1);
  }
}

const logoFiles = fs.readdirSync(path.join(__dirname, 'logos'));

const exceptionsLookup = _.keyBy(EXCEPTIONS, 'id');

const collegeScorecardLookupByIpedsId = _.keyBy(COLLEGE_SCORECARD, 'id');
const collegeScorecardLookupByOpe8Id = _.keyBy(COLLEGE_SCORECARD, 'ope8Id');

(async function run() {
  const json = await csvtojson().fromFile(path.resolve(INSTITUTION_CAMPUS_CSV_PATH));
  const parentInstitutionLookup = _.countBy(json, 'ParentDapipId');

  const schools = new Map();
  const nameLookup = new Map();

  json.forEach((object) => {
    const id = object.DapipId;
    const { IpedsUnitIds : ipedsId, OpeId : opeId, LocationName : locationName, LocationType : locationType, Address : address } = object;

    const exception = exceptionsLookup[id];

    if (locationType !== 'Institution' && (!exception)) return;

    let name = locationName;

    const [ stateAndZip, city, ...rest ] = _.chain(address).split(/, */).reverse().value();
    let street = rest.join(', ');
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

    let { url, alias, population : collegeScorecardPopulation, degree, lon, lat } = collegeScorecard || {};
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
      if (exception.alias) {
        ({ alias } = exception);
      }
      if (exception.street) {
        ({ street } = exception);
      }
    }

    if (/\S\?\S/.test(name)) {
      name = _.replace(name, /(\S)\?(\S)/, `$1'$2`); // fix question mark quotes
    }

    if (/\s\?\s/.test(name)) {
      name = _.replace(name, /\s\?\s/, ' - '); // fix question mark hyphens
    }

    name = _.replace(name, / {2,}/g, ' ');

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
      lon : lon || undefined,
      lat : lat || undefined,
      domain : domain || undefined,
      alias : alias || undefined,
      population : population || undefined,
      predominantDegree : _.get(degree, 'predominant') || 'N/A',
    };

    schools.set(id, entry);
    nameLookup.set(name, entry);
  });

  _.each(ADDITIONS, (school) => {
    if (!schools.has(school.id)) {
      schools.set(school.id, school);
    }
  });

  _.each(CAE, ({ school, designations }) => {
    const entry = nameLookup.get(school);
    if (!entry) {
      console.error(`[ERROR] CAE school: ${school} does not have a matching entry.`);
    } else {
      entry.designations = designations;
    }
  });

  _.each(logoFiles, (filename) => {
    const { name } = path.parse(filename);
    const [ id ] = name.split('_');
    const school = schools.get(id);
    if (school) {
      school.logo = filename;
    } else {
      console.error(`[ERROR] No matching school for the logo file: ${filename}`);
    }
  });

  const output = [ ...schools.values() ];

  console.log(`Total ${output.length} institutions`);
  fs.writeFileSync(path.join(__dirname, '../dist/us_institutions.json'), JSON.stringify(output, null, 2));
}());
