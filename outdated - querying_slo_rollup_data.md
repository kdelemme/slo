## Querying SLO


Fetching the total good events and the total events over the 7 last days (SLO definition is rolling window 7d)
```
POST slo-observability.sli-v1-default*/_search
{
  "size": 0,
  "sort": [
    {
      "@timestamp": {
        "order": "asc"
      }
    }
  ],
  "query": {
    "bool": {
      "filter": [
        {
          "range": {
            "@timestamp": {
              "gte": "now-7d/m",
              "lt": "now/m"
            }
          }
        },
        {
          "match": {
            "slo.id": "7e6bab30-2fa8-11ed-b2f7-979b9d4d0680"
          }
        }
      ]
    }
  },
  "aggs": {
    "good": {
      "sum": {
        "field": "slo.numerator"
      }
    },
    "total": {
      "sum": {
        "field": "slo.denominator"
      }
    }
  }
}
```


Example result:
```
{
  "took": 569,
  "timed_out": false,
  "_shards": {
    "total": 2,
    "successful": 2,
    "skipped": 1,
    "failed": 0
  },
  "hits": {
    "total": {
      "value": 1795,
      "relation": "eq"
    },
    "max_score": null,
    "hits": []
  },
  "aggregations": {
    "total": {
      "value": 28634
    },
    "good": {
      "value": 27172
    }
  }
}
```

total = 28634
good = 27172


### Computing current SLO value

The current SLO value is calculated as `good / total * 100` 
0% (nothing work) to 100% (all work).

Example: `ratio value = 27172 / 28634 = 0.948` => 95%


### Computing Error Budget

If the objective is `0.99` (99%), the error budget is `1 - objective = 1 - 0.99 = 0.01` (1%)

Then we take the total number of events over same period (7d) and multiply by the error rate budget:
=> `0.01 * 28634 = 286.34` failures allowed over the last 7d.

We already have `total - good = 28634 - 27172 = 1462` errors which means we used this error budget percentage:
 `current bad request / error budget * 100 = 1462 / 286.34 * 100 = 510%`



### API

GET /slos/id
Returns 
- the slo definition
- maybe some stats?

GET /slos/id/details
Returns
- the slo definition
- the current slo value (% value): is the objective met or not.
- Current error budget consumption (raw values and %): errors_allowed: 200.20, current_errors: 100.10, current_error_budget_consummed: 50%



## With Daily aggregation

aggregate per day and compute sum of good and total events => Can compute daily error budget consumption, and therefore cummulative error budget consumption

```
POST slo-observability.sli-v1-default*/_search
{
  "size": 1,
  "sort": [
    {
      "@timestamp": {
        "order": "asc"
      }
    }
  ],
  "query": {
    "bool": {
      "filter": [
        {
          "range": {
            "@timestamp": {
              "gte": "now-7d/m",
              "lt": "now/m"
            }
          }
        },
        {
          "match": {
            "slo.id": "adff00b0-32d0-11ed-8f34-a7ea5d3e2b47"
          }
        }
      ]
    }
  },
  "aggs": {
    "per_day": {
      "date_histogram": {
        "field": "@timestamp",
        "calendar_interval": "day"
      },
      "aggs": {
        "good": {
          "sum": {
            "field": "slo.numerator"
          }
        },
        "total": {
          "sum": {
            "field": "slo.denominator"
          }
        }
      }
    }
  }
}
```


```
POST slo-observability.sli-v1-default*/_search
{
  "size": 0,
  "sort": [
    {
      "@timestamp": {
        "order": "asc"
      }
    }
  ],
  "query": {
    "bool": {
      "filter": [
        {
          "range": {
            "@timestamp": {
              "gte": "now-7d/m",
              "lt": "now/m"
            }
          }
        },
        {
          "match": {
            "slo.id": "adff00b0-32d0-11ed-8f34-a7ea5d3e2b47"
          }
        }
      ]
    }
  },
  "aggs": {
    "per_day": {
      "date_histogram": {
        "field": "@timestamp",
        "calendar_interval": "hour"
      },
      "aggs": {
        "good": {
          "sum": {
            "field": "slo.numerator"
          }
        },
        "total": {
          "sum": {
            "field": "slo.denominator"
          }
        },
        "cumulative_good": {
          "cumulative_sum": {
            "buckets_path": "good"
          }
        },
        "cumulative_total": {
          "cumulative_sum": {
            "buckets_path": "total"
          }
        }
      }
    }
  }
}
```