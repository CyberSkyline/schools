const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const superagent = require('superagent');
const { JSDOM } = require('jsdom');
const jquery = require('jquery');
const states = require('states-us').default;

const MAPPINGS = {
  'Auburn University' : 'Auburn University Main Campus',
  'Binghamton University (SUNY at Binghamton)' : 'SUNY at Binghamton',
  'Bloomsburg University of Pennsylvania' : 'Commonwealth University of Pennsylvania',
  'Butler Community College' : 'Butler County Community College',
  'California State University, Sacramento' : 'California State University - Sacramento',
  'California State University, San Bernardino' : 'California State University - San Bernardino',
  'California State University, San Marcos' : 'California State University - San Marcos',
  'Cecil College' : 'Cecil Community College',
  'Collin College' : 'Collin County Community College District',
  'Colorado State University-Pueblo' : 'Colorado State University - Pueblo',
  'East Stroudsburg University' : 'East Stroudsburg University of Pennsylvania',
  'Eastern Iowa Community College' : 'Eastern Iowa Community College District',
  'Eastern New Mexico University - Ruidoso' : 'Eastern New Mexico University - Ruidoso Branch Community College',
  'Edmonds College' : 'Edmonds Community College',
  'El Paso Community College' : 'El Paso Community College District',
  'Embry-Riddle Aeronautical University - Daytona Beach Campus' : 'Embry-Riddle Aeronautical University - Daytona Beach',
  'Embry-Riddle Aeronautical University, Prescott Campus' : 'Embry-Riddle Aeronautical University - Prescott',
  'Estrella Mountain Community College' : 'Maricopa Community Colleges - Estrella Mountain Community College',
  'Great Falls College Montana State University' : 'Montana State University - Great Falls College of Technology',
  'Green River College' : 'Green River Community College',
  'Indiana University' : 'Indiana University Bloomington',
  'Iowa State University' : 'Iowa State University of Science and Technology',
  'Ivy Tech Community College' : 'Ivy Tech Community College of Indiana',
  'Lemoyne-Owen College' : 'LeMoyne-Owen College',
  'Louisiana State University' : 'Louisiana State University and A&M College',
  'Madison College' : 'Madison Area Technical College',
  'Maryville University' : 'Maryville University of Saint Louis',
  'Metropolitan State University of Denver' : 'Metropolitan State University',
  'Metro State University' : 'Metropolitan State University',
  'Middle Georgia State University - MSIT' : null,
  'Missoula College' : 'The University of Montana',
  'New Mexico Tech' : 'New Mexico Institute of Mining and Technology',
  'North Carolina A&T State University' : 'North Carolina A & T State University',
  'Northwest Arkansas Community College' : 'NorthWest Arkansas Community College',
  'Pikes Peak Community College' : 'Pikes Peak State College',
  'Polytechnic University of Puerto Rico' : 'Universidad Politecnica de Puerto Rico',
  'Rowan College  at Burlington County' : 'Rowan College at Burlington County',
  'Rutgers, State University of New Jersey' : 'Rutgers, The State University of New Jersey',
  'Saint Vincent College' : 'Saint Vincent College and Seminary',
  'SANS Technology Institute' : 'The SANS Technology Institute',
  'St. Cloud State University' : 'Saint Cloud State University',
  'St. Cloud Technical & Community College' : 'St. Cloud Technical and Community College',
  'St. Louis Community College' : 'Saint Louis Community College',
  'St. Philip\'s College' : 'Saint Philip\'s College',
  'Stark State' : 'Stark State College',
  'Tennessee Tech University' : 'Tennessee Technological University',
  'Texas A&M - San Antonio' : 'Texas A&M University San Antonio',
  'Texas A&M University-Corpus Christi' : 'Texas A&M University - Corpus Christi',
  'Texas State Technical College Harlingen' : 'Texas State Technical College - Harlingen',
  'The George Washington University' : 'George Washington University, The',
  'The Johns Hopkins University' : 'Johns Hopkins University',
  'The Ohio State University' : 'Ohio State University',
  'The State University of New York at Canton' : 'SUNY College of Technology at Canton',
  'The University of Alabama at Birmingham' : 'University of Alabama at Birmingham',
  'The University of Alabama Huntsville' : 'University of Alabama at Huntsville',
  'The University of Arizona' : 'University of Arizona',
  'The University of Tennessee at Chattanooga' : 'The University of Tennessee - Chattanooga',
  'Thomas Nelson Community College' : 'Virginia Peninsula Community College',
  'University at Albany - State University of New York' : 'SUNY at Albany',
  'University at Buffalo, the State University of New York' : 'SUNY at Buffalo',
  'University of Arkansas' : 'University of Arkansas, Fayetteville',
  'University Of Arkansas at Little Rock' : 'University of Arkansas at Little Rock',
  'University of California, Davis' : 'University of California - Davis',
  'University of Colorado, Colorado Springs' : 'University of Colorado at Colorado Springs',
  'University of Detroit, Mercy' : 'University of Detroit Mercy',
  'University of Findlay' : 'The University of Findlay',
  'University of Hawaii Kapiolani Community College' : 'Kapi\'olani Community College',
  'University of Illinois at Springfield' : 'University of Illinois Springfield',
  'University of Illinois at Urbana-Champaign' : 'University of Illinois Urbana-Champaign',
  'University of Louisville - Graduate Certificate of Cybersecurity' : null,
  'University of Louisville, Kentucky' : 'University of Louisville',
  'University of Maryland, Baltimore County' : 'University of Maryland - Baltimore County',
  'University of Maryland, College Park' : 'University of Maryland - College Park',
  'University of Massachusetts Lowell' : 'University of Massachusetts - Lowell',
  'University of Missouri - St. Louis' : 'University of Missouri - St Louis',
  'University of Nebraska at Omaha' : 'University of Nebraska - Omaha',
  'University of Nevada, Las Vegas' : 'University of Nevada - Las Vegas',
  'University of North Carolina, Charlotte' : 'University of North Carolina at Charlotte',
  'University of North Carolina, Pembroke' : 'University of North Carolina at Pembroke',
  'University of North Carolina, Wilmington' : 'University of North Carolina at Wilmington',
  'University of Pittsburgh' : 'University of Pittsburgh - Main Campus',
  'University of Puerto Rico' : 'University of Puerto Rico - Humacao',
  'University of South Carolina' : 'University of South Carolina - Columbia',
  'University of South Carolina-Aiken' : 'University of South Carolina Aiken',
  'University of Texas at Dallas' : 'The University of Texas at Dallas',
  'University of Texas at El Paso' : 'The University of Texas at El Paso',
  'University of West Florida' : 'The University of West Florida',
  'University of Wisconsin-Stout' : 'University of Wisconsin - Stout',
  'University of Wisconsin-Whitewater' : 'University of Wisconsin - Whitewater',
  'Utica University' : 'Utica College',
  'Utica University - MS Cybersecurity' : null,
  'Walsh College' : 'Walsh University',
  'Wallace State Community College' : 'Wallace State Community College - Hanceville',
};

(async function run() {
  const { text } = await superagent.get('https://www.caecommunity.org/cae-map');
  const dom = new JSDOM(text);

  const $ = jquery(dom.window);

  const output = _.flatMap($('.cae-map--data'), (entry) => {
    const $entry = $(entry);
    //Updates to the CAE site: have to sanatize name, changed location of the designation in the html
    const name = $entry.find('.cae-map--title').text().trim().replace(/^\+\s*/, '');
    const designations = _.map($entry.parent().siblings().find('.designation-name'), (designation) => $(designation).text().trim());

    const correctName = MAPPINGS[name];
    if (correctName === null) return []; // explicit skip

    const school = correctName || name;

    console.log(name, designations);
    return { school, designations };
  });

  fs.writeFileSync(path.join(__dirname, '../dist/cae_designations.json'), JSON.stringify(output, null, 2));

  console.log('Done');
}());
