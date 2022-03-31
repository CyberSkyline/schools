## Department of Education Data Sources

Private High School: https://nces.ed.gov/surveys/pss/pssdata.asp

Public High School: https://nces.ed.gov/ccd/files.asp#Fiscal:2,LevelId:7,Page:1

College & University: https://ope.ed.gov/dapip/#/download-data-files & https://collegescorecard.ed.gov/data

US Centers of Academic Excellence in Cybersecurity: https://www.caecommunity.org/cae-map

### Obtaining High School Data

1. Download the latest year CCD directory data from https://nces.ed.gov/ccd/files.asp#Fiscal:2,LevelId:7,Page:1 
2. Create a table on the ElSi tableGenerator to include total students column and school ID (e.g. for 2021 - https://nces.ed.gov/ccd/elsi/tableGenerator.aspx?savedTableID=421908)
3. Download as CSV
4. Run the `create_list.js` script for high school with the CCD directory data, ElSi data, and PSS data

### Boosting search ranking

The default ranking is based on the school's population, but some times large population schools may not necessarily be participating in our events, so we can boost their score by adding their school ID and the boost value (some value less than 10 should suffice, adjust to taste) to the `score_boost.json` file.

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
