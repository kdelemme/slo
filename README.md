# SLO

## Generate rollup data

In order to work on the SLO alerting project, we need to artificially generate a bunch of aggregated data as the SLO transform would do in production.
The script under `lib/rollup_data/index.js` generates 2 days of aggregate data (per minute). It output the generated slo id.

All generated data points are using constant values, e.g. numerator = 90, denominator = 100. 


Run: `node lib/rollup_data`
