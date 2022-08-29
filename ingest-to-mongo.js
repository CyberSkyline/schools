// This script loads in school data to be searchable with mongodb
const _ = require('lodash');
const { MongoClient } = require('mongodb');

const colleges = require('./dist/us_institutions');
const canadaColleges = require('./dist/ca_institutions');
const highschools = require('./dist/us_high_schools');
const scoreBoost = require('./score_boost');

const client = new MongoClient(process.env.MONGO_URI, { useNewUrlParser : true, useUnifiedTopology : true });

async function main() {
  const collection = client.db('search-production').collection('schools');

  await collection.createIndex({ eduId : 1, level : 1 });
  await collection.createIndex({ name : 1, level : 1 });
  await collection.createIndex({ domain : 1 });

  console.log(`Processing ${colleges.length + canadaColleges.length} colleges`);
  const bulkCollege = collection.initializeUnorderedBulkOp();
  _.each(colleges, (college) => {
    bulkCollege.find({ eduId : college.id, level : 'UC' }).upsert().updateOne({
      $set : {
        eduId : college.id,
        name : college.name,
        street : college.street,
        city : college.city,
        subdivision : college.state,
        country : 'US',
        domain : college.domain,
        level : 'UC',
        alias : college.alias,
        population : college.population,
        search : `${college.name} ${college.alias || ''} ${college.domain || ''}`.trim(),
        scoreBoost : scoreBoost[college.id] || undefined,
        designations : college.designations,
        predominantDegree : college.predominantDegree,
      },
    });
  });
  _.each(canadaColleges, (college) => {
    bulkCollege.find({ eduId : college.id, level : 'UC' }).upsert().updateOne({
      $set : {
        eduId : college.id,
        name : college.name,
        street : college.street,
        city : college.city,
        subdivision : college.province,
        country : 'CA',
        domain : college.domain,
        level : 'UC',
        alias : college.alias,
        population : college.population,
        search : `${college.name} ${college.alias || ''} ${college.domain || ''}`.trim(),
        scoreBoost : scoreBoost[college.id] || undefined,
        predominantDegree : college.predominantDegree,
      },
    });
  });
  const { result : collegeResult } = await bulkCollege.execute();
  console.log(`${collegeResult.nModified} colleges modified | ${collegeResult.nUpserted} colleges added`);

  console.log(`Processing ${highschools.length} highschools`);
  const bulkHS = collection.initializeUnorderedBulkOp();
  _.each(highschools, (highschool) => {
    bulkHS.find({ eduId : highschool.id, level : 'HS' }).upsert().updateOne({
      $set : {
        eduId : highschool.id,
        name : highschool.name,
        agency : highschool.agency,
        alias : highschool.alias,
        street : highschool.street,
        city : highschool.city,
        subdivision : highschool.state,
        country : 'US',
        level : 'HS',
        type : highschool.type,
        population : highschool.population,
        search : `${highschool.name} ${highschool.city}, ${highschool.state}`,
        scoreBoost : scoreBoost[highschool.id] || undefined,
      },
    });
  });

  bulkHS.find({ eduId : 'homeschool', level : 'HS' }).upsert().updateOne({
    $set : {
      eduId : 'homeschool',
      name : 'Home School',
      agency : 'At Home',
      alias : 'Homeschool',
      city : 'Home',
      subdivision : 'Anywhere',
      country : 'US',
      level : 'HS',
      type : 'PRIVATE',
      population : 30000,
      scoreBoost : 100,
      search : `homeschool home school`,
    },
  });
  const { result : highschoolResult } = await bulkHS.execute();
  console.log(`${highschoolResult.nModified} highschools modified | ${highschoolResult.nUpserted} highschools added`);

  console.log('done');
  client.close();
}

client.connect(async (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  try {
    await main();
  } catch (e) {
    console.error(e);
    client.close();
  }
});
