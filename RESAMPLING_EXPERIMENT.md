# SwasthyaSaathi: SMOTE-NC + Tomek Links ablation

**Status:** implemented and tested on a 30,000-record *development* subset. Full-data SMOTE-NC+Tomek comparison was attempted but did not finish within the available execution limit. The existing full-data model and its `backend/artifacts` are unchanged.

## Why SMOTE-NC rather than standard SMOTE?

The public questionnaire uses 15 predictors. Fourteen are discrete survey codes: `HighBP`, `HighChol`, `CholCheck`, `Smoker`, `Stroke`, `HeartDiseaseorAttack`, `PhysActivity`, `Fruits`, `Veggies`, `GenHlth`, `MentHlth`, `PhysHlth`, `DiffWalk`, `Age`. The remaining feature, `BMI`, is treated as continuous. `Age` and `GenHlth` are ordinal; `MentHlth` and `PhysHlth` are integer day counts. Treating all 14 as categorical **preserves valid observed categories** but does not use their ordinal ordering during neighbor discovery. Synthetic combinations may still be implausible; preserving codes alone does not guarantee realism.

`SMOTETomek()` by itself silently uses *ordinary* continuous SMOTE. This implementation explicitly passes `SMOTENC` to `SMOTETomek(smote=...)`. The `categorical_features` parameter uses **column indices**, not names, because `SMOTETomek` internally converts the DataFrame to a NumPy array.

Class-count operations are fit only on the train split. Validation/test folds preserve original distributions, and the threshold is selected on validation only. The training minority-to-majority target after SMOTE-NC defaults to 0.4 (not an automatic 50/50 balance). Tomek cleaning removes majority-class records; using original encoded ordinal values for Tomek distances is a limitation.

## Development-only results

30,000 randomly sampled original-distribution records (seed 42), grouped 70/15/15-ish split. Validation: 4,441 rows; held-out test: 4,514 rows. **All numbers below refer to validation PR-AUC, NOT clinical effectiveness.**

| Model | Original | SMOTE-NC | SMOTE-NC + Tomek |
|---|---:|---:|---:|
| Logistic Regression | 0.3901 | 0.3687 | 0.3707 |
| Random Forest | **0.4190** | 0.3890 | 0.3910 |
| XGBoost | 0.4111 | 0.3796 | 0.3861 |

The original training subset contained class counts `0: 18,207` and `1: 2,838`; after SMOTE-NC, `0: 18,207` and `1: 7,282`; after Tomek, `0: 17,515` and `1: 7,282`.

The baseline Random Forest was selected by validation PR-AUC. On the held-out development test set it obtained PR-AUC 0.4146, recall 0.7933, precision 0.3082, ROC-AUC 0.8299, Brier 0.0968 (threshold 0.15 chosen on validation using F2).

Resampling is **not an automatic improvement** in this experiment and raised the Brier score for all three models, consistent with shifted class proportions. No post-resampling probability calibration was performed. Selection for the final project should depend on full-dataset experiments and subgroup evaluation, not on the development subset alone.

## Commands

From the project root after installing `backend/requirements.txt`:

```bash
# Quick ablation with all three modes, preserves the deployed model:
python -m backend.train --fast --resampling compare --ratio 0.4 --output-dir backend/experiments/quick

# Full ablation: substantially slower, especially Tomek nearest-neighbor search.
# The --output-dir flag prevents overwriting the deployed model while evaluating.
python -m backend.train --resampling compare --ratio 0.4 --output-dir backend/experiments/full_comparison

# Oversampling only:
python -m backend.train --resampling smotenc --ratio 0.4 --output-dir backend/experiments/smotenc_only

# Unit and API tests:
python -m pytest -q tests
```

`backend/experiments/quick/metrics.json` contains the real development subset comparison and the selected development model. The original deployed model remains at `backend/artifacts/model.joblib` and its full-data report remains in `MODEL_REPORT.md`. These experiment artifacts do **not** automatically change the model served by the API.

## Methodological cautions

1. Synthetic categories are valid but cross-variable synthetic profiles may be unrealistic (e.g., combinations of responses that rarely occur together).
2. Tomek Links uses nearest-neighbor distances on the encoded survey fields; treating ordinal codes as numeric distances is not necessarily appropriate. Consider one-hot-aware neighbor cleaning or an alternative categorical distance as further research.
3. When a resampling strategy substantially changes class prevalence, probabilities may be miscalibrated for the original population. Always check Brier score and calibration on untouched data; if necessary, fit an explicit calibrator using untouched validation or separate calibration data.
4. Report precision, recall, PR-AUC and calibration alongside ROC-AUC; compare against class-weighted models without resampling.
5. No version can diagnose diabetes or estimate an individual's medical future risk; data are historical US self-reported survey labels and the intended Indian population has not been clinically validated.

## References

- imbalanced-learn SMOTENC: https://imbalanced-learn.org/stable/references/generated/imblearn.over_sampling.SMOTENC.html
- imbalanced-learn SMOTETomek: https://imbalanced-learn.org/stable/references/generated/imblearn.combine.SMOTETomek.html
- UCI BRFSS dataset: https://archive.ics.uci.edu/dataset/891/cdc+diabetes+health+indicators
