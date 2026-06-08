from dataclasses import dataclass
from typing import Dict, List, Optional


@dataclass(frozen=True)
class Language:
    name: str
    code: str
    voice: str
    google_supported: bool = True
    custom_translation_model: Optional[str] = None
    custom_tts_model: Optional[str] = None


LANGUAGES: Dict[str, Language] = {
    "English": Language("English", "en", "en-US-AndrewNeural"),
    "Mongolian": Language("Mongolian", "mn", "mn-MN-YesuiNeural"),
    "Russian": Language("Russian", "ru", "ru-RU-DmitryNeural"),
    "Kazakh": Language("Kazakh", "kk", "kk-KZ-AigulNeural"),
}

FLAGS = {
    "English": "🇬🇧",
    "Mongolian": "🇲🇳",
    "Russian": "🇷🇺",
    "Kazakh": "🇰🇿",
}

# Future extension point: add unsupported languages here only after a custom
# translation/TTS model exists for them.
RARE_LANGUAGE_ROADMAP: Dict[str, Language] = {
    "Sakha": Language("Sakha", "sah", "", google_supported=False, custom_translation_model="planned"),
    "Tuvan": Language("Tuvan", "tyv", "", google_supported=False, custom_translation_model="planned"),
    "Buryat": Language("Buryat", "bua", "", google_supported=False, custom_translation_model="planned"),
}


def language_names() -> List[str]:
    return list(LANGUAGES.keys())
