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

SCORING RULES:
- Score 5: does assigned tasks reliably
- Score 6: high trust, minimal follow-up needed, supervisor can give and forget
- Score 7+: ONLY if Fellow identified a problem the supervisor had NOT already articulated
- The difference between 6 and 7 is WHO defines the problem. A 6 solves problems given to them. A 7 finds problems nobody asked them to find.

THE SURVIVABILITY TEST — apply to every transcript:
Ask: If this Fellow left tomorrow, what would keep running on its own?
- If the answer is nothing, that is a systems_building gap and score cannot exceed 6.
- If the answer is a tracker, SOP, or process they built, that is systems_building evidence.

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
1. Helpfulness bias: She handles all my calls now = task absorption, not systems building. Score max 6.
2. Presence bias: Always on the floor is not a performance signal. Ignore it.
3. Halo effect: One impressive personal crisis story does not prove systems building.
4. Recency bias: One recent win does not override a pattern of task execution.
5. Critical bias: Supervisor complaints about too much laptop time may mask real systems work. Look at what was actually built.

CRITICAL TRAPS:
- Fellow personally running meetings, calls, and planning = task absorption. Score 5-6.
- Fellow who quantifies something nobody had measured before = problem identification. Score 7.
- Glowing supervisor but describes personal dependency = score 5-6, not 8-9.
- Critical supervisor but describes real systems built = score 7-8, not 4.

OUTPUT STRUCTURE:
Return a single JSON object with these exact top-level keys: score, evidence, kpiMapping, gaps, followUpQuestions.
Do NOT nest evidence inside score.

score is an object with: value (number 1-10), label (rubric label), justification (2-3 sentences citing specific transcript actions and explaining why score is not higher).

evidence is an array of at least 2 objects. Each object has: quote (exact words from transcript), interpretation (what it signals about the Fellow), dimension (one of: execution, systems_building, kpi_impact, change_management), signal (one of: positive, negative, neutral).

kpiMapping is an array of at least 1 object. Each object has: kpi (one of: TAT, Quality, NPS, PAT, Lead Generation, Lead Conversion, Upselling, Cross-selling), description (what the Fellow did that connects to this KPI).

gaps is an array of at least 2 objects. Each object has: gap (which dimension is missing or weak), importance (why it matters for this Fellow).

followUpQuestions is an array of at least 2 objects. Each object has: question (what to ask the supervisor next), targetGap (which gap this addresses).

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
const hasLevel7Signal = (parsed.evidence || []).some(e =>
  e.dimension === 'systems_building' && e.signal === 'positive' ||
  (e.quote && e.quote.toLowerCase().includes('nobody')) ||
  (e.interpretation && e.interpretation.toLowerCase().includes('problem identif'))
);

if (hasLevel7Signal && parsed.score.value < 7) {
  parsed.score.value = 7;
  parsed.score.label = 'Problem Identifier';
  parsed.score.justification += ' Score adjusted to 7: evidence of independent problem identification detected.';
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