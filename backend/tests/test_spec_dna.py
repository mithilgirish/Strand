import unittest

from backend.ingestion.spec_dna.fingerprint import (
    generate_ncr_spec_dna,
    generate_spec_dna_id,
    generate_submittal_spec_dna,
)


class SpecDnaFingerprintTests(unittest.TestCase):
    def test_deterministic_hashing(self):
        id1 = generate_spec_dna_id("ambient_temperature_max", 50, "spec_tia942.pdf", "6.7.1")
        id2 = generate_spec_dna_id("ambient_temperature_max", 50, "spec_tia942.pdf", "6.7.1")
        self.assertEqual(id1, id2)
        self.assertEqual(len(id1), 16)

    def test_different_inputs_produce_different_hashes(self):
        id1 = generate_spec_dna_id("ambient_temperature_max", 50, "spec_tia942.pdf", "6.7.1")
        id2 = generate_spec_dna_id("ambient_temperature_max", 55, "spec_tia942.pdf", "6.7.1")
        id3 = generate_spec_dna_id("ambient_temperature_max", 50, "spec_tia942.pdf", "6.7.2")
        self.assertNotEqual(id1, id2)
        self.assertNotEqual(id1, id3)

    def test_extra_parameter_differentiator(self):
        id_base = generate_spec_dna_id("cooling_capacity", 500, "spec.pdf", "1.0")
        id_extra1 = generate_spec_dna_id("cooling_capacity", 500, "spec.pdf", "1.0", extra="CT-01")
        id_extra2 = generate_spec_dna_id("cooling_capacity", 500, "spec.pdf", "1.0", extra="CT-02")
        self.assertNotEqual(id_base, id_extra1)
        self.assertNotEqual(id_extra1, id_extra2)

    def test_submittal_and_ncr_spec_dna(self):
        sub_id = generate_submittal_spec_dna("SUB-101", "Carrier Corp", "CH-01")
        ncr_id = generate_ncr_spec_dna("NCR-202", "CH-01", "ambient_temperature_max")
        self.assertEqual(len(sub_id), 16)
        self.assertEqual(len(ncr_id), 16)
        self.assertNotEqual(sub_id, ncr_id)
