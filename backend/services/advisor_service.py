"""
Advisor Service Module - YieldMax V1
Implements Bengali Farm Advisor using LangChain with SOLID principles and GoF design patterns.

Patterns implemented:
- Facade Pattern: AdvisorServiceFacade
- Strategy Pattern: LLMProviderStrategy, LangChainProvider, MockLLMProvider
- Chain of Responsibility/Validator: ResponseValidator, NonEmptyValidator, NumberHallucinationValidator
- Builder Pattern: AdvisorContextBuilder

Golden Rule: Python calculates; LLM ONLY explains. LLM must NEVER calculate, add, subtract,
or invent any numbers (yield, revenue, cost, profit, days, or area).
"""

import os
import re
from abc import ABC, abstractmethod
from typing import Dict, Any, Set, Optional, Tuple, List

try:
    from langchain_core.prompts import ChatPromptTemplate
except ImportError:
    try:
        from langchain.prompts import ChatPromptTemplate
    except ImportError:
        ChatPromptTemplate = None  # type: ignore[assignment,misc]

# Constants
FALLBACK_MESSAGE = "এই মুহূর্তে ব্যাখ্যা দেওয়া যাচ্ছে না। অনুগ্রহ করে নিচের হিসাবের সংখ্যাগুলো দেখুন।"
DEFAULT_LLM_TIMEOUT_SECONDS = 30
DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite"  # Fast, current Gemini model for Gemini Developer API
DEFAULT_OPENAI_MODEL = "gpt-3.5-turbo"

SYSTEM_PROMPT = (
    "You are a Bengali farm advisor. Explain the farm results and agricultural "
    "tasks to farmers in Bengali. Never calculate, add, subtract, or invent any "
    "numbers. Always use only the numbers provided in the context. Respond in "
    "Bengali language."
)

# Reason constants for the return dict
REASON_SUCCESS = "SUCCESS"
REASON_MISSING_API_KEY = "MISSING_API_KEY"
REASON_PROVIDER_TIMEOUT = "PROVIDER_TIMEOUT"
REASON_PROVIDER_ERROR = "PROVIDER_ERROR"
REASON_PROVIDER_INIT_ERROR = "PROVIDER_INIT_ERROR"
REASON_NUMBER_HALLUCINATION = "NUMBER_HALLUCINATION"
REASON_EMPTY_RESPONSE = "EMPTY_RESPONSE"


def _get_timeout_seconds() -> int:
    """Read the LLM timeout from the environment with a safe default."""
    try:
        return max(1, int(os.environ.get("LLM_TIMEOUT_SECONDS", DEFAULT_LLM_TIMEOUT_SECONDS)))
    except (TypeError, ValueError):
        return DEFAULT_LLM_TIMEOUT_SECONDS


def normalize_bengali_digits(text: str) -> str:
    """Normalize Bengali digits (০-৯) to English (0-9)."""
    bengali_to_english = {
        '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
        '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
    }
    result = text
    for bengali_digit, english_digit in bengali_to_english.items():
        result = result.replace(bengali_digit, english_digit)
    return result


# --- Builder Pattern: AdvisorContextBuilder ---

class AdvisorContextBuilder:
    """Builder Pattern: Safely extracts, validates, and formats the raw backend dictionary
    (farmer_name, crop_code, area_ha, scenarios, advisory with do_now and coming_up)
    into a structured prompt context AND builds the set of allowed_numbers
    (recursively extracting all ints/floats from the input dict)."""

    def __init__(self, context_data: dict):
        self._context_data = context_data or {}
        self._farmer_name: str = self._context_data.get("farmer_name", "")
        self._crop_code: str = self._context_data.get("crop_code", "")
        self._area_ha: float = float(self._context_data.get("area_ha", 0) or 0)
        self._scenarios: List[dict] = self._context_data.get("scenarios", []) or []
        advisory = self._context_data.get("advisory", {})
        self._advisory: dict = advisory if isinstance(advisory, dict) else {}
        do_now = advisory.get("do_now") if isinstance(advisory, dict) else None
        coming_up = advisory.get("coming_up") if isinstance(advisory, dict) else None
        self._do_now: List[dict] = do_now if isinstance(do_now, list) else []
        self._coming_up: List[dict] = coming_up if isinstance(coming_up, list) else []
        self._allowed_numbers: Set[float] = set()

    def build(self) -> dict:
        """Build and return the structured context dict."""
        self._build_allowed_numbers()
        return {
            "farmer_name": self._farmer_name,
            "crop_code": self._crop_code,
            "area_ha": self._area_ha,
            "scenarios": self._scenarios,
            "do_now": self._do_now,
            "coming_up": self._coming_up,
            "advisory": self._advisory,
        }

    def get_allowed_numbers(self) -> Set[float]:
        """Return the set of allowed numbers extracted from the input dict."""
        return self._allowed_numbers

    def _build_allowed_numbers(self):
        """Recursively extract all ints/floats from the input dict."""
        self._allowed_numbers = set()
        self._recursive_extract(self._context_data)

    def _recursive_extract(self, obj):
        """Recursively extract all numeric values from the dict/lists."""
        if isinstance(obj, dict):
            for key, value in obj.items():
                self._recursive_extract(value)
        elif isinstance(obj, list):
            for item in obj:
                self._recursive_extract(item)
        elif isinstance(obj, (int, float)):
            self._allowed_numbers.add(float(obj))
        elif isinstance(obj, str):
            # Try to extract numbers from string (handles 1,50,000 format)
            normalized = normalize_bengali_digits(obj)
            # Find numbers with optional commas
            numbers = re.findall(r'-?\d+[\d,]*(?:\.\d+)?', normalized)
            for num_str in numbers:
                num_clean = num_str.replace(',', '')
                try:
                    self._allowed_numbers.add(float(num_clean))
                except ValueError:
                    pass


