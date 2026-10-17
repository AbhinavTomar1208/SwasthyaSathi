# Results dashboard redesign — SwasthyaSaathi

This update redesigns **only the assessment results view**. It preserves the existing `POST /api/assess` response contract, backend training code, model artifacts, questionnaire flow, and browser-local wellness journal.

## What changed

- Added `frontend/src/AssessmentResults.jsx` — accessible result screen, large model score, clear non-diagnostic interpretation, threshold comparison, signed SHAP/sensitivity factor bars, general wellness information, WHO education link, print action, restart action, and wellness navigation.
- Added `frontend/src/assessment-results.css` — responsive healthcare dashboard styles, keyboard focus states, and print layout.
- Updated `frontend/src/App.jsx` to render the new results component, passing the assessment response, language, and questionnaire field metadata for Hindi labels.

The output is a **dataset-specific uncalibrated model score**, **not a probability of personal diabetes, clinical risk, or health status**. Color styling does not classify someone as healthy or ill.

## Install / run (Windows CMD)

```bat
cd SwasthyaSaathi
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.api:app --reload --port 8000
```

In another terminal:

```bat
cd SwasthyaSaathi\frontend
npm install
npm run dev
```

Open `http://localhost:5173`, go to **Health assessment**, answer the 15 questions, and submit. Results will appear after the form.

## Check the redesign

1. Try a completed questionnaire; verify result label, score, threshold, model name, and explanations match `/api/assess` JSON values.
2. Test both **flagged** and **not flagged** model outputs. The wording should **never** say someone has or does not have diabetes.
3. Switch language to **हिन्दी**; explanatory factor labels should use Hindi field metadata.
4. Select **Show all factors** and **Show fewer factors**.
5. Select **Open wellness tracker**, **New assessment**, and **Print this report**.
6. View on narrow and wide screens; confirm text and actions remain usable.
7. Check that no assessment responses are saved in localStorage or in the backend.

## Validation performed

- The modified `App.jsx` and new `AssessmentResults.jsx` parse as valid JSX using the TypeScript JSX parser.
- The existing backend API and resampling test suites pass (8 tests).
- A production Vite build has not been verified in this environment because installing npm dependencies timed out. Run `npm install && npm run build` locally to finish browser-build verification.
