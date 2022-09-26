# Multi-window Burn Rate Alert

We defined two window: a long and a short window. The short window = 1/12th of the long window.
Below example uses long window = 1hour, and short window = 5min. We sum the numerator and denominator of a specific SLO id for the two window using the `date_range` agg.


```
POST slo-observability.sli-v1*/_search
{
  "size": 0,
  "query": {
    "bool": {
      "filter": [
        {
          "range": {
            "@timestamp": {
              "gte": "now-1h/m",
              "lt": "now/m"
            }
          }
        },
        {
          "match": {
            "slo.id": "53224350-3db6-11ed-8c57-3b87fe4b4f10"
          }
        }
      ]
    }
  },
  "aggs": {
    "long_window": {
      "date_range": {
        "field": "@timestamp",
        "ranges": [
          {
            "from": "now-1h/m",
            "to": "now/m"
          }
        ]
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
    },
    "short_window": {
      "date_range": {
        "field": "@timestamp",
        "ranges": [
          {
            "from": "now-5m/m",
            "to": "now/m"
          }
        ]
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

Result:
We obtain for the long window: 402 good events of 427 total events, and for the short window: 48 on 51 total events.
Knowing the SLO Target, e.g. 99%, we can derive the Burn Rate for the Long and Short window and compare them agains't the threshold of the alert definition. 

```
{
  "took": 620,
  "timed_out": false,
  "_shards": {
    "total": 2,
    "successful": 2,
    "skipped": 0,
    "failed": 0
  },
  "hits": {
    "total": {
      "value": 27,
      "relation": "eq"
    },
    "max_score": null,
    "hits": []
  },
  "aggregations": {
    "long_window": {
      "buckets": [
        {
          "key": "2022-09-26T17:19:00.000Z-2022-09-26T18:19:00.000Z",
          "from": 1664212740000,
          "from_as_string": "2022-09-26T17:19:00.000Z",
          "to": 1664216340000,
          "to_as_string": "2022-09-26T18:19:00.000Z",
          "doc_count": 27,
          "total": {
            "value": 427
          },
          "good": {
            "value": 402
          }
        }
      ]
    },
    "short_window": {
      "buckets": [
        {
          "key": "2022-09-26T18:14:00.000Z-2022-09-26T18:19:00.000Z",
          "from": 1664216040000,
          "from_as_string": "2022-09-26T18:14:00.000Z",
          "to": 1664216340000,
          "to_as_string": "2022-09-26T18:19:00.000Z",
          "doc_count": 3,
          "total": {
            "value": 51
          },
          "good": {
            "value": 48
          }
        }
      ]
    }
  }
}
```

