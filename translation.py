from collections.abc import Awaitable, Callable
from typing import List, Optional

from googletrans import Translator

from languages import Language


class UnsupportedLanguageError(RuntimeError):
    pass


CustomTranslator = Callable[[str, Language, Language], Awaitable[Optional[str]]]

_custom_translators: List[CustomTranslator] = []


def register_custom_translator(translator: CustomTranslator) -> None:
    """Register a fine-tuned translation hook for unsupported languages later."""
    _custom_translators.append(translator)


async def _translate_with_custom_models(text: str, source: Language, target: Language) -> Optional[str]:
    for translator in _custom_translators:
        translated = await translator(text, source, target)
        if translated:
            return translated
    return None


async def _translate_with_google(text: str, source: Language, target: Language) -> str:
    if not source.google_supported or not target.google_supported:
        raise UnsupportedLanguageError(
            f"{source.name} → {target.name} is not supported by Google Translate yet. "
            "Add a custom translator hook before enabling this language pair."
        )

    async with Translator() as translator:
        result = await translator.translate(text, src=source.code, dest=target.code)
    return result.text


async def translate_text(text: str, source: Language, target: Language) -> str:
    cleaned = text.strip()
    if not cleaned:
        return ""

    custom_translation = await _translate_with_custom_models(cleaned, source, target)
    if custom_translation:
        return custom_translation

    return await _translate_with_google(cleaned, source, target)
