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
    // 🔥 TIMEOUT FIX ADDED HERE
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000); // 3min

    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mistral',
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
HARD OVERRIDE — PROBLEM IDENTIFICATION:

If the transcript contains ANY of the following:
- quantified issue (e.g., percentages, counts, before/after numbers)
- explicit comparison across lines/teams (e.g., "Line 3 has 14% vs 6% elsewhere")
- creation of SOP / tracker / analysis that did not exist earlier

THEN:
- score MUST be at least 7 (Problem Identifier)
- Do NOT reduce score due to criticism like "not on floor", "too much laptop", or "low adoption"
- Penalize ONLY in change_management, not in overall score below 7
HARD CONSTRAINT (DO NOT VIOLATE):
If the Fellow’s work depends heavily on their personal involvement:
→ score MUST NOT exceed 6

DEPENDENCY CHECK:
If Fellow leaves tomorrow:
- If work stops → score ≤ 6
- If work continues → score can be 7+

KEY DISTINCTION:
- Execution → max 6
- Problem identification → 7
- Systems building → 8+

OUTPUT STRUCTURE:
Return ONLY valid JSON with:
score, evidence, kpiMapping, gaps, followUpQuestions

Transcript:
${transcript}
`,
        stream: false
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

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

    if (!parsed.score || !parsed.evidence) {
      return res.json({
        warning: "Incomplete structured output",
        raw: data.response
      });
    }


// FINAL NORMALIZATION (robust)

if (typeof parsed.score === "number") {
  parsed.score = {
    value: parsed.score,
    label: "",
    justification: ""
  };
}

// Fix evidence
if (!Array.isArray(parsed.evidence)) {
  parsed.evidence = [
    {
      quote: parsed.evidence || "No evidence provided",
      interpretation: "",
      dimension: "",
      signal: "neutral"
    }
  ];
}

// Fix KPI mapping
if (!Array.isArray(parsed.kpiMapping)) {
  parsed.kpiMapping = [
    {
      kpi: "",
      description: parsed.kpiMapping || ""
    }
  ];
}

// Fix gaps
if (!Array.isArray(parsed.gaps)) {
  parsed.gaps = [
    {
      gap: "",
      importance: parsed.gaps || "Not specified"
    }
  ];
}

// Fix follow-up questions
if (!Array.isArray(parsed.followUpQuestions)) {
  parsed.followUpQuestions = [];
}
// 🔒 Force minimum score if clear problem-identification signals exist
const t = transcript.toLowerCase();

const hasProblemSignal =
  t.includes('%') ||
  t.includes('rejection') ||
  t.includes('rate') ||
  t.includes('compared') ||
  t.includes('sop') ||
  t.includes('tracker') ||
  t.includes('analysis') ||
  t.includes('line');

if (hasProblemSignal && parsed.score.value < 7) {
  parsed.score.value = 7;
  parsed.score.label = "Problem Identifier";
  parsed.score.justification =
    (parsed.score.justification || "") +
    " Score raised to 7 due to clear problem identification (quantification/system creation), with deductions only in change management.";
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