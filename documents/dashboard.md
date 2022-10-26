# SLO Dashboard

## Erorr budget consumption over time


Create Lens with formula:
0.05 is the error budget
```
(1 - cumulative_sum(sum(slo.denominator) - sum(slo.numerator)) / (overall_sum(sum(slo.denominator)) * (0.05)) )* 100
```
