const _ = require('lodash');
const superagent = require('superagent');
const fs = require('fs');
const bluebird = require('bluebird');
const path = require('path');
const readline = require('readline');
const dist = require('../dist/us_institutions.json');

const SCHOOL_IDS = process.argv.slice(2);

if (_.isEmpty(SCHOOL_IDS)) {
  console.error(`usage: node ${path.basename(process.argv[1])} <School ID> <School ID> ...`);
  process.exit(1);
}

const rl = readline.createInterface({
  input : process.stdin,
  output : process.stdout,
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer));
  });
}

function parseImageUrl(url) {
  const fileFormatMatch = url.match(/\[\[(?:File|Image):([^|]+)\|*.*\]\]/);
  if (fileFormatMatch) {
    return fileFormatMatch[1];
  } else {
    return url;
  }
}

(async function run() {
  let counter = 0;
  const total = _.size(SCHOOL_IDS);
  const lookup = _.keyBy(dist, 'id');

  await bluebird.each(SCHOOL_IDS, async (id) => {
    const school = lookup[id];
    const { name, domain } = school;
    console.log(`[${++counter}/${total}] ${name}`);

    const search = name;
    let logo;
    let image;

    const res = await superagent
      .get('https://en.wikipedia.org/w/api.php')
      .query({ action : 'opensearch', limit : 5, namespace : 0, format : 'json', search })
    ;

    const resultPages = res.body[1];

    let targetPage;
    if (_.size(resultPages) <= 3) {
      targetPage = _.first(resultPages);
    } else if (_.size(resultPages) > 3) {
      console.log(`[INPUT] Multiple articles found for:\n${name}`);
      _.each(resultPages, (url, i) => console.log(`        ${i} - ${url}`));
      const response = await askQuestion('Selection: ');
      targetPage = resultPages[Number(response)];
    }

    if (!targetPage) {
      console.error(`[INPUT] Wikiepdia article not found, please enter Wikipedia article page for:\n${name}`);
      const response = await askQuestion('Page: ');

      targetPage = response;
    }

    console.log(`\tUsing => ${targetPage}`);

    if (targetPage) {
      const response = await superagent
        .get('https://en.wikipedia.org/w/api.php')
        .query({ action : 'parse', prop : 'wikitext|images', format : 'json', redirects : true, page : targetPage })
      ;
      if (!response.body.parse) {
        console.log(name, response.body);
      }
      const { images, wikitext } = response.body.parse;

      const text = wikitext['*'];

      const logoMatch = _.get(text.match(/(?:logo|logo_name) *= *(.*)/), '1');
      const imageMatch = _.get(text.match(/(?:image|image_name) *= *(.*)\n/), '1');

      if (logoMatch) {
        logo = `https://en.wikipedia.org/wiki/Special:FilePath/${parseImageUrl(logoMatch)}`;
      }
      if (imageMatch) {
        image = `https://en.wikipedia.org/wiki/Special:FilePath/${parseImageUrl(imageMatch)}`;
      }

      if (!logoMatch && !imageMatch && !_.isEmpty(images)) {
        console.log('[INFO] Wikipedia article contained these images:');
        _.each(images, (imageUrl) => console.log(`       https://en.wikipedia.org/wiki/Special:FilePath/${imageUrl}`));
      }
      console.log(`        Logo: ${logo}`);
      console.log(`        Image: ${image}`);
    }

    if (!logo && !image) {
      console.error(`[ERROR] Cannot find logo or image for: ${name}`);
      console.error(`        Domain:`);
      console.error(`        ${domain}`);

      const logoResponse = await askQuestion('Please enter logo url: ');
      logo = logoResponse || undefined;
    }

    const url = _.trim(logo || image);
    const decodedUri = decodeURI(url);
    const encodedUri = encodeURI(url);

    const target = url === decodedUri ? encodedUri : url;

    console.log(`        Selected URL: ${target}`);

    const logoFilename = `${id}_${_.snakeCase(name)}${_.toLower(path.extname(target))}`;
    const out = fs.createWriteStream(path.join(__dirname, `logos/${logoFilename}`));

    const logoFileRes = superagent.get(target).set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
    logoFileRes.pipe(out);

    await new Promise((resolve, reject) => {
      logoFileRes.on('error', reject);
      out.on('close', resolve);
    });
  });

  console.log('Done');
  process.exit(0);
}());
