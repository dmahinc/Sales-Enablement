# AI Agent Review & Recommendations

## Executive Summary

The AI agent has recurring issues understanding user requests, especially for message-sending ("Dis à Laetitia que j'arrive"). This document reviews the current architecture and proposes improvements to create a more reliable conversation flow.

---

## Current Architecture

### Components
- **agent_service.py**: Orchestrates the tool-calling loop, manages sessions, confirmation flow
- **agent_tools.py**: 25+ tools (search, share, messages, requests, etc.)
- **ai_service.py**: Calls OVHcloud AI Endpoint (Mistral-Small-3.2-24B-Instruct)
- **AgentPanel.tsx**: Frontend chat UI with confirm/cancel for write actions

### Flow
1. User sends message → `process_message()`
2. Rule-based intent detection (only for "dis à X que Y" / "tell X that Y")
3. AI receives system prompt + history + tools → returns tool_calls or text
4. Read-only tools: execute immediately, add result to history, re-call AI
5. Write tools: queue `pending_action`, ask user to confirm
6. On confirm: execute tool, re-call AI for follow-up

---

## Identified Issues

### 1. **Prompt Overload & Contradictions**
- The system prompt has grown to ~15 guidelines with many "do NOT" rules
- Contradictions: "use list_my_customers then send_message" vs "call send_message directly with customer_email"
- The AI receives too many instructions and may prioritize incorrectly

### 2. **Tool Choice Confusion**
- **search_materials** vs **list_my_customers**: AI sometimes calls search_materials for "Laetitia Arlogis" (a person)
- **check_customer_engagement** vs **send_message_to_customer**: AI calls engagement first when user wants to send a message
- **customer_id** vs **customer_email**: AI uses IDs from get_conversations (which can be message IDs) instead of email

### 3. **Multi-Turn Drift**
- In long conversations, the AI loses focus: user says "J'arrive" (the message to send), AI asks "What message do you want to send?"
- Context from earlier turns (e.g. "Dis à Laetitia que j'arrive") is not carried forward

### 4. **Default "Done" Fallback**
- When AI returns empty content, the system defaults to "Done." — misleading when no action was taken
- No distinction between "success" and "AI gave up"

### 5. **Limited Rule-Based Coverage**
- Only 2 patterns: "dis à X que Y" and "tell X that Y"
- Misses: "envoie un message à X", "message X : Y", "notify X", variations with ":" instead of "que"

### 6. **Model Limitations**
- Mistral-Small may struggle with complex tool-chaining and strict instruction-following
- Temperature 0.3 is conservative but may not be enough for consistent tool selection

### 7. **No Intent Classification**
- Every request goes to the full AI with all tools
- No pre-step to classify intent (e.g. "send_message" vs "search" vs "engagement") and route accordingly

---

## Recommendations

### A. Short-Term (Quick Wins)

#### A1. Expand Rule-Based Intents
Add more patterns for message-sending before the AI is called:
```
- "envoie un message à X : Y" / "envoie un message à X, Y"
- "message X : Y" / "message à X que Y"
- "notify X that Y" / "notify X : Y"
- "écris à X que Y" / "écris à X : Y"
```

#### A2. Replace "Done" with Contextual Fallback
When AI returns empty content:
- If last user message contained message-sending intent → "I couldn't send the message. Please try: 'Dis à [nom] que [message]'."
- Otherwise → "I processed your request. Is there anything else?"

#### A3. Simplify System Prompt
- Reduce to 5–7 core rules
- One clear rule per intent type (search, share, message, engagement)
- Remove redundant "do NOT" clauses

#### A4. Add Intent Routing (Lightweight)
Before calling the full AI, run a fast classification:
- "send_message" → rule-based or dedicated flow
- "engagement" → check_customer_engagement only
- "search" → search_materials only
- "other" → full AI with all tools

### B. Medium-Term (Structural)

