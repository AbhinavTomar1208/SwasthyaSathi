import React, { useState } from 'react';
import './assessment-results.css';

const WORDS = {
  en: {
    kicker: 'YOUR ASSESSMENT · EDUCATIONAL REPORT',
    title: 'A clearer picture of your model result',
    subtitle: 'Explore how a research model interpreted your responses, what influenced its output, and what to do next.',
    print: 'Print this report', reset: 'New assessment',
    educational: 'For learning, not diagnosis',
    educationalDetail: 'This model analyzes patterns from a 2015 U.S. health survey. The result is not a medical test, a personal diabetes risk estimate, or proof of good health.',
    overview: 'SURVEY MODEL OUTPUT', survey: 'Based on U.S. BRFSS 2015 data',
    score: 'Model score', scoreSub: 'Not a medical risk percentage',
    patternYes: 'Survey-positive pattern flagged', patternNo: 'Survey-positive pattern not flagged',
    interpretationYes: 'The model output is above the demonstration threshold. This does not mean you have diabetes or prediabetes.',
    interpretationNo: 'The model output is below the demonstration threshold. This does not rule out diabetes or prediabetes.',
    sample: 'Your model score', threshold: 'Demo threshold', thresholdHelp: 'The threshold is a model setting, not a clinical cutoff.',
    explanation: 'What influenced this result?',
    explanationIntro: 'These factors help explain this individual model prediction. They do not identify medical causes.',
    toward: 'Toward survey-positive', away: 'Away from survey-positive',
    showAll: 'Show all factors', showFewer: 'Show fewer factors',
    strength: 'Bar length shows relative influence within this result, not risk or percentages.',
    fallback: 'If SHAP is unavailable, these are reference-profile sensitivity estimates, not SHAP values.',
    next: 'Simple ways to move forward', nextSub: 'General well-being education, not individualized treatment advice.',
    habit1: 'Keep moving', habit2: 'Eat a balanced variety', habit3: 'Ask a professional',
    readMore: 'Read WHO diabetes information', wellness: 'Open wellness tracker',
    safety: 'A result cannot replace medical care',
    safetyText: 'If you have symptoms, concerns, or a known condition, speak with a qualified healthcare professional. Never use an unflagged result to postpone testing or care.',
    privacy: 'Your answers are not saved in the app’s assessment history.',
    model: 'Model', methods: 'Explanation method', unavailable: 'No explanation factors available for this result.'
  },
  hi: {
    kicker: 'आपका आकलन · शैक्षिक रिपोर्ट',
    title: 'अपने मॉडल परिणाम को आसानी से समझें',
    subtitle: 'जानें कि शोध-आधारित मॉडल ने आपके जवाबों को कैसे समझा, किन बातों से परिणाम प्रभावित हुआ और आगे क्या करें।',
    print: 'रिपोर्ट प्रिंट करें', reset: 'नया आकलन',
    educational: 'सीखने के लिए, निदान के लिए नहीं',
    educationalDetail: 'यह मॉडल 2015 के अमेरिकी स्वास्थ्य सर्वेक्षण के पैटर्न पर आधारित है। यह मेडिकल टेस्ट, व्यक्तिगत डायबिटीज़ जोखिम या अच्छे स्वास्थ्य का प्रमाण नहीं है।',
    overview: 'सर्वेक्षण मॉडल का परिणाम', survey: 'अमेरिका के BRFSS 2015 डेटा पर आधारित',
    score: 'मॉडल स्कोर', scoreSub: 'यह मेडिकल जोखिम प्रतिशत नहीं है',
    patternYes: 'सर्वे-पॉजिटिव पैटर्न मिला', patternNo: 'सर्वे-पॉजिटिव पैटर्न नहीं मिला',
    interpretationYes: 'मॉडल स्कोर प्रदर्शन के लिए निर्धारित सीमा से ऊपर है। इसका अर्थ यह नहीं कि आपको डायबिटीज़ या प्रीडायबिटीज़ है।',
    interpretationNo: 'मॉडल स्कोर प्रदर्शन के लिए निर्धारित सीमा से नीचे है। इससे डायबिटीज़ या प्रीडायबिटीज़ की संभावना समाप्त नहीं होती।',
    sample: 'आपका मॉडल स्कोर', threshold: 'प्रदर्शन सीमा', thresholdHelp: 'यह सीमा मॉडल की सेटिंग है, डॉक्टर की निर्धारित सीमा नहीं।',
    explanation: 'परिणाम किन कारकों से प्रभावित हुआ?',
    explanationIntro: 'ये कारक केवल मॉडल के इस परिणाम की व्याख्या करते हैं। ये बीमारी के कारण नहीं बताते।',
    toward: 'सर्वे-पॉजिटिव की ओर', away: 'सर्वे-पॉजिटिव से दूर',
    showAll: 'सभी कारक देखें', showFewer: 'कम कारक देखें',
    strength: 'बार की लंबाई केवल इस परिणाम में सापेक्ष प्रभाव बताती है; यह जोखिम या प्रतिशत नहीं है।',
    fallback: 'अगर SHAP उपलब्ध नहीं है, तो यह केवल संदर्भ-प्रोफ़ाइल संवेदनशीलता का अनुमान है, SHAP नहीं।',
    next: 'अब आप क्या कर सकते हैं', nextSub: 'सामान्य स्वास्थ्य जानकारी; व्यक्तिगत इलाज की सलाह नहीं।',
    habit1: 'नियमित गतिविधि', habit2: 'संतुलित भोजन', habit3: 'विशेषज्ञ से सलाह',
    readMore: 'WHO की डायबिटीज़ जानकारी पढ़ें', wellness: 'वेलनेस ट्रैकर खोलें',
    safety: 'मॉडल परिणाम चिकित्सकीय देखभाल का विकल्प नहीं है',
    safetyText: 'अगर आपको लक्षण, कोई चिंता या पहले से कोई बीमारी है, तो योग्य चिकित्सक से संपर्क करें। इस परिणाम के आधार पर जांच या इलाज में देरी न करें।',
    privacy: 'आपके जवाब आकलन इतिहास में सेव नहीं किए जाते।',
    model: 'मॉडल', methods: 'व्याख्या विधि', unavailable: 'इस परिणाम के लिए व्याख्या के कारक उपलब्ध नहीं हैं।'
  }
};

