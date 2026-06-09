import asyncio
from html import escape
from typing import Tuple

import streamlit as st

from languages import FLAGS, LANGUAGES, language_names
from speech import synthesize_speech
from translation import UnsupportedLanguageError, translate_text


st.set_page_config(
    page_title="Mother-Tonguer",
    layout="wide",
    page_icon="🌐",
)


st.markdown(
    """
    <style>
    #MainMenu, footer, header { visibility: hidden; }
    .stApp, [data-testid="stAppViewContainer"] { background: #050505; color: #f8fafc; }
    .block-container { max-width: 980px; padding-top: 2rem; }
    h1, h2, h3, p, label, span { color: #f8fafc !important; }
    .app-title { font-size: 2.6rem; font-weight: 800; letter-spacing: -0.03em; margin-bottom: .2rem; }
    .app-subtitle { color: #a3a3a3 !important; margin-bottom: 1.5rem; }
    .panel {
        border: 1px solid #2a2a2a;
        border-radius: 16px;
        background: #111;
        padding: 1rem;
        min-height: 100%;
    }
    .result {
        min-height: 220px;
        white-space: pre-wrap;
        word-break: break-word;
        line-height: 1.65;
        font-size: 1rem;
    }
    .stTextArea textarea, .stSelectbox div[data-baseweb="select"] {
        background: #080808 !important;
        border-color: #303030 !important;
        color: #f8fafc !important;
    }
    .stButton button {
        border: 0 !important;
        border-radius: 12px !important;
        background: #d08a00 !important;
        color: #fff !important;
        font-weight: 700 !important;
    }
    audio { width: 100%; margin-top: 1rem; }
    </style>
    """,
    unsafe_allow_html=True,
)


async def translate_and_speak(text: str, source_name: str, target_name: str) -> Tuple[str, bytes]:
    source = LANGUAGES[source_name]
    target = LANGUAGES[target_name]
    translated = await translate_text(text, source, target)
    audio = await synthesize_speech(translated, target)
    return translated, audio


if "source_language" not in st.session_state:
    st.session_state.source_language = "English"
if "target_language" not in st.session_state:
    st.session_state.target_language = "Mongolian"
if "translated_text" not in st.session_state:
    st.session_state.translated_text = ""
if "audio_bytes" not in st.session_state:
    st.session_state.audio_bytes = b""


st.markdown('<div class="app-title">Mother-Tonguer</div>', unsafe_allow_html=True)
st.markdown('<p class="app-subtitle">Google Translate first, Edge neural voice output.</p>', unsafe_allow_html=True)

left, middle, right = st.columns([5, 1, 5])

with left:
    source_language = st.selectbox(
        "From",
        language_names(),
        index=language_names().index(st.session_state.source_language),
        format_func=lambda name: f"{FLAGS[name]} {name}",
    )
    st.session_state.source_language = source_language

with middle:
    st.write("")
    st.write("")
    if st.button("⇄", help="Swap languages"):
        st.session_state.source_language, st.session_state.target_language = (
            st.session_state.target_language,
            st.session_state.source_language,
        )
        st.session_state.translated_text = ""
        st.session_state.audio_bytes = b""
        st.rerun()

with right:
    target_language = st.selectbox(
        "To",
        language_names(),
        index=language_names().index(st.session_state.target_language),
        format_func=lambda name: f"{FLAGS[name]} {name}",
    )
    st.session_state.target_language = target_language


input_col, output_col = st.columns(2, gap="large")

with input_col:
    st.markdown('<div class="panel">', unsafe_allow_html=True)
    text_input = st.text_area("Text", placeholder="Type text to translate...", height=220)
    st.markdown("</div>", unsafe_allow_html=True)

with output_col:
    st.markdown('<div class="panel">', unsafe_allow_html=True)
    if st.session_state.translated_text:
        st.markdown(
            f'<div class="result">{escape(st.session_state.translated_text)}</div>',
            unsafe_allow_html=True,
        )
    else:
        st.markdown('<div class="result" style="color:#888;">Translation appears here.</div>', unsafe_allow_html=True)
    if st.session_state.audio_bytes:
        st.audio(st.session_state.audio_bytes, format="audio/mp3")
    st.markdown("</div>", unsafe_allow_html=True)


if st.button(
    f"Translate {FLAGS[st.session_state.source_language]} → {FLAGS[st.session_state.target_language]}",
    use_container_width=True,
):
    if not text_input.strip():
        st.warning("Enter text before translating.")
    else:
        try:
            with st.spinner("Translating and generating speech..."):
                translated_text, audio_bytes = asyncio.run(
                    translate_and_speak(
                        text_input.strip(),
                        st.session_state.source_language,
                        st.session_state.target_language,
                    )
                )
            st.session_state.translated_text = translated_text
            st.session_state.audio_bytes = audio_bytes
            st.rerun()
        except UnsupportedLanguageError as error:
            st.error(str(error))
        except Exception as error:
            st.error(f"Translation failed: {error}")


st.caption("Google Translate is the primary translation backend. Rare-language model hooks are kept in code for later fine-tuning.")
