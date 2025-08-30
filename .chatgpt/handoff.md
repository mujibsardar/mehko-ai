# Handoff
**Issue:** Need script to identify non-fillable PDF forms in data/applications directory
**Ask:** Create a script that scans data/applications/{countyid}/{formname}/ directories and identifies which form.pdf files are NOT fillable (non-AcroForm type)

## Repro
```bash
#!/usr/bin/env bash
set -e
# minimal run to view the form
npm -v || true
echo "Open the app and navigate to San Diego > SOP PDF step. Expect fields to render."
```

## Env & Checks
```bash
$ find data/applications -name 'form.pdf' -type f
data/applications/los_angeles_county_mehko/forms/MEHKO_PublicHealthPermitApplication-ENG/form.pdf
data/applications/los_angeles_county_mehko/forms/MEHKO_SOP-English/form.pdf
data/applications/solano_county_mehko/forms/MEHKO_Standard_Operating_Procedures_fill/form.pdf
data/applications/solano_county_mehko/forms/MEHKO_Facility_Application/form.pdf
data/applications/sonoma_county_mehko/forms/SonomaCounty-MEHKO-SOP-English-03-2025/form.pdf
data/applications/sonoma_county_mehko/forms/SonomaCounty-MEHKO-Program-Intro-Eng-02-2025/form.pdf
data/applications/santa_clara_county_mehko/forms/MEHKO_Application_Packet/form.pdf
data/applications/lake_county_mehko/forms/Permit-Application-PDF/form.pdf
data/applications/lake_county_mehko/forms/MEHKO-Standard-Operating-Procedures-PDF/form.pdf
data/applications/san_diego_county_mehko/forms/mehkosop.pdf/form.pdf
data/applications/san_diego_county_mehko/forms/publications_permitapp152.pdf/form.pdf
data/applications/san_mateo_county_mehko/forms/MEHKO_SOP_Form/form.pdf
data/applications/san_mateo_county_mehko/forms/MEHKO_Permit_Application/form.pdf
data/applications/san_mateo_county_mehko/forms/MEHKO_Rental_Notification/form.pdf
data/applications/santa_cruz_county_mehko/forms/EHD_404CP_MEHKO_STANDARD_OPERATING_PROCEDURES_12-23-2024_Fillable/form.pdf
data/applications/santa_cruz_county_mehko/forms/EHD_405CP_MEHKO_HEALTH_PERMIT_APPLICATION_12-23-2024_Fillable/form.pdf
data/applications/santa_barbara_county_mehko/forms/EHS_16-16a_MEHKO_SOP-English/form.pdf
data/applications/santa_barbara_county_mehko/forms/EHS_16-1_FoodFacility_PlanCheck_PermitApplication/form.pdf
data/applications/imperial_county_mehko/forms/Food_Facility_Health_Permit_Application_12-29-23/form.pdf
data/applications/imperial_county_mehko/forms/Imp_Co_MEHKO_SOP_2023-5-1-2/form.pdf
data/applications/riverside_county_mehko/forms/MHKO_SOP_Riverside/form.pdf
data/applications/alameda_county_mehko/forms/MEHKO_APP_SOP/form.pdf
```
```bash
$ ls -la data/applications/*/forms/*/
data/applications/alameda_county_mehko/forms/MEHKO_APP_SOP/:
total 632
drwxr-xr-x  6 avan  staff     192 Aug 30 11:14 .
drwxr-xr-x  3 avan  staff      96 Aug 30 11:14 ..
-rw-r--r--  1 avan  staff     387 Aug 30 11:14 acroform-definition.json
-rw-r--r--  1 avan  staff  309116 Aug 30 11:14 form.pdf
-rw-r--r--  1 avan  staff     337 Aug 30 11:14 meta.json
-rw-r--r--  1 avan  staff     183 Aug 30 11:14 overlay.json

data/applications/imperial_county_mehko/forms/Food_Facility_Health_Permit_Application_12-29-23/:
total 336
drwxr-xr-x  6 avan  staff     192 Aug 30 11:14 .
drwxr-xr-x  4 avan  staff     128 Aug 30 11:14 ..
-rw-r--r--  1 avan  staff   12918 Aug 30 11:14 acroform-definition.json
-rw-r--r--  1 avan  staff  131581 Aug 30 11:14 form.pdf
-rw-r--r--  1 avan  staff     423 Aug 30 11:14 meta.json
-rw-r--r--  1 avan  staff   12777 Aug 30 11:14 overlay.json

data/applications/imperial_county_mehko/forms/Imp_Co_MEHKO_SOP_2023-5-1-2/:
total 2696
drwxr-xr-x  6 avan  staff      192 Aug 30 11:14 .
drwxr-xr-x  4 avan  staff      128 Aug 30 11:14 ..
-rw-r--r--  1 avan  staff    24480 Aug 30 11:14 acroform-definition.json
-rw-r--r--  1 avan  staff  1326414 Aug 30 11:14 form.pdf
-rw-r--r--  1 avan  staff      364 Aug 30 11:14 meta.json
-rw-r--r--  1 avan  staff    24354 Aug 30 11:14 overlay.json

data/applications/lake_county_mehko/forms/MEHKO-Standard-Operating-Procedures-PDF/:
total 1384
drwxr-xr-x  6 avan  staff     192 Aug 30 11:14 .
drwxr-xr-x  4 avan  staff     128 Aug 30 11:14 ..
-rw-r--r--  1 avan  staff     404 Aug 30 11:14 acroform-definition.json
-rw-r--r--  1 avan  staff  695725 Aug 30 11:14 form.pdf
-rw-r--r--  1 avan  staff     373 Aug 30 11:14 meta.json
-rw-r--r--  1 avan  staff     207 Aug 30 11:14 overlay.json

data/applications/lake_county_mehko/forms/Permit-Application-PDF/:
total 352
drwxr-xr-x  6 avan  staff     192 Aug 30 11:14 .
drwxr-xr-x  4 avan  staff     128 Aug 30 11:14 ..
-rw-r--r--  1 avan  staff     392 Aug 30 11:14 acroform-definition.json
-rw-r--r--  1 avan  staff  164373 Aug 30 11:14 form.pdf
-rw-r--r--  1 avan  staff     344 Aug 30 11:14 meta.json
-rw-r--r--  1 avan  staff     180 Aug 30 11:14 overlay.json

data/applications/los_angeles_county_mehko/forms/MEHKO_PublicHealthPermitApplication-ENG/:
total 768
drwxr-xr-x  3 avan  staff      96 Aug 30 11:20 .
drwxr-xr-x  4 avan  staff     128 Aug 30 11:14 ..
-rw-r--r--@ 1 avan  staff  392073 Aug 30 11:20 form.pdf

data/applications/los_angeles_county_mehko/forms/MEHKO_SOP-English/:
total 1200
drwxr-xr-x  3 avan  staff      96 Aug 30 11:21 .
drwxr-xr-x  4 avan  staff     128 Aug 30 11:14 ..
-rw-r--r--@ 1 avan  staff  610801 Aug 30 11:21 form.pdf

data/applications/riverside_county_mehko/forms/MHKO_SOP_Riverside/:
total 776
drwxr-xr-x  6 avan  staff     192 Aug 30 11:14 .
drwxr-xr-x  3 avan  staff      96 Aug 30 11:14 ..
-rw-r--r--  1 avan  staff   22745 Aug 30 11:14 acroform-definition.json
-rw-r--r--  1 avan  staff  340303 Aug 30 11:14 form.pdf
-rw-r--r--  1 avan  staff     372 Aug 30 11:14 meta.json
-rw-r--r--  1 avan  staff   22618 Aug 30 11:14 overlay.json

data/applications/san_diego_county_mehko/forms/mehkosop.pdf/:
total 1752
drwxr-xr-x  6 avan  staff     192 Aug 30 11:14 .
drwxr-xr-x  4 avan  staff     128 Aug 30 11:14 ..
-rw-r--r--  1 avan  staff     382 Aug 30 11:14 acroform-definition.json
-rw-r--r--  1 avan  staff  884330 Aug 30 11:14 form.pdf
-rw-r--r--  1 avan  staff     336 Aug 30 11:14 meta.json
-rw-r--r--  1 avan  staff     180 Aug 30 11:14 overlay.json

data/applications/san_diego_county_mehko/forms/publications_permitapp152.pdf/:
total 1920
drwxr-xr-x  6 avan  staff     192 Aug 30 11:14 .
drwxr-xr-x  4 avan  staff     128 Aug 30 11:14 ..
-rw-r--r--  1 avan  staff   22775 Aug 30 11:14 acroform-definition.json
-rw-r--r--  1 avan  staff  928971 Aug 30 11:14 form.pdf
-rw-r--r--  1 avan  staff     373 Aug 30 11:14 meta.json
-rw-r--r--  1 avan  staff   22633 Aug 30 11:14 overlay.json

data/applications/san_mateo_county_mehko/forms/MEHKO_Permit_Application/:
total 480
drwxr-xr-x  6 avan  staff     192 Aug 30 11:14 .
drwxr-xr-x  5 avan  staff     160 Aug 30 11:14 ..
-rw-r--r--  1 avan  staff     399 Aug 30 11:14 acroform-definition.json
-rw-r--r--  1 avan  staff  230659 Aug 30 11:14 form.pdf
-rw-r--r--  1 avan  staff     393 Aug 30 11:14 meta.json
-rw-r--r--  1 avan  staff     182 Aug 30 11:14 overlay.json

data/applications/san_mateo_county_mehko/forms/MEHKO_Rental_Notification/:
total 1736
drwxr-xr-x  6 avan  staff     192 Aug 30 11:14 .
drwxr-xr-x  5 avan  staff     160 Aug 30 11:14 ..
-rw-r--r--  1 avan  staff     454 Aug 30 11:14 acroform-definition.json
-rw-r--r--  1 avan  staff  873712 Aug 30 11:14 form.pdf
-rw-r--r--  1 avan  staff     396 Aug 30 11:14 meta.json
-rw-r--r--  1 avan  staff     311 Aug 30 11:14 overlay.json

data/applications/san_mateo_county_mehko/forms/MEHKO_SOP_Form/:
total 808
drwxr-xr-x  6 avan  staff     192 Aug 30 11:14 .
drwxr-xr-x  5 avan  staff     160 Aug 30 11:14 ..
-rw-r--r--  1 avan  staff     456 Aug 30 11:14 acroform-definition.json
-rw-r--r--  1 avan  staff  399302 Aug 30 11:14 form.pdf
-rw-r--r--  1 avan  staff     359 Aug 30 11:14 meta.json
-rw-r--r--  1 avan  staff     329 Aug 30 11:14 overlay.json

data/applications/santa_barbara_county_mehko/forms/EHS_16-1_FoodFacility_PlanCheck_PermitApplication/:
total 1208
drwxr-xr-x  6 avan  staff     192 Aug 30 11:14 .
drwxr-xr-x  4 avan  staff     128 Aug 30 11:14 ..
-rw-r--r--  1 avan  staff   13251 Aug 30 11:14 acroform-definition.json
-rw-r--r--  1 avan  staff  577551 Aug 30 11:14 form.pdf
-rw-r--r--  1 avan  staff     381 Aug 30 11:14 meta.json
-rw-r--r--  1 avan  staff   13105 Aug 30 11:14 overlay.json

data/applications/santa_barbara_county_mehko/forms/EHS_16-16a_MEHKO_SOP-English/:
total 720
drwxr-xr-x  6 avan  staff     192 Aug 30 11:14 .
drwxr-xr-x  4 avan  staff     128 Aug 30 11:14 ..
-rw-r--r--  1 avan  staff   21526 Aug 30 11:14 acroform-definition.json
-rw-r--r--  1 avan  staff  312253 Aug 30 11:14 form.pdf
-rw-r--r--  1 avan  staff     355 Aug 30 11:14 meta.json
-rw-r--r--  1 avan  staff   21395 Aug 30 11:14 overlay.json

data/applications/santa_clara_county_mehko/forms/MEHKO_Application_Packet/:
total 904
drwxr-xr-x  3 avan  staff      96 Aug 30 11:29 .
drwxr-xr-x  3 avan  staff      96 Aug 30 11:28 ..
-rw-r--r--@ 1 avan  staff  458764 Aug 30 11:29 form.pdf

data/applications/santa_cruz_county_mehko/forms/EHD_404CP_MEHKO_STANDARD_OPERATING_PROCEDURES_12-23-2024_Fillable/:
total 1072
drwxr-xr-x  6 avan  staff     192 Aug 30 11:14 .
drwxr-xr-x  4 avan  staff     128 Aug 30 11:14 ..
-rw-r--r--  1 avan  staff   20715 Aug 30 11:14 acroform-definition.json
-rw-r--r--  1 avan  staff  493775 Aug 30 11:14 form.pdf
-rw-r--r--  1 avan  staff     498 Aug 30 11:14 meta.json
-rw-r--r--  1 avan  staff   20587 Aug 30 11:14 overlay.json

data/applications/santa_cruz_county_mehko/forms/EHD_405CP_MEHKO_HEALTH_PERMIT_APPLICATION_12-23-2024_Fillable/:
total 760
drwxr-xr-x  6 avan  staff     192 Aug 30 11:14 .
drwxr-xr-x  4 avan  staff     128 Aug 30 11:14 ..
-rw-r--r--  1 avan  staff    3257 Aug 30 11:14 acroform-definition.json
-rw-r--r--  1 avan  staff  376016 Aug 30 11:14 form.pdf
-rw-r--r--  1 avan  staff     504 Aug 30 11:14 meta.json
-rw-r--r--  1 avan  staff    3114 Aug 30 11:14 overlay.json

data/applications/sierra_county_mehko/forms/SIERRA_MEHKO_PermitApplication/:
total 0
drwxr-xr-x  2 avan  staff   64 Aug 30 11:14 .
drwxr-xr-x  4 avan  staff  128 Aug 30 11:14 ..

data/applications/sierra_county_mehko/forms/SIERRA_MEHKO_SOP-English/:
total 0
drwxr-xr-x  2 avan  staff   64 Aug 30 11:14 .
drwxr-xr-x  4 avan  staff  128 Aug 30 11:14 ..

data/applications/solano_county_mehko/forms/MEHKO_Facility_Application/:
total 400
drwxr-xr-x  6 avan  staff     192 Aug 30 11:32 .
drwxr-xr-x  4 avan  staff     128 Aug 30 11:14 ..
-rw-r--r--  1 avan  staff     398 Aug 30 11:14 acroform-definition.json
-rw-r--r--@ 1 avan  staff  188551 Aug 30 11:31 form.pdf
-rw-r--r--  1 avan  staff     489 Aug 30 11:14 meta.json
-rw-r--r--  1 avan  staff     184 Aug 30 11:14 overlay.json

data/applications/solano_county_mehko/forms/MEHKO_Standard_Operating_Procedures_fill/:
total 944
drwxr-xr-x  6 avan  staff     192 Aug 30 11:14 .
drwxr-xr-x  4 avan  staff     128 Aug 30 11:14 ..
-rw-r--r--  1 avan  staff   22683 Aug 30 11:14 acroform-definition.json
-rw-r--r--  1 avan  staff  426140 Aug 30 11:14 form.pdf
-rw-r--r--  1 avan  staff     388 Aug 30 11:14 meta.json
-rw-r--r--  1 avan  staff   22559 Aug 30 11:14 overlay.json

data/applications/sonoma_county_mehko/forms/SonomaCounty-MEHKO-Program-Intro-Eng-02-2025/:
total 3024
drwxr-xr-x  6 avan  staff      192 Aug 30 11:14 .
drwxr-xr-x  4 avan  staff      128 Aug 30 11:14 ..
-rw-r--r--  1 avan  staff      416 Aug 30 11:14 acroform-definition.json
-rw-r--r--  1 avan  staff  1533074 Aug 30 11:14 form.pdf
-rw-r--r--  1 avan  staff      550 Aug 30 11:14 meta.json
-rw-r--r--  1 avan  staff      202 Aug 30 11:14 overlay.json

data/applications/sonoma_county_mehko/forms/SonomaCounty-MEHKO-SOP-English-03-2025/:
total 912
drwxr-xr-x  6 avan  staff     192 Aug 30 11:14 .
drwxr-xr-x  4 avan  staff     128 Aug 30 11:14 ..
-rw-r--r--  1 avan  staff   31564 Aug 30 11:14 acroform-definition.json
-rw-r--r--  1 avan  staff  397200 Aug 30 11:14 form.pdf
-rw-r--r--  1 avan  staff     533 Aug 30 11:14 meta.json
-rw-r--r--  1 avan  staff   31440 Aug 30 11:14 overlay.json
```
```bash
$ python -c "import PyPDF2; print('PyPDF2 available')"
pyenv: python: command not found

The `python' command exists in these Python versions:
  3.10.13

Note: See 'pyenv help global' for tips on allowing both
      python2 and python3 to be found.
