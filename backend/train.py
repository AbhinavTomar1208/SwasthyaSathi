"""Train and compare imbalance strategies on CDC BRFSS 2015.

From the project root:
    python -m backend.train                     # original, no resampling
    python -m backend.train --resampling compare # baseline vs SMOTE-NC + Tomek
    python -m backend.train --resampling smotenc_tomek --ratio 0.4
    python -m backend.train --fast --resampling compare --output-dir backend/experiments/quick

Resampling happens only after the grouped train/validation/test split.
Validation and test retain the original observed class distributions.
"""
import argparse
from collections import Counter
import json
from pathlib import Path
import time

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (accuracy_score, average_precision_score, brier_score_loss,
                             confusion_matrix, f1_score, precision_score, recall_score,
                             roc_auc_score)
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler

from .features import FEATURES

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / 'backend' / 'artifacts'
LABEL = 'Diabetes_binary'
SEED = 42

# Every field except BMI is encoded as a finite discrete survey response.
# Age and GenHlth are ORDINAL, MentHlth and PhysHlth are integer day counts.
# Treating them as categorical in SMOTENC deliberately preserves valid codes,
# but sacrifices ordinal distances. This is a design trade-off to evaluate.
CATEGORICAL_FEATURES = [feature for feature in FEATURES if feature != 'BMI']
NUMERIC_FEATURES = ['BMI']


def evaluate(y, probs, threshold=0.5):
    pred = (np.asarray(probs) >= threshold).astype(int)
    return {
        'accuracy': float(accuracy_score(y, pred)),
        'precision': float(precision_score(y, pred, zero_division=0)),
        'recall': float(recall_score(y, pred, zero_division=0)),
        'f1': float(f1_score(y, pred, zero_division=0)),
        'roc_auc': float(roc_auc_score(y, probs)),
        'pr_auc': float(average_precision_score(y, probs)),
        'brier': float(brier_score_loss(y, probs)),
        'confusion_matrix': confusion_matrix(y, pred).tolist(),
        'threshold': float(threshold),
        'n': int(len(y)),
        'positive_rate': float(np.mean(y)),
    }


def select_threshold(y, p):
    """Validation-only threshold maximizing F2 (NOT a clinical threshold)."""
    grid = np.arange(0.10, 0.91, 0.025)
    best = (float('-inf'), 0.5)
    for t in grid:
        pred = (p >= t).astype(int)
        tp = np.sum((pred == 1) & (y == 1))
        fp = np.sum((pred == 1) & (y == 0))
        fn = np.sum((pred == 0) & (y == 1))
        f2 = 5 * tp / max(1, 5 * tp + 4 * fn + fp)
        if f2 > best[0]:
            best = (f2, float(t))
    return best[1]


def make_models():
    models = {
        'Logistic Regression': Pipeline([
            ('imputer', SimpleImputer(strategy='median')),
            ('scaler', StandardScaler()),
            ('model', LogisticRegression(max_iter=600, random_state=SEED)),
        ]),
        'Random Forest': Pipeline([
            ('imputer', SimpleImputer(strategy='median')),
            ('model', RandomForestClassifier(n_estimators=75, max_depth=12,
                    min_samples_leaf=12, n_jobs=-1, random_state=SEED)),
        ]),
    }
    try:
        from xgboost import XGBClassifier
        models['XGBoost'] = Pipeline([
            ('imputer', SimpleImputer(strategy='median')),
            ('model', XGBClassifier(n_estimators=180, max_depth=4,
                    learning_rate=0.065, subsample=0.85, colsample_bytree=0.9,
                    n_jobs=4, tree_method='hist', eval_metric='logloss', random_state=SEED)),
        ])
    except ImportError:
        print('XGBoost unavailable; continuing with sklearn models.')
    return models


def categorical_validity_check(original, transformed):
    """Fail fast if synthetic survey categories become fractional or invalid."""
    for name in CATEGORICAL_FEATURES:
        legal = set(original[name].unique().tolist())
        observed = set(pd.Series(transformed[name]).unique().tolist())
        illegal = observed - legal
        if illegal:
            raise ValueError(f'Synthetic samples contain illegal {name} categories: {illegal}')
    if not np.isfinite(transformed[FEATURES].to_numpy(dtype=float)).all():
        raise ValueError('Resampling produced non-finite feature values')