# --- Strategy Pattern: LLMProviderStrategy ---

class LLMProviderStrategy(ABC):
    """Abstract base class for LLM execution."""

    @abstractmethod
    def generate(self, prompt: str, timeout: int = 30) -> str:
        """Generate a response from the LLM given a prompt.

        Args:
            prompt: The prompt to send to the LLM
            timeout: Maximum time in seconds before timing out

        Returns:
            The LLM's response text
        """
        pass


class LangChainProvider(LLMProviderStrategy):
    """Uses LangChain ChatPromptTemplate with configurable LLM (OpenAI / Gemini via env vars)
    and strict timeout handling."""

    def __init__(self):
        self._llm = self._initialize_llm()

    def _initialize_llm(self):
        """Initialize the LLM based on environment variables.

        OpenAI takes precedence when both keys are present; otherwise Gemini is
        used. Missing packages raise ImportError so the facade can degrade to a
        safe fallback instead of crashing the request.
        """
        openai_key = (os.environ.get("OPENAI_API_KEY") or "").strip()
        gemini_key = (os.environ.get("GEMINI_API_KEY") or "").strip()
        timeout = _get_timeout_seconds()

        if openai_key:
            from langchain_openai import ChatOpenAI

            return ChatOpenAI(
                model=os.environ.get("OPENAI_MODEL", DEFAULT_OPENAI_MODEL),
                api_key=openai_key,
                temperature=0.3,
                timeout=timeout,
            )

        if gemini_key:
            from langchain_google_genai import ChatGoogleGenerativeAI

            # Gemini 3+ handles temperature differently, so leave it at the
            # provider default instead of forcing 0.3.
            return ChatGoogleGenerativeAI(
                model=os.environ.get("GEMINI_MODEL", DEFAULT_GEMINI_MODEL),
                api_key=gemini_key,
                timeout=timeout,
            )

        raise ValueError("No API key found")

    @staticmethod
    def _extract_text(response) -> str:
        """Normalize LangChain responses to plain text.

        Gemini 3+ can return a list of content blocks; ``.text`` handles both
        string and block responses.
        """
        text = getattr(response, "text", None)
        if isinstance(text, str):
            return text

        content = getattr(response, "content", "")
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            return "".join(
                block.get("text", "") if isinstance(block, dict) else str(block)
                for block in content
            )
        return str(content) if content else ""

    def generate(self, prompt: str, timeout: Optional[int] = None) -> str:
        """Generate a response from the LLM given a prompt with timeout handling."""
        timeout = timeout or _get_timeout_seconds()

        if ChatPromptTemplate is None:
            raise ImportError("LangChain prompt templates are not installed")

        try:
            prompt_template = ChatPromptTemplate.from_messages([
                ("system", SYSTEM_PROMPT),
                # Use a template variable so user text containing braces cannot
                # be interpreted as LangChain prompt variables.
                ("human", "{prompt}"),
            ])

            chain = prompt_template | self._llm

            response = chain.invoke({"prompt": prompt})
            result = self._extract_text(response).strip()

            return result

        except TimeoutError:
            raise
        except Exception as e:
            error_str = str(e).lower()
            if "timeout" in error_str or "timed out" in error_str:
                raise TimeoutError(f"LLM request timed out after {timeout} seconds")
            raise Exception(f"LLM provider error: {str(e)}")