function Glyph({ name, size = 19 }) {
  const shared = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  const path = {
    shield: <><path d="M12 2 4 5v6c0 5.5 3.2 9 8 11 4.8-2 8-5.5 8-11V5z"/><path d="m9 12 2 2 4-4"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/></>,
    print: <><path d="M6 9V3h12v6M6 17H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6zM17 12h.01"/></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14-5L3 9"/><path d="M3 3v6h6"/><path d="M4 13a8 8 0 0 0 14 5l3-3"/><path d="M15 15h6v6"/></>,
    brain: <><path d="M12 6a4 4 0 0 0-7-2 4 4 0 0 0-1 6 4 4 0 0 0 1 7 4 4 0 0 0 7 2zm0 0a4 4 0 0 1 7-2 4 4 0 0 1 1 6 4 4 0 0 1-1 7 4 4 0 0 1-7 2z"/><path d="M12 6v13"/></>,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6"/></>,
    heart: <><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></>,
    leaf: <><path d="M20 4c-9 0-16 4-16 12a5 5 0 0 0 5 5c8 0 12-7 11-17Z"/><path d="M6 18c3-4 6-6 11-9"/></>,
    book: <><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H21v18H6.5A2.5 2.5 0 0 0 4 22z"/><path d="M4 5v17M8 7h9M8 11h9"/></>,
    check: <><path d="m5 12 4 4L19 6"/></>,
    chevron: <path d="m6 9 6 6 6-6"/>
  };
  return <svg {...shared}>{path[name] || path.info}</svg>;
}

