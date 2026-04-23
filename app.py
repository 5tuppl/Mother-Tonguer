import streamlit as st
from deep_translator import GoogleTranslator
import edge_tts
import asyncio
import io

# Page config
st.set_page_config(page_title="Translator", layout="wide")

# Simple, clean CSS - just fix the input text color
st.markdown("""
    <style>
    /* Hide Streamlit branding */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    
    /* Just make input text BLACK - that's it */
    .stTextArea textarea {
        color: #000000 !important;
        background-color: #ffffff !important;
    }
    
    /* Make buttons look nice */
    .stButton button {
        width: 100%;
        border-radius: 20px;
        font-weight: bold;
    }
    </style>
    """, unsafe_allow_html=True)

# Language options
LANGUAGES = {
    'English': {'code': 'en', 'voice': 'en-US-AndrewNeural'},
    'Mongolian': {'code': 'mn', 'voice': 'mn-MN-YesuiNeural'},
    'Russian': {'code': 'ru', 'voice': 'ru-RU-DmitryNeural'},
    'Kazakh': {'code': 'kk', 'voice': 'kk-KZ-AigulNeural'}
}

# Simple language detection without external libraries
def simple_detect_language(text):
    """Basic language detection using character sets"""
    if not text or len(text.strip()) < 3:
        return None
    
    # Count different character types
    cyrillic = sum(1 for c in text if '\u0400' <= c <= '\u04FF')
    latin = sum(1 for c in text if c.isalpha() and c.isascii())
    
    # Kazakh specific letters
    kazakh_letters = sum(1 for c in text.lower() if c in 'әғқңөұүһ')
    
    # Mongolian specific (Cyrillic based)
    mongolian_letters = sum(1 for c in text.lower() if c in 'өү')
    
    total_letters = cyrillic + latin
    
    if total_letters == 0:
        return None
    
    # Detect based on character patterns
    if kazakh_letters > 0:
        return 'Kazakh'
    elif mongolian_letters > 0 and cyrillic > latin:
        return 'Mongolian'
    elif cyrillic > total_letters * 0.5:
        return 'Russian'
    elif latin > total_letters * 0.5:
        return 'English'
    
    return None

async def generate_voice(text, voice):
    communicate = edge_tts.Communicate(text, voice)
    data = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            data += chunk["data"]
    return data

# Sidebar
with st.sidebar:
    st.title("Settings")
    src_lang = st.selectbox("Source Language", list(LANGUAGES.keys()), index=0)
    target_lang = st.selectbox("Target Language", list(LANGUAGES.keys()), index=1)
    st.divider()
    st.caption("Neural Engine: Edge-TTS")

# Main interface
st.title("Translator")
text_input = st.text_area("", placeholder="Enter text to translate...", height=200)

# Detect language and show suggestion
if text_input and text_input.strip():
    detected = simple_detect_language(text_input)
    
    if detected and detected != src_lang:
        st.warning(f"🔍 Detected: {detected} | You selected: {src_lang}")
        
        # Simple button to switch
        if st.button(f"Click to switch to {detected}"):
            src_lang = detected
            st.rerun()
    elif detected:
        st.success(f"✅ Language verified: {detected}")

# Process translation
if st.button("Process"):
    if text_input.strip():
        try:
            # Translate
            translated = GoogleTranslator(
                source=LANGUAGES[src_lang]['code'], 
                target=LANGUAGES[target_lang]['code']
            ).translate(text_input)
            
            # Show result
            st.markdown("---")
            st.subheader("Translation")
            st.markdown(f"**{translated}**")
            
            # Voice output
            audio_data = asyncio.run(generate_voice(
                translated, 
                LANGUAGES[target_lang]['voice']
            ))
            st.audio(audio_data, format='audio/mp3')
            
        except Exception as e:
            st.error(f"Error: {str(e)}")
    else:
        st.info("Please enter some text to translate.")
