# SLO

You'll find some proof of concepts, research documents, es queries...

## Generate SLO historical data and continous data

Handy if you want to generate some data for an existing SLO, and keep generating the data as time passes.
The script will generate 3 month of historical data, and then every minute, will insert a new document.

1. Create an SLO through the API. Copy the slo `id`
2. Stop the **transform** manually associated to this slo
3. Remove the data manually (delete by query or delete all slo indices)
4. Run `node lib/continuous_rollup_data_generator/index.js slo_id` 


The data is generated with the following noise function. When the function returns a negative value, we use it to compute the `good` events as a ratio of the `total` events.
![noise](./noise.svg)

   

## Generate SLO rollup data

You'll need to have the SLO resources (indices and pipeline) installed on your ES instance, therefore, make sure you have created at least on SLO using the API.

```
curl --request POST \
  --url http://localhost:5601/efu/api/observability/slos \
  --header 'Authorization: Basic ZWxhc3RpYzpjaGFuZ2VtZQ==' \
  --header 'Content-Type: application/json' \
  --header 'kbn-xsrf: oui' \
  --data '{
	"name": "My SLO Availability 1",
	"description": "99% o11y-app all services availablility",
	"indicator": {
		"type": "slo.apm.transaction_error_rate",
		"params": {
			"environment": "development",
			"service": "o11y-app",
			"transaction_type": "request",
			"transaction_name": "GET /flaky"
		}
	},
	"time_window": {
		"duration": "7d",
		"is_rolling": true
	},
	"budgeting_method": "occurrences",
	"objective": {
		"target": 0.99
	}
}'
```

In order to work on the SLO alerting project, we need to artificially generate a bunch of aggregated data as the SLO transform would do in production.
The script under `lib/rollup_data/index.js` generates 2 days of aggregate data (per minute). It output the generated slo id.

All generated data points are using constant values, e.g. numerator = 100, denominator = 100, except for a defined outage window using the `errorSpikeDateRange`.



Run: `node lib/rollup_data`
