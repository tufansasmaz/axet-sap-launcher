# Human review inside a flow

An agent that can send the mail, post the document or update the record needs a place
where a person says yes. This file is how that place is built in aXet.flows, and — just
as important — when it should not exist at all.

**Human review is a control, not a default interaction pattern.** A flow that asks
about everything trains its reviewer to approve everything, and then it is worse than
the flow that asked about nothing.

## When not to add a review step

| the situation | what to do instead |
|---|---|
| the action is read-only or trivially reversible | run it and log it |
| a deterministic rule can decide | schema validation, a policy check, a test |
| the answer is needed in seconds | safe automation, or an explicit "I could not do this" |
| the reviewer has neither the context nor the authority | fix routing and permissions, not the flow |
| *everything* ends up in review | fix retrieval, the prompt, the tools — the gate is hiding a quality problem |

Reach for review when the step is **consequential and not decidable by a rule**:
money leaves, a record changes, something is sent outside the company, or the model's
own confidence is low.

## The shape

The flow calls the agent **twice** around the human: once to produce a proposal, once
to resume with the decision. Everything between is ordinary Node-RED.

```
input  -> python-agent (start)
       -> switch on msg.payload.status
            "completed"          -> return the result
            "waiting_for_review" -> present the proposal (form / mail / ticket)
                                    -> collect the decision
                                    -> python-agent (resume, same run_id)
                                    -> switch on status  (loops back)
```

Five rules make it work, and each of them is a real failure when it is missing.

**1. The waiting node and the acting node are different nodes.** The step that collects
a decision must not also send the mail. Keep the side effect in its own node,
downstream of the branch that was approved.

**2. `run_id` is the thread.** The resume message carries the *same* `run_id` as the
start; that is what finds the paused state. Generate it once at the entry point and
carry it on `msg` — not in flow context, where two concurrent runs share one slot.

**3. The state is persisted, not remembered.** If the pause lives only in the agent
process, a container restart loses the request silently — and the reviewer is waiting
for a mail that will never be answered. LangGraph's `InMemorySaver` is a demo. In a
deployed flow use a durable checkpointer, or write the review item under
`/internal-storage-files/` yourself.

**4. Re-validate after the resume.** Between the proposal and the approval the world
moved: prices changed, the record was edited, the transport closed. Check the action is
still valid before executing it, and use an **idempotency key** — the `run_id` works —
so a resubmitted approval does not execute twice.

**5. LangGraph re-runs the interrupted node on resume.** Everything above the
`interrupt()` call executes a second time. Anything with a side effect must be above it
only if it is idempotent; otherwise move it below.

## The review record

One object, shared by the flow and whatever interface shows it to the person:

```json
{
  "review_id": "review-456",
  "run_id": "run-123",
  "status": "waiting_for_review",
  "requested_action": "tool_call",
  "payload": {"tool": "update_record", "arguments": {}},
  "evidence": [],
  "allowed_decisions": ["approve", "edit", "reject", "escalate"],
  "expires_at": "2026-09-30T12:00:00Z",
  "review": {
    "required_role": "support-manager",
    "decision": null,
    "comment": null,
    "reviewed_by": null,
    "reviewed_at": null
  }
}
```

Four fields carry more weight than they look like they do:

- **`allowed_decisions`** is a closed set. Free text is a comment, never a decision.
- **`expires_at`** — decide what happens when nobody answers. A review with no expiry
  is a request that disappears, and "the flow did nothing" is the hardest failure to
  notice. Expire, retry, or return a safe message; do not sit silently.
- **`required_role`** is checked at the moment of decision, not when the request was
  created.
- **`evidence`** is what makes the decision possible. Show the draft, the validation
  warnings, and the exact action approval authorises — a reviewer with too little
  context approves everything.

When a person **edits** rather than approves, keep both values:

```json
{"decision": "approved_with_edits",
 "fields": {"invoice_number": {"value": "INV-1042", "source": "human"},
            "total":          {"value": 1250.00,   "source": "ai"}},
 "comment": "Corrected the invoice number"}
```

That `source` field is the whole feedback loop. Without it you know the model was
wrong; with it you know *which field* it gets wrong, which is what turns into a
prompt fix, a validation rule, or a regression case.

## Hosting the agent: the python-agent node

The `python-agent` node is the execution boundary for LangChain / LangGraph / CrewAI /
AutoGen. Configure it for the application you are running:

| setting | what it is for |
|---|---|
| Entrypoint | the file defining `run(msg)` / `main(msg)` / `process(msg)` / `handle_message(msg, node_id)` |
| Requirements | the packages — `langchain`, `langgraph`, the provider integration |
| Auto Install | install the requirements at deployment |
| Environment | **UV (managed)** for an isolated runtime |
| Python version | 3.10 - 3.13 under UV |
| Dedicated Env | when this agent must not share dependencies with another python-agent |
| Timeout / memory | bounded, so a stuck run does not hold resources forever |
| API Gateway | only when the Python app must expose FastAPI HTTP handlers — not needed for an internal flow |
| LLM tab | enable aXet LLM and pick project/model when the agent uses the platform integration |

The handler returns something serialisable and makes the waiting state **visible to the
flow** rather than blocking inside Python:

```python
def run(msg: dict) -> dict:
    result = run_agent(msg)
    return {
        "status":   result["status"],          # "completed" | "waiting_for_review"
        "output":   result.get("output"),
        "review":   result.get("review"),
        "state_id": result.get("state_id"),
    }
```

The LangGraph side of that, both directions through one entrypoint:

```python
from langgraph.types import Command

def run(msg):
    config = {"configurable": {"thread_id": msg["run_id"]}}

    if "decision" in msg:
        state = graph.invoke(Command(resume=msg["decision"]), config=config)
    else:
        state = graph.invoke({"request": msg["request"]}, config=config)

    if "__interrupt__" in state:
        return {"status": "waiting_for_review",
                "run_id": msg["run_id"],
                "review": state["__interrupt__"]}
    return {"status": "completed",
            "run_id": msg["run_id"],
            "output": state.get("result")}
```

**Never return a secret in the flow message.** `msg` is persisted unencrypted, the same
rule as everywhere else in this platform.

## Testing it

The happy path is the one case that does not need a test. These do:

- validation passes and the flow completes with no review at all;
- a risk rule fires and a review is created;
- approval by someone **without** the required role;
- rejection with a reason, and edit-before-execute;
- an expired review;
- the **same approval submitted twice**;
- a restart while a review is waiting;
- the final external action failing *after* approval;
- an audit trail exists for every one of those outcomes.

## The mistakes that recur

| mistake | consequence |
|---|---|
| pausing without persistence | a restart loses the request, silently |
| letting the model approve itself | there is no control, only the appearance of one |
| no idempotency key | a retried approval executes the action twice |
| review and execution in one node | the side effect fires while the decision is still open |
| too little evidence shown | the reviewer approves everything |
| no expiry or fallback | the flow stops forever and nobody is told |
| free-text feedback only | you cannot count failures, so you cannot fix them |
