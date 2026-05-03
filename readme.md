# Trinethra — Fellow Performance Evaluator

Trinethra is a local AI-powered system that evaluates Fellows based on supervisor feedback transcripts. It converts unstructured feedback into structured performance insights while correcting for common supervisor biases.

---

## 🚀 Problem

Supervisor feedback is often:
- Subjective and biased (helpfulness, presence)
- Influenced by tone rather than actual capability
- Not aligned with structured evaluation criteria

This leads to inaccurate performance scoring.

---

## 💡 Solution

Trinethra uses a locally running LLM (via Ollama) to:

- Assign a performance score (1–10)
- Extract supporting evidence from transcript
- Map actions to business KPIs
- Identify gaps in performance
- Generate follow-up questions

---

## 🧠 Core Evaluation Framework

The system evaluates across 4 dimensions:

1. **Execution** — task completion reliability  
2. **Systems Building** — ability to create independent processes  
3. **KPI Impact** — measurable business outcomes  
4. **Change Management** — adoption of improvements  

---

## ⚠️ Key Design Principle

> High impact does NOT mean high score.

If a Fellow’s work depends heavily on their personal involvement:
- Personally handles tasks (calls, complaints, tracking)
- Work would stop or slow down if they leave

👉 Score is capped at **≤ 6**

This prevents overrating task-heavy performers.

---

## 🧩 Handling Supervisor Bias

The system explicitly corrects for:

- **Helpfulness bias** — “handles everything” ≠ high performance  
- **Presence bias** — “always on the floor” is not a performance metric  
- **Tone bias** — negative feedback does not imply low capability  

---

## 🔧 Tech Stack

- **Frontend:** HTML, CSS, Vanilla JavaScript  
- **Backend:** Node.js (Express)  
- **LLM:** Ollama (local models like Llama / Mistral)  

---

## ⚙️ Setup Instructions

### 1. Install Ollama  
https://ollama.com

### 2. Pull a model
```bash
ollama pull mistral
```

### 3. Run backend
```bash
node server.js
```

### 4. Open frontend  
Open `index.html` in your browser

---

##  Expected Behavior

| Fellow   | Expected Score |
|----------|--------------|
| Anil     | 5–6 |
| Karthik  | 6–7 |
| Meena    | 7 |

---

##  Limitations

- Local models may produce inconsistent JSON  
- Output formatting may vary  
- Requires normalization in frontend/backend for stability  

---

##  Key Learning

Building with LLMs is not about perfect prompts.  
It is about **handling imperfect outputs and enforcing rules consistently**.

---

##  Author

Raksha  

