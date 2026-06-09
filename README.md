# Mother-Tonguer

A small Streamlit translator that uses Google Translate as the primary translation backend and Microsoft Edge neural voices for playback.

The current implementation is intentionally minimal: translate text, speak the result, and keep clear hooks for later rare-language work.

## Current Languages

| Language | Google code | TTS voice |
| --- | --- | --- |
| English | `en` | `en-US-AndrewNeural` |
| Mongolian | `mn` | `mn-MN-YesuiNeural` |
| Russian | `ru` | `ru-RU-DmitryNeural` |
| Kazakh | `kk` | `kk-KZ-AigulNeural` |

Google Translate may not support some rare languages that Mother-Tonguer should eventually cover. Those languages should be enabled only after adding a custom translation or TTS hook in `translation.py` or `speech.py`.

## Setup

Requires Python 3.8+.

```bash
pip install -r requirements.txt
streamlit run app.py
```

Then open `http://localhost:8501`.

## Architecture

- `app.py`: Streamlit UI and user flow.
- `languages.py`: Supported language metadata and rare-language roadmap placeholders.
- `translation.py`: Google Translate backend plus custom translator hook registration.
- `speech.py`: Edge TTS backend plus custom synthesizer hook registration.

## Future Rare-Language Path

1. Add a `Language` entry in `languages.py` with `google_supported=False`.
2. Register a custom translator with `register_custom_translator(...)`.
3. Register a custom voice model with `register_custom_synthesizer(...)` when Edge TTS has no usable voice.
4. Move the language from `RARE_LANGUAGE_ROADMAP` into `LANGUAGES` once both text and voice paths are ready.

## Notes

`googletrans` is an unofficial Google Translate client. For production stability, the `translation.py` Google backend can be swapped for the official Google Cloud Translation API without changing the Streamlit UI.
