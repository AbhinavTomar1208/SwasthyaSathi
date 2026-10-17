# SwasthyaSaathi: ML model evaluation (actual training run)

Source: **CDC BRFSS 2015 binary health indicators**, original class distribution, 253,680 rows, 15 selected predictors.

The training program used group-aware, random (seed 42) 70/15/15-ish splits. The group key is an exact hash of all 15 predictor fields. This keeps identically encoded feature profiles in the same split to reduce straightforward cross-split leakage, although it cannot verify individual respondent identities or independence.

| Model | Validation PR-AUC | Validation ROC-AUC | Validation Brier |
|---|---:|---:|---:|
| Logistic Regression | 0.4031 | 0.8214 | 0.0981 |
| Random Forest | 0.4286 | 0.8274 | 0.0962 |
| **XGBoost (selected)** | **0.4335** | **0.8297** | **0.0955** |

Selection criterion: **validation PR-AUC**, independent of the held-out test set. Model comparators above are shown at default threshold 0.50; the selected model's final decision threshold was tuned on validation using F2 (favoring recall). Results below use that **demonstration threshold 0.125**. This threshold has **no clinical justification**.

## Held-out test results (XGBoost, 38,798 rows)

| Metric | Value |
|---|---:|
| Accuracy | 0.7009 |
| Precision | 0.2930 |
| Recall / Sensitivity | 0.8211 |
| F1 | 0.4319 |
| ROC-AUC | 0.8278 |
| PR-AUC | 0.4316 |
| Brier score | 0.0965 |
| Test positive prevalence | 0.1385 |

**Confusion matrix** (rows: survey class, columns: model flag):

| Actual \\ Predicted | Negative | Positive |
|---|---:|---:|
| 0 (no reported diabetes) | 22,780 | 10,645 |
| 1 (reported prediabetes / diabetes) | 961 | 4,412 |

At this threshold there are **10,645 false positives**, and precision is only ~29%. High recall is accompanied by a substantial false positive rate. Avoid presenting the flagged classification as a medical result.

## Interpretation limits

- Dataset labels are self-reported conditions, not clinical examinations or future outcomes.
- US respondents in 2015; strong domain shift is expected in modern Indian settings.
- Preprocessing, selected predictors and other omitted factors influence generalization.
- Scores have not been independently recalibrated or clinically validated.
- A demo score is not the probability that an individual has or will develop diabetes.
- No clinical safety, fairness, subgroup performance or intervention benefit has been established.
- SHAP explains the model's output (usually on a log-odds scale for XGBoost), not the causal impact of a lifestyle change.

Full machine-readable report: `backend/artifacts/metrics.json`.
