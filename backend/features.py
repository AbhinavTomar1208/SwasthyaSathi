"""Inputs shared by training and the public questionnaire.

We intentionally omit sex, income, education and US healthcare-access variables
from the public MVP questionnaire. These 15 fields must match the fitted model.
"""
FEATURES = [
    'HighBP', 'HighChol', 'CholCheck', 'BMI', 'Smoker', 'Stroke',
    'HeartDiseaseorAttack', 'PhysActivity', 'Fruits', 'Veggies',
    'GenHlth', 'MentHlth', 'PhysHlth', 'DiffWalk', 'Age',
]

YES_NO = [{'value': 0, 'label': 'No', 'hi': 'नहीं'}, {'value': 1, 'label': 'Yes', 'hi': 'हाँ'}]
AGE_LABELS = ['18–24','25–29','30–34','35–39','40–44','45–49','50–54','55–59','60–64','65–69','70–74','75–79','80+']

def field(name, label, hi, group, kind='select', options=None, minimum=None, maximum=None, default=0, help_text=''):
    return {'name': name, 'label': label, 'hi': hi, 'group': group, 'type': kind,
            'options': options, 'min': minimum, 'max': maximum, 'default': default, 'help': help_text}

FIELDS = [
    field('Age', 'Age group', 'आयु समूह', 'Basics', options=[{'value': i + 1, 'label': s, 'hi': s} for i,s in enumerate(AGE_LABELS)], default=6),
    field('BMI', 'Body mass index (BMI)', 'बॉडी मास इंडेक्स', 'Basics', kind='number', minimum=12, maximum=98, default=25, help_text='BMI = weight in kg / (height in meters)²'),
    field('HighBP', 'Ever told you have high blood pressure?', 'उच्च रक्तचाप का इतिहास?', 'Medical history', options=YES_NO),
    field('HighChol', 'Ever told you have high cholesterol?', 'उच्च कोलेस्ट्रॉल का इतिहास?', 'Medical history', options=YES_NO),
    field('CholCheck', 'Cholesterol checked in the last 5 years?', 'पिछले 5 साल में कोलेस्ट्रॉल जाँच?', 'Medical history', options=YES_NO, default=1),
    field('Stroke', 'Ever told you had a stroke?', 'क्या कभी स्ट्रोक हुआ है?', 'Medical history', options=YES_NO),
    field('HeartDiseaseorAttack', 'Ever told you had heart disease or a heart attack?', 'हृदय रोग या दिल के दौरे का इतिहास?', 'Medical history', options=YES_NO),
    field('Smoker', 'Smoked at least 100 cigarettes in your life?', 'जीवन में कम से कम 100 सिगरेट पी हैं?', 'Habits', options=YES_NO),
    field('PhysActivity', 'Physical activity in the last 30 days (apart from job)?', 'पिछले 30 दिनों में शारीरिक गतिविधि?', 'Habits', options=YES_NO, default=1),
    field('Fruits', 'Eat fruit at least once a day?', 'क्या रोज़ फल खाते हैं?', 'Habits', options=YES_NO, default=1),
    field('Veggies', 'Eat vegetables at least once a day?', 'क्या रोज़ सब्ज़ियाँ खाते हैं?', 'Habits', options=YES_NO, default=1),
    field('GenHlth', 'Self-rated general health', 'आपका सामान्य स्वास्थ्य कैसा है?', 'Well-being', options=[{'value': i, 'label': t, 'hi': h} for i,t,h in [(1,'Excellent','उत्कृष्ट'),(2,'Very good','बहुत अच्छा'),(3,'Good','अच्छा'),(4,'Fair','ठीक-ठाक'),(5,'Poor','खराब')]], default=3),
    field('MentHlth', 'Days of poor mental health (past 30 days)', 'पिछले 30 दिन: मानसिक स्वास्थ्य खराब रहने के दिन', 'Well-being', kind='number', minimum=0, maximum=30),
    field('PhysHlth', 'Days of poor physical health (past 30 days)', 'पिछले 30 दिन: शारीरिक स्वास्थ्य खराब रहने के दिन', 'Well-being', kind='number', minimum=0, maximum=30),
    field('DiffWalk', 'Serious difficulty walking or climbing stairs?', 'चलने या सीढ़ी चढ़ने में गंभीर कठिनाई?', 'Well-being', options=YES_NO),
]
assert [f['name'] for f in FIELDS] == ['Age','BMI','HighBP','HighChol','CholCheck','Stroke','HeartDiseaseorAttack','Smoker','PhysActivity','Fruits','Veggies','GenHlth','MentHlth','PhysHlth','DiffWalk']
assert set(FEATURES) == set(f['name'] for f in FIELDS)
FIELD_BY_NAME = {f['name']: f for f in FIELDS}