def prepare_training_data(Xt, yt, strategy='none', ratio=0.4):
    """Perform SMOTENC and optional Tomek cleaning on training data ONLY.

    `SMOTETomek(smote=SMOTENC(...))` is essential: plain SMOTETomek()
    uses continuous SMOTE and can create invalid binary/ordinal values.
    We intentionally target minority/majority ratio 0.4, not 1.0, because
    aggressive oversampling may worsen calibration and precision.
    """
    before = {str(k): int(v) for k, v in sorted(Counter(yt).items())}
    if strategy == 'none':
        return Xt, yt, {'method': 'none', 'before': before, 'after': before,
                         'created_or_removed_rows': 0}

    from imblearn.combine import SMOTETomek
    from imblearn.over_sampling import SMOTENC
    from imblearn.under_sampling import TomekLinks

    # Preserve category labels for 14 discrete survey variables.
    # BMI is the only interpolated numeric feature.
    smote_nc = SMOTENC(categorical_features=[FEATURES.index(c) for c in CATEGORICAL_FEATURES],
                       sampling_strategy=ratio, k_neighbors=5, random_state=SEED)
    if strategy == 'smotenc':
        sampler = smote_nc
    elif strategy == 'smotenc_tomek':
        sampler = SMOTETomek(smote=smote_nc,
                             tomek=TomekLinks(sampling_strategy='majority'),
                             random_state=SEED)
    else:
        raise ValueError(f'Unsupported resampling method: {strategy}')

    X_res, y_res = sampler.fit_resample(Xt, yt)
    X_res = pd.DataFrame(X_res, columns=FEATURES).astype(float)
    y_res = np.asarray(y_res, dtype=int)
    categorical_validity_check(Xt, X_res)
    after = {str(k): int(v) for k, v in sorted(Counter(y_res).items())}
    return X_res, y_res, {
        'method': strategy, 'ratio_requested': ratio,
        'categorical_features': CATEGORICAL_FEATURES,
        'continuous_features': NUMERIC_FEATURES,
        'before': before, 'after': after,
        'created_or_removed_rows': int(len(y_res) - len(yt)),
        'note': ('Tomek nearest-neighbor distances use the encoded survey values; '
                 'ordinal/categorical distance choice is a limitation.' if strategy == 'smotenc_tomek' else ''),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--data', default=str(ROOT / 'data' / 'diabetes_binary_health_indicators_BRFSS2015.csv'))
    parser.add_argument('--fast', action='store_true', help='Development subset, not final evaluation')
    parser.add_argument('--resampling', default='none',
                        choices=['none', 'smotenc', 'smotenc_tomek', 'compare'],
                        help='Compare baseline, SMOTENC, and SMOTENC+Tomek on the SAME split')
    parser.add_argument('--ratio', type=float, default=0.4,
                        help='Target minority/majority ratio after SMOTENC (between original ratio and 1)')
    parser.add_argument('--output-dir', type=Path, default=None,
                        help='Override model artifact destination; recommended for experiments')
    args = parser.parse_args()
    started = time.time()

    df = pd.read_csv(args.data)
    required = [LABEL] + FEATURES
    absent = sorted(set(required) - set(df.columns))
    if absent:
        raise ValueError(f'Missing columns: {absent}; use original binary export')
    df = df[required].dropna().reset_index(drop=True)
    df[LABEL] = df[LABEL].astype(int)
    if set(df[LABEL].unique()) != {0, 1}:
        raise ValueError('Label must have binary classes 0 and 1')
    X, y = df[FEATURES], df[LABEL].to_numpy()
    if args.fast:
        X = X.sample(n=min(30000,len(X)), random_state=SEED)
        y = df.loc[X.index, LABEL].to_numpy()
        X = X.reset_index(drop=True)

    groups = pd.util.hash_pandas_object(X, index=False).to_numpy()
    s1 = GroupShuffleSplit(n_splits=1, train_size=0.70, random_state=SEED)
    tr, rem = next(s1.split(X, y, groups))
    s2 = GroupShuffleSplit(n_splits=1, train_size=0.50, random_state=SEED + 1)
    val_rel, test_rel = next(s2.split(X.iloc[rem], y[rem], groups[rem]))
    val, te = rem[val_rel], rem[test_rel]
    assert not (set(groups[tr]) & set(groups[val]))
    assert not (set(groups[tr]) & set(groups[te]))
    assert not (set(groups[val]) & set(groups[te]))

    Xt, yt = X.iloc[tr], y[tr]
    Xv, yv = X.iloc[val], y[val]
    Xtest, ytest = X.iloc[te], y[te]
    print('Splits:', len(tr), len(val), len(te), flush=True)
    print('Positive prevalences:', *[round(float(a.mean()), 4) for a in [yt,yv,ytest]], flush=True)
    if args.resampling != 'none' and not (yt.mean() < args.ratio <= 1):
        raise ValueError(f'--ratio must be greater than training prevalence {yt.mean():.4f} and at most 1')

    modes = ['none','smotenc','smotenc_tomek'] if args.resampling == 'compare' else [args.resampling]
    validation_metrics = {}
    trained = {}
    sampling_reports = {}
    for mode in modes:
        t0 = time.time()
        print(f'Preparing training fold: {mode}...', flush=True)
        Xfit, yfit, samp_report = prepare_training_data(Xt, yt, mode, args.ratio)
        sampling_reports[mode] = samp_report
        print(f'Class counts: {samp_report["before"]} -> {samp_report["after"]} ({time.time()-t0:.1f}s)',flush=True)
        for name, pipe in make_models().items():
            title = f'{name} [{mode}]'
            t1 = time.time()
            pipe.fit(Xfit, yfit)
            pv = pipe.predict_proba(Xv)[:,1]
            validation_metrics[title] = evaluate(yv, pv)
            trained[title] = (pipe, mode)
            print(f'{title}: PR-AUC={validation_metrics[title]["pr_auc"]:.4f}, '
                  f'ROC-AUC={validation_metrics[title]["roc_auc"]:.4f}, '
                  f'Brier={validation_metrics[title]["brier"]:.4f} '
                  f'({time.time()-t1:.1f}s)',flush=True)

    # Select using validation PR-AUC, NEVER the hold-out test results.
    best_name = max(validation_metrics, key=lambda k: validation_metrics[k]['pr_auc'])
    best, best_mode = trained[best_name]
    vp = best.predict_proba(Xv)[:,1]
    threshold = select_threshold(yv, vp)
    test_results = evaluate(ytest, best.predict_proba(Xtest)[:,1], threshold)
    bg = Xt.sample(n=min(60,len(Xt)),random_state=SEED)
    report = {
        'source': Path(args.data).name,
        'training_mode': 'development_subset' if args.fast else 'full_original_distribution',
        'resampling_experiment': args.resampling,
        'sampled_class_ratio': args.ratio if args.resampling != 'none' else None,
        'total_rows': int(len(X)), 'features': FEATURES,
        'splits': {'train':int(len(tr)), 'validation':int(len(val)), 'test':int(len(te))},
        'original_class_prevalence': {'train':float(yt.mean()),'validation':float(yv.mean()),
                                     'test':float(ytest.mean())},
        'resampling_reports': sampling_reports,
        'validation_metrics': validation_metrics,
        'selected_model': best_name,
        'selected_resampling': best_mode,
        'selection_metric': 'validation_pr_auc',
        'decision_threshold': threshold,
        'test_metrics': test_results,
        'notes': [
            'The target is reported diabetes/prediabetes, NOT future onset or clinical diagnosis.',
            'All synthetic samples and Tomek cleaning applied to TRAIN only, never validation or test.',
            'SMOTENC treats all discrete survey codes as categories; order is not modeled during synthesis.',
            'Tomek cleaning can remove difficult but meaningful minority-neighbor examples; validate benefit.',
            'Resampling changes training prevalence: predicted probabilities are not calibrated for original prevalence.',
            'Survey data from US 2015; not validated for Indian populations or clinical decisions.',
            'Threshold maximizes validation F2 for demonstration, not clinical use.',
            'Identical predictor profiles grouped across splits; this cannot verify unique respondents.',
        ],
        'elapsed_seconds': round(time.time()-started,1),
    }
    output = args.output_dir or (ROOT / 'backend' / 'experiments' / 'fast' if args.fast else ARTIFACTS)
    output = output if output.is_absolute() else ROOT / output
    output.mkdir(parents=True, exist_ok=True)
    joblib.dump({'pipeline': best, 'features': FEATURES,'threshold': threshold,
                 'model_name': best_name.split(' [')[0]}, output/'model.joblib', compress=3)
    np.save(output/'shap_background.npy',bg[FEATURES].to_numpy(dtype=float))
    (output/'metrics.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps({'selected_model': best_name, 'selected_resampling':best_mode,
                      'test_metrics':test_results, 'elapsed_seconds': report['elapsed_seconds'],
                      'output_dir':str(output)},indent=2),flush=True)

if __name__ == '__main__':
    main()
