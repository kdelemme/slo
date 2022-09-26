# SLO

You'll find some proof of concepts, research documents, es queries...



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

All generated data points are using constant values, e.g. numerator = 90, denominator = 100. 


Run: `node lib/rollup_data`
