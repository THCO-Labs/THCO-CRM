"""Unit tests for CV name extraction.

These exercise the pure functions in `services.cv_parser` with the real
filenames and text layouts observed in the THCO corpus. No database or server
is required.
"""

from services.cv_parser import (
    _name_from_email,
    _looks_like_name,
    extract_name,
    name_from_filename,
)


# ---------------------------------------------------------------------------
# _looks_like_name
# ---------------------------------------------------------------------------

def test_looks_like_name_accepts_plain_name():
    assert _looks_like_name("John Smith") is True


def test_looks_like_name_accepts_accented_name():
    assert _looks_like_name("RAPHAEL GONÇALVES DE CARVALHO") is True


def test_looks_like_name_accepts_hyphen_and_apostrophe():
    assert _looks_like_name("Val-Okenyi Ugochukwu") is True
    assert _looks_like_name("Abdel-Salam El Refaay") is True


def test_looks_like_name_rejects_section_heading():
    assert _looks_like_name("Professional Summary") is False
    assert _looks_like_name("Work Experience") is False


def test_looks_like_name_rejects_contact_line():
    assert _looks_like_name("John Smith email@x.com") is False
    assert _looks_like_name("John Smith 08012345678") is False


# ---------------------------------------------------------------------------
# _name_from_email
# ---------------------------------------------------------------------------

def test_name_from_email_split_on_separator():
    assert _name_from_email("mandong.lawrence@gmail.com") == "Mandong Lawrence"


def test_name_from_email_split_on_camel_case():
    assert _name_from_email("JohnSmith@gmail.com") == "John Smith"


def test_name_from_email_returns_none_for_single_token():
    assert _name_from_email("olukayodealuko@gmail.com") is None


# ---------------------------------------------------------------------------
# extract_name
# ---------------------------------------------------------------------------

def test_extract_name_from_plain_header():
    text = "John Smith\nSoftware Engineer\nLagos, Nigeria"
    assert extract_name(text, "john.smith@gmail.com") == "John Smith"


def test_extract_name_from_accented_header():
    text = "RAPHAEL GONÇALVES DE CARVALHO\nBrazilian"
    assert extract_name(text, "raphaelgoncar@hotmail.com") == "RAPHAEL GONÇALVES DE CARVALHO"


def test_extract_name_recovers_name_before_email_on_same_line():
    text = "Mohammed Nizamuddin emailnizam@gmail.com\n+919963056766"
    assert extract_name(text, "emailnizam@gmail.com") == "Mohammed Nizamuddin"


def test_extract_name_reorders_surname_first_name():
    text = "ANABA, SYLVESTER ANANI (PhD, FCS)\nLagos"
    assert extract_name(text, "sylvesteranaba@yahoo.com") == "SYLVESTER ANANI ANABA"


def test_extract_name_drops_trailing_title_from_reversed_name():
    text = "Anifowoshe, Oluwashina Tajudeen, Mechanical Engineer\nLagos"
    assert extract_name(text, "anifowosheayomikun@gmail.com") == "Oluwashina Tajudeen Anifowoshe"


def test_extract_name_reads_contact_header():
    text = "Contact Ololade Idowu\nidowuololade23@gmail.com\nLagos"
    assert extract_name(text, "idowuololade23@gmail.com") == "Ololade Idowu"


def test_extract_name_contact_header_rejects_non_name():
    text = "Contact user devices.\nSome CV"
    assert extract_name(text, "x@y.com") is None


def test_extract_name_contact_header_trims_credential_suffix():
    text = "Contact Joy Felix CCPA\nLagos"
    assert extract_name(text, "joyfelix@gmail.com") == "Joy Felix"


# ---------------------------------------------------------------------------
# name_from_filename
# ---------------------------------------------------------------------------

def test_name_from_filename_underscore_id_suffix():
    assert name_from_filename("Torisheju_Ogbe_1146584002.pdf") == "Torisheju Ogbe"


def test_name_from_filename_strips_cv_and_parentheses():
    assert name_from_filename("AZUKA OBIM CV.docx.pdf") == "AZUKA OBIM"
    assert name_from_filename("Favour Emmanuel CV (1).pdf") == "Favour Emmanuel"


def test_name_from_filename_splits_run_together_and_drops_credentials():
    assert name_from_filename("MohammedEnamul_Hoque_1146583994.pdf") == "Mohammed Enamul Hoque"
    assert name_from_filename("Mital_ManojSHRM-CP_1146584002.pdf") == "Mital Manoj"


def test_name_from_filename_strips_trailing_noise():
    assert name_from_filename("Rufus Adenipekun Resume July 2023.pdf") == "Rufus Adenipekun"
    assert name_from_filename("Resume of Okechukwu Gabriel Okereke, May 10, 2023.pdf") == "Okechukwu Gabriel Okereke May"


def test_name_from_filename_keeps_single_letter_initial():
    assert name_from_filename("Sam_M._1120335842.pdf") == "Sam M"
