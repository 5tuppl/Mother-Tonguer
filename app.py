import streamlit as st
from deep_translator import GoogleTranslator
import edge_tts
import asyncio
import re

# Page config
st.set_page_config(
    page_title="Voicer — AI Translator",
    layout="wide",
    page_icon="🌐"
)

# Modern light SaaS CSS
st.markdown("""
    <style>
    /* ── Imports ── */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

    /* ── Reset & base ── */
    #MainMenu {visibility: hidden;}
    footer    {visibility: hidden;}
    header    {visibility: hidden;}

    * { font-family: 'Inter', sans-serif; box-sizing: border-box; }

    /* ── Background ── */
    .stApp {
        background: #f1f5f9;
    }

    /* ── Main container ── */
    .main .block-container {
        max-width: 1080px;
        padding: 2.5rem 1.5rem 4rem;
    }

    /* ── App header ── */
    .app-header {
        text-align: center;
        padding: 1.5rem 0 2rem;
    }
    .app-logo {
        font-size: 1rem;
        font-weight: 700;
        color: #6366f1;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        margin-bottom: 0.75rem;
    }
    .app-title {
        font-size: 2.8rem;
        font-weight: 800;
        color: #1e293b;
        letter-spacing: -0.03em;
        line-height: 1.15;
        margin: 0;
    }
    .app-subtitle {
        color: #94a3b8;
        font-size: 1rem;
        font-weight: 400;
        margin-top: 0.5rem;
    }

    /* ── Language bar card ── */
    .lang-bar {
        background: #ffffff;
        border-radius: 20px;
        padding: 1.25rem 1.5rem;
        box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
        margin-bottom: 1.25rem;
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    .lang-label {
        font-size: 11px;
        font-weight: 600;
        color: #94a3b8;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        margin-bottom: 6px;
    }

    /* ── Panel cards (input / output) ── */
    .panel-card {
        background: #ffffff;
        border-radius: 20px;
        padding: 1.5rem;
        box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
        margin-bottom: 1.25rem;
    }
    .panel-label {
        font-size: 11px;
        font-weight: 700;
        color: #94a3b8;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        margin-bottom: 0.75rem;
    }

    /* ── Text area ── */
    .stTextArea textarea {
        background: #f8fafc !important;
        border: 1.5px solid #e2e8f0 !important;
        border-radius: 14px !important;
        color: #1e293b !important;
        font-size: 15px !important;
        padding: 16px !important;
        line-height: 1.65 !important;
        font-weight: 400 !important;
        resize: vertical !important;
        transition: border-color 0.2s, box-shadow 0.2s !important;
    }
    .stTextArea textarea:focus {
        border-color: #6366f1 !important;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12) !important;
        background: #ffffff !important;
    }
    .stTextArea textarea::placeholder {
        color: #cbd5e1 !important;
    }
    .stTextArea label { display: none !important; }

    /* ── Selectbox ── */
    .stSelectbox label {
        font-size: 11px !important;
        font-weight: 700 !important;
        color: #94a3b8 !important;
        letter-spacing: 0.1em !important;
        text-transform: uppercase !important;
        margin-bottom: 4px !important;
    }
    .stSelectbox div[data-baseweb="select"] {
        background: #f8fafc !important;
        border-radius: 12px !important;
        border: 1.5px solid #e2e8f0 !important;
        transition: border-color 0.2s !important;
    }
    .stSelectbox div[data-baseweb="select"]:hover {
        border-color: #6366f1 !important;
    }
    .stSelectbox div[data-baseweb="select"] div {
        color: #1e293b !important;
        font-weight: 500 !important;
    }

    /* ── Buttons ── */
    .stButton button {
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%) !important;
        color: #ffffff !important;
        font-weight: 600 !important;
        border: none !important;
        border-radius: 14px !important;
        padding: 13px 32px !important;
        font-size: 15px !important;
        letter-spacing: 0.01em !important;
        transition: all 0.2s ease !important;
        box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35) !important;
        width: 100% !important;
    }
    .stButton button:hover {
        transform: translateY(-1px) !important;
        box-shadow: 0 6px 20px rgba(99, 102, 241, 0.45) !important;
    }
    .stButton button:active {
        transform: translateY(0) !important;
    }

    /* Swap button — secondary style */
    .swap-btn button {
        background: #f1f5f9 !important;
        color: #475569 !important;
        box-shadow: none !important;
        border: 1.5px solid #e2e8f0 !important;
        border-radius: 50% !important;
        padding: 10px !important;
        font-size: 18px !important;
        font-weight: 400 !important;
        width: 44px !important;
        height: 44px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: background 0.2s, border-color 0.2s !important;
    }
    .swap-btn button:hover {
        background: #e0e7ff !important;
        border-color: #6366f1 !important;
        color: #6366f1 !important;
        transform: none !important;
        box-shadow: none !important;
    }

    /* Detect-switch button — ghost style */
    .detect-btn button {
        background: #f0fdf4 !important;
        color: #16a34a !important;
        border: 1.5px solid #bbf7d0 !important;
        border-radius: 10px !important;
        box-shadow: none !important;
        font-size: 13px !important;
        padding: 8px 16px !important;
        font-weight: 600 !important;
    }
    .detect-btn button:hover {
        background: #dcfce7 !important;
        border-color: #4ade80 !important;
        transform: none !important;
        box-shadow: none !important;
    }

    /* ── Result card ── */
    .result-card {
        background: #f8fafc;
        border: 1.5px solid #e2e8f0;
        border-radius: 14px;
        padding: 20px 22px;
        min-height: 200px;
    }
    .result-text {
        color: #1e293b !important;
        font-size: 15px;
        line-height: 1.65;
        margin: 0;
        font-weight: 400;
    }
    .empty-card {
        background: #f8fafc;
        border: 1.5px dashed #cbd5e1;
        border-radius: 14px;
        padding: 40px 20px;
        text-align: center;
        min-height: 200px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .empty-text {
        color: #94a3b8 !important;
        font-size: 14px;
        margin: 0;
    }

    /* ── Alerts ── */
    .stAlert {
        border-radius: 12px !important;
        border: none !important;
        font-size: 13px !important;
        font-weight: 500 !important;
    }
    [data-testid="stNotification"] {
        border-radius: 12px !important;
    }

    /* ── Audio player ── */
    audio {
        width: 100%;
        margin-top: 14px;
        border-radius: 10px;
    }

    /* ── Spinner ── */
    .stSpinner > div {
        border-top-color: #6366f1 !important;
    }

    /* ── Divider ── */
    hr {
        border: none;
        height: 1px;
        background: #e2e8f0;
        margin: 2rem 0;
    }

    /* ── Caption / small text ── */
    .stCaption {
        color: #94a3b8 !important;
    }

    /* ── General headings / paragraphs ── */
    h1, h2, h3, h4 {
        color: #1e293b !important;
        font-weight: 700 !important;
    }
    p { color: #475569 !important; }

    /* ── Footer ── */
    .footer-text {
        text-align: center;
        color: #94a3b8;
        font-size: 12px;
        padding-top: 0.5rem;
    }

    /* ── Responsive tweaks ── */
    @media (max-width: 768px) {
        .app-title { font-size: 2rem; }
        .main .block-container { padding: 1.5rem 1rem 3rem; }
    }
    </style>
""", unsafe_allow_html=True)

