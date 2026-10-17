# SwasthyaSaathi — working full-stack ML internship MVP

**SDG 3: Good Health and Well-Being** | IBM SkillsBuild / AICTE–BharatCares (CSRBOX), 2026

An educational prototype that compares three ML classifiers on the historical **CDC BRFSS 2015 Diabetes Health Indicators** binary survey data and exposes an explainable model through a FastAPI + React application. The React app includes a bilingual health questionnaire and local wellness habit tracking.

> **Important**: This is NOT a medical device, diagnostic test, personalized risk score, or substitute for clinician advice. Its model target is *self-reported* diabetes or prediabetes in 2015 US survey respondents; the model is **not validated for India** or any clinical use. The displayed score is uncalibrated and does not estimate individual future disease probability. Both a flagged and an unflagged result require appropriate professional care if there are health concerns.

**Updated result dashboard (October 2026):** The responsive assessment screen now includes clearer non-diagnostic model output, a threshold comparison, localized factor explanations, wellness education, and print support. See [`RESULTS_DASHBOARD_UPGRADE.md`](RESULTS_DASHBOARD_UPGRADE.md).

## Project structure

```
SwasthyaSaathi/
├── backend/
│   ├── api.py                 # FastAPI endpoints, validators, optional SHAP with fallback
│   ├── features.py            # Input specification (15 features)
│   ├── train.py               # Group-aware 70/15/15 splits, 3 models, validation + held-out test
│   ├── requirements.txt
│   └── artifacts/
│       ├── model.joblib       # A PRE-TRAINED model is included
│       ├── metrics.json       # Genuine validation/test metrics
│       └── shap_background.npy
├── frontend/
│   ├── src/App.jsx             # Dashboard, questionnaire and wellness journal
│   ├── src/AssessmentResults.jsx # Redesigned assessment results
│   ├── src/assessment-results.css # Responsive report styles
│   ├── src/styles.css
│   └── package.json
├── data/
│   └── diabetes_binary_health_indicators_BRFSS2015.csv
├── tests/test_api.py
└── README.md
```

## How to run

Open terminal **from the project root**, not the backend folder.

### 1) Start API (Python 3.10+ recommended; model must be trained using compatible scikit-learn versions)

Windows PowerShell:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
python -m uvicorn backend.api:app --reload --port 8000
```

macOS / Linux:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
python -m uvicorn backend.api:app --reload --port 8000
```

API docs at **http://localhost:8000/docs**; health check at **http://localhost:8000/health**. If the model fails to deserialize on a different scikit-learn version, retrain it using that environment (see below).

### 2) Start frontend (Node 20.19+ or 22.12+)

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. If your API is on another origin, create `frontend/.env` with `VITE_API_BASE=https://your-api-host` and set backend `CORS_ORIGINS` accordingly.

### 3) Reproduce model training (optional; recommended for grading)

Back in the project root, with the Python virtual environment activated:

```bash
python -m backend.train
```

Optional quick development experiment (**DO NOT quote its scores as your full-dataset results**):

```bash
python -m backend.train --fast
```

WARNING: `--fast` overwrites the existing model/report with a smaller subset model. Re-run without `--fast` before submission.

The original-imbalance **253,680-row binary file** is used. Do NOT train on the artificial 50/50 file and claim production-style evaluation. The three-class `Diabetes_012` export is a separate outcome and requires a different classification setup. The main project does not silently merge these datasets.

### Resampling experiment: SMOTE-NC + Tomek Links

A separate training experiment compares **no resampling**, **SMOTE-NC only**, and **SMOTE-NC followed by Tomek Links**. SMOTE-NC is used instead of plain SMOTE because the input contains binary and ordinal-coded survey responses. The minority-to-majority oversampling target is 0.4 by default. Resampling is performed **only on the training fold**; validation/test are untouched.

```bash
# Quick 30,000-record comparison (safe: existing trained API model is unchanged):
python -m backend.train --fast --resampling compare --ratio 0.4 --output-dir backend/experiments/quick

# Full-data comparison (resource-intensive; use experiment output folder):
python -m backend.train --resampling compare --ratio 0.4 --output-dir backend/experiments/full_comparison
```

Results and limitations are explained in **`RESAMPLING_EXPERIMENT.md`**. The quick ablation did **not** improve validation PR-AUC; it must not be presented as proof that resampling helps. The reference full-data XGBoost model remains in `backend/artifacts/`.

