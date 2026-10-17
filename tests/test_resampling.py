"""Regression tests: oversampling must not invent survey categories."""
import numpy as np
import pandas as pd

from backend.features import FEATURES
from backend.train import CATEGORICAL_FEATURES, prepare_training_data, select_threshold


def toy_dataset():
    rng = np.random.default_rng(21)
    n = 90
    df = pd.DataFrame({
        'HighBP': rng.integers(0, 2, n), 'HighChol': rng.integers(0, 2, n),
        'CholCheck':rng.integers(0, 2, n), 'BMI':rng.uniform(17, 45, n),
        'Smoker':rng.integers(0, 2, n), 'Stroke':rng.integers(0, 2, n),
        'HeartDiseaseorAttack':rng.integers(0, 2, n),
        'PhysActivity':rng.integers(0, 2, n),
        'Fruits':rng.integers(0, 2, n), 'Veggies':rng.integers(0, 2, n),
        'GenHlth':rng.integers(1, 6, n), 'MentHlth':rng.integers(0, 31, n),
        'PhysHlth':rng.integers(0, 31, n), 'DiffWalk':rng.integers(0, 2, n),
        'Age':rng.integers(1, 14, n),
    })
    return df[FEATURES], np.array([0]*65 + [1]*25)


def test_baseline_no_changes():
    X, y = toy_dataset()
    Xr, yr, report = prepare_training_data(X,y, strategy='none')
    assert len(Xr)==len(X) and np.array_equal(y,yr)
    assert report['method']=='none'


def test_smotenc_valid_categories():
    X, y = toy_dataset()
    Xr, yr, report = prepare_training_data(X,y, strategy='smotenc', ratio=0.6)
    assert sum(yr==1) > sum(y==1)
    assert report['before']['1']==25
    for c in CATEGORICAL_FEATURES:
        assert set(Xr[c].unique()).issubset(set(X[c].unique()))


def test_smotenc_tomek_valid_categories():
    X, y = toy_dataset()
    Xr, yr, report = prepare_training_data(X,y, strategy='smotenc_tomek', ratio=0.6)
    assert len(Xr)==len(yr)
    assert report['method']=='smotenc_tomek'
    for c in CATEGORICAL_FEATURES:
        assert set(Xr[c].unique()).issubset(set(X[c].unique()))


def test_threshold_uses_only_supplied_validation():
    y=np.array([0,0,1,1])
    probs=np.array([0.1,0.2,0.8,0.9])
    assert .1 <= select_threshold(y,probs) <= .9
