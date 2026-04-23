import streamlit as st
from deep_translator import GoogleTranslator
import edge_tts
import asyncio
import io
import re

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
        transition: all 0.3s ease;
    }
    
    .stButton button:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
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
    
    /* Success message styling */
    .language-success {
        background: linear-gradient(135deg, #a8e6cf 0%, #3b82f6 100%);
        border-radius: 15px;
        padding: 12px;
        margin: 10px 0;
        border-left: 5px solid #10b981;
        color: #ffffff;
        font-weight: 500;
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
    'kk': 'Kazakh',
    'ru': 'Russian'
}

def detect_language_custom(text):
    """
    Custom language detection without external libraries
    Returns detected language and confidence score
    """
    if not text or len(text.strip()) < 3:
        return None, 0
    
    text_lower = text.lower()
    text_len = len(text)
    
    # Character sets for different languages
    cyrillic_chars = set('абвгдеёжзийклмнопрстуфхцчшщъыьэюя')
    mongolian_cyrillic_extras = set('өү')  # Mongolian-specific Cyrillic
    kazakh_specific = set('әғқңөұүһ')  # Kazakh-specific letters
    latin_chars = set('abcdefghijklmnopqrstuvwxyz')
    
    # Count character types
    cyrillic_count = sum(1 for c in text_lower if c in cyrillic_chars)
    kazakh_count = sum(1 for c in text_lower if c in kazakh_specific)
    mongolian_count = sum(1 for c in text_lower if c in mongolian_cyrillic_extras)
    latin_count = sum(1 for c in text_lower if c in latin_chars)
    
    # Common words for each language (for better detection)
    english_words = ['the', 'and', 'to', 'of', 'a', 'in', 'is', 'it', 'you', 'that', 'he', 'was', 'for', 'on', 'are', 'with']
    russian_words = ['и', 'в', 'не', 'на', 'я', 'что', 'с', 'а', 'по', 'к', 'у', 'но', 'от', 'за', 'так', 'же']
    kazakh_words = ['және', 'бен', 'мен', 'де', 'да', 'ол', 'осы', 'анау', 'мынау', 'бар', 'жоқ']
    mongolian_words = ['болон', 'ба', 'нь', 'ийг', 'дээр', 'руу', 'д', 'т', 'хамт', 'бүх']
    
    word_list = text_lower.split()
    word_matches = {
        'English': sum(1 for word in word_list if word in english_words),
        'Russian': sum(1 for word in word_list if word in russian_words),
        'Kazakh': sum(1 for word in word_list if word in kazakh_words),
        'Mongolian': sum(1 for word in word_list if word in mongolian_words)
    }
    
    # Calculate scores for each language
    scores = {}
    
    # English score
    if latin_count > text_len * 0.5:
        scores['English'] = 70 + min(word_matches['English'] * 5, 25)
    else:
        scores['English'] = word_matches['English'] * 8
    
    # Russian score (Cyrillic but not Kazakh/Mongolian specific)
    if cyrillic_count > text_len * 0.3 and kazakh_count == 0 and mongolian_count == 0:
        scores['Russian'] = 75 + min(word_matches['Russian'] * 5, 20)
    elif cyrillic_count > text_len * 0.3:
        scores['Russian'] = 50 + word_matches['Russian'] * 5
    
    # Kazakh score
    if kazakh_count > 0:
        scores['Kazakh'] = 80 + min(kazakh_count * 10, 20)
        if word_matches['Kazakh'] > 0:
            scores['Kazakh'] += word_matches['Kazakh'] * 5
    elif cyrillic_count > text_len * 0.3:
        scores['Kazakh'] = 30 + word_matches['Kazakh'] * 8
    
    # Mongolian score
    if mongolian_count > 0:
        scores['Mongolian'] = 80 + min(mongolian_count * 10, 20)
        if word_matches['Mongolian'] > 0:
            scores['Mongolian'] += word_matches['Mongolian'] * 5
    elif cyrillic_count > text_len * 0.3:
        scores['Mongolian'] = 30 + word_matches['Mongolian'] * 8
    
    # Special detection for Latin text that might be English
    if latin_count > text_len * 0.7:
        scores['English'] = max(scores.get('English', 0), 85)
    
    # Get the language with highest score
    if scores:
        detected = max(scores, key=scores.get)
        confidence = min(scores[detected], 95)
        
        # Additional confidence boost for clear matches
        if detected == 'Kazakh' and kazakh_count > 1:
            confidence = min(confidence + 10, 98)
        if detected == 'Mongolian' and mongolian_count > 1:
            confidence = min(confidence + 10, 98)
        if detected == 'Russian' and cyrillic_count > text_len * 0.5 and kazakh_count == 0 and mongolian_count == 0:
            confidence = min(confidence + 10, 98)
        if detected == 'English' and latin_count > text_len * 0.8:
            confidence = min(confidence + 10, 98)
            
        return detected, confidence
    
    return None, 0

async def generate_voice(text, voice):
    communicate = edge_tts.Communicate(text, voice)
    data = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            data += chunk["data"]
    return data

# Initialize session state for language switching
if 'src_lang' not in st.session_state:
    st.session_state.src_lang = 'English'
if 'target_lang' not in st.session_state:
    st.session_state.target_lang = 'Mongolian'

# Configuration Sidebar
with st.sidebar:
    st.title("⚙️ Settings")
    
    # Use session state to maintain language selection
    src_lang = st.selectbox(
        "📤 Source Language", 
        list(LANGUAGES.keys()), 
        index=list(LANGUAGES.keys()).index(st.session_state.src_lang),
        key="src_lang_select"
    )
    
    target_lang = st.selectbox(
        "📥 Target Language", 
        list(LANGUAGES.keys()), 
        index=list(LANGUAGES.keys()).index(st.session_state.target_lang),
        key="tgt_lang_select"
    )
    
    # Update session state
    st.session_state.src_lang = src_lang
    st.session_state.target_lang = target_lang
    
    st.divider()
    st.caption("🎙️ Neural Engine: Edge-TTS")
    st.caption("🔍 Smart language detection (no external APIs)")

# Translation Interface
st.title("🌐 Smart Translator")
text_input = st.text_area("", placeholder="✍️ Start typing in any language... I'll detect it!", height=200)

# Language detection and suggestion logic
detected_language = None
detection_confidence = 0

if text_input and text_input.strip():
    detected_language, detection_confidence = detect_language_custom(text_input)
    
    # Show suggestion if detected language differs from selected source language
    if detected_language and detected_language != src_lang and detection_confidence > 60:
        st.markdown(f"""
        <div class="language-warning">
            <strong>🔍 Language Detected:</strong> {detected_language} (confidence: {detection_confidence}%)<br>
            <strong>💡 Suggestion:</strong> Your text appears to be in <strong>{detected_language}</strong>, 
            but source language is set to <strong>{src_lang}</strong>.
        </div>
        """, unsafe_allow_html=True)
        
        # Create clickable button to switch language
        col1, col2, col3 = st.columns([1, 2, 1])
        with col2:
            if st.button(f"🎯 Click here to switch to {detected_language}", key="switch_lang_btn", use_container_width=True):
                st.session_state.src_lang = detected_language
                st.rerun()
    
    elif detected_language and detected_language == src_lang and detection_confidence > 60:
        st.markdown(f"""
        <div class="language-success">
            ✅ <strong>Language verified:</strong> {detected_language} detected correctly! (confidence: {detection_confidence}%)
        </div>
        """, unsafe_allow_html=True)
    
    elif detection_confidence < 50:
        st.info("🔍 Text detected but confidence is low. Please verify the source language manually if translation seems off.")
else:
    if text_input == "":
        pass  # No text entered yet

# Process button and translation
col1, col2, col3 = st.columns([1, 2, 1])
with col2:
    process_button = st.button("🚀 Process Translation", use_container_width=True)

if process_button:
    if text_input.strip():
        try:
            # Double-check language before translation
            detected_before_translate, confidence = detect_language_custom(text_input)
            
            # Show translation info
            with st.spinner("🔄 Translating..."):
                # Logic Execution
                translated = GoogleTranslator(
                    source=LANGUAGES[src_lang]['code'], 
                    target=LANGUAGES[target_lang]['code']
                ).translate(text_input)
            
            # Display Result
            st.markdown("---")
            st.markdown("### 📝 Translation Result")
            container = st.container(border=True)
            container.markdown(f"### {translated}")
            
            # Vocalization
            with st.spinner("🎵 Generating voice..."):
                audio_data = asyncio.run(generate_voice(
                    translated, 
                    LANGUAGES[target_lang]['voice']
                ))
                st.audio(audio_data, format='audio/mp3')
                st.success("✅ Translation complete! Click play to listen.")
            
            # Show detected language summary
            if detected_before_translate and confidence > 50:
                st.caption(f"📊 Language analysis: Detected '{detected_before_translate}' as input language (confidence: {confidence}%)")
            elif detected_before_translate:
                st.caption(f"📊 Language analysis: Possibly '{detected_before_translate}' (low confidence: {confidence}%)")
            
        except Exception as e:
            st.error(f"⚠️ Translation Error: {str(e)}")
    else:
        st.warning("📝 Input is empty. Please type some text to translate!")

# Add helpful information in expander
with st.expander("ℹ️ How language detection works (No external libraries)"):
    st.markdown("""
    **Smart Language Detection Features:**
    
    - ✅ **Zero external dependencies** - Works without langdetect or other libraries
    - ✅ **Detects:** English, Mongolian, Russian, and Kazakh
    - ✅ **Character-based analysis** - Identifies Cyrillic, Latin, and special characters
    - ✅ **Word pattern matching** - Recognizes common words in each language
    - ✅ **Special character detection** for:
        - **Kazakh**: ә, ғ, қ, ң, ө, ұ, ү, һ
        - **Mongolian**: ө, ү (Cyrillic variants)
        - **Russian**: Standard Cyrillic alphabet
        - **English**: Latin alphabet
    
    **How it works:**
    1. Analyzes character sets in your text
    2. Counts language-specific letters
    3. Looks for common words in each language
    4. Calculates confidence scores
    5. Suggests language switch when mismatch detected
    
    **Click the suggestion button** to automatically update the source language!
    """)

# Clear session state button (optional)
if st.button("🔄 Reset to Default Settings"):
    st.session_state.src_lang = 'English'
    st.session_state.target_lang = 'Mongolian'
    st.rerun()
