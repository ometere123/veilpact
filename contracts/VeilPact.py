# v0.2.18
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
from dataclasses import dataclass
import json
import hashlib


# ─────────────────────────────────────────────────────────────
# VeilPact — Private pact + optional GEN-backed settlement
# ─────────────────────────────────────────────────────────────
#
# Winning merge:
# - Your VeilPact v0.4 architecture remains the base.
# - Friend's contract is used only for payable mechanics:
#   @gl.public.write.payable, gl.message.value, _Recipient.emit_transfer.
# - No DynArray instantiation.
# - No nested dynamic arrays.
# - Clause-level selective reveal stays intact.
# - GEN-backed settlement is optional and claim-based.


@gl.evm.contract_interface
class _Recipient:
    class View:
        pass

    class Write:
        pass


MAX_CLAUSES = 50
MAX_CLAIM_LEN = 1200
MAX_RESPONSE_LEN = 5000
MAX_CLAUSE_PAYLOAD_LEN = 8000
MAX_EVIDENCE_BUNDLE_LEN = 9000
MAX_ROOT_SALT_LEN = 130
MAX_REASONING_LEN = 1000
BPS_DENOMINATOR = 10000

NETWORK_ID = "studionet"
CLAUSE_VERSION = "1.0"
ROOT_VERSION = "VEILPACT_ROOT_V1"

PACT_STATUS_PENDING = "PENDING_COUNTERPARTY"
PACT_STATUS_ACCEPTED = "ACCEPTED"
PACT_STATUS_ACTIVE = "ACTIVE"
PACT_STATUS_DISPUTED = "DISPUTED"
PACT_STATUS_UNDER_REVIEW = "UNDER_REVIEW"
PACT_STATUS_RESOLVED_CONTINUE = "RESOLVED_CONTINUE"
PACT_STATUS_RESOLVED_PAUSE = "RESOLVED_PAUSE"
PACT_STATUS_RESOLVED_RENEGOTIATE = "RESOLVED_RENEGOTIATE"
PACT_STATUS_RESOLVED_SETTLE = "RESOLVED_SETTLE"
PACT_STATUS_CLOSED = "CLOSED"

DISPUTE_STATUS_OPEN = "OPEN"
DISPUTE_STATUS_REVEALED = "REVEALED"
DISPUTE_STATUS_RESOLVED = "RESOLVED"
DISPUTE_STATUS_CLOSED = "CLOSED"

PAYMENT_STATUS_NONE = "NONE"
PAYMENT_STATUS_UNFUNDED = "UNFUNDED"
PAYMENT_STATUS_FUNDED = "FUNDED"
PAYMENT_STATUS_LOCKED = "LOCKED"
PAYMENT_STATUS_RELEASED = "RELEASED"
PAYMENT_STATUS_REFUNDED = "REFUNDED"
PAYMENT_STATUS_SPLIT = "SPLIT"
PAYMENT_STATUS_PAUSED = "PAUSED"
PAYMENT_STATUS_CLAIMABLE = "CLAIMABLE"
PAYMENT_STATUS_CLAIMED = "CLAIMED"

ALLOWED_REQUESTED_OUTCOMES = {"CONTINUE", "PAUSE", "RENEGOTIATE", "SETTLE", "DISMISS"}
ALLOWED_RECOMMENDED_ACTIONS = {
    "CONTINUE", "PAUSE", "RENEGOTIATE", "SETTLE", "DISMISS",
    "REQUEST_MORE_EVIDENCE", "REQUEST_NARROW_REVEAL", "REJECTED_UNSAFE"
}
ALLOWED_PAYMENT_DECISIONS = {
    "NO_PAYMENT_ACTION", "RELEASE_TO_PAYEE", "REFUND_TO_PAYER", "SPLIT_PAYMENT", "PAUSE_PAYMENT"
}
ALLOWED_EVIDENCE_STRENGTH = {"STRONG", "MODERATE", "WEAK", "INSUFFICIENT", "CONFLICTING"}
ALLOWED_BREACH_LIKELIHOOD = {"LOW", "MEDIUM", "HIGH", "UNCLEAR"}
ALLOWED_CLAUSE_RELEVANCE = {"DIRECTLY_RELEVANT", "PARTIALLY_RELEVANT", "NOT_RELEVANT"}
ALLOWED_PRIVACY_JUDGEMENT = {
    "MINIMAL_REVEAL_SUFFICIENT", "MORE_EVIDENCE_NEEDED",
    "ADDITIONAL_CLAUSE_NEEDED", "OVERDISCLOSURE_DETECTED"
}
ALLOWED_SAFETY_LABELS = {"SAFE_TO_REVIEW", "NEEDS_HUMAN_LEGAL_REVIEW", "REJECTED_UNSAFE", "INSUFFICIENT_CONTEXT"}

PROHIBITED_KEYWORDS = [
    "illegal", "blackmail", "weapon", "weapons", "gun", "guns", "drug", "drugs",
    "coerce", "coercion", "evade law", "evading law", "harassment", "exploit",
    "exploitation", "illicit", "crime", "criminal", "smuggle", "smuggling",
    "bribe", "bribery", "extortion",
]


@allow_storage
@dataclass
class Verdict:
    clause_verified: bool
    clause_relevant: str
    evidence_strength: str
    breach_likelihood: str
    recommended_action: str
    payment_decision: str
    payer_refund_bps: u256
    payee_release_bps: u256
    privacy_judgement: str
    safety_label: str
    reasoning: str
    payment_reasoning: str
    next_steps: str
    confidence: str


@allow_storage
@dataclass
class Pact:
    pact_id: u256
    party_a: Address
    party_b: Address
    agreement_root: str
    root_salt: str
    metadata_hash: str
    clause_count: u256
    status: str
    created_at: u256
    accepted_at: u256
    closed_at: u256
    dispute_count: u256
    revealed_count: u256
    payer: Address
    payee: Address
    expected_amount: u256
    funded_amount: u256
    payer_claimable: u256
    payee_claimable: u256
    payer_claimed: bool
    payee_claimed: bool
    payment_status: str
    settlement_applied: bool
    close_proposed_by: Address
    close_proposed_target: Address
    close_proposal_active: bool


@allow_storage
@dataclass
class Dispute:
    dispute_id: u256
    pact_id: u256
    opened_by: Address
    clause_index: u256
    claim: str
    requested_outcome: str
    evidence_summary: str
    status: str
    response_json: str
    revealed_clause_payload_json: str
    evidence_bundle_json: str
    revealed: bool
    review_count: u256
    verdict: Verdict


@allow_storage
@dataclass
class RevealRecord:
    reveal_id: u256
    pact_id: u256
    dispute_id: u256
    clause_index: u256
    clause_commitment: str
    revealed_by: Address
    verified: bool
    revealed_at: u256
    payload_hash: str
    evidence_hash: str


@allow_storage
@dataclass
class PrivacyEntry:
    entry_id: u256
    pact_id: u256
    dispute_id: u256
    clause_index: u256
    revealed_by: Address
    purpose: str
    verified: bool
    revealed_at: u256
    overdisclosure_warning: bool
    safety_label: str
    payment_decision: str


