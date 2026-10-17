"""SwasthyaSaathi educational assessment API. No personal questionnaire storage."""
from functools import lru_cache
from pathlib import Path
from typing import Dict
import json
import os

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .features import FEATURES, FIELDS, FIELD_BY_NAME

HERE = Path(__file__).resolve().parent
ARTIFACT = HERE / 'artifacts' / 'model.joblib'
METRICS = HERE / 'artifacts' / 'metrics.json'
app = FastAPI(title='SwasthyaSaathi API',version='1.0.0', description='Education and demonstration only—not medical advice.')
allowed_origins = [s.strip() for s in os.getenv('CORS_ORIGINS','http://localhost:5173,http://127.0.0.1:5173').split(',') if s.strip()]
app.add_middleware(CORSMiddleware,allow_origins=allowed_origins,allow_credentials=False,
                   allow_methods=['GET','POST'],allow_headers=['Content-Type'])
DISCLAIMER = ('Educational demonstration using historical US self-reported survey data. '
              'The output is not a diagnosis, clinical screening test, or estimate of future disease. '
              'Seek advice from a qualified healthcare professional for health concerns.')

class AssessmentRequest(BaseModel):
    answers: Dict[str,float] = Field(min_length=len(FEATURES),max_length=len(FEATURES))
    model_config = {'json_schema_extra': {'examples':[{'answers':{f['name']: f['default'] for f in FIELDS}}]}}

@lru_cache(maxsize=1)
def load_model():
    if not ARTIFACT.exists():
        raise HTTPException(status_code=503,detail='Model not trained. Run: python -m backend.train')
    return joblib.load(ARTIFACT)

@lru_cache(maxsize=1)
def get_explainer():
    """SHAP contributions if compatible; returns None when optional library isn't present."""
    try:
        import shap
        obj = load_model()
        pipe = obj['pipeline']
        estimator = pipe.named_steps['model']
        bg = np.load(HERE/'artifacts'/'shap_background.npy')
        prep = pipe[:-1]
        background = prep.transform(pd.DataFrame(bg, columns=FEATURES))
        name = obj['model_name']
        if name == 'Logistic Regression':
            return shap.LinearExplainer(estimator,background)
        return shap.TreeExplainer(estimator,data=background,feature_perturbation='interventional')
    except Exception as exc:
        print('SHAP explainer unavailable:',repr(exc))
        return None

def validate_answers(raw):
    if set(raw) != set(FEATURES):
        missing = sorted(set(FEATURES)-set(raw))
        extra = sorted(set(raw)-set(FEATURES))
        raise HTTPException(422,detail={'missing':missing,'unknown':extra})
    cleaned = {}
    for name in FEATURES:
        f = FIELD_BY_NAME[name]
        value = raw[name]
        if not np.isfinite(value):
            raise HTTPException(422,detail=f'{name} must be finite')
        if f['type'] == 'select':
            allowed = [o['value'] for o in f['options']]
            if value not in allowed:
                raise HTTPException(422,detail=f'{name} must be one of {allowed}')
        elif not f['min'] <= value <= f['max']:
            raise HTTPException(422,detail=f'{name} must be between {f["min"]} and {f["max"]}')
        cleaned[name] = float(value)
    return pd.DataFrame([cleaned],columns=FEATURES)

def local_explanation(pipeline, frame):
    """Get model SHAP values. Graceful fall-back is *explicitly* not labelled SHAP."""
    model = pipeline.named_steps['model']
    prep = pipeline[:-1]
    explainer = get_explainer()
    if explainer is not None:
        try:
            sample = prep.transform(frame)
            values = explainer.shap_values(sample)
            if isinstance(values,list):
                arr = np.asarray(values[1])
            else:
                arr = np.asarray(values)
            if arr.ndim == 3:
                arr = arr[:,:,1]
            contributions = arr[0].astype(float)
            if len(contributions) == len(FEATURES) and np.isfinite(contributions).all():
                return 'SHAP (local model contribution)', contributions
        except Exception as exc:
            print('SHAP evaluation failed; using sensitivity analysis:',repr(exc))
    # Not SHAP: change one input at a time to a training-profile median.
    base_prob = float(pipeline.predict_proba(frame)[0,1])
    bg = np.load(HERE/'artifacts'/'shap_background.npy')
    baseline = np.median(bg,axis=0)
    effects=[]
    for i,name in enumerate(FEATURES):
        modified=frame.copy()
        modified.loc[0,name]=float(baseline[i])
        effects.append(base_prob-float(pipeline.predict_proba(modified)[0,1]))
    return 'Reference-profile sensitivity (not SHAP)', np.array(effects)

@app.get('/health')
def health():
    return {'status':'ok','model_ready':ARTIFACT.exists()}

@app.get('/api/metadata')
def metadata():
    results={'fields':FIELDS, 'disclaimer':DISCLAIMER,
             'label_description':'Reported diabetes or prediabetes category from BRFSS 2015',
             'data_policy':'Assessments are processed in memory; not retained by this API.'}
    if METRICS.exists():
        metrics=json.loads(METRICS.read_text(encoding='utf-8'))
        results['model']={'name':metrics['selected_model'],'tested_rows':metrics['test_metrics']['n'],
                          'pr_auc':round(metrics['test_metrics']['pr_auc'],3),
                          'recall':round(metrics['test_metrics']['recall'],3),
                          'dataset':metrics['source'],
                          'training_mode':metrics['training_mode']}
    return results

@app.post('/api/assess')
def assess(req:AssessmentRequest):
    obj=load_model()
    frame=validate_answers(req.answers)
    pipeline=obj['pipeline']
    prob=float(pipeline.predict_proba(frame)[0,1])
    method,contrib=local_explanation(pipeline,frame)
    items=[{'feature':name, 'label':FIELD_BY_NAME[name]['label'],
            'contribution':float(contrib[i]),
            'direction':'toward_positive_class' if contrib[i]>=0 else 'toward_negative_class'}
           for i,name in enumerate(FEATURES)]
    items.sort(key=lambda item:abs(item['contribution']),reverse=True)
    threshold=float(obj['threshold'])
    return {
        'classification':int(prob>=threshold),
        'classification_label': 'Model flags survey-positive pattern' if prob>=threshold else 'Model does not flag survey-positive pattern',
        'model_score':round(prob,4),
        'threshold':round(threshold,4),
        'score_description':'Uncalibrated model score for a survey-defined label; not personal medical risk',
        'explanation_method':method,
        'feature_contributions':items[:8],
        'model_name':obj['model_name'],
        'recommendations':[
           'Follow evidence-based physical activity guidance appropriate to your situation.',
           'Choose varied foods including fruits and vegetables when available.',
           'Discuss medical history or concerning symptoms with a qualified professional.'
        ],
        'disclaimer':DISCLAIMER
    }
