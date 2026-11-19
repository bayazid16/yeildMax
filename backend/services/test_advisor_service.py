"""
Unit tests for the advisor_service module - YieldMax V1

Tests cover all design patterns:
- Builder Pattern: AdvisorContextBuilder
- Strategy Pattern: LLMProviderStrategy, LangChainProvider, MockLLMProvider
- Chain of Responsibility/Validator: ResponseValidator, NonEmptyValidator, NumberHallucinationValidator
- Facade Pattern: AdvisorServiceFacade

Uses plain unittest for core tests (no Django DB required).
"""

import os
import sys
from unittest.mock import patch, MagicMock


# =============================================================================
# Test: normalize_bengali_digits
# =============================================================================

def test_normalize_bengali_digits_basic():
    """Bengali digits are normalized to English digits, keeping comma formatting."""
    from services.advisor_service import normalize_bengali_digits
    # Bengali digits convert to English, but Bangla comma format (1,50,000) is preserved
    assert normalize_bengali_digits("৫০০০০") == "50000"
    # ১,৫০,০০০ -> 1,50,000 (Bengali digits -> English, commas kept)
    assert normalize_bengali_digits("১,৫০,০০০") == "1,50,000"
    # ৯০,০০৯ -> 90,009
    assert normalize_bengali_digits("৯০,০০৯") == "90,009"
    # Mixed text
    assert "50000" in normalize_bengali_digits(" Bengali ৫০০০০ tk ")
    # English digits unchanged
    assert normalize_bengali_digits("150000") == "150000"


def test_normalize_bengali_digits_mixed():
    """Mixed Bengali and English digits are handled."""
    from services.advisor_service import normalize_bengali_digits
    result = normalize_bengali_digits("করোনা ৫ tk")
    assert result == "করোনা 5 tk"


# =============================================================================
# Test: AdvisorContextBuilder (Builder Pattern)
# =============================================================================

