# SLO Dashboard

## SLI Value

Metric in percent:
```
sum(slo.numerator) / sum(slo.denominator)
```

## Error budget Consumed

Metric in percent:
```
(sum(slo.denominator) - sum(slo.numerator)) / (sum(slo.denominator) * (1 - last_value(slo._internal.objective.target)))
```

## Error Budget Remaining


Lines with formula
```
(1 - cumulative_sum(sum(slo.denominator) - sum(slo.numerator)) / (overall_sum(sum(slo.denominator)) * (1-last_value(slo._internal.objective.target))) ) * 100
```

## SLO Value over time

Lines with formula
```
cumulative_sum(sum(slo.numerator)) / cumulative_sum(sum(slo.denominator))
```