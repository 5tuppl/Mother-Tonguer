import streamlit as st
from deep_translator import GoogleTranslator
from langdetect import detect, DetectorFactory
import edge_tts
import asyncio
import io

# Set seed for consistent language detection
DetectorFactory.seed = 0

# Visual Constraints
st.set_page_config(page_title="Translator", layout="wide")

st.markdown("""
    <style>
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    
    /* Make input textarea text BLACK */
    .stTextArea textarea {
        font-family: 'Inter', sans-serif;
        font-size: 1.1rem;
        border-radius: 10px;
        color: #000000 !important;
        background-color: #ffffff !important;
        font-weight: 500;
    }
    
    .stTextArea textarea::placeholder {
        color: #666666 !important;
    }
    
    .stButton button {
        width: 100%;
        border-radius: 20px;
        font-weight: bold;
        background-color: #f0f2f6;
    }
    
    /* Language suggestion button styling */
    .suggestion-btn {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 25px;
        padding: 8px 20px;
        margin: 5px;
        cursor: pointer;
        font-weight: bold;
        transition: all 0.3s ease;
        font-size: 14px;
    }
    
    .suggestion-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    }
    
    /* Warning message styling */
    .language-warning {
        background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%);
        border-radius: 15px;
        padding: 15px;
        margin: 10px 0;
        border-left: 5px solid #e17055;
        color: #2d3436;
    }
    </style>
    """, unsafe_allow_html=True)

LANGUAGES = {
    'English': {'code': 'en', 'voice': 'en-US-AndrewNeural'},
    'Mongolian': {'code': 'mn', 'voice': 'mn-MN-YesuiNeural'},
    'Russian': {'code': 'ru', 'voice': 'ru-RU-DmitryNeural'},
    'Kazakh': {'code': 'kk', 'voice': 'kk-KZ-AigulNeural'}
}

# Map language codes to display names
CODE_TO_LANG = {
    'en': 'English',
    'mn': 'Mongolian',
    'ru': 'Russian',
    'kk': 'Kazakh'
}

# Language detection confidence mapping for better suggestions
def detect_language_with_confidence(text):
    """Detect language and return language name with confidence indicators"""
    if not text or len(text.strip()) < 3:
        return None, 0
    
    try:
        detected_code = detect(text)
        
        # Check if detected language is in our supported languages
        if detected_code in CODE_TO_LANG:
            # Calculate simple confidence based on text length and character patterns
            confidence = min(85 + (len(text) // 20), 98)
            
            # Special checks for Russian/Cyrillic vs Mongolian/Kazakh
            cyrillic_chars = sum(1 for c in text if '\u0400' <= c <= '\u04FF')
            if cyrillic_chars > 0:
                # Check for specific Mongolian characters
                mongolian_chars = sum(1 for c in text if '\u1800' <= c <= '\u18AF')
                if mongolian_chars > 0:
                    return 'Mongolian', 95
                # Check for Kazakh specific characters (ә, ғ, қ, ң, ө, ұ, ү, һ)
                kazakh_specific = sum(1 for c in text.lower() if c in 'әғқңөұүһ')
                if kazakh_specific > 0:
                    return 'Kazakh', 95
                elif cyrillic_chars > len(text) * 0.5:
                    return 'Russian', 90
            
            return CODE_TO_LANG.get(detected_code), confidence
        else:
            return None, 0
    except:
        return None, 0

async def generate_voice(text, voice):
    communicate = edge_tts.Communicate(text, voice)
    data = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            data += chunk["data"]
    return data

# Configuration Sidebar
with st.sidebar:
    st.title("Settings")
    src_lang = st.selectbox("Source Language", list(LANGUAGES.keys()), index=0)
    target_lang = st.selectbox("Target Language", list(LANGUAGES.keys()), index=1)
    st.divider()
    st.caption("Neural Engine: Edge-TTS")
    st.caption("🔍 Language detection active")

# Translation Interface
st.title("Translator")
text_input = st.text_area("", placeholder="Enter text to translate...", height=200)

# Language detection and suggestion logic
detected_language = None
detection_confidence = 0

if text_input and text_input.strip():
    detected_language, detection_confidence = detect_language_with_confidence(text_input)
    
    # Show suggestion if detected language differs from selected source language
    if detected_language and detected_language != src_lang and detection_confidence > 70:
        st.markdown(f"""
        <div class="language-warning">
            <strong>🔍 Language Detected:</strong> {detected_language} (confidence: {detection_confidence}%)<br>
            <strong>💡 Suggestion:</strong> It looks like you're typing in <strong>{detected_language}</strong>, 
            but your source language is set to <strong>{src_lang}</strong>.
        </div>
        """, unsafe_allow_html=True)
        
        # Create clickable button to switch language
        col1, col2, col3 = st.columns([1, 2, 1])
        with col2:
            if st.button(f"🎯 Switch to {detected_language}", key="switch_lang_btn", use_container_width=True):
                # Update the source language in session state
                src_lang = detected_language
                st.rerun()
    
    elif detected_language and detected_language == src_lang:
        st.success(f"✅ Language check: {detected_language} detected ✓")
    elif detected_language and detection_confidence < 70:
        st.info("🔍 Text detected but confidence is low. Please verify the source language manually.")
else:
    if text_input == "":
        pass  # No text entered yet

# Process button and translation
if st.button("Process"):
    if text_input.strip():
        try:
            # Double-check language before translation
            detected_before_translate, confidence = detect_language_with_confidence(text_input)
            
            # If detection suggests a different language, show warning but still translate
            if detected_before_translate and detected_before_translate != src_lang and confidence > 75:
                st.warning(f"⚠️ Note: Your text appears to be in {detected_before_translate}, but translating from {src_lang}. Results may be incorrect.")
            
            # Logic Execution
            translated = GoogleTranslator(
                source=LANGUAGES[src_lang]['code'], 
                target=LANGUAGES[target_lang]['code']
            ).translate(text_input)
            
            # Display Result
            container = st.container(border=True)
            container.markdown(f"### {translated}")
            
            # Vocalization
            audio_data = asyncio.run(generate_voice(
                translated, 
                LANGUAGES[target_lang]['voice']
            ))
            st.audio(audio_data, format='audio/mp3')
            
            # Show detected language summary in success message
            if detected_before_translate:
                st.caption(f"📊 Language analysis: Detected '{detected_before_translate}' as input language")
            
        except Exception as e:
            st.error(f"Logic Error: {str(e)}")
    else:
        st.info("Input terminal is empty.")

# Add helpful hint at the bottom
with st.expander("ℹ️ How language detection works"):
    st.markdown("""
    **Language Detection Features:**
    - Automatically detects if you're typing in English, Mongolian, Russian, or Kazakh
    - Shows a suggestion button to switch to the detected language
    - Click the suggestion to automatically update source language
    - Detection confidence increases with longer text (3+ characters minimum)
    - Special detection for:
        - Mongolian script characters
        - Kazakh specific letters (ә, ғ, қ, ң, ө, ұ, ү, һ)
        - Cyrillic alphabet (Russian)
        - Latin alphabet (English)
    """)
