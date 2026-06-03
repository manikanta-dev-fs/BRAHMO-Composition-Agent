import unittest

from fastapi import HTTPException

from main import ComposeRequest, compose_strict


class ComposeStrictTests(unittest.TestCase):
    def test_default_budget_fits_rendered_context(self):
        result = compose_strict(ComposeRequest(budget=4000))

        self.assertLessEqual(result["token_stats"]["total"], 4000)
        self.assertFalse(result["token_stats"]["over_budget"])
        self.assertEqual(result["total_nodes"], 28)
        self.assertEqual(result["constraints_protected"], 6)
        self.assertIn("=== SESSION BOUNDARIES ===", result["context_string"])
        self.assertIn("CAPTURE:", result["context_string"])

    def test_tight_budget_compresses_to_fit(self):
        result = compose_strict(ComposeRequest(budget=1500))

        self.assertLessEqual(result["token_stats"]["total"], 1500)
        self.assertGreater(result["iterations"], 0)
        self.assertGreater(result["nodes_omitted"], 0)
        self.assertEqual(result["safety_status"], "COMPRESSED_TO_FIT")

    def test_impossible_budget_fails_safely(self):
        with self.assertRaises(HTTPException) as ctx:
            compose_strict(ComposeRequest(budget=700))

        self.assertEqual(ctx.exception.status_code, 422)
        self.assertIn("Budget cannot be met safely", ctx.exception.detail)

    def test_constraints_never_compress(self):
        result = compose_strict(ComposeRequest(budget=1500))
        constraints = [
            node for node in result["node_details"]
            if node["type"] == "CONSTRAINT"
        ]

        self.assertEqual(len(constraints), 6)
        self.assertTrue(all(node["final_compression"] == "FULL" for node in constraints))
        self.assertTrue(all(node["is_constraint_protected"] for node in constraints))

    def test_block_order_and_open_questions_are_visible(self):
        result = compose_strict(ComposeRequest(budget=4000))
        context = result["context_string"]

        headers = [
            "=== ROLE ===",
            "=== GLOBAL CONSTRAINTS ===",
            "=== RECENT DECISIONS ===",
            "=== ACTIVE CONSTRAINTS ===",
            "=== SESSION CONTEXT ===",
            "=== OPEN QUESTIONS ===",
            "=== STALE FLAGS ===",
            "=== SESSION BOUNDARIES ===",
        ]
        positions = [context.index(header) for header in headers]
        self.assertEqual(positions, sorted(positions))


if __name__ == "__main__":
    unittest.main()
