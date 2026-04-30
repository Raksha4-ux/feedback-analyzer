const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.send('Server is running');
});

app.post('/analyze', async (req, res) => {
  const { transcript } = req.body;

  //  Input validation
  if (!transcript || transcript.trim().length < 10) {
    return res.status(400).json({ error: "Transcript too short or missing" });
  }

  try {
    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2',
        prompt: `
You are evaluating a Fellow based on supervisor feedback.

SCORING LOGIC:
- Score 5 → consistent execution of assigned tasks
- Score 6 → high-trust execution (tasks completed independently, minimal follow-up needed)
- Score 7+ → ONLY if independent problem identification or systems building exists

RUBRIC LABELS (USE EXACTLY):
1: Not Interested
2: Lacks Discipline
3: Motivated but Directionless
4: Careless and Inconsistent
5: Consistent Performer
6: Reliable and Productive
7: Problem Identifier
8: Problem Solver
9: Innovative and Experimental
10: Exceptional Performer

DIMENSIONS:
- execution
- systems_building
- kpi_impact
- change_management

REQUIREMENTS:
- Extract at least 2 DIRECT quotes from the transcript (no paraphrasing)
- Quotes MUST be exact phrases from the transcript
- Each quote must include interpretation explaining what it signals

- KPI Mapping:
  - Always attempt to map at least 1 KPI if any operational work is described
  - Infer KPIs like:
    - time saved → TAT
    - complaints → Quality
    - coordination → NPS or TAT

- Gaps:
  - MUST be specific
  - Do NOT write "no detail"
  - Explain what is missing and why it matters

- Justification:
  - MUST reference at least 1–2 specific actions from transcript
  - MUST explain why score is NOT higher (especially 6 vs 7)



IMPORTANT:
- Strong execution alone can justify a 6
- Do NOT reduce score below 6 if the Fellow shows high reliability and ownership in execution
- Reduce score only if execution is inconsistent or passive

Return ONLY valid JSON.

FORMAT:
{
  "score": {
    "value": number,
    "label": "",
    "justification": ""
  },
  "evidence": [],
  "kpiMapping": [],
  "gaps": [],
  "followUpQuestions": []
}

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
} catch (e) {
  console.log("⚠️ Direct parse failed, trying extraction...");

  try {
    // Extract JSON manually using regex
    const match = data.response.match(/\{[\s\S]*\}/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      throw new Error("No JSON found");
    }
  } catch (err) {
    console.log("❌ JSON extraction failed");
    return res.json({ raw: data.response });
  }
}
   
  
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