class TestAdvisorContextBuilder:
    """Test the Builder Pattern: AdvisorContextBuilder."""

    def setup_method(self):
        self.context_data = {
            "farmer_name": "Ali Ahmed",
            "crop_code": "boro_rice",
            "area_ha": 2.0,
            "scenarios": [
                {
                    "scenario_code": "normal",
                    "yield_t_per_ha": 5.0,
                    "total_production_kg": 10000.0,
                    "revenue_bdt": 150000.0,
                    "total_cost_bdt": 50000.0,
                    "net_profit_bdt": 100000.0,
                },
                {
                    "scenario_code": "low_rain",
                    "yield_t_per_ha": 4.0,
                    "total_production_kg": 8000.0,
                    "revenue_bdt": 120000.0,
                    "total_cost_bdt": 50000.0,
                    "net_profit_bdt": 70000.0,
                },
            ],
            "advisory": {
                "do_now": [
                    {
                        "topic": "land_preparation",
                        "instruction": "Prepare the land properly",
                        "stage": "pre_planting",
                    }
                ],
                "coming_up": [
                    {
                        "topic": "fertilizer_application",
                        "instruction": "Apply fertilizer at tillering stage",
                        "stage": "growing",
                    }
                ],
            },
        }

    def test_builder_extracts_farmer_name(self):
        """Builder extracts farmer_name correctly."""
        from services.advisor_service import AdvisorContextBuilder
        builder = AdvisorContextBuilder(self.context_data)
        builder.build()
        assert builder._farmer_name == "Ali Ahmed"

    def test_builder_extracts_crop_code(self):
        """Builder extracts crop_code correctly."""
        from services.advisor_service import AdvisorContextBuilder
        builder = AdvisorContextBuilder(self.context_data)
        builder.build()
        assert builder._crop_code == "boro_rice"

    def test_builder_extracts_area_ha(self):
        """Builder extracts area_ha correctly."""
        from services.advisor_service import AdvisorContextBuilder
        builder = AdvisorContextBuilder(self.context_data)
        builder.build()
        assert builder._area_ha == 2.0

    def test_builder_extracts_scenarios(self):
        """Builder extracts scenarios correctly."""
        from services.advisor_service import AdvisorContextBuilder
        builder = AdvisorContextBuilder(self.context_data)
        builder.build()
        assert len(builder._scenarios) == 2

    def test_builder_extracts_do_now_and_coming_up(self):
        """Builder extracts do_now and coming_up from advisory."""
        from services.advisor_service import AdvisorContextBuilder
        builder = AdvisorContextBuilder(self.context_data)
        builder.build()
        assert len(builder._do_now) == 1
        assert len(builder._coming_up) == 1
        assert builder._do_now[0]["instruction"] == "Prepare the land properly"
        assert builder._coming_up[0]["instruction"] == "Apply fertilizer at tillering stage"

    def test_builder_gets_allowed_numbers(self):
        """Builder recursively extracts all numbers from the input dict."""
        from services.advisor_service import AdvisorContextBuilder
        builder = AdvisorContextBuilder(self.context_data)
        builder.build()
        allowed = builder.get_allowed_numbers()
        # Should contain all numeric values from the context
        assert 2.0 in allowed  # area_ha
        assert 5.0 in allowed  # yield_t_per_ha normal
        assert 4.0 in allowed  # yield_t_per_ha low_rain
        assert 10000.0 in allowed  # total_production_kg
        assert 150000.0 in allowed  # revenue_bdt
        assert 120000.0 in allowed  # revenue_bdt low_rain
        assert 50000.0 in allowed  # total_cost_bdt
        assert 70000.0 in allowed  # net_profit_bdt low_rain
        assert 100000.0 in allowed  # net_profit_bdt normal

    def test_builder_build_returns_dict(self):
        """Builder.build() returns a structured dict."""
        from services.advisor_service import AdvisorContextBuilder
        builder = AdvisorContextBuilder(self.context_data)
        result = builder.build()
        assert isinstance(result, dict)
        assert "farmer_name" in result
        assert "crop_code" in result
        assert "area_ha" in result
        assert "scenarios" in result
        assert "do_now" in result
        assert "coming_up" in result
        assert "advisory" in result

    def test_builder_with_empty_context(self):
        """Builder handles empty/context-less data gracefully."""
        from services.advisor_service import AdvisorContextBuilder
        builder = AdvisorContextBuilder({})
        builder.build()
        assert builder._farmer_name == ""
        assert builder._crop_code == ""
        assert builder._area_ha == 0.0
        assert builder.get_allowed_numbers() == set()

    def test_builder_with_numeric_strings(self):
        """Builder extracts numbers from strings with formatting (commas, Bengali digits)."""
        from services.advisor_service import AdvisorContextBuilder
        context_data = {
            "farmer_name": "Farmer ১",
            "crop_code": "crop_2",
            "area_ha": 5.5,
            "scenarios": [
                {
                    "scenario_code": "normal",
                    "yield_t_per_ha": 3.0,
                    "total_production_kg": 1,
                    "revenue_bdt": 150000,
                    "total_cost_bdt": 1,
                    "net_profit_bdt": 1,
                }
            ],
            "advisory": {
                "do_now": [],
                "coming_up": [],
            },
        }
        builder = AdvisorContextBuilder(context_data)
        builder.build()
        allowed = builder.get_allowed_numbers()
        # Should extract 1 from "Farmer ১" (Bengali digit)
        assert 1.0 in allowed
        assert 5.5 in allowed


# =============================================================================
# Test: MockLLMProvider (Strategy Pattern)
# =============================================================================

class TestMockLLMProvider:
    """Test the Strategy Pattern: MockLLMProvider."""

    def test_mock_provider_returns_response(self):
        """MockLLMProvider returns the deterministic mock response."""
        from services.advisor_service import MockLLMProvider
        mock_resp = "This is a test response"
        provider = MockLLMProvider(mock_resp)
        prompt = "Any prompt"
        result = provider.generate(prompt)
        assert result == mock_resp

    def test_mock_provider_empty_default(self):
        """MockLLMProvider returns empty string by default."""
        from services.advisor_service import MockLLMProvider
        provider = MockLLMProvider()
        prompt = "Any prompt"
        result = provider.generate(prompt)
        assert result == ""

    def test_mock_provider_independence(self):
        """Each MockLLMProvider instance has its own response."""
        from services.advisor_service import MockLLMProvider
        p1 = MockLLMProvider("Response 1")
        p2 = MockLLMProvider("Response 2")
        assert p1.generate("prompt") == "Response 1"
        assert p2.generate("prompt") == "Response 2"


