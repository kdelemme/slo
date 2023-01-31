## Rolling Occurrences

```
POST slo-observability.sli-v1*/_search
{
  "size": 1,
  "query": {
    "bool": {
      "filter": [
        {
          "term": {
            "slo.id": "fake-slo-id-5"
          }
        },
        {
          "range": {
            "@timestamp": {
              "gte": "now-60d/d",
              "lte": "now/d"
            }
          }
        }
      ]
    }
  },
  "aggs": {
    "daily": {
      "date_histogram": {
        "field": "@timestamp",
        "fixed_interval": "1d",
        "extended_bounds": {
          "min": "now-60d/d",
          "max": "now/d"
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
        },
        "cumulative_good": {
          "moving_fn": {
            "buckets_path": "good",
            "window": "30",
            "shift": 1,
            "script": "MovingFunctions.sum(values)"
          }
        },
        "cumulative_total": {
          "moving_fn": {
            "buckets_path": "total",
            "window": "30",
            "shift": 1,
            "script": "MovingFunctions.sum(values)"
          }
        }
      }
    }
  }
}
```

## Rolling + Timeslices

```
POST slo-observability.sli-v1*/_search
{
  "size": 1,
  "query": {
    "bool": {
      "filter": [
        {
          "term": {
            "slo.id": "fake-slo-id-5"
          }
        },
        {
          "range": {
            "@timestamp": {
              "gte": "now-60d/d",
              "lte": "now/d"
            }
          }
        }
      ]
    }
  },
  "aggs": {
    "daily": {
      "date_histogram": {
        "field": "@timestamp",
        "fixed_interval": "1d",
        "extended_bounds": {
          "min": "now-60d/d",
          "max": "now/d"
        }
      },
      "aggs": {
        "good": {
          "sum": {
            "field": "slo.isGoodSlice"
          }
        },
        "total": {
          "value_count": {
            "field": "slo.isGoodSlice"
          }
        },
        "cumulative_good": {
          "moving_fn": {
            "buckets_path": "good",
            "window": "30",
            "shift": 1,
            "script": "MovingFunctions.sum(values)"
          }
        },
        "cumulative_total": {
          "moving_fn": {
            "buckets_path": "total",
            "window": "30",
            "shift": 1,
            "script": "MovingFunctions.sum(values)"
          }
        }
      }
    }
  }
}

```


## Calendar Aligned + Timeslices


```
POST slo-observability.sli-v1*/_search
{
  "size": 1,
  "query": {
    "bool": {
      "filter": [
        {
          "term": {
            "slo.id": "fake-slo-id-5"
          }
        },
        {
          "range": {
            "@timestamp": {
              "gte": "2023-01-01T00:00:00.000Z",
              "lte": "now/m"
            }
          }
        }
      ]
    }
  },
  "aggs": {
    "daily": {
      "date_histogram": {
        "field": "@timestamp",
        "fixed_interval": "1d",
        "extended_bounds": {
          "min": "2023-01-01T00:00:00.000Z",
          "max": "now/d"
        }
      },
      "aggs": {
        "good": {
          "sum": {
            "field": "slo.isGoodSlice"
          }
        },
        "total": {
          "value_count": {
            "field": "slo.isGoodSlice"
          }
        },
        "cumulative_good": {
          "moving_fn": {
            "buckets_path": "good",
            "window": "30",
            "shift": 1,
            "script": "MovingFunctions.sum(values)"
          }
        },
        "cumulative_total": {
          "moving_fn": {
            "buckets_path": "total",
            "window": "30",
            "shift": 1,
            "script": "MovingFunctions.sum(values)"
          }
        }
      }
    }
  }
}
```

## Calendar Aligned + Occurrences

```
POST slo-observability.sli-v1*/_search
{
  "size": 1,
  "query": {
    "bool": {
      "filter": [
        {
          "term": {
            "slo.id": "fake-slo-id-5"
          }
        },
        {
          "range": {
            "@timestamp": {
              "gte": "2023-01-01T00:00:00.000Z",
              "lte": "now/m"
            }
          }
        }
      ]
    }
  },
  "aggs": {
    "daily": {
      "date_histogram": {
        "field": "@timestamp",
        "fixed_interval": "1d",
        "extended_bounds": {
          "min": "2023-01-01T00:00:00.000Z",
          "max": "now/d"
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
        },
        "cumulative_good": {
          "moving_fn": {
            "buckets_path": "good",
            "window": "30",
            "shift": 1,
            "script": "MovingFunctions.sum(values)"
          }
        },
        "cumulative_total": {
          "moving_fn": {
            "buckets_path": "total",
            "window": "30",
            "shift": 1,
            "script": "MovingFunctions.sum(values)"
          }
        }
      }
    }
  }
}
```