#### B1. Two-Phase Tool Selection
**Phase 1**: AI returns only the intent + extracted params (no tool execution)
- E.g. `{"intent": "send_message", "recipient": "Laetitia Arlogis", "message": "J'arrive"}`
- User confirms the interpretation

**Phase 2**: Execute the confirmed action
- Reduces wrong tool calls and ID mix-ups

#### B2. Structured Tool Responses
- Have tools return structured JSON (not just text) when possible
- E.g. `get_conversations` returns `{customers: [{id, name, email}, ...]}`
- AI can use these structures directly instead of parsing free text

#### B3. Conversation Memory
- Store "current task" in the session (e.g. "sending message to Laetitia")
- When user says "oui" or "J'arrive", resolve against current task
- Avoids "What message?" when the message was already given

#### B4. Tool Descriptions as Decision Tree
- Group tools by intent in the schema
- E.g. `message_tools: [send_message_to_customer, send_message_to_sales_contact]`
- Add `tool_groups` or tags so the AI picks the right category first

### C. Long-Term (Architecture)

#### C1. Consider a Stronger Model for Agent
- Mistral-Small may be insufficient for reliable tool use
- Evaluate Mistral-Large or Llama 3.1 70B for the agent
- Or use a smaller model for intent classification + current model for execution

#### C2. Hybrid: Rules + AI
- **Rules** for high-confidence intents (message-sending, simple searches)
- **AI** for ambiguous or multi-step requests
- Reduces cost and improves reliability for common cases

#### C3. User Feedback Loop
- "Was this helpful?" after each response
- Log failures (e.g. wrong tool, wrong ID) for prompt tuning
- A/B test prompt variations

#### C4. Few-Shot Examples in Prompt
- Add 3–5 example exchanges to the system prompt:
  - User: "Dis à Laetitia que j'arrive" → Assistant: [calls send_message_to_customer with customer_name="Laetitia", message="J'arrive"]
  - User: "A-t-elle téléchargé le deck?" → Assistant: [calls check_customer_engagement]
- Improves consistency for similar requests

---

## Priority Implementation Order

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| 1 | A1: Expand rule-based intents | Low | High |
| 2 | A3: Simplify system prompt | Low | Medium |
| 3 | B3: Conversation memory for "current task" | Medium | High |
| 4 | A2: Replace "Done" fallback | Low | Medium |
| 5 | B1: Two-phase tool selection | Medium | High |
| 6 | C4: Few-shot examples | Low | Medium |
| 7 | A4: Intent routing | Medium | Medium |

---

## Example: Improved Message-Sending Flow

**Current (problematic):**
```
User: Dis à Laetitia de la société Arlogis que j'arrive
AI: [calls check_customer_engagement, list_my_customers] 
AI: Laetitia a consulté... Je peux lui envoyer un message. Voulez-vous que je lui envoie ?
User: oui
AI: Quel message souhaitez-vous lui envoyer ?
User: J'arrive
AI: [calls send_message_to_customer with customer_id=11371]  ← wrong ID
Error: Customer not found
```

**Target (with recommendations):**
```
User: Dis à Laetitia de la société Arlogis que j'arrive
→ Rule-based match: customer_name="Laetitia de la société Arlogis", message="j'arrive"
→ Pending action: Send message to Laetitia de la société Arlogis: "j'arrive"
User: Confirme
→ Executed. Message sent.
```

Or, if rule doesn't match:
```
User: Peux-tu prévenir Laetitia que j'arrive ?
→ Intent routing: send_message
→ AI (with few-shot): [calls send_message_to_customer with customer_name="Laetitia", message="J'arrive"]
→ Pending action for confirmation
```

---

## Conclusion

The main issues are: (1) too many competing instructions, (2) wrong tool selection, (3) ID vs name/email confusion, and (4) loss of context in multi-turn flows. Implementing A1, A3, and B3 first should significantly improve reliability for message-sending and similar tasks.