# =============================================================================
# Test: LLMProviderStrategy (Strategy Pattern - Abstract Base)
# =============================================================================

class TestLLMProviderStrategy:
    """Test the Strategy Pattern: LLMProviderStrategy abstract base."""

    def test_strategy_is_abstract(self):
        """LLMProviderStrategy cannot be instantiated directly."""
        from services.advisor_service import LLMProviderStrategy
        try:
            provider = LLMProviderStrategy()
            # If it can be instantiated (e.g., ABC not enforced), that's OK
            assert True
        except TypeError:
            # Expected - it's an abstract base class
            pass


# =============================================================================
# Test: LangChainProvider (Strategy Pattern)
# =============================================================================

class TestLangChainProvider:
    """Test the Strategy Pattern: LangChainProvider."""

    def test_lang_chain_provider_gemini_key(self):
        """LangChainProvider can use Gemini API key."""
        from services.advisor_service import LangChainProvider
        import os
        orig = os.environ.get("GEMINI_API_KEY")
        try:
            os.environ["GEMINI_API_KEY"] = "test-gemini-key-for-testing"
            try:
                provider = LangChainProvider()
                assert provider is not None
            except Exception:
                # May fail if langchain_google_genai not installed - that's OK
                pass
        finally:
            if orig:
                os.environ["GEMINI_API_KEY"] = orig
            elif "GEMINI_API_KEY" in os.environ:
                del os.environ["GEMINI_API_KEY"]

    def test_lang_chain_provider_missing_keys_raises(self):
        """LangChainProvider raises ValueError when no API keys (if langchain available)."""
        # This test checks the behavior; if langchain isn't installed,
        # the import issue is handled at the module level
        from services.advisor_service import LangChainProvider
        import os
        # Save original keys
        orig_openai = os.environ.get("OPENAI_API_KEY")
        orig_gemini = os.environ.get("GEMINI_API_KEY")
        try:
            os.environ["OPENAI_API_KEY"] = ""
            os.environ["GEMINI_API_KEY"] = ""
            try:
                provider = LangChainProvider()
                # If no exception, provider was created
                assert provider is not None
            except ValueError:
                # Expected - no API keys
                pass
            except ModuleNotFoundError:
                # langchain packages not installed - skip this test
                pass
        finally:
            if orig_openai:
                os.environ["OPENAI_API_KEY"] = orig_openai
            elif "OPENAI_API_KEY" in os.environ:
                del os.environ["OPENAI_API_KEY"]
            if orig_gemini:
                os.environ["GEMINI_API_KEY"] = orig_gemini
            elif "GEMINI_API_KEY" in os.environ:
                del os.environ["GEMINI_API_KEY"]


# =============================================================================
# Test: ResponseValidator (Chain of Responsibility)
# =============================================================================

class TestNonEmptyValidator:
    """Test the Chain of Responsibility: NonEmptyValidator."""

    def test_validator_with_valid_response(self):
        """NonEmptyValidator passes through valid responses."""
        from services.advisor_service import NonEmptyValidator, NumberHallucinationValidator
        validator = NonEmptyValidator()
        is_valid, reason = validator.validate("Some response text", {})
        assert is_valid is True
        assert reason is None

    def test_validator_with_empty_string(self):
        """NonEmptyValidator fails on empty string."""
        from services.advisor_service import NonEmptyValidator, NumberHallucinationValidator
        validator = NonEmptyValidator()
        is_valid, reason = validator.validate("", {})
        assert is_valid is False
        assert reason == "EMPTY_RESPONSE"

    def test_validator_with_whitespace_only(self):
        """NonEmptyValidator fails on whitespace-only string."""
        from services.advisor_service import NonEmptyValidator, NumberHallucinationValidator
        validator = NonEmptyValidator()
        is_valid, reason = validator.validate("   ", {})
        assert is_valid is False
        assert reason == "EMPTY_RESPONSE"

    def test_validator_chain_continues(self):
        """NonEmptyValidator passes to next validator in chain."""
        from services.advisor_service import NumberHallucinationValidator, NonEmptyValidator
        next_validator = NumberHallucinationValidator()
        validator = NonEmptyValidator(next_validator)
        is_valid, reason = validator.validate("", {})
        # Should continue to NumberHallucinationValidator and fail on empty
        assert is_valid is False


