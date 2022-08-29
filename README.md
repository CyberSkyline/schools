## Department of Education Data Sources

Private High School: https://nces.ed.gov/surveys/pss/pssdata.asp

Public High School: https://nces.ed.gov/ccd/files.asp#Fiscal:2,LevelId:7,Page:1

College & University: https://ope.ed.gov/dapip/#/download-data-files & https://collegescorecard.ed.gov/data

US Centers of Academic Excellence in Cybersecurity: https://www.caecommunity.org/cae-map

### Obtaining College Data

Inside the `us_colleges_list` directory:
1. Run `node download_college_scorecard_database.js` to get College Scorecard Data
2. Run `./download_dapip_data.sh` to get all Institution Campuses data
3. Navigate to the CAE Community website above to retrieve list of CAE designated schools
4. Run the `create_list.js` script with the InstitutionCampus.csv data from step 2

### Obtaining High School Data

Inside the `us_highschools_list` directory:
1. Download the latest year CCD directory data from https://nces.ed.gov/ccd/files.asp#Fiscal:2,LevelId:7,Page:1 
2. Create a table on the ElSi tableGenerator to include total students column and school ID (e.g. for 2021 - https://nces.ed.gov/ccd/elsi/tableGenerator.aspx?savedTableID=421908)
3. Download as CSV
4. Run the `create_list.js` script for high school with the CCD directory data, ElSi data, and PSS data

### Adding Exceptions

In each directory, there's an `exceptions.json` which you can add in additional schools. Run `create_list.js` again to create the list. The final list should be in the `dist` directory.

### Boosting search ranking

The default ranking is based on the school's population, but some times large population schools may not necessarily be participating in our events, so we can boost their score by adding their school ID and the boost value (some value less than 10 should suffice, adjust to taste) to the `score_boost.json` file.

### Deploy

Run `ingest-to-mongo.js` to deploy into the production MongoDB server.

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