class VeilPact(gl.Contract):
    admin: str
    resolver: str
    pact_count: u256
    reveal_count: u256
    privacy_entry_count: u256
    pacts: TreeMap[u256, Pact]
    clause_commitments: TreeMap[str, str]
    disputes: TreeMap[str, Dispute]
    reveals: TreeMap[str, RevealRecord]
    privacy_ledger: TreeMap[u256, PrivacyEntry]
    user_pact_counts: TreeMap[Address, u256]
    user_pacts: TreeMap[str, u256]

    def __init__(self) -> None:
        deployer = str(gl.message.sender_address).lower()
        self.admin = deployer
        self.resolver = deployer

    def _require(self, condition: bool, msg: str) -> None:
        if not condition:
            raise gl.vm.UserError(msg)

    def _caller(self) -> str:
        return str(gl.message.sender_address).lower()

    def _now(self) -> u256:
        # GenVM v0.2.18 no longer exposes a timestamp on gl.message.
        # Timestamps are display-only metadata; state transitions must not depend on them.
        return u256(0)

    def _require_admin(self) -> None:
        self._require(self._caller() == self.admin, "caller is not admin")

    def _require_resolver(self) -> None:
        caller = self._caller()
        self._require(caller == self.resolver or caller == self.admin, "caller is not resolver")

    def _digest(self, value: str) -> str:
        return "0x" + hashlib.sha256(value.encode("utf-8")).hexdigest()

    def _is_hash(self, value: str) -> bool:
        if not isinstance(value, str) or len(value) != 66 or not value.startswith("0x"):
            return False
        for ch in value[2:]:
            if ch not in "0123456789abcdefABCDEF":
                return False
        return True

    def _require_hash(self, value: str, label: str) -> None:
        self._require(self._is_hash(value), label + " must be 0x + 64 hex chars")

    def _canonical_json_from_obj(self, obj: object) -> str:
        return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)

    def _shorten(self, value: str, max_len: int) -> str:
        return value if len(value) <= max_len else value[:max_len]

    def _commitment_key(self, pact_id: u256, clause_index: u256) -> str:
        return str(int(pact_id)) + ":" + str(int(clause_index))

    def _dispute_key(self, pact_id: u256, dispute_id: u256) -> str:
        return str(int(pact_id)) + ":" + str(int(dispute_id))

    def _reveal_key(self, pact_id: u256, reveal_index: u256) -> str:
        return str(int(pact_id)) + ":" + str(int(reveal_index))

    def _user_pact_key(self, addr: Address, index: u256) -> str:
        return str(addr).lower() + ":" + str(int(index))

    def _empty_addr(self) -> Address:
        return Address("0x0000000000000000000000000000000000000000")

    def _empty_verdict(self) -> Verdict:
        return Verdict(False, "", "", "", "", "NO_PAYMENT_ACTION", u256(0), u256(0), "", "", "", "", "[]", "0")

    def _is_party(self, pact: Pact) -> bool:
        caller = gl.message.sender_address
        return caller == pact.party_a or caller == pact.party_b

    def _is_party_addr(self, pact: Pact, addr: Address) -> bool:
        return addr == pact.party_a or addr == pact.party_b

    def _add_user_pact(self, addr: Address, pact_id: u256) -> None:
        current = self.user_pact_counts.get(addr, u256(0))
        next_index = current + u256(1)
        self.user_pact_counts[addr] = next_index
        self.user_pacts[self._user_pact_key(addr, next_index)] = pact_id

    def _commitments_from_input(self, clause_commitments: list) -> list:
        commitments = []
        for c in clause_commitments:
            commitment = str(c).lower()
            self._require_hash(commitment, "clauseCommitment")
            for existing in commitments:
                self._require(existing != commitment, "Duplicate clause commitment")
            commitments.append(commitment)
        return commitments

    def _commitments_for_pact(self, pact_id: u256, clause_count: u256) -> list:
        commitments = []
        for i in range(0, int(clause_count)):
            key = self._commitment_key(pact_id, u256(i))
            self._require(key in self.clause_commitments, "Missing clause commitment")
            commitments.append(self.clause_commitments[key].lower())
        return commitments

    def _compute_agreement_root_from_list(self, party_a: Address, party_b: Address, commitments: list, metadata_hash: str, root_salt: str) -> str:
        payload = {
            "version": ROOT_VERSION,
            "network": NETWORK_ID,
            "partyA": str(party_a).lower(),
            "partyB": str(party_b).lower(),
            "metadataHash": metadata_hash.lower(),
            "clauseCommitments": commitments,
            "rootSalt": root_salt,
        }
        return self._digest(self._canonical_json_from_obj(payload))

    def _contains_prohibited_keyword(self, text: str) -> bool:
        lowered = text.lower()
        for kw in PROHIBITED_KEYWORDS:
            if kw in lowered:
                return True
        return False

    def _pay(self, recipient: Address, amount_wei: u256) -> None:
        if int(amount_wei) <= 0:
            return
        _Recipient(recipient).emit_transfer(value=amount_wei)

    def _all_claimed_or_zero(self, pact: Pact) -> bool:
        payer_done = int(pact.payer_claimable) == 0 or pact.payer_claimed
        payee_done = int(pact.payee_claimable) == 0 or pact.payee_claimed
        return payer_done and payee_done

    def _validate_bps_pair(self, payer_refund_bps: u256, payee_release_bps: u256) -> None:
        self._require(int(payer_refund_bps) <= BPS_DENOMINATOR, "payerRefundBps too high")
        self._require(int(payee_release_bps) <= BPS_DENOMINATOR, "payeeReleaseBps too high")
        self._require(int(payer_refund_bps) + int(payee_release_bps) == BPS_DENOMINATOR, "payment bps must sum to 10000")

    def _set_claimables_from_bps(self, pact: Pact, payer_refund_bps: u256, payee_release_bps: u256, payment_status: str) -> Pact:
        self._validate_bps_pair(payer_refund_bps, payee_release_bps)
        funded = int(pact.funded_amount)
        payer_amount = (funded * int(payer_refund_bps)) // BPS_DENOMINATOR
        payee_amount = funded - payer_amount
        pact.payer_claimable = u256(payer_amount)
        pact.payee_claimable = u256(payee_amount)
        pact.payer_claimed = False
        pact.payee_claimed = False
        pact.payment_status = payment_status
        pact.settlement_applied = True
        return pact

    @gl.public.view
    def get_admin(self) -> str:
        return self.admin

    @gl.public.view
    def get_resolver(self) -> str:
        return self.resolver

    @gl.public.view
    def get_balance(self) -> u256:
        return self.balance

    @gl.public.write
    def set_resolver(self, resolver: str) -> None:
        self._require_admin()
        self.resolver = resolver.lower()

    @gl.public.write
    def set_admin(self, new_admin: str) -> None:
        self._require_admin()
        self.admin = new_admin.lower()

    @gl.public.write
    def create_pact(self, counterparty: str, agreement_root: str, clause_commitments: list, metadata_hash: str, root_salt: str, payer: str, payee: str, expected_amount: u256) -> u256:
        caller = gl.message.sender_address
        party_b = Address(counterparty)
        payer_addr = Address(payer)
        payee_addr = Address(payee)
        self._require(party_b != caller, "Counterparty cannot be caller")
        self._require(len(clause_commitments) > 0, "No clause commitments provided")
        self._require(len(clause_commitments) <= MAX_CLAUSES, "Too many clauses")
        self._require(len(root_salt) > 0 and len(root_salt) <= MAX_ROOT_SALT_LEN, "Invalid root salt")
        self._require_hash(agreement_root, "agreementRoot")
        self._require_hash(metadata_hash, "metadataHash")
        self._require(payer_addr == caller or payer_addr == party_b, "payer must be one of the pact parties")
        self._require(payee_addr == caller or payee_addr == party_b, "payee must be one of the pact parties")
        self._require(payer_addr != payee_addr, "payer and payee cannot be the same")
        commitments = self._commitments_from_input(clause_commitments)
        expected_root = self._compute_agreement_root_from_list(caller, party_b, commitments, metadata_hash.lower(), root_salt)
        self._require(expected_root.lower() == agreement_root.lower(), "Agreement root does not match parties, metadata, commitments, and root salt")
        pact_id = self.pact_count + u256(1)
        self.pact_count = pact_id
        initial_payment_status = PAYMENT_STATUS_UNFUNDED if int(expected_amount) > 0 else PAYMENT_STATUS_NONE
        pact = Pact(
            pact_id, caller, party_b, agreement_root.lower(), root_salt, metadata_hash.lower(), u256(len(commitments)),
            PACT_STATUS_PENDING, self._now(), u256(0), u256(0), u256(0), u256(0),
            payer_addr, payee_addr, expected_amount, u256(0), u256(0), u256(0), False, False,
            initial_payment_status, False, self._empty_addr(), self._empty_addr(), False,
        )
        self.pacts[pact_id] = pact
        for i in range(0, len(commitments)):
            self.clause_commitments[self._commitment_key(pact_id, u256(i))] = commitments[i]
        self._add_user_pact(caller, pact_id)
        self._add_user_pact(party_b, pact_id)
        return pact_id

    @gl.public.write.payable
    def fund_pact(self, pact_id: u256) -> None:
        self._require(pact_id in self.pacts, "Pact not found")
        pact = self.pacts[pact_id]
        self._require(gl.message.sender_address == pact.payer, "Only payer can fund pact")
        self._require(int(pact.expected_amount) > 0, "This pact has no expected funded amount")
        self._require(pact.status in [PACT_STATUS_PENDING, PACT_STATUS_ACCEPTED], "Pact cannot be funded in current status")
        self._require(pact.payment_status == PAYMENT_STATUS_UNFUNDED, "Pact is already funded or settled")
        received = int(gl.message.value)
        required = int(pact.expected_amount)
        self._require(received == required, "must send exact pact funding amount")
        pact.funded_amount = u256(received)
        if pact.status == PACT_STATUS_ACCEPTED:
            pact.status = PACT_STATUS_ACTIVE
            pact.payment_status = PAYMENT_STATUS_LOCKED
        else:
            pact.payment_status = PAYMENT_STATUS_FUNDED
        self.pacts[pact_id] = pact

    @gl.public.write
    def accept_pact(self, pact_id: u256) -> None:
        self._require(pact_id in self.pacts, "Pact not found")
        pact = self.pacts[pact_id]
        self._require(gl.message.sender_address == pact.party_b, "Only counterparty can accept")
        self._require(pact.status == PACT_STATUS_PENDING, "Pact not pending acceptance")
        pact.accepted_at = self._now()
        if int(pact.expected_amount) == 0:
            pact.status = PACT_STATUS_ACTIVE
            pact.payment_status = PAYMENT_STATUS_NONE
        elif pact.payment_status == PAYMENT_STATUS_FUNDED:
            pact.status = PACT_STATUS_ACTIVE
            pact.payment_status = PAYMENT_STATUS_LOCKED
        else:
            pact.status = PACT_STATUS_ACCEPTED
        self.pacts[pact_id] = pact

    @gl.public.write
    def cancel_unaccepted_pact(self, pact_id: u256) -> None:
        self._require(pact_id in self.pacts, "Pact not found")
        pact = self.pacts[pact_id]
        self._require(gl.message.sender_address == pact.party_a or gl.message.sender_address == pact.payer, "Only creator or payer can cancel unaccepted pact")
        self._require(pact.status in [PACT_STATUS_PENDING, PACT_STATUS_ACCEPTED], "Can only cancel before pact is active")
        if int(pact.funded_amount) > 0 and not pact.settlement_applied:
            pact = self._set_claimables_from_bps(pact, u256(BPS_DENOMINATOR), u256(0), PAYMENT_STATUS_CLAIMABLE)
        else:
            pact.payment_status = PAYMENT_STATUS_REFUNDED if int(pact.expected_amount) > 0 else PAYMENT_STATUS_NONE
        pact.status = PACT_STATUS_CLOSED
        pact.closed_at = self._now()
        self.pacts[pact_id] = pact

    @gl.public.write
    def release_payment(self, pact_id: u256) -> None:
        self._require(pact_id in self.pacts, "Pact not found")
        pact = self.pacts[pact_id]
        self._require(gl.message.sender_address == pact.payer, "Only payer can release payment")
        self._require(pact.status == PACT_STATUS_ACTIVE, "Pact must be active")
        self._require(pact.payment_status == PAYMENT_STATUS_LOCKED, "Payment must be locked")
        self._require(int(pact.dispute_count) == 0, "Cannot release while pact has disputes")
        self._require(not pact.settlement_applied, "Settlement already applied")
        pact = self._set_claimables_from_bps(pact, u256(0), u256(BPS_DENOMINATOR), PAYMENT_STATUS_CLAIMABLE)
        pact.status = PACT_STATUS_RESOLVED_SETTLE
        self.pacts[pact_id] = pact

    @gl.public.write
    def propose_close(self, pact_id: u256, payout_to: str) -> None:
        self._require(pact_id in self.pacts, "Pact not found")
        pact = self.pacts[pact_id]
        self._require(self._is_party(pact), "Not a party to this pact")
        self._require(pact.status == PACT_STATUS_ACTIVE, "Can only propose close from ACTIVE")
        target = Address(payout_to)
        self._require(self._is_party_addr(pact, target), "payout target must be a party")
        pact.close_proposed_by = gl.message.sender_address
        pact.close_proposed_target = target
        pact.close_proposal_active = True
        self.pacts[pact_id] = pact

    @gl.public.write
    def confirm_close(self, pact_id: u256) -> None:
        self._require(pact_id in self.pacts, "Pact not found")
        pact = self.pacts[pact_id]
        self._require(self._is_party(pact), "Not a party to this pact")
        self._require(pact.close_proposal_active, "No close proposal active")
        self._require(gl.message.sender_address != pact.close_proposed_by, "Proposer cannot confirm")
        self._require(pact.status == PACT_STATUS_ACTIVE, "Pact must be active")
        if int(pact.funded_amount) > 0 and pact.payment_status == PAYMENT_STATUS_LOCKED:
            if pact.close_proposed_target == pact.payer:
                pact = self._set_claimables_from_bps(pact, u256(BPS_DENOMINATOR), u256(0), PAYMENT_STATUS_CLAIMABLE)
            elif pact.close_proposed_target == pact.payee:
                pact = self._set_claimables_from_bps(pact, u256(0), u256(BPS_DENOMINATOR), PAYMENT_STATUS_CLAIMABLE)
            else:
                raise gl.vm.UserError("invalid close target")
        pact.status = PACT_STATUS_RESOLVED_SETTLE
        pact.close_proposal_active = False
        pact.close_proposed_by = self._empty_addr()
        pact.close_proposed_target = self._empty_addr()
        self.pacts[pact_id] = pact

    @gl.public.write
    def cancel_close(self, pact_id: u256) -> None:
        self._require(pact_id in self.pacts, "Pact not found")
        pact = self.pacts[pact_id]
        self._require(self._is_party(pact), "Not a party to this pact")
        self._require(pact.close_proposal_active, "No close proposal active")
        pact.close_proposal_active = False
        pact.close_proposed_by = self._empty_addr()
        pact.close_proposed_target = self._empty_addr()
        self.pacts[pact_id] = pact

    @gl.public.write
    def open_dispute(self, pact_id: u256, clause_index: u256, claim: str, requested_outcome: str) -> u256:
        self._require(pact_id in self.pacts, "Pact not found")
        pact = self.pacts[pact_id]
        self._require(self._is_party(pact), "Not a party to this pact")
        self._require(pact.status == PACT_STATUS_ACTIVE, "Pact must be ACTIVE to open dispute")
        self._require(int(clause_index) < int(pact.clause_count), "Clause index out of range")
        self._require(len(claim) > 0 and len(claim) <= MAX_CLAIM_LEN, "Invalid claim length")
        self._require(requested_outcome in ALLOWED_REQUESTED_OUTCOMES, "Invalid requested outcome")
        if pact.close_proposal_active:
            pact.close_proposal_active = False
            pact.close_proposed_by = self._empty_addr()
            pact.close_proposed_target = self._empty_addr()
        dispute_id = pact.dispute_count + u256(1)
        dispute = Dispute(dispute_id, pact_id, gl.message.sender_address, clause_index, claim, requested_outcome, "", DISPUTE_STATUS_OPEN, "", "", "", False, u256(0), self._empty_verdict())
        self.disputes[self._dispute_key(pact_id, dispute_id)] = dispute
        pact.dispute_count = dispute_id
        pact.status = PACT_STATUS_DISPUTED
        self.pacts[pact_id] = pact
        return dispute_id

    @gl.public.write
    def respond_to_dispute(self, pact_id: u256, dispute_id: u256, response_json: str) -> None:
        self._require(pact_id in self.pacts, "Pact not found")
        pact = self.pacts[pact_id]
        self._require(self._is_party(pact), "Not a party to this pact")
        self._require(len(response_json) > 0 and len(response_json) <= MAX_RESPONSE_LEN, "Invalid response length")
        self._require(not pact.settlement_applied, "Settlement already applied")
        d_key = self._dispute_key(pact_id, dispute_id)
        self._require(d_key in self.disputes, "Dispute not found")
        dispute = self.disputes[d_key]
        self._require(dispute.status in [DISPUTE_STATUS_OPEN, DISPUTE_STATUS_REVEALED, DISPUTE_STATUS_RESOLVED], "Dispute cannot accept response")
        self._require(gl.message.sender_address != dispute.opened_by, "Dispute opener cannot respond")
        try:
            json.loads(response_json)
        except Exception:
            raise gl.vm.UserError("responseJson must be valid JSON")
        dispute.response_json = response_json
        self.disputes[d_key] = dispute
        if dispute.revealed and dispute.status in [DISPUTE_STATUS_REVEALED, DISPUTE_STATUS_RESOLVED]:
            self._run_dispute_review(pact_id, dispute_id, dispute.revealed_clause_payload_json, dispute.evidence_bundle_json)

    @gl.public.write
    def reveal_clause_for_dispute(self, pact_id: u256, dispute_id: u256, clause_index: u256, clause_payload_json: str, evidence_bundle_json: str) -> None:
        self._require(pact_id in self.pacts, "Pact not found")
        pact = self.pacts[pact_id]
        self._require(self._is_party(pact), "Not a party to this pact")
        self._require(pact.status in [PACT_STATUS_ACTIVE, PACT_STATUS_DISPUTED, PACT_STATUS_UNDER_REVIEW], "Pact not in disputable state")
        self._require(len(clause_payload_json) > 0 and len(clause_payload_json) <= MAX_CLAUSE_PAYLOAD_LEN, "Invalid clause payload length")
        self._require(len(evidence_bundle_json) > 0 and len(evidence_bundle_json) <= MAX_EVIDENCE_BUNDLE_LEN, "Invalid evidence bundle length")
        self._require(not pact.settlement_applied, "Settlement already applied")
        d_key = self._dispute_key(pact_id, dispute_id)
        self._require(d_key in self.disputes, "Dispute not found")
        dispute = self.disputes[d_key]
        self._require(dispute.status == DISPUTE_STATUS_OPEN, "Dispute not open for reveal")
        self._require(not dispute.revealed, "Clause already revealed for this dispute")
        self._require(int(clause_index) == int(dispute.clause_index), "Clause index does not match dispute")
        self._require(int(clause_index) < int(pact.clause_count), "Clause index out of range")
        try:
            payload = json.loads(clause_payload_json)
        except Exception:
            raise gl.vm.UserError("clausePayloadJson must be valid JSON")
        self._require(str(payload.get("version", "")) == CLAUSE_VERSION, "Invalid clause payload version")
        self._require(str(payload.get("network", "")) == NETWORK_ID, "Invalid network in clause payload")
        self._require(str(payload.get("partyA", "")).lower() == str(pact.party_a).lower(), "partyA mismatch")
        self._require(str(payload.get("partyB", "")).lower() == str(pact.party_b).lower(), "partyB mismatch")
        self._require(int(payload.get("clauseIndex", -1)) == int(clause_index), "clauseIndex mismatch")
        self._require(len(str(payload.get("clauseSalt", ""))) > 0, "Missing clauseSalt")
        self._require(len(str(payload.get("clauseText", ""))) > 0, "Missing clauseText")
        self._require(len(str(payload.get("clauseType", ""))) > 0, "Missing clauseType")
        self._require(len(str(payload.get("clauseTitle", ""))) > 0, "Missing clauseTitle")
        self._require(len(str(payload.get("remedyPreference", ""))) > 0, "Missing remedyPreference")
        canonical_clause = self._canonical_json_from_obj(payload)
        computed_commitment = self._digest(canonical_clause).lower()
        stored_key = self._commitment_key(pact_id, clause_index)
        self._require(stored_key in self.clause_commitments, "Stored clause commitment not found")
        stored_commitment = self.clause_commitments[stored_key].lower()
        self._require(computed_commitment == stored_commitment, "Revealed clause does not match stored commitment")
        commitments = self._commitments_for_pact(pact_id, pact.clause_count)
        expected_root = self._compute_agreement_root_from_list(pact.party_a, pact.party_b, commitments, pact.metadata_hash, pact.root_salt)
        self._require(expected_root.lower() == pact.agreement_root.lower(), "Agreement root mismatch")
        try:
            evidence_data = json.loads(evidence_bundle_json)
        except Exception:
            raise gl.vm.UserError("evidenceBundleJson must be valid JSON")
        self._require(len(str(evidence_data.get("claim", ""))) > 0, "Evidence bundle missing claim")
        evidence_requested = str(evidence_data.get("requestedOutcome", dispute.requested_outcome))
        self._require(evidence_requested in ALLOWED_REQUESTED_OUTCOMES, "Evidence bundle requestedOutcome invalid")
        combined_safety_text = str(payload.get("clauseText", "")) + " " + evidence_bundle_json + " " + dispute.claim
        self._require(not self._contains_prohibited_keyword(combined_safety_text), "Rejected unsafe or prohibited agreement content")
        payload_hash = self._digest(canonical_clause)
        evidence_hash = self._digest(self._canonical_json_from_obj(evidence_data))
        self.reveal_count = self.reveal_count + u256(1)
        reveal_index = pact.revealed_count + u256(1)
        reveal = RevealRecord(self.reveal_count, pact_id, dispute_id, clause_index, stored_commitment, gl.message.sender_address, True, self._now(), payload_hash, evidence_hash)
        self.reveals[self._reveal_key(pact_id, reveal_index)] = reveal
        dispute.status = DISPUTE_STATUS_REVEALED
        dispute.evidence_summary = self._shorten(evidence_bundle_json, 500)
        dispute.revealed_clause_payload_json = clause_payload_json
        dispute.evidence_bundle_json = evidence_bundle_json
        dispute.revealed = True
        self.disputes[d_key] = dispute
        pact.revealed_count = reveal_index
        pact.status = PACT_STATUS_UNDER_REVIEW
        self.pacts[pact_id] = pact
        self.privacy_entry_count = self.privacy_entry_count + u256(1)
        entry = PrivacyEntry(self.privacy_entry_count, pact_id, dispute_id, clause_index, gl.message.sender_address, "DISPUTE_REVEAL", True, self._now(), False, "SAFE_TO_REVIEW", "NO_PAYMENT_ACTION")
        self.privacy_ledger[self.privacy_entry_count] = entry
        self._run_dispute_review(pact_id, dispute_id, clause_payload_json, evidence_bundle_json)

    def _run_dispute_review(self, pact_id: u256, dispute_id: u256, clause_payload_json: str, evidence_bundle_json: str) -> None:
        pact = self.pacts[pact_id]
        d_key = self._dispute_key(pact_id, dispute_id)
        dispute = self.disputes[d_key]
        try:
            clause_data = json.loads(clause_payload_json)
        except Exception:
            clause_data = {}
        try:
            evidence_data = json.loads(evidence_bundle_json)
        except Exception:
            evidence_data = {}
        context = {
            "protocol": "VeilPact",
            "network": NETWORK_ID,
            "pactId": int(pact_id),
            "disputeId": int(dispute_id),
            "clauseVerified": True,
            "revealedClause": {
                "clauseIndex": int(dispute.clause_index),
                "clauseType": str(clause_data.get("clauseType", "UNKNOWN")),
                "clauseTitle": str(clause_data.get("clauseTitle", "")),
                "clauseText": str(clause_data.get("clauseText", "")),
                "remedyPreference": str(clause_data.get("remedyPreference", "")),
            },
            "dispute": {
                "claim": str(evidence_data.get("claim", dispute.claim)),
                "requestedOutcome": str(evidence_data.get("requestedOutcome", dispute.requested_outcome)),
                "counterpartyResponse": dispute.response_json if dispute.response_json else "No counterparty response submitted.",
            },
            "evidenceBundle": evidence_data,
            "payment": {
                "hasFundedSettlement": int(pact.funded_amount) > 0,
                "paymentStatus": pact.payment_status,
                "payer": str(pact.payer),
                "payee": str(pact.payee),
                "fundedAmount": str(int(pact.funded_amount)),
            },
            "privacyRules": [
                "Only judge the revealed clause and submitted evidence.",
                "Do not assume unrevealed clauses.",
                "Request narrow reveal only if strictly necessary.",
                "Do not claim legal enforceability.",
            ],
            "safetyRules": [
                "Reject unsafe or prohibited agreements.",
                "Do not recommend enforcement for illegal, coercive, exploitative, blackmail, weapons, drugs, or evasion-of-law content.",
            ],
        }
        def review_context() -> str:
            return self._canonical_json_from_obj(context)
        task = """
Return ONLY a valid JSON object with exactly these fields:
{
  "clauseVerified": true,
  "clauseRelevant": "DIRECTLY_RELEVANT" | "PARTIALLY_RELEVANT" | "NOT_RELEVANT",
  "evidenceStrength": "STRONG" | "MODERATE" | "WEAK" | "INSUFFICIENT" | "CONFLICTING",
  "breachLikelihood": "LOW" | "MEDIUM" | "HIGH" | "UNCLEAR",
  "recommendedAction": "CONTINUE" | "PAUSE" | "RENEGOTIATE" | "SETTLE" | "DISMISS" | "REQUEST_MORE_EVIDENCE" | "REQUEST_NARROW_REVEAL" | "REJECTED_UNSAFE",
  "paymentDecision": "NO_PAYMENT_ACTION" | "RELEASE_TO_PAYEE" | "REFUND_TO_PAYER" | "SPLIT_PAYMENT" | "PAUSE_PAYMENT",
  "payerRefundBps": 0,
  "payeeReleaseBps": 0,
  "privacyJudgement": "MINIMAL_REVEAL_SUFFICIENT" | "MORE_EVIDENCE_NEEDED" | "ADDITIONAL_CLAUSE_NEEDED" | "OVERDISCLOSURE_DETECTED",
  "safetyLabel": "SAFE_TO_REVIEW" | "NEEDS_HUMAN_LEGAL_REVIEW" | "REJECTED_UNSAFE" | "INSUFFICIENT_CONTEXT",
  "reasoning": "one to three short sentences tied only to the revealed clause and evidence",
  "paymentReasoning": "short explanation of the payment recommendation, or empty string if no payment action",
  "nextSteps": ["step one", "step two"],
  "confidence": 0.0
}
"""
        criteria = """
The output must be valid JSON with no markdown and no extra text.
All enum values must be from the allowed lists.
clauseVerified must be true because deterministic commitment verification already passed.
Do not rely on unrevealed clauses. Do not make legal enforceability claims.
If paymentDecision is RELEASE_TO_PAYEE, payerRefundBps=0 and payeeReleaseBps=10000.
If paymentDecision is REFUND_TO_PAYER, payerRefundBps=10000 and payeeReleaseBps=0.
If paymentDecision is SPLIT_PAYMENT, payerRefundBps + payeeReleaseBps must equal 10000.
If safetyLabel is REJECTED_UNSAFE, paymentDecision should be REFUND_TO_PAYER.
"""
        raw = gl.eq_principle.prompt_non_comparative(review_context, task=task, criteria=criteria)
        verdict = self._parse_verdict(raw, dispute, pact)
        dispute.verdict = verdict
        dispute.review_count = dispute.review_count + u256(1)
        dispute.status = DISPUTE_STATUS_RESOLVED
        self.disputes[d_key] = dispute
        action = verdict.recommended_action
        if action == "CONTINUE":
            pact.status = PACT_STATUS_RESOLVED_CONTINUE
        elif action == "PAUSE":
            pact.status = PACT_STATUS_RESOLVED_PAUSE
        elif action == "RENEGOTIATE":
            pact.status = PACT_STATUS_RESOLVED_RENEGOTIATE
        elif action in ["SETTLE", "REJECTED_UNSAFE"]:
            pact.status = PACT_STATUS_RESOLVED_SETTLE
        else:
            pact.status = PACT_STATUS_UNDER_REVIEW
        self.pacts[pact_id] = pact
        if self.privacy_entry_count > u256(0):
            entry = self.privacy_ledger[self.privacy_entry_count]
            if entry.pact_id == pact_id and entry.dispute_id == dispute_id:
                entry.safety_label = verdict.safety_label
                entry.payment_decision = verdict.payment_decision
                if verdict.privacy_judgement == "OVERDISCLOSURE_DETECTED":
                    entry.overdisclosure_warning = True
                self.privacy_ledger[self.privacy_entry_count] = entry

    def _parse_verdict(self, raw: str, dispute: Dispute, pact: Pact) -> Verdict:
        try:
            start = raw.find("{")
            end = raw.rfind("}") + 1
            self._require(start >= 0 and end > start, "No JSON object in LLM output")
            data = json.loads(raw[start:end])
            clause_verified = bool(data.get("clauseVerified", False))
            clause_relevant = str(data.get("clauseRelevant", "NOT_RELEVANT"))
            evidence_strength = str(data.get("evidenceStrength", "INSUFFICIENT"))
            breach_likelihood = str(data.get("breachLikelihood", "UNCLEAR"))
            recommended_action = str(data.get("recommendedAction", "REQUEST_MORE_EVIDENCE"))
            payment_decision = str(data.get("paymentDecision", "NO_PAYMENT_ACTION"))
            privacy_judgement = str(data.get("privacyJudgement", "MORE_EVIDENCE_NEEDED"))
            safety_label = str(data.get("safetyLabel", "INSUFFICIENT_CONTEXT"))
            try:
                payer_refund_bps_int = int(data.get("payerRefundBps", 0))
            except Exception:
                payer_refund_bps_int = 0
            try:
                payee_release_bps_int = int(data.get("payeeReleaseBps", 0))
            except Exception:
                payee_release_bps_int = 0
            payer_refund_bps_int = max(0, min(BPS_DENOMINATOR, payer_refund_bps_int))
            payee_release_bps_int = max(0, min(BPS_DENOMINATOR, payee_release_bps_int))
            reasoning = self._shorten(str(data.get("reasoning", "")), MAX_REASONING_LEN)
            payment_reasoning = self._shorten(str(data.get("paymentReasoning", "")), 700)
            next_steps_value = data.get("nextSteps", [])
            if not isinstance(next_steps_value, list):
                next_steps_value = [str(next_steps_value)]
            next_steps = json.dumps([str(s)[:220] for s in next_steps_value[:5]])
            try:
                confidence_float = float(data.get("confidence", 0.5))
            except Exception:
                confidence_float = 0.5
            confidence_float = max(0.0, min(1.0, confidence_float))
            if clause_relevant not in ALLOWED_CLAUSE_RELEVANCE:
                clause_relevant = "NOT_RELEVANT"
            if evidence_strength not in ALLOWED_EVIDENCE_STRENGTH:
                evidence_strength = "INSUFFICIENT"
            if breach_likelihood not in ALLOWED_BREACH_LIKELIHOOD:
                breach_likelihood = "UNCLEAR"
            if recommended_action not in ALLOWED_RECOMMENDED_ACTIONS:
                recommended_action = "REQUEST_MORE_EVIDENCE"
            if payment_decision not in ALLOWED_PAYMENT_DECISIONS:
                payment_decision = "NO_PAYMENT_ACTION"
            if privacy_judgement not in ALLOWED_PRIVACY_JUDGEMENT:
                privacy_judgement = "MORE_EVIDENCE_NEEDED"
            if safety_label not in ALLOWED_SAFETY_LABELS:
                safety_label = "INSUFFICIENT_CONTEXT"
            safety_text = reasoning + " " + payment_reasoning + " " + dispute.claim + " " + dispute.evidence_summary + " " + dispute.response_json
            if self._contains_prohibited_keyword(safety_text) or safety_label == "REJECTED_UNSAFE":
                safety_label = "REJECTED_UNSAFE"
                recommended_action = "REJECTED_UNSAFE"
                payment_decision = "REFUND_TO_PAYER"
                payer_refund_bps_int = BPS_DENOMINATOR
                payee_release_bps_int = 0
                reasoning = "This dispute appears to involve prohibited activity. VeilPact cannot facilitate enforcement."
                payment_reasoning = "Unsafe or prohibited pacts are not enforced; the funded amount should be returned to the payer in the MVP."
                next_steps = '["Do not use VeilPact for prohibited or unsafe agreements."]'
                confidence_float = 1.0
            if int(pact.funded_amount) == 0:
                payment_decision = "NO_PAYMENT_ACTION"
                payer_refund_bps_int = 0
                payee_release_bps_int = 0
            if evidence_strength in ["INSUFFICIENT", "WEAK"] and recommended_action in ["SETTLE", "RENEGOTIATE"]:
                recommended_action = "REQUEST_MORE_EVIDENCE"
                breach_likelihood = "UNCLEAR"
                if payment_decision not in ["PAUSE_PAYMENT", "NO_PAYMENT_ACTION"]:
                    payment_decision = "PAUSE_PAYMENT"
                    payer_refund_bps_int = 0
                    payee_release_bps_int = 0
            if payment_decision == "RELEASE_TO_PAYEE":
                payer_refund_bps_int = 0
                payee_release_bps_int = BPS_DENOMINATOR
            elif payment_decision == "REFUND_TO_PAYER":
                payer_refund_bps_int = BPS_DENOMINATOR
                payee_release_bps_int = 0
            elif payment_decision == "SPLIT_PAYMENT":
                if payer_refund_bps_int + payee_release_bps_int != BPS_DENOMINATOR:
                    payment_decision = "PAUSE_PAYMENT"
                    payer_refund_bps_int = 0
                    payee_release_bps_int = 0
            elif payment_decision in ["NO_PAYMENT_ACTION", "PAUSE_PAYMENT"]:
                payer_refund_bps_int = 0
                payee_release_bps_int = 0
            return Verdict(clause_verified, clause_relevant, evidence_strength, breach_likelihood, recommended_action, payment_decision, u256(payer_refund_bps_int), u256(payee_release_bps_int), privacy_judgement, safety_label, reasoning, payment_reasoning, next_steps, str(confidence_float))
        except Exception:
            return Verdict(True, "PARTIALLY_RELEVANT", "INSUFFICIENT", "UNCLEAR", "REQUEST_MORE_EVIDENCE", "PAUSE_PAYMENT", u256(0), u256(0), "MORE_EVIDENCE_NEEDED", "INSUFFICIENT_CONTEXT", "The review output could not be parsed safely. Submit clearer structured evidence or request a narrow review again.", "Payment remains paused because the review output could not be parsed safely.", '["Submit a clearer evidence bundle.", "Avoid revealing unrelated clauses."]', "0.1")

    @gl.public.write
    def apply_settlement_decision(self, pact_id: u256, dispute_id: u256) -> None:
        self._require(pact_id in self.pacts, "Pact not found")
        pact = self.pacts[pact_id]
        self._require(self._is_party(pact), "Not a party to this pact")
        self._require(int(pact.funded_amount) > 0, "No funded settlement")
        self._require(pact.payment_status in [PAYMENT_STATUS_LOCKED, PAYMENT_STATUS_PAUSED], "Payment not locked or paused")
        self._require(not pact.settlement_applied, "Settlement already applied")
        d_key = self._dispute_key(pact_id, dispute_id)
        self._require(d_key in self.disputes, "Dispute not found")
        dispute = self.disputes[d_key]
        self._require(dispute.status == DISPUTE_STATUS_RESOLVED, "Dispute must be resolved")
        verdict = dispute.verdict
        decision = verdict.payment_decision
        if verdict.safety_label == "REJECTED_UNSAFE" or verdict.recommended_action == "REJECTED_UNSAFE":
            pact = self._set_claimables_from_bps(pact, u256(BPS_DENOMINATOR), u256(0), PAYMENT_STATUS_CLAIMABLE)
        elif decision == "NO_PAYMENT_ACTION":
            raise gl.vm.UserError("Verdict has no payment action")
        elif decision == "PAUSE_PAYMENT":
            pact.payment_status = PAYMENT_STATUS_PAUSED
            pact.status = PACT_STATUS_RESOLVED_PAUSE
            self.pacts[pact_id] = pact
            return
        elif decision == "RELEASE_TO_PAYEE":
            pact = self._set_claimables_from_bps(pact, u256(0), u256(BPS_DENOMINATOR), PAYMENT_STATUS_CLAIMABLE)
        elif decision == "REFUND_TO_PAYER":
            pact = self._set_claimables_from_bps(pact, u256(BPS_DENOMINATOR), u256(0), PAYMENT_STATUS_CLAIMABLE)
        elif decision == "SPLIT_PAYMENT":
            pact = self._set_claimables_from_bps(pact, verdict.payer_refund_bps, verdict.payee_release_bps, PAYMENT_STATUS_CLAIMABLE)
        else:
            raise gl.vm.UserError("Unsupported payment decision")
        pact.status = PACT_STATUS_RESOLVED_SETTLE
        self.pacts[pact_id] = pact

    @gl.public.write
    def claim_payer_refund(self, pact_id: u256) -> None:
        self._require(pact_id in self.pacts, "Pact not found")
        pact = self.pacts[pact_id]
        self._require(gl.message.sender_address == pact.payer, "Only payer can claim refund")
        self._require(int(pact.payer_claimable) > 0, "No payer refund claimable")
        self._require(not pact.payer_claimed, "Payer refund already claimed")
        self._require(pact.settlement_applied, "Settlement not applied")
        amount = pact.payer_claimable
        pact.payer_claimed = True
        if self._all_claimed_or_zero(pact):
            pact.payment_status = PAYMENT_STATUS_CLAIMED
            pact.status = PACT_STATUS_CLOSED
            pact.closed_at = self._now()
        elif int(pact.payee_claimable) > 0:
            pact.payment_status = PAYMENT_STATUS_SPLIT
        else:
            pact.payment_status = PAYMENT_STATUS_REFUNDED
        self.pacts[pact_id] = pact
        self._pay(pact.payer, amount)

    @gl.public.write
    def claim_payee_payment(self, pact_id: u256) -> None:
        self._require(pact_id in self.pacts, "Pact not found")
        pact = self.pacts[pact_id]
        self._require(gl.message.sender_address == pact.payee, "Only payee can claim payment")
        self._require(int(pact.payee_claimable) > 0, "No payee payment claimable")
        self._require(not pact.payee_claimed, "Payee payment already claimed")
        self._require(pact.settlement_applied, "Settlement not applied")
        amount = pact.payee_claimable
        pact.payee_claimed = True
        if self._all_claimed_or_zero(pact):
            pact.payment_status = PAYMENT_STATUS_CLAIMED
            pact.status = PACT_STATUS_CLOSED
            pact.closed_at = self._now()
        elif int(pact.payer_claimable) > 0:
            pact.payment_status = PAYMENT_STATUS_SPLIT
        else:
            pact.payment_status = PAYMENT_STATUS_RELEASED
        self.pacts[pact_id] = pact
        self._pay(pact.payee, amount)

    @gl.public.write
    def resolver_settle(self, pact_id: u256, dispute_id: u256, payer_refund_bps: u256, payee_release_bps: u256, settlement_reason: str) -> None:
        self._require_resolver()
        self._require(pact_id in self.pacts, "Pact not found")
        pact = self.pacts[pact_id]
        self._require(int(pact.funded_amount) > 0, "No funded settlement")
        self._require(pact.payment_status in [PAYMENT_STATUS_LOCKED, PAYMENT_STATUS_PAUSED], "Payment not locked or paused")
        self._require(not pact.settlement_applied, "Settlement already applied")
        self._validate_bps_pair(payer_refund_bps, payee_release_bps)
        d_key = self._dispute_key(pact_id, dispute_id)
        self._require(d_key in self.disputes, "Dispute not found")
        dispute = self.disputes[d_key]
        decision = "SPLIT_PAYMENT"
        if int(payer_refund_bps) == BPS_DENOMINATOR:
            decision = "REFUND_TO_PAYER"
        elif int(payee_release_bps) == BPS_DENOMINATOR:
            decision = "RELEASE_TO_PAYEE"
        v = dispute.verdict
        v.payment_decision = decision
        v.payer_refund_bps = payer_refund_bps
        v.payee_release_bps = payee_release_bps
        v.payment_reasoning = self._shorten(settlement_reason, 700)
        if v.recommended_action == "":
            v.recommended_action = "SETTLE"
        dispute.verdict = v
        dispute.status = DISPUTE_STATUS_RESOLVED
        self.disputes[d_key] = dispute
        pact = self._set_claimables_from_bps(pact, payer_refund_bps, payee_release_bps, PAYMENT_STATUS_CLAIMABLE)
        pact.status = PACT_STATUS_RESOLVED_SETTLE
        self.pacts[pact_id] = pact

    @gl.public.write
    def close_dispute(self, pact_id: u256, dispute_id: u256) -> None:
        self._require(pact_id in self.pacts, "Pact not found")
        pact = self.pacts[pact_id]
        self._require(self._is_party(pact), "Not a party to this pact")
        d_key = self._dispute_key(pact_id, dispute_id)
        self._require(d_key in self.disputes, "Dispute not found")
        dispute = self.disputes[d_key]
        self._require(dispute.status in [DISPUTE_STATUS_RESOLVED, DISPUTE_STATUS_REVEALED], "Dispute not closable")
        dispute.status = DISPUTE_STATUS_CLOSED
        self.disputes[d_key] = dispute

    @gl.public.view
    def get_pact(self, pact_id: u256) -> dict:
        self._require(pact_id in self.pacts, "Pact not found")
        p = self.pacts[pact_id]
        return {
            "pactId": int(p.pact_id), "partyA": str(p.party_a), "partyB": str(p.party_b),
            "agreementRoot": p.agreement_root, "rootSalt": p.root_salt, "metadataHash": p.metadata_hash,
            "clauseCommitments": self._commitments_for_pact(pact_id, p.clause_count), "clauseCount": int(p.clause_count),
            "status": p.status, "createdAt": int(p.created_at), "acceptedAt": int(p.accepted_at), "closedAt": int(p.closed_at),
            "disputeCount": int(p.dispute_count), "revealedCount": int(p.revealed_count),
            "payer": str(p.payer), "payee": str(p.payee), "expectedAmount": int(p.expected_amount), "fundedAmount": int(p.funded_amount),
            "payerClaimable": int(p.payer_claimable), "payeeClaimable": int(p.payee_claimable),
            "payerClaimed": p.payer_claimed, "payeeClaimed": p.payee_claimed,
            "paymentStatus": p.payment_status, "settlementApplied": p.settlement_applied,
            "closeProposalActive": p.close_proposal_active, "closeProposedBy": str(p.close_proposed_by), "closeProposedTarget": str(p.close_proposed_target),
        }

    @gl.public.view
    def get_clause_commitment(self, pact_id: u256, clause_index: u256) -> str:
        self._require(pact_id in self.pacts, "Pact not found")
        p = self.pacts[pact_id]
        self._require(int(clause_index) < int(p.clause_count), "Clause index out of range")
        key = self._commitment_key(pact_id, clause_index)
        self._require(key in self.clause_commitments, "Clause commitment not found")
        return self.clause_commitments[key]

    @gl.public.view
    def get_dispute(self, pact_id: u256, dispute_id: u256) -> dict:
        self._require(pact_id in self.pacts, "Pact not found")
        d_key = self._dispute_key(pact_id, dispute_id)
        self._require(d_key in self.disputes, "Dispute not found")
        d = self.disputes[d_key]
        v = d.verdict
        verdict = None
        if v.recommended_action:
            try:
                next_steps = json.loads(v.next_steps)
            except Exception:
                next_steps = []
            verdict = {
                "clauseVerified": v.clause_verified, "clauseRelevant": v.clause_relevant,
                "evidenceStrength": v.evidence_strength, "breachLikelihood": v.breach_likelihood,
                "recommendedAction": v.recommended_action, "paymentDecision": v.payment_decision,
                "payerRefundBps": int(v.payer_refund_bps), "payeeReleaseBps": int(v.payee_release_bps),
                "privacyJudgement": v.privacy_judgement, "safetyLabel": v.safety_label,
                "reasoning": v.reasoning, "paymentReasoning": v.payment_reasoning,
                "nextSteps": next_steps, "confidence": v.confidence,
            }
        return {
            "disputeId": int(d.dispute_id), "pactId": int(d.pact_id), "openedBy": str(d.opened_by),
            "clauseIndex": int(d.clause_index), "claim": d.claim, "requestedOutcome": d.requested_outcome,
            "evidenceSummary": d.evidence_summary, "status": d.status, "hasResponse": bool(d.response_json),
            "revealed": d.revealed, "reviewCount": int(d.review_count), "verdict": verdict,
        }

    @gl.public.view
    def get_reveals(self, pact_id: u256) -> list:
        self._require(pact_id in self.pacts, "Pact not found")
        pact = self.pacts[pact_id]
        result = []
        for i in range(1, int(pact.revealed_count) + 1):
            key = self._reveal_key(pact_id, u256(i))
            if key in self.reveals:
                r = self.reveals[key]
                result.append({
                    "revealId": int(r.reveal_id), "pactId": int(r.pact_id), "disputeId": int(r.dispute_id),
                    "clauseIndex": int(r.clause_index), "clauseCommitment": r.clause_commitment,
                    "revealedBy": str(r.revealed_by), "verified": r.verified, "revealedAt": int(r.revealed_at),
                    "payloadHash": r.payload_hash, "evidenceHash": r.evidence_hash,
                })
        return result

    @gl.public.view
    def get_user_pacts(self, address: str) -> list:
        addr = Address(address)
        count = self.user_pact_counts.get(addr, u256(0))
        result = []
        for i in range(1, int(count) + 1):
            key = self._user_pact_key(addr, u256(i))
            if key in self.user_pacts:
                pid = self.user_pacts[key]
                if pid in self.pacts:
                    p = self.pacts[pid]
                    result.append({
                        "pactId": int(p.pact_id), "partyA": str(p.party_a), "partyB": str(p.party_b),
                        "status": p.status, "agreementRoot": p.agreement_root, "metadataHash": p.metadata_hash,
                        "clauseCount": int(p.clause_count), "createdAt": int(p.created_at), "acceptedAt": int(p.accepted_at),
                        "revealedCount": int(p.revealed_count), "disputeCount": int(p.dispute_count),
                        "payer": str(p.payer), "payee": str(p.payee), "expectedAmount": int(p.expected_amount),
                        "fundedAmount": int(p.funded_amount), "paymentStatus": p.payment_status,
                        "payerClaimable": int(p.payer_claimable), "payeeClaimable": int(p.payee_claimable),
                    })
        return result

    @gl.public.view
    def get_privacy_ledger(self) -> list:
        result = []
        for i in range(1, int(self.privacy_entry_count) + 1):
            entry_id = u256(i)
            if entry_id in self.privacy_ledger:
                e = self.privacy_ledger[entry_id]
                result.append({
                    "entryId": int(e.entry_id), "pactId": int(e.pact_id), "disputeId": int(e.dispute_id),
                    "clauseIndex": int(e.clause_index), "revealedBy": str(e.revealed_by), "purpose": e.purpose,
                    "verified": e.verified, "revealedAt": int(e.revealed_at),
                    "overdisclosureWarning": e.overdisclosure_warning, "safetyLabel": e.safety_label,
                    "paymentDecision": e.payment_decision,
                })
        return result

    @gl.public.view
    def get_protocol_stats(self) -> dict:
        total_pacts = int(self.pact_count)
        active_pacts = 0
        total_disputes = 0
        total_revealed = 0
        overdisclosure_warnings = 0
        funded_pacts = 0
        locked_amount = 0
        claimable_amount = 0
        for i in range(1, total_pacts + 1):
            pid = u256(i)
            if pid in self.pacts:
                pact = self.pacts[pid]
                if pact.status == PACT_STATUS_ACTIVE:
                    active_pacts += 1
                if int(pact.funded_amount) > 0:
                    funded_pacts += 1
                if pact.payment_status == PAYMENT_STATUS_LOCKED:
                    locked_amount += int(pact.funded_amount)
                claimable_amount += int(pact.payer_claimable) + int(pact.payee_claimable)
                total_disputes += int(pact.dispute_count)
                total_revealed += int(pact.revealed_count)
        for i in range(1, int(self.privacy_entry_count) + 1):
            eid = u256(i)
            if eid in self.privacy_ledger and self.privacy_ledger[eid].overdisclosure_warning:
                overdisclosure_warnings += 1
        return {
            "totalPacts": total_pacts, "activePacts": active_pacts, "fundedPacts": funded_pacts,
            "lockedAmount": locked_amount, "claimableAmount": claimable_amount,
            "totalDisputes": total_disputes, "totalClausesRevealed": total_revealed,
            "overdisclosureWarnings": overdisclosure_warnings, "privacyLedgerEntries": int(self.privacy_entry_count),
        }

    @gl.public.view
    def get_hashing_spec(self) -> dict:
        return {
            "commitmentHash": "SHA-256",
            "canonicalJson": "json.dumps(sort_keys=True, separators=(',', ':'), ensure_ascii=False)",
            "clausePayloadVersion": CLAUSE_VERSION,
            "rootVersion": ROOT_VERSION,
            "network": NETWORK_ID,
            "note": "Frontend must generate commitments and roots with the exact same canonical JSON and SHA-256 algorithm.",
        }

    @gl.public.view
    def get_payment_spec(self) -> dict:
        return {
            "payableMethod": "fund_pact",
            "valueSource": "gl.message.value",
            "transferPattern": "_Recipient(Address(...)).emit_transfer(value=u256(amount))",
            "claimPattern": "settlement creates payer/payee claimable balances; claim methods transfer",
            "bpsDenominator": BPS_DENOMINATOR,
        }
