const express = require('express');
const cors = require('cors');
const { jsonrepair } = require('jsonrepair');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Server is running');
});

app.post('/analyze', async (req, res) => {
  const { transcript } = req.body;

  if (!transcript || transcript.trim().length < 10) {
    return res.status(400).json({ error: "Transcript too short or missing" });
  }

  try {
    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2',
        format: 'json',
        prompt: `
You are a rigorous Fellow performance evaluator for DeepThought. Your job is to resist supervisor bias and score based on evidence, not sentiment.

RUBRIC:
1: Not Interested | 2: Lacks Discipline | 3: Motivated but Directionless
4: Careless and Inconsistent | 5: Consistent Performer | 6: Reliable and Productive
7: Problem Identifier | 8: Problem Solver | 9: Innovative and Experimental | 10: Exceptional Performer

SCORING LOGIC:

- Score 5 → executes assigned tasks consistently
- Score 6 → reliable, high-trust execution, handles responsibilities independently
- Score 7 → identifies problems or introduces improvements beyond assigned tasks
- Score 8+ → builds systems or processes that reduce dependency and create sustained impact

CRITICAL RULES:

- HARD CONSTRAINT (DO NOT VIOLATE):

If the Fellow’s work depends heavily on their personal involvement (they run meetings, handle all coordination, or replace other team members):

→ The score MUST NOT exceed 6, regardless of impact or outcomes.

This rule overrides all other scoring logic.

DEPENDENCY CHECK (MANDATORY):

Before assigning score, ask:
"If this Fellow leaves tomorrow, will the work continue without them?"

- If NO → score ≤ 6
- If YES → systems building exists → score can be 7+

- If work would stop when they leave → NOT systems building
- Strong outcomes alone are NOT enough for high score

KEY DISTINCTION:

- Execution = doing assigned work → max 6
- Problem identification = noticing issues independently → 7
- Systems building = creating processes that reduce dependency → 8+

FOUR DIMENSIONS TO ASSESS:

1. execution: Does the Fellow get things done without reminders?
2. systems_building: Did the Fellow create anything that runs without them?
3. kpi_impact: Did their work connect to measurable business outcomes?
4. change_management: Did the Fellow get the floor team to adopt new processes?

THE 8 KPIs — map supervisor words to these labels:

- TAT: faster dispatch, saved time, missed fewer deadlines
- Quality: fewer complaints, rejection rate dropped, defects reduced
- NPS: retailers happier, customers satisfied
- PAT: costs down, waste reduced
- Lead Generation, Lead Conversion, Upselling, Cross-selling for sales contexts

SUPERVISOR BIAS — actively counteract these:

1. Helpfulness bias: “handles everything” = task absorption, not systems building (max score 6)
2. Presence bias: “always on the floor” is not a performance signal
3. Halo effect: one impressive story ≠ strong system capability
4. Recency bias: one recent win ≠ consistent performance
5. Critical bias: negative tone may hide real systems work — check actual actions

CRITICAL TRAPS:

- Running meetings, calls, planning personally = task absorption → score 5–6
- Quantifying something nobody had measured before = problem identification → score 7
- Glowing supervisor + dependency = score 5–6 (NOT 8–9)
- Critical supervisor + real systems built = score 7–8 (NOT low score)

OUTPUT STRUCTURE:

Return a single JSON object with these exact top-level keys:
score, evidence, kpiMapping, gaps, followUpQuestions

Do NOT nest evidence inside score.

score:
- value (number 1–10)
- label (rubric label)
- justification (2–3 sentences explaining reasoning and why score is NOT higher)

evidence:
- At least 2 items
- Each must include:
  - quote (exact words from transcript)
  - interpretation (what it signals)
  - dimension (execution / systems_building / kpi_impact / change_management)
  - signal (positive / negative / neutral)

kpiMapping:
- At least 1 item
- Each must include:
  - kpi (TAT / Quality / NPS / PAT / etc.)
  - description (how the Fellow impacted it)

gaps:
- At least 2 items
- Each must include:
  - gap (which dimension is weak/missing)
  - importance (why it matters)

followUpQuestions:
- At least 2 items
- Each must include:
  - question
  - targetGap

IMPORTANT:
- Return ONLY valid JSON
- Do NOT include any text before or after JSON
- Ensure all string values are properly quoted

Transcript:
${transcript}
`,
        stream: false
      })
    });

    const data = await response.json();
    console.log("OLLAMA RAW RESPONSE:", data.response);

    let parsed;
    try {
      parsed = JSON.parse(data.response);
    } catch (err) {
      console.log("⚠️ Attempting repair...");
      try {
        parsed = JSON.parse(jsonrepair(data.response));
      } catch (err2) {
        console.log("❌ Parse failed:", err2.message);
        return res.json({ raw: data.response });
      }
    }

    // Normalize: if model nested evidence inside score, lift it out
    if (parsed.score && parsed.score.evidence && !parsed.evidence) {
      parsed.evidence = parsed.score.evidence;
      delete parsed.score.evidence;
    }
      // If evidence contains a systems_building or problem identification signal,
// enforce minimum score of 7

    if (!parsed.score || !parsed.evidence) {
      return res.json({
        warning: "Incomplete structured output",
        raw: data.response
      });
    }

    res.json(parsed);

  } catch (error) {
    console.error("FULL ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});