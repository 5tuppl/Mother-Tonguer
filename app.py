import streamlit as st
from deep_translator import GoogleTranslator
import edge_tts
import asyncio
import re

# Page config
st.set_page_config(
    page_title="LinguaFlow | AI Translator", 
    layout="wide",
    page_icon="✨"
)

# Modern SaaS-style CSS
st.markdown("""
    <style>
    /* Hide Streamlit defaults */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    
    /* Clean typography */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    
    * {
        font-family: 'Inter', sans-serif;
    }
    
    /* Main container */
    .main {
        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    }
    
    /* Card style for content */
    .stApp {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    
    /* Center and style title */
    .title-container {
        text-align: center;
        padding: 2rem 0 1rem 0;
    }
    
    .main-title {
        font-size: 3.5rem;
        font-weight: 700;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 0.5rem;
    }
    
    .subtitle {
        text-align: center;
        color: #666;
        font-size: 1rem;
        margin-bottom: 2rem;
    }
    
    /* Clean text area */
    .stTextArea textarea {
        background: white !important;
        border: 1px solid #e0e0e0 !important;
        border-radius: 12px !important;
        color: #1a1a1a !important;
        font-size: 16px !important;
        padding: 16px !important;
        line-height: 1.5 !important;
        transition: all 0.2s ease !important;
    }
    
    .stTextArea textarea:focus {
        border-color: #667eea !important;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1) !important;
    }
    
    /* Clean select boxes */
    .stSelectbox label {
        font-weight: 500 !important;
        color: #333 !important;
        font-size: 14px !important;
        margin-bottom: 4px !important;
    }
    
    .stSelectbox div[data-baseweb="select"] {
        background: white !important;
        border-radius: 10px !important;
        border: 1px solid #e0e0e0 !important;
    }
    
    /* Modern button */
    .stButton button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        color: white !important;
        font-weight: 600 !important;
        border: none !important;
        border-radius: 12px !important;
        padding: 12px 32px !important;
        font-size: 16px !important;
        transition: all 0.2s ease !important;
        width: 100% !important;
    }
    
    .stButton button:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
    }
    
    /* Sidebar styling */
    .css-1d391kg, .css-12oz5g7 {
        background: rgba(255, 255, 255, 0.95) !important;
        backdrop-filter: blur(10px);
        border-right: 1px solid rgba(0,0,0,0.05);
    }
    
    /* Info/Warning/Success messages */
    .stAlert {
        border-radius: 12px !important;
        border-left: 4px solid !important;
        font-size: 14px !important;
    }
    
    /* Result card */
    .result-card {
        background: white;
        border-radius: 16px;
        padding: 24px;
        margin: 20px 0;
        box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        border: 1px solid #f0f0f0;
    }
    
    /* Divider */
    hr {
        margin: 30px 0;
        border: none;
        height: 1px;
        background: linear-gradient(90deg, transparent, #ddd, transparent);
    }
    </style>
""", unsafe_allow_html=True)