const clamp = (n) => Number.isFinite(Number(n)) ? Math.max(0, Math.min(1, Number(n))) : 0;
const pct = (n, locale) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(clamp(n) * 100) + '%';

export default function AssessmentResults({ result, lang = 'en', fields = [], onReset, onWellness }) {
  const [expanded, setExpanded] = useState(false);
  const t = WORDS[lang] || WORDS.en;
  const locale = lang === 'hi' ? 'hi-IN' : 'en-IN';
  const score = clamp(result?.model_score);
  const threshold = clamp(result?.threshold);
  const flagged = result?.classification === 1;
  const factors = Array.isArray(result?.feature_contributions) ? result.feature_contributions : [];
  const maxMagnitude = Math.max(...factors.map(f => Math.abs(Number(f.contribution) || 0)), 1e-9);
  const displayed = expanded ? factors : factors.slice(0, 5);
  const featureName = (f) => (lang === 'hi' && fields.find(field => field.name === f.feature)?.hi) || f.label || f.feature;
  const tips = lang === 'hi'
    ? ['अपनी स्थिति के अनुसार नियमित शारीरिक गतिविधि की जानकारी लें।', 'उपलब्धता के अनुसार अलग-अलग फल, सब्ज़ियाँ और संतुलित भोजन चुनें।', 'लक्षणों या स्वास्थ्य इतिहास को लेकर योग्य चिकित्सक से बात करें।']
    : result?.recommendations?.length ? result.recommendations.slice(0, 3) : [
        'Learn about regular physical activity that suits your situation.',
        'Explore a varied diet with fruits and vegetables when available.',
        'Discuss symptoms or medical history with a qualified professional.'
      ];

  return <section className="sa-report" id="result" aria-labelledby="sa-report-title">
    <header className="sa-report-header">
      <div className="sa-report-heading">
        <span className="sa-overline"><span className="sa-green-spark" /> {t.kicker}</span>
        <h2 id="sa-report-title">{t.title}</h2>
        <p>{t.subtitle}</p>
      </div>
      <div className="sa-header-actions">
        <button className="sa-action sa-action-subtle" type="button" onClick={() => window.print()}><Glyph name="print" size={17}/>{t.print}</button>
        <button className="sa-action sa-action-primary" type="button" onClick={onReset}><Glyph name="refresh" size={17}/>{t.reset}</button>
      </div>
    </header>

    <div className="sa-education" role="note">
      <span className="sa-education-icon"><Glyph name="shield" size={20}/></span>
      <div><strong>{t.educational}</strong><p>{t.educationalDetail}</p></div>
    </div>

    <div className="sa-report-grid">
      <article className="sa-report-card sa-score-card">
        <div className="sa-card-top"><span className="sa-card-label">{t.overview}</span><span className="sa-micro-chip"><Glyph name="check" size={13}/>{t.survey}</span></div>
        <div className="sa-score-display">
          <div className="sa-result-ring" style={{ '--sa-fill': `${score * 100}%` }} role="img" aria-label={`${t.score}: ${pct(score, locale)}`}>
            <div className="sa-ring-center"><span className="sa-ring-eyebrow">{t.score}</span><strong>{pct(score, locale)}</strong><small>{t.scoreSub}</small></div>
          </div>
          <div className={`sa-result-pill ${flagged ? 'sa-pill-flag' : 'sa-pill-neutral'}`}><Glyph name={flagged ? 'info' : 'check'} size={17}/>{flagged ? t.patternYes : t.patternNo}</div>
          <p className="sa-interpretation">{flagged ? t.interpretationYes : t.interpretationNo}</p>
        </div>
        <div className="sa-score-comparison">
          <div className="sa-comparison-head"><strong>{t.sample}</strong><strong>{pct(score, locale)}</strong></div>
          <div className="sa-comparison-track" aria-hidden="true">
            <span className="sa-comparison-fill" style={{ width: `${score * 100}%` }}/>
            <span className="sa-comparison-marker" style={{ left: `${threshold * 100}%` }}/>
          </div>
          <div className="sa-threshold-line"><span>{t.threshold}</span><strong>{pct(threshold, locale)}</strong></div>
          <p>{t.thresholdHelp}</p>
        </div>
      </article>

      <article className="sa-report-card sa-factors-card">
        <div className="sa-factors-heading"><span className="sa-soft-icon"><Glyph name="brain" size={22}/></span><span className="sa-card-label">EXPLAINABLE AI</span></div>
        <h3>{t.explanation}</h3>
        <p className="sa-factors-intro">{t.explanationIntro}</p>
        <div className="sa-factor-legend"><span><i className="sa-legend-away"/>{t.away}</span><span><i className="sa-legend-toward"/>{t.toward}</span></div>
        <div className="sa-factor-list">
          {displayed.map((f, i) => {
            const toward = f.direction === 'toward_positive_class';
            const length = Math.max(2, (Math.abs(Number(f.contribution) || 0) / maxMagnitude) * 100);
            return <div className="sa-factor-item" key={f.feature || i}>
              <div className="sa-factor-meta"><strong>{featureName(f)}</strong><span className={toward ? 'sa-direction-toward' : 'sa-direction-away'}>{toward ? '↑' : '↓'} {toward ? t.toward : t.away}</span></div>
              <div className="sa-bipolar-track" role="img" aria-label={`${featureName(f)}: ${toward ? t.toward : t.away}`}>
                <span className="sa-bipolar-half sa-bipolar-left">{!toward && <span className="sa-negative-bar" style={{ width: `${length}%` }}/>}</span>
                <span className="sa-bipolar-half sa-bipolar-right">{toward && <span className="sa-positive-bar" style={{ width: `${length}%` }}/>}</span>
              </div>
            </div>;
          })}
          {!factors.length && <p className="sa-no-factors">{t.unavailable}</p>}
        </div>
        {factors.length > 5 && <button className="sa-show-more" type="button" aria-expanded={expanded} onClick={() => setExpanded(e => !e)}>{expanded ? t.showFewer : `${t.showAll} (${factors.length})`}<span className={expanded ? 'sa-chevron-up' : ''}><Glyph name="chevron" size={17}/></span></button>}
        <div className="sa-factor-note"><Glyph name="info" size={17}/><p>{t.strength}<br/><strong>{t.methods}:</strong> {result?.explanation_method || '—'}. {!(result?.explanation_method || '').startsWith('SHAP') && t.fallback}</p></div>
      </article>
    </div>

    <section className="sa-next-section" aria-labelledby="sa-next-title">
      <div className="sa-section-heading"><span className="sa-overline">WELLNESS & EDUCATION</span><h3 id="sa-next-title">{t.next}</h3><p>{t.nextSub}</p></div>
      <div className="sa-next-grid">
        {tips.map((tip, i) => <div className="sa-tip-card" key={i}><span className={`sa-tip-icon sa-tip-icon-${i}`}><Glyph name={['heart','leaf','book'][i]}/></span><h4>{[t.habit1,t.habit2,t.habit3][i]}</h4><p>{tip}</p></div>)}
      </div>
      <div className="sa-resource-actions"><button className="sa-action sa-action-primary" type="button" onClick={onWellness}><Glyph name="heart" size={17}/>{t.wellness}<Glyph name="arrow" size={16}/></button><a className="sa-resource-link" href="https://www.who.int/news-room/fact-sheets/detail/diabetes" target="_blank" rel="noopener noreferrer">{t.readMore} ↗</a></div>
    </section>

    <footer className="sa-result-disclaimer"><span className="sa-disclaimer-icon"><Glyph name="shield" size={23}/></span><div><strong>{t.safety}</strong><p>{t.safetyText}</p><small><Glyph name="info" size={13}/>{t.privacy} {t.model}: {result?.model_name || '—'}</small></div></footer>
  </section>;
}