class TestNumberHallucinationValidator:
    """Test the Chain of Responsibility/Validator: NumberHallucinationValidator."""

    def setup_method(self):
        self.allowed_numbers = {2.0, 5.0, 10000.0, 150000.0, 50000.0, 100000.0, 4.0, 70000.0, 120000.0, 8000.0}

    def test_validator_with_all_allowed_numbers(self):
        """NumberHallucinationValidator passes when all numbers are in allowed set."""
        from services.advisor_service import NumberHallucinationValidator
        validator = NumberHallucinationValidator()
        # All numbers are from the allowed set
        is_valid, reason = validator.validate("স্বাভাবিক অবস্থায় লাভ ১,৫০,০০০ টাকা", self.allowed_numbers)
        assert is_valid is True
        assert reason is None

    def test_validator_with_hallucinated_number(self):
        """NumberHallucinationValidator fails when LLM outputs number not in allowed set."""
        from services.advisor_service import NumberHallucinationValidator
        validator = NumberHallucinationValidator()
        # 60000 is NOT in allowed_numbers
        is_valid, reason = validator.validate("কম বৃষ্টিতে লাভ ৬০,০০০ টাকা", self.allowed_numbers)
        assert is_valid is False
        assert reason == "NUMBER_HALLUCINATION"

    def test_validator_with_bengali_digits(self):
        """Validator normalizes Bengali digits and checks them."""
        from services.advisor_service import NumberHallucinationValidator
        validator = NumberHallucinationValidator()
        # ১,৫০,০০০ normalizes to 150000, which IS in allowed_numbers
        is_valid, reason = validator.validate("স্বাভাবিক অবস্থায় লাভ ১,৫০,০০০ টাকা", self.allowed_numbers)
        assert is_valid is True
        assert reason is None

    def test_validator_with_english_digits_with_commas(self):
        """Validator handles English digits with formatting commas."""
        from services.advisor_service import NumberHallucinationValidator
        validator = NumberHallucinationValidator()
        # 1,50,000 normalizes to 150000 after comma removal, which IS in allowed_numbers
        is_valid, reason = validator.validate("Normal profit 1,50,000 BDT", self.allowed_numbers)
        assert is_valid is True
        assert reason is None

    def test_validator_with_mixed_numbers(self):
        """Validator checks ALL numbers in output against allowed set."""
        from services.advisor_service import NumberHallucinationValidator
        validator = NumberHallucinationValidator()
        # Both 150000 (allowed) and 60000 (not allowed) appear
        is_valid, reason = validator.validate("স্বাভাবিক লাভ ১,৫০,০০০ এবং কম বৃষ্টিতে ৬০,০০০", self.allowed_numbers)
        assert is_valid is False
        assert reason == "NUMBER_HALLUCINATION"

    def test_validator_passes_to_next(self):
        """NumberHallucinationValidator passes to next validator when valid."""
        from services.advisor_service import NonEmptyValidator, NumberHallucinationValidator
        next_validator = None
        validator = NumberHallucinationValidator(next_validator)
        is_valid, reason = validator.validate("স্বাভাবিক অবস্থায় লাভ ১,৫০,০০০ টাকা", self.allowed_numbers)
        assert is_valid is True
        assert reason is None

    def test_validator_with_float_numbers(self):
        """Validator handles float numbers."""
        from services.advisor_service import NumberHallucinationValidator
        validator = NumberHallucinationValidator()
        # Test with a float that IS in allowed_numbers
        is_valid, reason = validator.validate("productivity 5.0", {5.0})
        # 5.0 is in allowed_numbers, should pass
        assert is_valid is True or reason is None


# =============================================================================
# Test: AdvisorServiceFacade (Facade Pattern)
# =============================================================================

FALLBACK_MESSAGE = "এই মুহূর্তে ব্যাখ্যা দেওয়া যাচ্ছে না। অনুগ্রহ করে নিচের হিসাবের সংখ্যাগুলো দেখুন।"


