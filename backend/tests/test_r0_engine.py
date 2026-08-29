import unittest

import networkx as nx

from backend.r0.engine import (
    _as_float,
    compute_r0_from_task_graph,
    compute_violation_r0,
    deviation_ratio,
    engineering_r0,
    parameter_criticality,
    score_downstream_r0,
)


class R0EngineTests(unittest.TestCase):
    def test_score_downstream_r0_formula(self):
        # downstream = 10, critical = 0, norm = 10 -> (10 + 0) / 10 = 1.0
        self.assertEqual(score_downstream_r0(10, 0, 10.0), 1.0)
        # downstream = 10, critical = 5, norm = 10 -> (10 + 10) / 10 = 2.0
        self.assertEqual(score_downstream_r0(10, 5, 10.0), 2.0)
        # bounds capped at 10.0
        self.assertEqual(score_downstream_r0(100, 50, 10.0), 10.0)

    def test_as_float_cleaning(self):
        self.assertEqual(_as_float("50°C"), 50.0)
        self.assertEqual(_as_float("500 kW"), 500.0)
        self.assertEqual(_as_float("12.0 kN/m2"), 12.0)
        self.assertEqual(_as_float("96%"), 96.0)
        self.assertIsNone(_as_float("N+1"))
        self.assertIsNone(_as_float(None))

    def test_parameter_criticality_lookups(self):
        self.assertEqual(parameter_criticality("cooling_capacity"), 1.00)
        self.assertEqual(parameter_criticality("ambient_temperature_max"), 0.85)
        self.assertEqual(parameter_criticality("unknown_custom_spec"), 0.60)

    def test_deviation_ratio_logic(self):
        # gte shortfall: actual 450, required 500 -> gap (500 - 450)/500 = 0.1
        self.assertAlmostEqual(deviation_ratio(450, 500, operator="gte"), 0.1, places=3)
        # gte compliant: actual 550, required 500 -> gap 0.0
        self.assertEqual(deviation_ratio(550, 500, operator="gte"), 0.0)
        # lte exceed: actual 55, required 50 -> gap (55 - 50)/50 = 0.1
        self.assertAlmostEqual(deviation_ratio(55, 50, operator="lte"), 0.1, places=3)
        # string equality
        self.assertEqual(deviation_ratio("FM-200", "FM-200"), 0.0)
        self.assertEqual(deviation_ratio("Water", "FM-200"), 1.0)

    def test_compute_violation_r0_structure(self):
        res = compute_violation_r0(
            parameter="cooling_capacity",
            actual=450,
            required=500,
            operator="gte",
        )
        self.assertIn("r0", res)
        self.assertIn("contagion", res)
        self.assertIn("engineering", res)
        self.assertIn("severity", res)
        self.assertGreaterEqual(res["r0"], 0.0)
        self.assertLessEqual(res["r0"], 10.0)

    def test_compute_r0_from_task_graph(self):
        g = nx.DiGraph()
        g.add_node("T1", delay_probability=0.2)
        g.add_node("T2", delay_probability=0.5)
        g.add_node("T3", delay_probability=0.8)
        g.add_edge("T1", "T2")
        g.add_edge("T2", "T3")

        r0_t1 = compute_r0_from_task_graph("T1", g, critical_path=["T1", "T2", "T3"])
        self.assertGreaterEqual(r0_t1, 0.0)
        self.assertLessEqual(r0_t1, 10.0)
        # Non-existent task returns 0.0
        self.assertEqual(compute_r0_from_task_graph("NONEXISTENT", g), 0.0)