# ── Language configuration ──────────────────────────────────────────────────
LANGUAGES = {
    'English':   {'code': 'en', 'voice': 'en-US-AndrewNeural'},
    'Mongolian': {'code': 'mn', 'voice': 'mn-MN-YesuiNeural'},
    'Russian':   {'code': 'ru', 'voice': 'ru-RU-DmitryNeural'},
    'Kazakh':    {'code': 'kk', 'voice': 'kk-KZ-AigulNeural'},
}

LANG_FLAGS = {
    'English':   '🇬🇧',
    'Mongolian': '🇲🇳',
    'Russian':   '🇷🇺',
    'Kazakh':    '🇰🇿',
}


# ── Helpers ─────────────────────────────────────────────────────────────────
def detect_language(text):
    """Detect language based on character patterns."""
    if not text or len(text.strip()) < 2:
        return None

    cyrillic        = r'[\u0400-\u04FF]'
    latin           = r'[a-zA-Z]'
    kazakh_specific = r'[әғқңөұүһ]'

    text_lower = text.lower()
    has_cyrillic  = len(re.findall(cyrillic,        text_lower)) > len(text) * 0.3
    has_latin     = len(re.findall(latin,            text_lower)) > len(text) * 0.3
    has_kazakh    = len(re.findall(kazakh_specific,  text_lower)) > 0
    has_mongolian = len(re.findall(r'[өү]',          text_lower)) > 0

    if has_kazakh:
        return 'Kazakh'
    if has_mongolian and has_cyrillic:
        return 'Mongolian'
    if has_cyrillic and not has_kazakh:
        return 'Russian'
    if has_latin:
        return 'English'
    return None


async def generate_voice(text, voice):
    communicate = edge_tts.Communicate(text, voice)
    audio_data = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data += chunk["data"]
    return audio_data


# ── Session state ────────────────────────────────────────────────────────────
if 'src_lang'        not in st.session_state:
    st.session_state.src_lang        = 'English'
if 'target_lang'     not in st.session_state:
    st.session_state.target_lang     = 'Mongolian'
if 'translated_text' not in st.session_state:
    st.session_state.translated_text = ""


