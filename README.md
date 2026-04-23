# 🌐 Voice Translator

(I deployed it with a help of streamlit,
here is how to run it in web, not locally -  https://mother-tonguer-2w73kppag3hb7op56bbazf.streamlit.app/

A simple web app that actually translates interesting languages and reads the result aloud.

Built with Streamlit, Google Translate, and Microsoft Edge TTS.

## Languages

| Language | TTS Voice |
|----------|-----------|
| English | en-US-AndrewNeural |
| Mongolian | mn-MN-YesuiNeural |
| Russian | ru-RU-DmitryNeural |
| Kazakh | kk-KZ-AigulNeural |

## Setup

**1. Clone the repo**
```bash
git clone https://github.com/5tuppl/Mother-Tonguer
cd Mother-Tonguer
```

**2. Install dependencies**
```bash
pip install -r requirements.txt
```

**3. Run the app**
```bash
streamlit run app.py
```

Then open `http://localhost:8501` in your browser.

## Requirements

- Python 3.8+
- Internet connection (for Google Translate and Edge TTS)

## Dependencies

```
streamlit
deep-translator
edge-tts
```
