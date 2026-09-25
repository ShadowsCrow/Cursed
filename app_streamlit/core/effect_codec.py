"""Compatibilidade para importadores antigos de efeitos.

O codec canônico vive em ``core.efeitos_codec``. Este módulo mantém o
import histórico usado pela interface atual sem duplicar a implementação.
"""

from core.efeitos_codec import (
    decode_effect,
    decode_effect_e1,
    decode_effect_e2,
    encode_effect,
    encode_effect_e1,
    encode_effect_e2,
)

__all__ = [
    "decode_effect",
    "decode_effect_e1",
    "decode_effect_e2",
    "encode_effect",
    "encode_effect_e1",
    "encode_effect_e2",
]
