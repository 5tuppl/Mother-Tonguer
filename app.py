import streamlit as st
from deep_translator import GoogleTranslator
import edge_tts
import asyncio
import re

# Page config
st.set_page_config(
    page_title="Translate | AI Translator", 
    layout="wide",
    page_icon="●"
)

# Minimalist high-contrast B&W CSS
st.markdown("""
    <style>
    /* Hide Streamlit defaults */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    
    /* Clean typography */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    
    * {
        font-family: 'Inter', sans-serif;
    }
    
    /* Pure black and white background */
    .stApp {
        background: #000000;
    }
    
    /* Main container */
    .main .block-container {
        max-width: 1200px;
        padding-top: 2rem;
    }
    
    /* Title styling */
    .title-container {
        text-align: center;
        padding: 1rem 0 2rem 0;
    }
    
    .main-title {
        font-size: 4rem;
        font-weight: 800;
        color: #ffffff;
        letter-spacing: -0.02em;
        margin-bottom: 0.5rem;
    }
    
    .subtitle {
        text-align: center;
        color: #888888;
        font-size: 0.9rem;
        font-weight: 400;
        letter-spacing: 0.01em;
    }
    
    /* Text area - pure white on black */
    .stTextArea textarea {
        background: #1a1a1a !important;
        border: 1px solid #333333 !important;
        border-radius: 0px !important;
        color: #ffffff !important;
        font-size: 15px !important;
        padding: 16px !important;
        line-height: 1.5 !important;
        font-weight: 400 !important;
    }
    
    .stTextArea textarea:focus {
        border-color: #ffffff !important;
        box-shadow: none !important;
    }
    
    .stTextArea textarea::placeholder {
        color: #555555 !important;
    }
    
    /* Labels */
    .stSelectbox label {
        font-weight: 500 !important;
        color: #ffffff !important;
        font-size: 13px !important;
        margin-bottom: 6px !important;
        letter-spacing: 0.02em;
    }
    
    /* Select boxes - dark theme */
    .stSelectbox div[data-baseweb="select"] {
        background: #1a1a1a !important;
        border-radius: 0px !important;
        border: 1px solid #333333 !important;
    }
    
    .stSelectbox div[data-baseweb="select"] div {
        color: #ffffff !important;
    }
    
    /* Button styling - inverted */
    .stButton button {
        background: #ffffff !important;
        color: #000000 !important;
        font-weight: 600 !important;
        border: none !important;
        border-radius: 0px !important;
        padding: 12px 32px !important;
        font-size: 14px !important;
        letter-spacing: 0.05em;
        transition: all 0.2s ease !important;
        width: 100% !important;
    }
    
    .stButton button:hover {
        background: #e0e0e0 !important;
        transform: none !important;
        box-shadow: none !important;
    }
    
    /* Sidebar - pure black */
    .css-1d391kg, .css-12oz5g7 {
        background: #000000 !important;
        border-right: 1px solid #222222 !important;
    }
    
    /* Sidebar text */
    .sidebar .sidebar-content {
        color: #ffffff;
    }
    
    /* Info/Warning/Success messages - minimal */
    .stAlert {
        border-radius: 0px !important;
        border-left: 2px solid !important;
        font-size: 13px !important;
        padding: 12px !important;
    }
    
    .stInfo {
        background: #1a1a1a !important;
        color: #aaaaaa !important;
    }
    
    .stWarning {
        background: #1a1a1a !important;
        color: #ffaa66 !important;
    }
    
    .stSuccess {
        background: #1a1a1a !important;
        color: #66ff66 !important;
    }
    
    .stError {
        background: #1a1a1a !important;
        color: #ff6666 !important;
    }
    
    /* Result card - pure black and white */
    .result-card {
        background: #1a1a1a;
        border: 1px solid #333333;
        padding: 24px;
        margin: 0;
    }
    
    .result-text {
        color: #ffffff;
        font-size: 16px;
        line-height: 1.6;
        margin: 0;
        font-weight: 400;
    }
    
    /* Empty state card */
    .empty-card {
        background: #1a1a1a;
        border: 1px solid #333333;
        padding: 24px;
        text-align: center;
    }
    
    .empty-text {
        color: #555555;
        margin: 0;
        font-size: 14px;
    }
    
    /* Divider */
    hr {
        margin: 30px 0;
        border: none;
        height: 1px;
        background: #222222;
    }
    
    /* Caption text */
    .stCaption {
        color: #666666 !important;
    }
    
    /* Spinner */
    .stSpinner > div {
        border-color: #ffffff !important;
    }
    
    /* Audio player */
    audio {
        width: 100%;
        margin-top: 12px;
    }
    
    /* Headers */
    h1, h2, h3, h4 {
        color: #ffffff !important;
        font-weight: 600 !important;
    }
    
    p {
        color: #cccccc !important;
    }
    </style>
""", unsafe_allow_html=True)

