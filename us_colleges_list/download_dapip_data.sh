#!/bin/bash

curl 'https://ope.ed.gov/dapip/api/downloadFiles/accreditationDataFiles' \
  -H 'content-type: application/json' \
  --data-raw $'{\n  "CSVChecked": true,\n  "ExcelChecked": false\n}' \
  --compressed \
	--output 'DAPIP.zip'

unzip -o DAPIP.zip InstitutionCampus.csv

rm DAPIP.zip