# Language configuration
LANGUAGES = {
    'English': {'code': 'en', 'voice': 'en-US-AndrewNeural', 'flag': '🇺🇸'},
    'Mongolian': {'code': 'mn', 'voice': 'mn-MN-YesuiNeural', 'flag': '🇲🇳'},
    'Russian': {'code': 'ru', 'voice': 'ru-RU-DmitryNeural', 'flag': '🇷🇺'},
    'Kazakh': {'code': 'kk', 'voice': 'kk-KZ-AigulNeural', 'flag': '🇰🇿'}
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

# Sidebar - Clean Settings
with st.sidebar:
    st.markdown("### ⚙️ Settings")
    st.markdown("---")
    
    # Language selectors with flags
    st.session_state.src_lang = st.selectbox(
        "Source Language",
        list(LANGUAGES.keys()),
        index=list(LANGUAGES.keys()).index(st.session_state.src_lang),
        format_func=lambda x: f"{LANGUAGES[x]['flag']} {x}"
    )
    
    st.session_state.target_lang = st.selectbox(
        "Target Language",
        list(LANGUAGES.keys()),
        index=list(LANGUAGES.keys()).index(st.session_state.target_lang),
        format_func=lambda x: f"{LANGUAGES[x]['flag']} {x}"
    )
    
    st.markdown("---")
    st.caption("🎙️ **Neural Voice Engine**")
    st.caption("✨ Real-time translation")
    st.caption("🔒 Privacy focused")

# Main content
st.markdown('<div class="title-container">', unsafe_allow_html=True)
st.markdown('<div class="main-title">✨ LinguaFlow</div>', unsafe_allow_html=True)
st.markdown('<div class="subtitle">Break language barriers with AI</div>', unsafe_allow_html=True)
st.markdown('</div>', unsafe_allow_html=True)

# Two column layout for input/output
col1, col2 = st.columns(2, gap="large")

with col1:
    st.markdown("### 📝 Input")
    text_input = st.text_area(
        "",
        placeholder="Type or paste your text...",
        height=200,
        label_visibility="collapsed"
    )
    
    # Language detection badge
    if text_input and text_input.strip():
        detected = detect_language(text_input)
        if detected and detected != st.session_state.src_lang:
            st.info(f"🔍 Detected: {detected}")
            if st.button(f"Switch to {detected}", key="detect_switch", use_container_width=True):
                st.session_state.src_lang = detected
                st.rerun()

with col2:
    st.markdown("### 🎯 Translation")
    # Result display area
    result_placeholder = st.empty()
    
    if st.session_state.translated_text:
        result_placeholder.markdown(f"""
        <div class="result-card">
            <p style="font-size: 16px; line-height: 1.6; margin: 0; color: #1a1a1a;">
                {st.session_state.translated_text}
            </p>
        </div>
        """, unsafe_allow_html=True)
    else:
        result_placeholder.markdown("""
        <div class="result-card" style="background: #fafafa; text-align: center; color: #999;">
            <p style="margin: 0;">Translation will appear here</p>
        </div>
        """, unsafe_allow_html=True)

# Translate button
st.markdown("<br>", unsafe_allow_html=True)
col1, col2, col3 = st.columns([1, 2, 1])
with col2:
    translate_clicked = st.button("🚀 Translate", use_container_width=True)

# Process translation
if translate_clicked and text_input.strip():
    with st.spinner("Processing..."):
        try:
            # Translate
            translated = GoogleTranslator(
                source=LANGUAGES[st.session_state.src_lang]['code'],
                target=LANGUAGES[st.session_state.target_lang]['code']
            ).translate(text_input)
            
            # Store in session state
            st.session_state.translated_text = translated
            
            # Update result display
            with col2:
                result_placeholder.markdown(f"""
                <div class="result-card">
                    <p style="font-size: 16px; line-height: 1.6; margin: 0; color: #1a1a1a;">
                        {translated}
                    </p>
                </div>
                """, unsafe_allow_html=True)
            
            # Generate audio
            with st.spinner("🎵 Generating audio..."):
                audio_bytes = asyncio.run(generate_voice(
                    translated,
                    LANGUAGES[st.session_state.target_lang]['voice']
                ))
                st.audio(audio_bytes, format='audio/mp3')
            
            # Success message
            st.toast("✨ Translation complete!", icon="✅")
            
        except Exception as e:
            st.error(f"Translation error: {str(e)}")
            st.session_state.translated_text = ""
            
elif translate_clicked and not text_input.strip():
    st.warning("Please enter some text to translate")

# Footer
st.markdown("---")
st.markdown(
    "<p style='text-align: center; color: #666; font-size: 13px;'>LinguaFlow • Powered by advanced neural networks • Instant voice synthesis</p>",
    unsafe_allow_html=True
)
