import streamlit as st
from deep_translator import GoogleTranslator
import edge_tts
import asyncio
import io

# Page config
st.set_page_config(page_title=" Chroma Translator", layout="wide", page_icon="🌍")

# ========== VIBRANT CUSTOM CSS ==========
st.markdown("""
    <style>
    /* Hide Streamlit branding */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    
    /* Animated gradient background */
    .stApp {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
        background-attachment: fixed;
    }
    
    /* Main container glassmorphism */
    .main > div {
        background: rgba(255,255,255,0.1);
        backdrop-filter: blur(10px);
        border-radius: 24px;
        padding: 20px;
        margin: 10px;
        border: 1px solid rgba(255,255,255,0.2);
    }
    
    /* Title styling */
    h1 {
        background: linear-gradient(135deg, #FFD6A0, #FF6B9D, #A55EFF);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent !important;
        font-size: 3.5rem !important;
        font-weight: 800 !important;
        text-align: center;
        animation: gradientShift 3s ease infinite;
    }
    
    @keyframes gradientShift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }
    
    /* Text area styling */
    .stTextArea textarea {
        background: rgba(255,255,255,0.95) !important;
        border-radius: 20px !important;
        border: 2px solid transparent !important;
        font-size: 1.1rem !important;
        transition: all 0.3s ease !important;
    }
    
    .stTextArea textarea:focus {
        border-color: #FF6B9D !important;
        box-shadow: 0 0 20px rgba(255,107,157,0.3) !important;
    }
    
    /* Button styling */
    .stButton button {
        background: linear-gradient(95deg, #EE7B30, #E05A5A, #B83B8B) !important;
        background-size: 200% auto !important;
        color: white !important;
        border-radius: 50px !important;
        padding: 12px 30px !important;
        font-weight: bold !important;
        font-size: 1.1rem !important;
        border: none !important;
        transition: all 0.3s ease !important;
        width: 100% !important;
    }
    
    .stButton button:hover {
        transform: translateY(-2px);
        background-position: right center !important;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    }
    
    /* Select box styling */
    .stSelectbox label {
        color: white !important;
        font-weight: 600 !important;
    }
    
    .stSelectbox div[data-baseweb="select"] {
        background: rgba(255,255,255,0.2) !important;
        border-radius: 40px !important;
    }
    
    /* Result container */
    .element-container:has(.stAlert) {
        background: rgba(255,255,255,0.15);
        border-radius: 20px;
        padding: 5px;
    }
    
    /* Success message styling */
    .stAlert {
        background: linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.1)) !important;
        backdrop-filter: blur(10px);
        border-radius: 20px !important;
        color: white !important;
        font-size: 1.2rem !important;
    }
    </style>
    """, unsafe_allow_html=True)

# Language configuration
LANGUAGES = {
    'English': {'code': 'en', 'voice': 'en-US-AndrewNeural', 'emoji': '🇬🇧'},
    'Mongolian': {'code': 'mn', 'voice': 'mn-MN-YesuiNeural', 'emoji': '🇲🇳'},
    'Russian': {'code': 'ru', 'voice': 'ru-RU-DmitryNeural', 'emoji': '🇷🇺'},
    'Kazakh': {'code': 'kk', 'voice': 'kk-KZ-AigulNeural', 'emoji': '🇰🇿'}
}

async def generate_voice(text, voice):
    communicate = edge_tts.Communicate(text, voice)
    data = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            data += chunk["data"]
    return data

# Sidebar with colored styling
with st.sidebar:
    st.markdown("## 🎨 **Settings Studio**")
    st.markdown("---")
    
    # Language selection with emojis
    src_lang = st.selectbox(
        "📤 **Source Language**", 
        list(LANGUAGES.keys()), 
        index=0,
        format_func=lambda x: f"{LANGUAGES[x]['emoji']} {x}"
    )
    
    target_lang = st.selectbox(
        "📥 **Target Language**", 
        list(LANGUAGES.keys()), 
        index=1,
        format_func=lambda x: f"{LANGUAGES[x]['emoji']} {x}"
    )
    
    st.markdown("---")
    st.caption("⚡ **Neural Engine** · Edge-TTS")
    st.caption("🎙️ **High quality voice synthesis**")
    st.markdown("---")
    st.markdown("### 💡 Pro tip")
    st.info("Press **Ctrl+Enter** for quick translation")

# Main interface
st.markdown("# 🌈✨ **Mother tonguer** ✨🌈")
st.markdown("<p style='text-align: center; opacity: 0.8; margin-top: -20px;'>break language barriers with vibrant AI</p>", unsafe_allow_html=True)

# Input area
text_input = st.text_area(
    "", 
    placeholder="✍️ Enter your text here... (try something magical!)", 
    height=150,
    key="input"
)

# Columns for better layout
col1, col2, col3 = st.columns([1, 2, 1])
with col2:
    process = st.button("🚀 **TRANSLATE & SPEAK** 🎧", use_container_width=True)

# Process translation
if process:
    if text_input.strip():
        with st.spinner("✨ Translating with neural magic..."):
            try:
                # Translation
                translated = GoogleTranslator(
                    source=LANGUAGES[src_lang]['code'], 
                    target=LANGUAGES[target_lang]['code']
                ).translate(text_input)
                
                # Display result with colorful container
                st.markdown("---")
                st.markdown(f"### 🎯 **Translation Result**")
                
                # Custom colored container
                st.markdown(f"""
                <div style='
                    background: linear-gradient(135deg, rgba(255,215,150,0.2), rgba(255,107,157,0.2));
                    border-radius: 20px;
                    padding: 25px;
                    margin: 10px 0;
                    border: 1px solid rgba(255,215,150,0.5);
                '>
                    <h3 style='color: #FFE2B5; margin-bottom: 15px;'>{LANGUAGES[target_lang]['emoji']} {target_lang}</h3>
                    <p style='font-size: 1.4rem; line-height: 1.5; color: black;'>{translated}</p>
                </div>
                """, unsafe_allow_html=True)
                
                # Voice generation
                with st.spinner("🎤 Generating neural voice..."):
                    audio_data = asyncio.run(generate_voice(
                        translated, 
                        LANGUAGES[target_lang]['voice']
                    ))
                    st.audio(audio_data, format='audio/mp3')
                    st.success("✅ Translation complete! Click play to hear it.")
                    
            except Exception as e:
                st.error(f"⚠️ **Error:** {str(e)}")
    else:
        st.warning("📝 **Input is empty** — please type something to translate!")
else:
    # Empty state message
    st.markdown("""
    <div style='text-align: center; padding: 40px; opacity: 0.7;'>
        <p>✨ <strong>Ready to translate</strong> — select languages, type your text, and hit the button! ✨</p>
        <p style='font-size: 0.9rem;'>🎙️ Supports voice output in all languages 🌍</p>
    </div>
    """, unsafe_allow_html=True)
