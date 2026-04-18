import streamlit as st
from deep_translator import GoogleTranslator
import edge_tts
import asyncio
import io

# Visual Constraints
st.set_page_config(page_title="Translator", layout="wide")

st.markdown("""
    <style>
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    .stTextArea textarea {
        font-family: 'Inter', sans-serif;
        font-size: 1.1rem;
        border-radius: 10px;
    }
    .stButton button {
        width: 100%;
        border-radius: 20px;
        font-weight: bold;
        background-color: #f0f2f6;
    }
    </style>
    """, unsafe_allow_html=True)

LANGUAGES = {
    'English': {'code': 'en', 'voice': 'en-US-AndrewNeural'},
    'Mongolian': {'code': 'mn', 'voice': 'mn-MN-YesuiNeural'},
    'Russian': {'code': 'ru', 'voice': 'ru-RU-DmitryNeural'},
    'Kazakh': {'code': 'kk', 'voice': 'kk-KZ-AigulNeural'}
}

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

# Translation Interface
st.title("Translator")
text_input = st.text_area("", placeholder="Enter text to translate...", height=200)

if st.button("Process"):
    if text_input.strip():
        try:
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
            
        except Exception as e:
            st.error(f"Logic Error: {str(e)}")
    else:
        st.info("Input terminal is empty.")
