## Department of Education Data Sources

Private High School: https://nces.ed.gov/surveys/pss/pssdata.asp

Public High School: https://nces.ed.gov/ccd/files.asp#Fiscal:2,LevelId:7,Page:1

College & University: https://ope.ed.gov/dapip/#/download-data-files & https://collegescorecard.ed.gov/data

US Centers of Academic Excellence in Cybersecurity: https://www.caecommunity.org/cae-map

### Obtaining College Data

Inside the `us_colleges_list` directory:
1. Run `node download_college_scorecard_database.js` to get College Scorecard Data
2. Run `./download_dapip_data.sh` to get all Institution Campuses data
3. Run `node download_cae_schools.js` to get all CAE designation data
4. Run the `create_list.js` script with the InstitutionCampus.csv data from step 2

### Contributing College Logos

All logos should be placed in the `us_colleges_list/logos/` directory in the filename format: `id_school_name.svg`. For example, `112093_university_of_hawaii_west_oahu.svg` is an acceptable filename where `112093` is the Department of Education DAPIP ID for the University of Hawaii West Oahu. SVG file format is highly encouraged, if no SVG file is available, a high quality PNG is also acceptable. For PNG files, please make sure it is no larger than 1000px in width or height and make sure to compress the PNG via tools such as https://compresspng.com

Logos files are for reference and are solely owned by their respective owners. If the copyright owner does not wish for their logo file to be included in this repository, you may open an issue to request for removal.

### Obtaining High School Data

Inside the `us_highschools_list` directory:
1. Download the latest year CCD directory data from https://nces.ed.gov/ccd/files.asp#Fiscal:2,LevelId:7,Page:1 
2. Create a table on the ElSi tableGenerator to include total students column and school ID, make sure to select the latest year and include column for total enrollment (e.g. for 2021 - https://nces.ed.gov/ccd/elsi/tableGenerator.aspx?savedTableID=421908)
3. Download as CSV
4. Run the `create_list.js` script for high school with the CCD directory data, ElSi data, and PSS data

### Adding Exceptions

In each directory, there's an `exceptions.json` which you can add in additional schools. Run `create_list.js` again to create the list. The final list should be in the `dist` directory.

### Boosting search ranking

The default ranking is based on the school's population, but some times large population schools may not necessarily be participating in our events, so we can boost their score by adding their school ID and the boost value (some value less than 10 should suffice, adjust to taste) to the `score_boost.json` file.

### Deploy

On push to the `main` branch, GitHub Actions will automatically run and deploy it to the MongoDB server.

To deploy manually, run `ingest-to-mongo.js` to deploy into the production MongoDB server with the `MONGO_URI` environmental variable.

### Altas Search Index

```JSON
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "alias": [
        {
          "dynamic": true,
          "type": "document"
        },
        {
          "type": "string"
        },
        {
          "type": "autocomplete"
        }
      ],
      "city": [
        {
          "dynamic": true,
          "type": "document"
        },
        {
          "type": "string"
        },
        {
          "type": "autocomplete"
        }
      ],
      "domain": [
        {
          "dynamic": true,
          "type": "document"
        },
        {
          "type": "string"
        },
        {
          "type": "autocomplete"
        }
      ],
      "name": [
        {
          "dynamic": true,
          "type": "document"
        },
        {
          "type": "string"
        },
        {
          "type": "autocomplete"
        }
      ],
      "search": [
        {
          "dynamic": true,
          "type": "document"
        },
        {
          "type": "string"
        },
        {
          "type": "autocomplete"
        }
      ]
    }
  }
}
```
