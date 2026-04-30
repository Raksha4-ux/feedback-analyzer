const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.send('Server is running');
});

// MAIN ANALYZE ROUTE
app.post('/analyze', async (req, res) => {
  const { transcript } = req.body;

  try {
    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2',
        prompt: `
You are evaluating a Fellow based on supervisor feedback.

Use this logic strictly:

SCORING RULE:
- Score 1–6 → only execution (doing assigned tasks)
- Score 7+ → ONLY if there is clear problem identification or systems building
- Do NOT overrate helpfulness or sincerity

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

ANALYZE ON THESE DIMENSIONS:
- execution
- systems_building
- kpi_impact
- change_management

IMPORTANT:
- Extract MULTIPLE quotes (2–4 minimum if possible)
- Map at least 1 KPI if any operational impact is implied
- Identify missing dimensions clearly
- Be critical, not generous

Return ONLY valid JSON.

FORMAT:
{
  "score": {
    "value": number,
    "label": "",
    "justification": ""
  },
  "evidence": [
    {
      "quote": "",
      "signal": "positive/negative/neutral",
      "dimension": "",
      "interpretation": ""
    }
  ],
  "kpiMapping": [
    {
      "kpi": "",
      "evidence": "",
      "systemOrPersonal": ""
    }
  ],
  "gaps": [
    {
      "dimension": "",
      "detail": ""
    }
  ],
  "followUpQuestions": [
    {
      "question": "",
      "targetGap": "",
      "lookingFor": ""
    }
  ]
}

Transcript:
${transcript}
`
,
        stream: false
      })
    });

    const data = await response.json();

    console.log("OLLAMA RAW RESPONSE:", data.response);

  let parsed;

try {
  parsed = JSON.parse(data.response);
} catch (e) {
  console.log("JSON parse failed, sending raw text");
  parsed = { raw: data.response };
}

res.json(parsed);

  } catch (error) {
    console.error("FULL ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});