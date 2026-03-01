"""
# ZONE: CORE (Governance Infrastructure)
# STAGE_GATES: All (Cannot skip gates)
"""

from __future__ import annotations

from agents.state import GovernanceState
from core.gates import (
    gate_0_business_intent,
    gate_1_data_contract,
    gate_2_feature_governance,
    gate_3_model_governance,
    gate_4_validation_controls,
    gate_5_deployment_controls,
    gate_6_decision_traceability,
    validate_all,
)
from core.lineage import emit_lineage_event


class GateRouter:
    """
    State machine that tracks current gate.
    Cannot proceed to next step until current gate passes.
    """

    def __init__(self, state: GovernanceState):
        self.state = state

    def run_gate(self, gate_num: int) -> tuple[bool, str]:
        """Run a single gate. Returns (passed, message)."""
        run_id = self.state.run_id
        gate_input = self.state.to_gate_input()

        gates = {
            0: lambda: gate_0_business_intent(gate_input["vtco"], run_id),
            1: lambda: gate_1_data_contract(gate_input["dataset_manifest"], run_id),
            2: lambda: gate_2_feature_governance(gate_input["feature_manifest"], run_id),
            3: lambda: gate_3_model_governance(gate_input["model_config"], run_id),
            4: lambda: gate_4_validation_controls(gate_input["validation_results"], run_id),
            5: lambda: gate_5_deployment_controls(gate_input["deployment_config"], run_id),
            6: lambda: gate_6_decision_traceability(run_id),
        }

        if gate_num not in gates:
            return False, f"Unknown gate {gate_num}"

        passed, msg = gates[gate_num]()
        if passed:
            self.state.current_gate = gate_num
            emit_lineage_event(run_id, "router_advance", {"gate": gate_num})
        return passed, msg

    def run_all_gates(self) -> tuple[bool, list[tuple[int, str]]]:
        """Run all gates in sequence. Fails closed."""
        return validate_all(self.state.to_gate_input())

    def can_promote_to_contender(self) -> bool:
        """Gates 0-4 must pass for Contender promotion."""
        from core.gates import validate_through_gate

        passed, results = validate_through_gate(self.state.to_gate_input(), through_gate=4)
        return passed

    def can_promote_to_champion(self) -> bool:
        """All gates 0-6 must pass for Champion promotion."""
        passed, results = self.run_all_gates()
        return passed and len(results) == 7