### 4) Run API tests

```bash
pip install pytest httpx
python -m pytest -q tests
```

### 5) Build the frontend

```bash
cd frontend
npm run build
```

## Assessment architecture

The user's 15 answers -> input validation -> fitted preprocessing pipeline -> selected model -> SHAP factors (or transparently labeled reference-profile sensitivity fallback) -> nonclinical educational result. The API **does not save submitted answers**. A trained model is selected by **validation PR-AUC**; a demonstration classification threshold is chosen using validation F2 only. Held-out test metrics are measured once after selection. Identical feature vectors remain in the same split, reducing exact-profile cross-split leakage. This does not guarantee independent survey respondents or transportability.

Unlike the original 21-feature table, this public questionnaire excludes **sex, income, education, heavy drinking and US health-system access variables**, reducing questionnaire burden and some domain-mismatch concerns. It retrains the model on the **exact same 15 inputs collected by the form**. It still contains personal health history questions—do not persist or log requests.

### Model evaluation

Real metrics from training are in `backend/artifacts/metrics.json`. See that file for ROC-AUC, PR-AUC, recall, precision, F1, Brier score and confusion matrix. This evaluation is an internal retrospective experiment, **not clinical validation**. Model scores are not explicitly recalibrated; Brier score describes but does not guarantee probability calibration.

### Interpretability

The backend attempts to compute model-specific local **SHAP** feature contributions. If this is unavailable or incompatible, it falls back to a **one-variable-at-a-time reference profile sensitivity calculation**, which the UI labels *not SHAP*. Positive and negative contributions indicate direction within a model, not how changing a health behavior changes real-world outcomes. Background reference values are sampled solely from the training fold.

See also `MODEL_REPORT.md` (actual evaluation and confusion matrix) and `DEPLOYMENT.md` (private-demo deployment guidance).

## Frontend functionality

- Overview dashboard with actual local weekly movement and sleep metrics.
- Health questionnaire with 15 age/medical history/lifestyle/self-rating questions; both English and Hindi label options.
- Assessment output: model score explicitly labeled nonmedical, decision label, top influences, explanation type and disclaimer.
- Wellness tracker: one entry per date, replace/update, last-seven-day activity chart, past entries and data deletion.
- Data stored via `localStorage` for habit logs on the same browser/device only. There is **no multi-device sync**, account system, or clinician dashboard in this MVP.
- Project information and limitations page.

## API

- `GET /health` — status and model readiness
- `GET /api/metadata` — questionnaire schema, source model details, disclaimer
- `POST /api/assess` — JSON `{ "answers": {"Age":6, "BMI":25, ...15 fields } }`

Request body must contain exactly the 15 allowed feature names and valid values. No medical or survey answers are stored by the API. Demo results are not personalized medical recommendations.

## Privacy and deployment notes

- **Do not deploy this as a health screening service.** It is a course/research educational prototype.
- Do not enable server request-body logs or collect sensitive health information without proper legal review and clear informed consent.
- API CORS allowlist is controlled by `CORS_ORIGINS`. Deploy HTTPS on both services and configure security headers, rate limiting, and monitoring before public use.
- In this MVP, browser wellness entries are not encrypted and are accessible to scripts running on this origin. Avoid sensitive notes; clear site data on shared devices.
- The current application has no Supabase accounts or clinical functions. These are intentionally deferred rather than pretending they are implemented.
- For India, examine DPDP obligations and relevant health-data requirements before storing real personal health data.

## Sources and attribution

- CDC BRFSS Diabetes Health Indicators Dataset, UCI ML Repository (Alex Teboul). The linked dataset is based on CDC 2015 survey extracts. UCI resource: https://archive.ics.uci.edu/dataset/891/cdc+diabetes+health+indicators
- Original data version distributed on Kaggle: https://www.kaggle.com/datasets/alexteboul/diabetes-health-indicators-dataset
- UN SDG 3: https://sdgs.un.org/goals/goal3
- WHO diabetes general information: https://www.who.int/news-room/fact-sheets/detail/diabetes

UCI provides its dataset under the **CC BY 4.0** license; preserve its attribution when redistributing the CSV or derived work. Data and labels are not provided as clinical ground truth.
