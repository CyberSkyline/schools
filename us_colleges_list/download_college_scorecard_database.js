const ProgressBar = require('progress');
const _ = require('lodash');
const superagent = require('superagent');
const fs = require('fs');
const path = require('path');

const KEY_MAPPINGS = {
  id : 'id',
  ope8Id : 'ope8_id',
  ope6Id : 'ope6_id',
  operating : 'school.operating',
  name : 'school.name',
  alias : 'school.alias',
  city : 'school.city',
  state : 'school.state',
  zip : 'school.zip',
  lat : 'location.lat',
  lon : 'location.lon',
  url : 'school.school_url',
  onlineOnly : 'school.online_only',
  ownership : 'school.ownership',
  level : 'school.institutional_characteristics.level',
  urbanization : 'school.degree_urbanization',
  'degree.predominant' : 'school.degrees_awarded.predominant',
  'degree.highest' : 'school.degrees_awarded.highest',
  'cost.tuitionRevenue' : 'school.tuition_revenue_per_fte', // Net tuition revenue per full-time equivalent student
  'cost.inState' : 'latest.cost.tuition.in_state',
  'cost.outOfState' : 'latest.cost.tuition.out_of_state',
  'cost.programYear' : 'latest.cost.tuition.program_year',
  'population.total' : 'latest.student.size',
  'population.pellGrant' : 'latest.aid.pell_grant_rate',
  'population.federalAid' : 'latest.aid.federal_loan_rate',
  'population.adultLearners' : 'latest.student.share_25_older',
  'population.partTime' : 'latest.student.part_time_share',
  'population.computer' : 'latest.academics.program_percentage.computer',
  'population.engineering' : 'latest.academics.program_percentage.engineering',
  'population.engineeringTechnology' : 'latest.academics.program_percentage.engineering_technology',
  'population.scienceTechnology' : 'latest.academics.program_percentage.science_technology',
  'population.communicationsTechnology' : 'latest.academics.program_percentage.communications_technology',
  'carnegie.basic' : 'school.carnegie_basic',
  'carnegie.undergrad' : 'school.carnegie_undergrad',
  'carnegie.sizeSetting' : 'school.carnegie_size_setting',
};

const VALUE_MAPPINGS = {
  operating : [ false, true ],
  onlineOnly : [ false, true ],
  ownership : [ 'Public', 'Private Nonprofit', 'Private For-Profit' ],
  level : [ null, '4-year', '2-year', 'Less-than-2-year' ],
  urbanization : [ null, 'Large City', 'Mid-Size City', 'Urban Fringe of a Large City', 'Urban Fringe of a Mid-Size City', 'Large Town', 'Small Town', 'Rural, Outside MSA', 'Rural, Inside MSA' ],
  'degree.predominant' : [ 'N/A', 'Certificate', 'Associate', 'Bachelor', 'Graduate' ],
  'degree.highest' : [ 'Non-degree', 'Certificate', 'Associate', 'Bachelor', 'Graduate' ],
};

(async function run() {
  let total;
  let page = 0;
  const data = [];
  console.log('starting...');
  let progressBar;
  try {
    do {
      const { body } = await superagent
        .get('https://api.data.gov/ed/collegescorecard/v1/schools.json')
        .query({
          _page : page,
          _per_page : 100,
          _sort : 'id',
          _fields : _.values(KEY_MAPPINGS).join(','),
          api_key : '9ceRc1xMRvhbgprzkbcqThfuzehVw6KRkaOkt3Ju', // API key assigned to zxlin+datagov@cyberskyline
        })
      ;

      const { metadata, results } = body;
      ({ page, total } = metadata);
      const { per_page : perPage } = metadata;

      if (!progressBar) {
        progressBar = new ProgressBar('[:bar] :current/:total :percent :rate elem/s :elapseds elapsed :etas remaining Page :page of :pages', { total });
      }

      _.each(results, (school) => {
        const transform = {};
        _.forOwn(KEY_MAPPINGS, (foreignKey, localKey) => {
          const mapping = VALUE_MAPPINGS[localKey];
          const value = mapping ? mapping[school[foreignKey]] : school[foreignKey];
          _.set(transform, localKey, _.isString(value) ? _.replace(value, / +(?= )/g, '') : value);
        });
        data.push(transform);
      });
      progressBar.tick(_.size(results), { page, pages : Math.ceil(total / perPage) });
      page++;
    } while (data.length < total);
    fs.writeFileSync(path.join(__dirname, '../dist/college_scorecard_database.json'), JSON.stringify(data, null, 2));
    console.log('done!');
  } catch (err) {
    console.error(_.get(err, 'response.body') || err);
  }
}());