# ══════════════════════════════════════════════════════════════════════════════
#  HEADER
# ══════════════════════════════════════════════════════════════════════════════
st.markdown("""
<div class="app-header">
    <div class="app-logo">✦ Voicer</div>
    <div class="app-title">AI Translation</div>
    <div class="app-subtitle">Speak any language — instantly</div>
</div>
""", unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════════════════════════
#  LANGUAGE SELECTOR BAR
# ══════════════════════════════════════════════════════════════════════════════
st.markdown('<div class="panel-card">', unsafe_allow_html=True)
col_src, col_swap, col_tgt = st.columns([5, 1, 5])

with col_src:
    st.markdown('<div class="lang-label">Translate from</div>', unsafe_allow_html=True)
    src_lang = st.selectbox(
        "Source language",
        list(LANGUAGES.keys()),
        index=list(LANGUAGES.keys()).index(st.session_state.src_lang),
        key="src_select",
        label_visibility="collapsed",
        format_func=lambda x: f"{LANG_FLAGS[x]}  {x}",
    )
    st.session_state.src_lang = src_lang

with col_swap:
    st.markdown("<div style='height:24px'></div>", unsafe_allow_html=True)
    st.markdown('<div class="swap-btn">', unsafe_allow_html=True)
    if st.button("⇄", key="swap_btn", help="Swap languages"):
        st.session_state.src_lang, st.session_state.target_lang = (
            st.session_state.target_lang,
            st.session_state.src_lang,
        )
        st.session_state.translated_text = ""
        st.rerun()
    st.markdown('</div>', unsafe_allow_html=True)

with col_tgt:
    st.markdown('<div class="lang-label">Translate to</div>', unsafe_allow_html=True)
    target_lang = st.selectbox(
        "Target language",
        list(LANGUAGES.keys()),
        index=list(LANGUAGES.keys()).index(st.session_state.target_lang),
        key="tgt_select",
        label_visibility="collapsed",
        format_func=lambda x: f"{LANG_FLAGS[x]}  {x}",
    )
    st.session_state.target_lang = target_lang

st.markdown('</div>', unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════════════════════════
#  INPUT / OUTPUT PANELS
# ══════════════════════════════════════════════════════════════════════════════
col_in, col_out = st.columns(2, gap="medium")

with col_in:
    st.markdown('<div class="panel-card">', unsafe_allow_html=True)
    st.markdown('<div class="panel-label">Input text</div>', unsafe_allow_html=True)
    text_input = st.text_area(
        "Input",
        placeholder="Type or paste your text here…",
        height=220,
        label_visibility="collapsed",
    )

    # Language auto-detection hint
    if text_input and text_input.strip():
        detected = detect_language(text_input)
        if detected and detected != st.session_state.src_lang:
            st.info(f"Detected language: **{LANG_FLAGS[detected]} {detected}**")
            st.markdown('<div class="detect-btn">', unsafe_allow_html=True)
            if st.button(f"Switch source to {detected}", key="detect_switch"):
                st.session_state.src_lang = detected
                st.rerun()
            st.markdown('</div>', unsafe_allow_html=True)

    st.markdown('</div>', unsafe_allow_html=True)

with col_out:
    st.markdown('<div class="panel-card">', unsafe_allow_html=True)
    st.markdown('<div class="panel-label">Translation</div>', unsafe_allow_html=True)

    if st.session_state.translated_text:
        st.markdown(
            f'<div class="result-card">'
            f'<p class="result-text">{st.session_state.translated_text}</p>'
            f'</div>',
            unsafe_allow_html=True,
        )
    else:
        st.markdown(
            '<div class="empty-card">'
            '<p class="empty-text">Your translation will appear here</p>'
            '</div>',
            unsafe_allow_html=True,
        )

    st.markdown('</div>', unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════════════════════════
#  TRANSLATE BUTTON
# ══════════════════════════════════════════════════════════════════════════════
st.markdown("<br>", unsafe_allow_html=True)
_, btn_col, _ = st.columns([2, 3, 2])
with btn_col:
    translate_clicked = st.button(
        f"Translate  {LANG_FLAGS[st.session_state.src_lang]} → {LANG_FLAGS[st.session_state.target_lang]}",
        use_container_width=True,
    )


# ══════════════════════════════════════════════════════════════════════════════
#  TRANSLATION LOGIC
# ══════════════════════════════════════════════════════════════════════════════
if translate_clicked and text_input.strip():
    with st.spinner("Translating…"):
        try:
            translated = GoogleTranslator(
                source=LANGUAGES[st.session_state.src_lang]['code'],
                target=LANGUAGES[st.session_state.target_lang]['code'],
            ).translate(text_input)

            st.session_state.translated_text = translated

            # Re-render the output card with the new translation
            with col_out:
                st.markdown(
                    f'<div class="result-card">'
                    f'<p class="result-text">{translated}</p>'
                    f'</div>',
                    unsafe_allow_html=True,
                )

            with st.spinner("Generating voice…"):
                audio_bytes = asyncio.run(generate_voice(
                    translated,
                    LANGUAGES[st.session_state.target_lang]['voice'],
                ))
                st.audio(audio_bytes, format='audio/mp3')

            st.success("Translation complete!")

        except Exception as e:
            st.error(f"Error: {str(e)}")
            st.session_state.translated_text = ""

elif translate_clicked and not text_input.strip():
    st.warning("Please enter some text to translate.")


# ══════════════════════════════════════════════════════════════════════════════
#  FOOTER
# ══════════════════════════════════════════════════════════════════════════════
st.markdown("<hr>", unsafe_allow_html=True)
st.markdown(
    '<p class="footer-text">Powered by Google Translate & Microsoft Neural TTS</p>',
    unsafe_allow_html=True,
)
