# Deployment guidance (course demonstration only)

The API contains a model artifact and accepts sensitive questionnaire inputs. **Do not make the service public for clinical use**. Never turn on request-body logging. This project is a demonstration of machine learning, not a healthcare screening product.

## Backend on a Docker-capable host

From repository/project root:

```bash
docker build -f backend/Dockerfile -t swasthya-api .
docker run --rm -p 8000:8000 -e CORS_ORIGINS=http://localhost:5173 swasthya-api
```

`backend/artifacts/model.joblib` and `shap_background.npy` are included in this project; if you retrain, rebuild the image. Use only model artifacts you generated or trust: Python pickle/joblib files can execute code when loaded.

## Frontend on Vercel / other static hosting

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Node: 22.x
- Environment variable: `VITE_API_BASE=https://your-private-https-backend`
- Set backend environment variable `CORS_ORIGINS=https://your-frontend-host`.
- Keep public access disabled for an internship demonstration unless you have an appropriate privacy and security review.

Production hardening that is NOT included: authentication/authorization, abuse rate limits, TLS termination, account workflows, encrypted data at rest, clinical validation, regulator review, privacy notices for public processing, periodic dataset bias monitoring and full operational security controls.
