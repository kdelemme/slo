Date: 2023-01-13
---

# Transforms


## Custom KQL

```
{
  "transform_id": "slo-5b8f14c0-934a-11ed-8986-bd72132ba916-1",
  "source": {
    "index": "high-cardinality-data-fake_logs*",
    "runtime_mappings": {
      "slo.id": {
        "type": "keyword",
        "script": {
          "source": "emit('5b8f14c0-934a-11ed-8986-bd72132ba916')"
        }
      },
      "slo.revision": {
        "type": "long",
        "script": {
          "source": "emit(1)"
        }
      },
      "slo._internal.name": {
        "type": "keyword",
        "script": {
          "source": "emit('latency logs service')"
        }
      },
      "slo._internal.budgeting_method": {
        "type": "keyword",
        "script": {
          "source": "emit('occurrences')"
        }
      },
      "slo._internal.objective.target": {
        "type": "double",
        "script": {
          "source": "emit(0.98)"
        }
      },
      "slo._internal.time_window.duration": {
        "type": "keyword",
        "script": {
          "source": "emit('30d')"
        }
      },
      "slo._internal.time_window.is_rolling": {
        "type": "boolean",
        "script": {
          "source": "emit(true)"
        }
      }
    },
    "query": {
      "bool": {
        "should": [
          {
            "match": {
              "labels.eventId": "event-0"
            }
          }
        ],
        "minimum_should_match": 1
      }
    }
  },
  "frequency": "1m",
  "dest": {
    "pipeline": "slo-observability.sli.monthly",
    "index": "slo-observability.sli-v1"
  },
  "settings": {
    "deduce_mappings": false
  },
  "sync": {
    "time": {
      "field": "@timestamp",
      "delay": "1m"
    }
  },
  "pivot": {
    "group_by": {
      "slo.id": {
        "terms": {
          "field": "slo.id"
        }
      },
      "slo.revision": {
        "terms": {
          "field": "slo.revision"
        }
      },
      "slo._internal.name": {
        "terms": {
          "field": "slo._internal.name"
        }
      },
      "slo._internal.budgeting_method": {
        "terms": {
          "field": "slo._internal.budgeting_method"
        }
      },
      "slo._internal.objective.target": {
        "terms": {
          "field": "slo._internal.objective.target"
        }
      },
      "slo._internal.time_window.duration": {
        "terms": {
          "field": "slo._internal.time_window.duration"
        }
      },
      "slo._internal.time_window.is_rolling": {
        "terms": {
          "field": "slo._internal.time_window.is_rolling"
        }
      },
      "@timestamp": {
        "date_histogram": {
          "field": "@timestamp",
          "calendar_interval": "1m"
        }
      }
    },
    "aggregations": {
      "slo.numerator": {
        "filter": {
          "bool": {
            "should": [
              {
                "range": {
                  "latency": {
                    "lt": "300"
                  }
                }
              }
            ],
            "minimum_should_match": 1
          }
        }
      },
      "slo.denominator": {
        "filter": {
          "bool": {
            "should": [
              {
                "range": {
                  "latency": {
                    "gt": "0"
                  }
                }
              }
            ],
            "minimum_should_match": 1
          }
        }
      }
    }
  },
  "_meta": {
    "version": 1
  }
}
```