import re

def is_gibberish_or_blank(text: str) -> bool:
    # Guard: blank/empty pages — prevents ZeroDivisionError downstream
    if not text or not text.strip():
        return True
    stripped = text.strip()
    # Guard: extremely short pages cannot yield a reliable ratio
    if len(stripped) < 50:
        return True
    # Gibberish regex filter: null/control bytes, non-printable chars
    if re.search(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', stripped):
        return True
    # Alpha ratio check (math-safe: len(stripped) is >= 50 here)
    alpha_count = sum(c.isalpha() or c.isspace() for c in stripped)
    ratio = alpha_count / len(stripped)
    return ratio < 0.40