# Language configuration - no emojis
LANGUAGES = {
    'English': {'code': 'en', 'voice': 'en-US-AndrewNeural'},
    'Mongolian': {'code': 'mn', 'voice': 'mn-MN-YesuiNeural'},
    'Russian': {'code': 'ru', 'voice': 'ru-RU-DmitryNeural'},
    'Kazakh': {'code': 'kk', 'voice': 'kk-KZ-AigulNeural'}
}

def detect_language(text):
    """Detect language based on character patterns"""
    if not text or len(text.strip()) < 2:
        return None
    
    cyrillic = r'[\u0400-\u04FF]'
    latin = r'[a-zA-Z]'
    kazakh_specific = r'[әғқңөұүһ]'
    
    text_lower = text.lower()
    
    has_cyrillic = len(re.findall(cyrillic, text_lower)) > len(text) * 0.3
    has_latin = len(re.findall(latin, text_lower)) > len(text) * 0.3
    has_kazakh = len(re.findall(kazakh_specific, text_lower)) > 0
    has_mongolian = len(re.findall(r'[өү]', text_lower)) > 0
    
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

# Initialize session state
if 'src_lang' not in st.session_state:
    st.session_state.src_lang = 'English'
if 'target_lang' not in st.session_state:
    st.session_state.target_lang = 'Mongolian'
if 'translated_text' not in st.session_state:
    st.session_state.translated_text = ""

# Sidebar
with st.sidebar:
    st.markdown("### CONFIG")
    st.markdown("---")
    
    st.session_state.src_lang = st.selectbox(
        "SOURCE",
        list(LANGUAGES.keys()),
        index=list(LANGUAGES.keys()).index(st.session_state.src_lang)
    )
    
    st.session_state.target_lang = st.selectbox(
        "TARGET",
        list(LANGUAGES.keys()),
        index=list(LANGUAGES.keys()).index(st.session_state.target_lang)
    )
    
    st.markdown("---")
    st.caption("VOICE ENGINE")
    st.caption("Neural TTS")
    st.caption("Low latency")

# Main content
st.markdown('<div class="title-container">', unsafe_allow_html=True)
st.markdown('<div class="main-title">TRANSLATE</div>', unsafe_allow_html=True)
st.markdown('<div class="subtitle">AI-powered language translation</div>', unsafe_allow_html=True)
st.markdown('</div>', unsafe_allow_html=True)

# Two column layout
col1, col2 = st.columns(2, gap="large")

with col1:
    st.markdown("### INPUT")
    text_input = st.text_area(
        "",
        placeholder="Enter text to translate...",
        height=200,
        label_visibility="collapsed"
    )
    
    # Language detection
    if text_input and text_input.strip():
        detected = detect_language(text_input)
        if detected and detected != st.session_state.src_lang:
            st.info(f"DETECTED: {detected}")
            if st.button(f"SWITCH TO {detected}", key="detect_switch", use_container_width=True):
                st.session_state.src_lang = detected
                st.rerun()

with col2:
    st.markdown("### OUTPUT")
    
    if st.session_state.translated_text:
        st.markdown(f"""
        <div class="result-card">
            <p class="result-text">{st.session_state.translated_text}</p>
        </div>
        """, unsafe_allow_html=True)
    else:
        st.markdown("""
        <div class="empty-card">
            <p class="empty-text">Translation will appear here</p>
        </div>
        """, unsafe_allow_html=True)

# Translate button
st.markdown("<br>", unsafe_allow_html=True)
col1, col2, col3 = st.columns([1, 2, 1])
with col2:
    translate_clicked = st.button("TRANSLATE", use_container_width=True)

# Process translation
if translate_clicked and text_input.strip():
    with st.spinner("PROCESSING..."):
        try:
            translated = GoogleTranslator(
                source=LANGUAGES[st.session_state.src_lang]['code'],
                target=LANGUAGES[st.session_state.target_lang]['code']
            ).translate(text_input)
            
            st.session_state.translated_text = translated
            
            with col2:
                st.markdown(f"""
                <div class="result-card">
                    <p class="result-text">{translated}</p>
                </div>
                """, unsafe_allow_html=True)
            
            with st.spinner("GENERATING VOICE..."):
                audio_bytes = asyncio.run(generate_voice(
                    translated,
                    LANGUAGES[st.session_state.target_lang]['voice']
                ))
                st.audio(audio_bytes, format='audio/mp3')
            
            st.success("COMPLETE")
            
        except Exception as e:
            st.error(f"ERROR: {str(e)}")
            st.session_state.translated_text = ""
            
elif translate_clicked and not text_input.strip():
    st.warning("EMPTY INPUT")

# Footer
st.markdown("---")
st.markdown(
    "<p style='text-align: center; color: #555555; font-size: 12px;'>NEURAL TRANSLATION SYSTEM • HIGH ACCURACY</p>",
    unsafe_allow_html=True
)