class MockLLMProvider(LLMProviderStrategy):
    """Deterministic mock provider for offline testing and unit tests without hitting external APIs."""

    def __init__(self, mock_response: str = ""):
        self._mock_response = mock_response

    def generate(self, prompt: str, timeout: int = 30) -> str:
        """Return the deterministic mock response."""
        return self._mock_response if self._mock_response else ""


# --- Chain of Responsibility / Validator Pattern: ResponseValidator ---

class ResponseValidator(ABC):
    """Abstract base class for response validators in the chain of responsibility."""

    @abstractmethod
    def validate(self, response: str, allowed_numbers: Set[float]) -> Tuple[bool, Optional[str]]:
        """Validate the response.

        Args:
            response: The LLM's response text
            allowed_numbers: Set of numbers allowed from context_data

        Returns:
            Tuple of (is_valid, error_reason or None)
        """
        pass


class NonEmptyValidator(ResponseValidator):
    """Ensures the response is not empty or malformed.

    First link in the chain of responsibility pipeline."""
    
    def __init__(self, next_validator: Optional['ResponseValidator'] = None):
        self._next_validator = next_validator

    def validate(self, response: str, allowed_numbers: Set[float]) -> Tuple[bool, Optional[str]]:
        # Short-circuit immediately on empty — never delegate empty to next validator
        if not response or not response.strip():
            return False, REASON_EMPTY_RESPONSE

        if self._next_validator:
            return self._next_validator.validate(response, allowed_numbers)
        return True, None


class NumberHallucinationValidator(ResponseValidator):
    """Extracts all numbers from the LLM's Bengali output, normalizes Bengali digits
    (০-৯) to English (0-9), strips formatting commas (1,50,000 -> 150000),
    and verifies that EVERY number in the output exists in the allowed numbers.

    Second link in the chain of responsibility pipeline."""
    
    def __init__(self, next_validator: Optional['ResponseValidator'] = None):
        self._next_validator = next_validator

    def validate(self, response: str, allowed_numbers: Set[float]) -> Tuple[bool, Optional[str]]:
        if not response or not response.strip():
            if self._next_validator:
                return self._next_validator.validate(response, allowed_numbers)
            return False, REASON_EMPTY_RESPONSE

        # Normalize Bengali digits to English
        normalized = normalize_bengali_digits(response)

        # Extract numbers with optional commas between digits
        number_pattern = r'-?\d+[\d,]*(?:\.\d+)?'
        extracted_numbers = re.findall(number_pattern, normalized)

        hallucination_detected = False
        for match in extracted_numbers:
            # Remove commas and convert to float
            num_clean = match.replace(',', '')
            try:
                num_val = float(num_clean)
                if num_val not in allowed_numbers:
                    hallucination_detected = True
                    break
            except ValueError:
                continue

        if hallucination_detected:
            if self._next_validator:
                return self._next_validator.validate(response, allowed_numbers)
            return False, REASON_NUMBER_HALLUCINATION

        if self._next_validator:
            return self._next_validator.validate(response, allowed_numbers)
        return True, None


# --- Facade Pattern: AdvisorServiceFacade ---