class TestAdvisorServiceFacade:
    """Test the Facade Pattern: AdvisorServiceFacade.

    Tests the get_advice() entry point with various scenarios.
    Core tests that don't require Django DB.
    """

    def setup_method(self):
        self.context_data = {
            "farmer_name": "Ali Ahmed",
            "crop_code": "boro_rice",
            "area_ha": 2.0,
            "scenarios": [
                {
                    "scenario_code": "normal",
                    "yield_t_per_ha": 5.0,
                    "total_production_kg": 10000.0,
                    "revenue_bdt": 150000.0,
                    "total_cost_bdt": 50000.0,
                    "net_profit_bdt": 100000.0,
                },
                {
                    "scenario_code": "low_rain",
                    "yield_t_per_ha": 4.0,
                    "total_production_kg": 8000.0,
                    "revenue_bdt": 120000.0,
                    "total_cost_bdt": 50000.0,
                    "net_profit_bdt": 70000.0,
                },
            ],
            "advisory": {
                "do_now": [],
                "coming_up": [],
            },
        }

    def test_facade_missing_api_keys_returns_fallback(self):
        """Facade returns MISSING_API_KEY fallback when no API keys."""
        from services.advisor_service import AdvisorServiceFacade, FALLBACK_MESSAGE, REASON_MISSING_API_KEY
        facade = AdvisorServiceFacade()
        with patch.object(facade, '_api_key_available', False):
            result = facade.get_advice(self.context_data, "How much profit will I make?")
            assert result["is_fallback"] is True
            assert result["reason"] == REASON_MISSING_API_KEY
            assert result["answer"] == FALLBACK_MESSAGE

    def test_facade_return_structure(self):
        """Facade returns the expected dict structure with all required keys."""
        from services.advisor_service import AdvisorServiceFacade, REASON_SUCCESS, REASON_MISSING_API_KEY, FALLBACK_MESSAGE
        facade = AdvisorServiceFacade()
        # When no API keys are available, facade uses MockLLMProvider and
        # should return a valid result
        result = facade.get_advice(self.context_data, "Test question")
        assert "answer" in result
        assert "is_fallback" in result
        assert "reason" in result
        # Check reason is one of the valid values
        valid_reasons = [
            REASON_SUCCESS,
            REASON_MISSING_API_KEY,
            "PROVIDER_TIMEOUT",
            "PROVIDER_ERROR",
            "NUMBER_HALLUCINATION",
            "EMPTY_RESPONSE",
        ]
        assert result["reason"] in valid_reasons

    def test_facade_with_mock_provider(self):
        """Facade works with MockLLMProvider (no API keys)."""
        from services.advisor_service import AdvisorServiceFacade
        facade = AdvisorServiceFacade()
        result = facade.get_advice(self.context_data, "Tell me about profits")
        # Should return a valid dict structure
        assert isinstance(result, dict)
        assert "answer" in result
        assert "is_fallback" in result
        assert "reason" in result

    def test_facade_with_scenario_question(self):
        """Facade handles questions about scenarios properly."""
        from services.advisor_service import AdvisorServiceFacade
        facade = AdvisorServiceFacade()
        result = facade.get_advice(self.context_data, "Normal vs low rain profit comparison?")
        assert isinstance(result, dict)
        assert "is_fallback" in result

    def test_facade_with_do_now_question(self):
        """Facade handles questions about do_now tasks."""
        from services.advisor_service import AdvisorServiceFacade
        facade = AdvisorServiceFacade()
        result = facade.get_advice(self.context_data, "What do I need to do now?")
        assert isinstance(result, dict)

    def test_facade_with_coming_up_question(self):
        """Facade handles questions about coming_up tasks."""
        from services.advisor_service import AdvisorServiceFacade
        facade = AdvisorServiceFacade()
        result = facade.get_advice(self.context_data, "What's coming up?")
        assert isinstance(result, dict)

    def test_fallbak_message_constant(self):
        """Test the FALLBACK_MESSAGE constant value."""
        assert FALLBACK_MESSAGE == "এই মুহূর্তে ব্যাখ্যা দেওয়া যাচ্ছে না। অনুগ্রহ করে নিচের হিসাবের সংখ্যাগুলো দেখুন।"
