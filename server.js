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

STRICT SCORING LOGIC:
- Score 1–6 → execution only
- Score 7+ → ONLY if independent problem identification or systems building exists
- If unclear → default to lower score
- You MUST explain why the score is NOT higher

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
- Extract at least 2 quotes (if possible)
- Try to map at least 1 KPI
- Identify missing dimensions clearly
- Be critical — not generous

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
      console.log("⚠️ JSON parse failed");
      return res.json({ raw: data.response });
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