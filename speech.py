from collections.abc import Awaitable, Callable
from typing import List, Optional

import edge_tts

from languages import Language
from translation import UnsupportedLanguageError


CustomSynthesizer = Callable[[str, Language], Awaitable[Optional[bytes]]]

_custom_synthesizers: List[CustomSynthesizer] = []


def register_custom_synthesizer(synthesizer: CustomSynthesizer) -> None:
    """Register a fine-tuned TTS hook for unsupported languages later."""
    _custom_synthesizers.append(synthesizer)


async def _synthesize_with_custom_models(text: str, language: Language) -> Optional[bytes]:
    for synthesizer in _custom_synthesizers:
        audio = await synthesizer(text, language)
        if audio:
            return audio
    return None


async def synthesize_speech(text: str, language: Language) -> bytes:
    custom_audio = await _synthesize_with_custom_models(text, language)
    if custom_audio:
        return custom_audio

    if not language.voice:
        raise UnsupportedLanguageError(
            f"No voice is configured for {language.name}. Add a custom TTS hook before enabling this language."
        )

    communicate = edge_tts.Communicate(text, language.voice)
    audio_data = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data += chunk["data"]
    return audio_data
