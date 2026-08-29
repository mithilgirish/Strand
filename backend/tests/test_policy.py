import unittest

from backend.errors import StrandPermissionError
from backend.tools.policy import (
    authorize_tool_call,
    get_role,
    set_role,
)


class ToolPolicyTests(unittest.TestCase):
    def setUp(self):
        self._initial_role = get_role()

    def tearDown(self):
        set_role(self._initial_role)

    def test_role_get_and_set(self):
        set_role("guardian")
        self.assertEqual(get_role(), "guardian")

    def test_guardian_authorized_tools(self):
        set_role("guardian")
        self.assertTrue(authorize_tool_call("run_guardian"))
        self.assertTrue(authorize_tool_call("trace_spec_dna"))
        self.assertTrue(authorize_tool_call("compute_r0"))
        self.assertTrue(authorize_tool_call("search_vector"))

    def test_guardian_disallowed_tool_raises_error(self):
        set_role("guardian")
        with self.assertRaises(StrandPermissionError):
            authorize_tool_call("create_ncr")

    def test_admin_wildcard_access(self):
        set_role("admin")
        self.assertTrue(authorize_tool_call("any_custom_tool_name"))
        self.assertTrue(authorize_tool_call("create_rfi"))
