import unittest

from backend.agents.brain import _build_context, _fallback_answer


class BrainFallbackTests(unittest.TestCase):
    def test_unknown_question_fallback(self):
        res = _fallback_answer("What is the meaning of life?", [], [])
        self.assertEqual(res.confidence, "Low")
        self.assertIn("do not have information", res.answer)

    def test_fire_suppression_grounding(self):
        res = _fallback_answer("What fire suppression is required for UPS rooms?", [], [])
        self.assertIn("FM-200 or Novec 1230", res.answer)

    def test_ambient_temperature_grounding(self):
        res = _fallback_answer("What is the ambient temperature limit for cooling tower?", [], [])
        self.assertIn("50°C", res.answer)

    def test_build_context_empty(self):
        ctx = _build_context([])
        self.assertIn("No relevant context found", ctx)

    def test_build_context_with_chunks(self):
        chunks = [
            {
                "text": "UPS room must have N+1 redundancy.",
                "metadata": {"document_source": "spec.pdf", "page_number": 3},
                "sources": ["vector", "bm25"],
            }
        ]
        ctx = _build_context(chunks)
        self.assertIn("spec.pdf", ctx)
        self.assertIn("Page 3", ctx)
        self.assertIn("UPS room must have N+1 redundancy.", ctx)