class AdvisorServiceFacade:
    """Facade Pattern: Provide a single, clean entry point
    get_advice(context_data: dict, question: str) -> dict
    for the Django REST API so the view layer knows nothing about LangChain, prompts, or regex validation."""

    # Backward-compatible class alias for the module-level constant.
    FALLBACK_MESSAGE = FALLBACK_MESSAGE

    def __init__(self):
        self._api_key_available = self._check_api_keys()
        self._initialization_error: Optional[str] = None
        self._llm_provider = MockLLMProvider()

        if self._api_key_available:
            try:
                self._llm_provider = LangChainProvider()
            except Exception as exc:
                # A configured key with missing/broken LangChain packages must
                # degrade to the fallback instead of returning HTTP 500.
                self._api_key_available = False
                self._initialization_error = type(exc).__name__

        self._validator_chain = NonEmptyValidator(
            NumberHallucinationValidator()
        )

    def _check_api_keys(self):
        """Check if required API keys are available."""
        openai_key = (os.environ.get("OPENAI_API_KEY") or "").strip()
        gemini_key = (os.environ.get("GEMINI_API_KEY") or "").strip()
        return bool(openai_key or gemini_key)

    def get_advice(self, context_data: dict, question: str) -> dict:
        """Single entry point for the Django REST API.

        Args:
            context_data: Raw backend dictionary with farm data
            question: The farmer's question

        Returns:
            dict with keys: answer, is_fallback, reason
        """
        # Step 0: Check for provider availability - fall back immediately if
        # no key is configured or the provider could not be initialized.
        if self._initialization_error:
            return {
                "answer": self.FALLBACK_MESSAGE,
                "is_fallback": True,
                "reason": REASON_PROVIDER_INIT_ERROR,
            }

        if not self._api_key_available:
            return {
                "answer": self.FALLBACK_MESSAGE,
                "is_fallback": True,
                "reason": REASON_MISSING_API_KEY,
            }

        # Step 1: Build the context using Builder Pattern
        try:
            builder = AdvisorContextBuilder(context_data)
            structured_context = builder.build()
            allowed_numbers = builder.get_allowed_numbers()
        except Exception:
            return {
                "answer": self.FALLBACK_MESSAGE,
                "is_fallback": True,
                "reason": REASON_PROVIDER_ERROR,
            }

        # Step 2: Generate LLM response
        # Build the prompt using the structured context
        prompt = self._build_prompt(structured_context, question)

        # Generate response with timeout (inner try handles TimeoutError and exceptions)
        try:
            llm_response = self._llm_provider.generate(
                prompt, timeout=_get_timeout_seconds()
            )
        except TimeoutError:
            return {
                "answer": self.FALLBACK_MESSAGE,
                "is_fallback": True,
                "reason": REASON_PROVIDER_TIMEOUT,
            }
        except Exception:
            return {
                "answer": self.FALLBACK_MESSAGE,
                "is_fallback": True,
                "reason": REASON_PROVIDER_ERROR,
            }

        # Step 3: Validate the LLM response via Chain of Responsibility
        is_valid, reason = self._validator_chain.validate(llm_response, allowed_numbers)
        if not is_valid:
            return {
                "answer": self.FALLBACK_MESSAGE,
                "is_fallback": True,
                "reason": reason or REASON_PROVIDER_ERROR,
            }

        # Step 4: Success case - return the LLM response
        return {
            "answer": llm_response,
            "is_fallback": False,
            "reason": REASON_SUCCESS,
        }

    def _build_prompt(self, context: dict, question: str) -> str:
        """Build the prompt for the LLM using the structured context."""
        farmer_name = context.get("farmer_name", "")
        crop_code = context.get("crop_code", "")
        area_ha = context.get("area_ha", 0)
        scenarios = context.get("scenarios", [])
        do_now = context.get("do_now", [])
        coming_up = context.get("coming_up", [])

        # Format scenarios using their codes (words like "normal" / "low_rain")
        # so no extra numbers are introduced into the prompt.
        scenarios_text = ""
        for scenario in scenarios:
            code = scenario.get("scenario_code") or "scenario"
            scenarios_text += f"\n- {code}:"
            scenarios_text += f"\n  ফলন: {scenario.get('yield_t_per_ha', 0)} টন/হেক্টর"
            scenarios_text += f"\n  উৎপাদন: {scenario.get('total_production_kg', 0)} কেজি"
            scenarios_text += f"\n  আয়: {scenario.get('revenue_bdt', 0)} টাকা"
            scenarios_text += f"\n  খরচ: {scenario.get('total_cost_bdt', 0)} টাকা"
            scenarios_text += f"\n  নিট লাভ: {scenario.get('net_profit_bdt', 0)} টাকা"

        # Format guidelines with bullets instead of numeric list markers.
        do_now_text = ""
        if do_now:
            do_now_text = "\n\nবর্তমান কাজ (Do Now):"
            for guideline in do_now:
                do_now_text += f"\n  - {guideline.get('instruction', '')}"

        coming_up_text = ""
        if coming_up:
            coming_up_text = "\n\nআগামী কাজ (Coming Up):"
            for guideline in coming_up:
                coming_up_text += f"\n  - {guideline.get('instruction', '')}"

        prompt = f"""কৃষকের প্রশ্ন: {question}

কৃষকের তথ্য:
- নাম: {farmer_name}
- ফসল: {crop_code}
- জমির আয়তন (হেক্টর): {area_ha}

কৃষি পরিস্থিতি:
{scenarios_text}

নির্দেশনা:
{do_now_text}{coming_up_text}

উত্তর দেওয়ার নিয়ম:
1. শুধুমাত্র উপরের তথ্যে থাকা সংখ্যাগুলো ব্যবহার করুন।
2. কোনো সংখ্যা যোগ, বিয়োগ, গুণ, ভাগ বা নতুন করে তৈরি করবেন না (ফলন, আয়, খরচ, লাভ, দিন বা আয়তন)।
3. প্রশ্ন তুলনামূলক হলে (যেমন কম বৃষ্টি বনাম স্বাভাবিক), উপরের তথ্য থেকে normal এবং low_rain এর মান সরাসরি উল্লেখ করুন।
4. পুরো উত্তর বাংলা ভাষায় দিন।

উত্তর (বাংলায়):"""

        return prompt