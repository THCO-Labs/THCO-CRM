import { useState, useEffect, useRef, useCallback } from "react";
import { assessmentAPI } from "../lib/api";
import { Check, Lock } from "lucide-react";

const QUESTIONS = [
  { id: "q1", type: "textarea", text: "Tell us about yourself — but don't tell us what you've built. Tell us who you are." },
  { id: "q2", type: "radio", text: "If you could only work at ONE company for the rest of your career, which would you choose? You must pick one.", options: [
    "The first trillion-dollar African company that puts Africa on the global map",
    "The company that cures cancer and saves 1 million+ lives",
    "The company with the best culture in the world — where everyone loves coming to work",
    "The highest paying company in the world",
    "The company that finally makes the world take Black people seriously",
  ]},
  { id: "q3", type: "textarea", text: "Why did you pick that? Be completely honest — not what sounds good, what's actually true for you." },
  { id: "q4", type: "radio", text: "What drives you? Pick the ONE that is most honest, not the one that sounds best.", options: [
    "I want to prove to myself that I can build something extraordinary",
    "I want financial freedom for my family",
    "I want to be part of something that changes the world",
    "I want to master my craft and be the best at what I do",
    "I want to be recognised and respected in my field",
  ]},
  { id: "q5", type: "textarea", text: 'What does "being part of something big" actually mean to you? Don\'t give us the answer you think we want. Tell us what it really means when you imagine it.' },
  { id: "q6", type: "radio", text: "How smart do you think you are? Pick your estimated IQ range honestly.", options: [
    "Below average (below 100)",
    "Average (100)",
    "Above average (100–115)",
    "Smart (115–130)",
    "Very smart (130–145)",
    "Genius level (145+)",
    "I don't think IQ measures real intelligence",
  ]},
  { id: "q7", type: "textarea", text: "Why did you pick that? What makes you believe this about yourself?" },
  { id: "q8", type: "radio", text: "Does order and structure make sense to you? Why or why not?", options: [
    "Order is essential — without it, nothing gets shipped",
    "Some order, but too much kills creativity",
    "Chaos is where the best ideas come from",
    "It depends entirely on the stage of the project",
  ]},
  { id: "q9", type: "textarea", text: "Why that answer? Give a real example from your work." },
  { id: "q10", type: "textarea", text: "Have you ever taken credit for something you didn't fully do, or let someone else take blame for something that was partly your fault? What happened?" },
  { id: "q11", type: "textarea", text: "Do you think you are replaceable? What — if anything — stops you from being replaced?" },
  { id: "q12", type: "textarea", text: "What's one thing about yourself that most people get wrong?" },
  { id: "q13", type: "textarea", text: "What is something you are genuinely not good at — technically or otherwise — that would be relevant to this role?" },
  { id: "q14", type: "textarea", text: "Do you have a faith or belief system? If yes, which one? If no, what guides your moral decisions?" },
  { id: "q15", type: "textarea", text: "If you are a person of faith — what is the most important book, chapter, or verse in your holy text for you personally? Why does it matter to you? (Skip this if you answered no faith above.)" },
  { id: "q16", type: "textarea", text: "Who do you consider the most important person — dead or alive, from any faith, history, or fiction? Why?" },
  { id: "q17", type: "textarea", text: "If you were an animal, what would you be? Why?" },
  { id: "q18", type: "textarea", text: "What's one thing you love most about your family? And what's one thing you wish you could change?" },
  { id: "q19", type: "textarea", text: "Do you believe you have the ability to build anything? If yes, why do you say so? If no, what are your limits?" },
  { id: "q20", type: "textarea", text: "You have 48 hours, no sleep required, and unlimited compute. What do you build — and why?" },
  { id: "q21", type: "textarea", text: 'What is your standard for "done"? Give a specific example of when you held that standard under pressure.' },
  { id: "q22", type: "textarea", text: "Do you think AI can build anything? Why or why not?" },
  { id: "q23", type: "textarea", text: "What is the hardest thing you've ever built, and what made it genuinely difficult? Don't tell us the technology — tell us what made it hard." },
  { id: "q24", type: "textarea", text: "Have you ever been in a situation where you knew the right thing to do, but doing it would cost you something — a job, a friendship, money? What did you do?" },
  { id: "q25", type: "textarea", text: "If you joined a team and after three months you realised the technical lead was making a decision you believed was fundamentally wrong — something that would hurt the product — what would you do?" },
  { id: "q26", type: "textarea", text: 'Tell us about a time you failed badly. Not a "failure that was actually a success" story. A real failure. What happened and what did it teach you?' },
  { id: "q27", type: "textarea", text: "If you found a critical security vulnerability in a system you didn't build and weren't responsible for, what would you do — step by step?" },
  { id: "q28", type: "textarea", text: 'If I gave you a project you\'d never built before — something completely outside your experience — and told you "figure it out, you have 4 weeks," what would your first 48 hours look like?' },
  { id: "q29", type: "textarea", text: "Be honest: are you a 9-to-5 person, or are you the kind of person who loses track of time because you're deep in a problem?" },
  { id: "q30", type: "textarea", text: "Describe the best place to work for you. Not a company name — describe the environment, the people, the energy." },
  { id: "q31", type: "textarea", text: "If THCO became the most important technology and professional services firm in Africa in 5 years, what role do you see yourself playing in that story?" },
  { id: "q32", type: "textarea", text: "Is there anything about you — your background, your values, the way you think — that you think we should know, but that we didn't ask about?" },
  { id: "q33", type: "radio", text: "When you are old and retired, what do you want to look back and say you did with your life? Pick one.", options: [
    "Built a billion-dollar empire and made the Forbes list",
    "Made a real dent in stopping racism and empowering Black people globally",
    "Made an impact beyond my wildest dreams — even if nobody knows my name",
    "Started the next Google, Facebook, or Microsoft",
    "Was part of building the first trillion-dollar African company",
    "Raised a family that loves and respects me",
    "Just lived a peaceful, happy life doing what I love",
    "Became the absolute best in the world at my craft",
    "Helped millions of people I'll never meet live better lives",
    "Built something that still exists and works long after I'm gone",
  ]},
  { id: "q34", type: "textarea", text: "Why that one? What would it feel like to actually achieve it?" },
  { id: "q35", type: "radio", text: "You're working on a project and your team lead makes a decision you think is wrong. You've already raised your concern once and they've heard you but still want to go their way. What do you do?", options: [
    "I commit to their decision fully and execute it with everything I've got — they have context I might not have",
    "I do it their way but keep notes so I can say \"I told you so\" if it fails",
    "I go along with it publicly but quietly do it my way where I can",
    "I raise it one more time with stronger evidence — if they still say no, I commit",
    "I escalate to someone above them because the project is at risk",
    "I lose motivation because I know we're heading in the wrong direction",
  ]},
  { id: "q36", type: "radio", text: "You've been at a company for 2 years. You've built strong relationships with clients, you understand the systems deeply, and you're genuinely good at what you do. One day, an opportunity comes along — better pay, bigger title, exciting new challenge. How do you handle the transition?", options: [
    "I'd have an honest conversation with my leadership first — I believe in leaving the right way, not just leaving",
    "I'd make the move and bring my full energy to the new role — the people who know my work will always know where to find me",
    "I'd transition cleanly and make sure whoever comes after me has everything they need to succeed with the existing clients",
    "I'd be open about it — if where I am can grow with me, I'd rather stay and build than start over somewhere new",
    "I'd make the move — I don't chase anyone, but I also don't shut doors on people who valued working with me personally",
    "I'd go where I'm valued. Loyalty is a two-way street — if a company wants to keep its best people and the relationships they've built, it should act like it",
  ]},
  { id: "q37", type: "radio", text: "What's more important to you right now — building your own name and reputation, or building something incredible as part of a team even if your individual name is never known?", options: [
    "Building something incredible as part of a team — the work matters more than who gets credit",
    "Honestly, I want both — I want to be part of something great AND be recognised for my contribution",
    "Building my own name — I've worked hard and I want the world to know what I can do",
    "I don't care about recognition at all — I just want to solve hard problems",
    "I want to build my reputation so I can eventually lead my own thing",
  ]},
  { id: "q38", type: "radio", text: "A close friend calls you. They've just launched a health startup and they're building a system that will deliver medication to rural communities with no pharmacy access. They need it urgently — people are literally dying waiting. They say \"you built something almost identical at your last company, you could save us months. Please help us rebuild it.\" What do you do?", options: [
    "I'd do it — lives are at stake, and the knowledge is in my head. Using my experience to save people isn't stealing, it's the right thing to do",
    "I'd be honest — \"I know exactly how to build this, but that knowledge came from a company that trusted me with it. Let me connect you with someone I've mentored who can build it fresh without carrying any of that baggage\"",
    "I'd help — but I'd bring my old company into the conversation too, because maybe we can all work on this together and nobody's trust gets broken",
    "I'd rebuild it better than the original — my old company has actually pivoted away from this space entirely and isn't even using the system anymore, so the knowledge would go to waste if I don't put it to use saving lives",
    "I'd share the architecture and core design so they can move fast, but I'd tell my old company what I did afterwards — transparency makes it okay",
    "I'd advise them on the general approach and point them in the right direction, but I'd decline to build it myself — I already built this once for someone who trusted me, and I don't think it's mine to rebuild for someone else, even with lives at stake",
  ]},
  { id: "q39", type: "radio", text: "You've just joined a new team. The person leading the project has less technical experience than you — you can tell within the first week that you know more. How does this affect how you work with them?", options: [
    "It doesn't change anything — they're leading for a reason, and leadership isn't just about technical skill",
    "I'd quietly prove my value through my work and hope they start leaning on me for technical decisions",
    "I'd respect their role but make sure the team knows I'm the stronger technical voice when it matters",
    "I'd support them publicly and offer my technical input privately — their authority matters even if my knowledge is deeper",
    "I'd find it frustrating honestly — if I'm the most technically capable person, I should be leading",
    "I'd wait for them to realise they need me and come to me naturally",
  ]},
];

const TOTAL_QUESTIONS = QUESTIONS.length; // 37
const TOTAL_TIME = 6000; // 100 minutes in seconds

// --- Page 1: Candidate Info ---
const PageOne = ({ onStart }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = name.trim() && email.trim();

  const handleStart = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await assessmentAPI.start({ name: name.trim(), email: email.trim().toLowerCase() });
      onStart(data);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f6f8] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">Candidate Assessment</h1>
          <p className="text-gray-500 mt-2 text-sm">THCO Engineering</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
            <input
              data-testid="assessment-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#5a54d4] focus:ring-1 focus:ring-[#5a54d4] transition-colors"
              placeholder="Your full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
            <input
              data-testid="assessment-email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#5a54d4] focus:ring-1 focus:ring-[#5a54d4] transition-colors"
              placeholder="your.email@example.com"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            data-testid="assessment-begin-btn"
            onClick={handleStart}
            disabled={!canSubmit || loading}
            className="w-full py-3 rounded-lg font-medium text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#5a54d4] hover:bg-[#4e48c4] text-white"
          >
            {loading ? "Starting..." : "Begin assessment"}
          </button>

          <p className="text-center text-xs text-gray-400">
            You have 100 minutes to complete this assessment once you begin.
          </p>
        </div>
      </div>
    </div>
  );
};


// --- Timer Component ---
const Timer = ({ secondsLeft, total }) => {
  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const pct = (secondsLeft / total) * 100;

  let color = "#22c55e";
  let bgBar = "#dcfce7";
  if (secondsLeft < 180) { color = "#ef4444"; bgBar = "#fee2e2"; }
  else if (secondsLeft < 600) { color = "#eab308"; bgBar = "#fef9c3"; }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm" data-testid="assessment-timer">
      <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center gap-4">
        <span className="text-sm font-mono font-semibold tabular-nums" style={{ color, minWidth: 52 }}>
          {String(minutes).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </span>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: bgBar }}>
          <div
            className="h-full rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
        <span className="text-xs text-gray-400">{Math.round(pct)}%</span>
      </div>
    </div>
  );
};


// --- Page 2: Questions ---
const PageTwo = ({ assessment, onContinue, onTimerExpire }) => {
  const [answers, setAnswers] = useState(assessment.answers || {});
  const [locked, setLocked] = useState(() => {
    // On resume, lock any question that already has an answer
    const initial = new Set();
    const existing = assessment.answers || {};
    QUESTIONS.forEach(q => {
      if (existing[q.id] && String(existing[q.id]).trim()) {
        initial.add(q.id);
      }
    });
    return initial;
  });
  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (assessment.timer_started_at) {
      const started = new Date(assessment.timer_started_at).getTime();
      const elapsed = Math.floor((Date.now() - started) / 1000);
      return Math.max(0, TOTAL_TIME - elapsed);
    }
    return TOTAL_TIME;
  });
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef({});
  const timerSaveRef = useRef(null);
  const expiredRef = useRef(false);

  useEffect(() => {
    if (!assessment.timer_started_at) {
      const now = new Date().toISOString();
      assessmentAPI.saveTimer(assessment.id, { timer_started_at: now }).catch(() => {});
    }
  }, [assessment.id, assessment.timer_started_at]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!expiredRef.current) {
            expiredRef.current = true;
            onTimerExpire();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onTimerExpire]);

  useEffect(() => {
    timerSaveRef.current = setInterval(() => {
      assessmentAPI.saveTimer(assessment.id, { time_remaining_seconds: secondsLeft }).catch(() => {});
    }, 30000);
    return () => clearInterval(timerSaveRef.current);
  }, [assessment.id, secondsLeft]);

  const saveAnswer = useCallback((questionId, value) => {
    if (debounceRef.current[questionId]) clearTimeout(debounceRef.current[questionId]);
    debounceRef.current[questionId] = setTimeout(async () => {
      setSaving(true);
      try {
        await assessmentAPI.saveAnswers(assessment.id, { [questionId]: value });
      } catch (err) {
        console.error("Auto-save failed:", err);
      } finally {
        setSaving(false);
      }
    }, 500);
  }, [assessment.id]);

  const handleChange = (questionId, value) => {
    if (locked.has(questionId)) return; // Already locked
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    saveAnswer(questionId, value);
  };

  // Lock radio immediately on selection
  const handleRadioSelect = (questionId, value) => {
    if (locked.has(questionId)) return;
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    saveAnswer(questionId, value);
    setLocked(prev => new Set(prev).add(questionId));
  };

  // Lock textarea on blur if it has content
  const handleTextareaBlur = (questionId) => {
    const val = answers[questionId];
    if (val && String(val).trim()) {
      setLocked(prev => new Set(prev).add(questionId));
    }
  };

  const handleContinue = () => {
    onContinue(answers, secondsLeft);
  };

  const answeredCount = QUESTIONS.filter(q => answers[q.id] && String(answers[q.id]).trim()).length;
  const allAnswered = answeredCount === TOTAL_QUESTIONS;

  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <Timer secondsLeft={secondsLeft} total={TOTAL_TIME} />

      <div className="max-w-2xl mx-auto px-4 pt-16 pb-24">
        <div className="space-y-6">
          {QUESTIONS.map((q, idx) => {
            const isLocked = locked.has(q.id);
            return (
              <div key={q.id} className={`bg-white rounded-xl border p-5 transition-colors ${isLocked ? "border-green-200 bg-green-50/30" : "border-gray-200"}`} data-testid={`question-${q.id}`}>
                <div className="flex gap-3 mb-3">
                  <span className="text-[#5a54d4] font-semibold text-sm mt-0.5 shrink-0">Q{idx + 1}.</span>
                  <p className="text-gray-800 text-sm leading-relaxed flex-1">{q.text}</p>
                  {isLocked && <Lock size={14} className="text-green-500 shrink-0 mt-0.5" />}
                </div>

                <div className="pl-8">
                  {q.type === "textarea" ? (
                    <textarea
                      data-testid={`answer-${q.id}`}
                      value={answers[q.id] || ""}
                      onChange={(e) => handleChange(q.id, e.target.value)}
                      onBlur={() => handleTextareaBlur(q.id)}
                      readOnly={isLocked}
                      rows={3}
                      className={`w-full border rounded-lg px-4 py-3 text-sm leading-relaxed transition-colors resize-y min-h-[80px] ${
                        isLocked
                          ? "bg-gray-100 border-gray-200 text-gray-700 cursor-not-allowed"
                          : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#5a54d4] focus:ring-1 focus:ring-[#5a54d4]"
                      }`}
                      placeholder={isLocked ? "" : "Type your answer..."}
                    />
                  ) : (
                    <div className="space-y-2">
                      {q.options.map((opt) => (
                        <div
                          key={opt}
                          role="button"
                          tabIndex={isLocked ? -1 : 0}
                          data-testid={`option-${q.id}-${opt.slice(0,20).replace(/\s/g,'-').toLowerCase()}`}
                          onClick={() => handleRadioSelect(q.id, opt)}
                          onKeyDown={(e) => { if (!isLocked && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handleRadioSelect(q.id, opt); }}}
                          className={`flex items-start gap-3 px-4 py-3 rounded-lg transition-all border text-sm select-none ${
                            isLocked
                              ? answers[q.id] === opt
                                ? "bg-[#5a54d4]/5 border-[#5a54d4] text-gray-900 cursor-not-allowed"
                                : "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed"
                              : answers[q.id] === opt
                                ? "bg-[#5a54d4]/5 border-[#5a54d4] text-gray-900 cursor-pointer"
                                : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-800 cursor-pointer"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center transition-colors ${
                            answers[q.id] === opt ? "border-[#5a54d4] bg-[#5a54d4]" : isLocked ? "border-gray-300" : "border-gray-400"
                          }`}>
                            {answers[q.id] === opt && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <span className="leading-relaxed">{opt}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {saving ? "Saving..." : allAnswered ? "All answers auto-saved" : `${answeredCount}/${TOTAL_QUESTIONS} answered`}
          </span>
          <button
            data-testid="assessment-continue-btn"
            onClick={handleContinue}
            disabled={!allAnswered}
            className="px-8 py-3 rounded-lg font-medium text-sm bg-[#5a54d4] hover:bg-[#4e48c4] text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue to final details
          </button>
        </div>
      </div>
    </div>
  );
};


// --- Page 3: Final Details ---
const PageThree = ({ assessment, answers, secondsLeft, onSubmit }) => {
  const [onsiteHybrid, setOnsiteHybrid] = useState(assessment.onsite_hybrid || "");
  const [workPreference, setWorkPreference] = useState(assessment.work_preference || "");
  const [salary, setSalary] = useState(assessment.salary_expectation || "");
  const [city, setCity] = useState(assessment.location_city || "");
  const [state, setState] = useState(assessment.location_state || "");
  const [country, setCountry] = useState(assessment.location_country || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = onsiteHybrid && workPreference && salary.trim() && city.trim() && country.trim();

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const timeTaken = TOTAL_TIME - secondsLeft;
      await assessmentAPI.saveFinal(assessment.id, {
        onsite_hybrid: onsiteHybrid,
        work_preference: workPreference,
        salary_expectation: salary.trim(),
        location_city: city.trim(),
        location_state: state.trim(),
        location_country: country.trim(),
        time_remaining_seconds: secondsLeft,
        total_time_taken_seconds: timeTaken,
      });
      onSubmit();
    } catch (err) {
      setError(err?.response?.data?.detail || "Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f6f8] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <h2 className="text-xl font-semibold text-gray-900 mb-8">Final details</h2>

        <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 space-y-8">
          {/* Work arrangement - Yes/No */}
          <div>
            <p className="text-sm text-gray-700 mb-3">This role is onsite/hybrid — does this work for you?</p>
            <div className="flex gap-3">
              {["Yes", "No"].map((val) => (
                <button
                  key={val}
                  data-testid={`onsite-${val.toLowerCase()}`}
                  onClick={() => setOnsiteHybrid(val)}
                  className={`flex-1 py-3 rounded-lg font-medium text-sm transition-all border ${
                    onsiteHybrid === val
                      ? "bg-[#5a54d4] border-[#5a54d4] text-white"
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* Work preference - Fully Onsite / Hybrid */}
          <div>
            <p className="text-sm text-gray-700 mb-3">Which option do you prefer?</p>
            <div className="flex gap-3">
              {["Fully Onsite", "Hybrid"].map((val) => (
                <button
                  key={val}
                  data-testid={`work-pref-${val.toLowerCase().replace(/\s/g, '-')}`}
                  onClick={() => setWorkPreference(val)}
                  className={`flex-1 py-3 rounded-lg font-medium text-sm transition-all border ${
                    workPreference === val
                      ? "bg-[#5a54d4] border-[#5a54d4] text-white"
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* Salary */}
          <div>
            <p className="text-sm text-gray-700 mb-3">What is your monthly salary expectation?</p>
            <input
              data-testid="salary-input"
              type="text"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-[#5a54d4] focus:ring-1 focus:ring-[#5a54d4] transition-colors"
              placeholder="Enter amount in your local currency"
            />
          </div>

          {/* Location */}
          <div>
            <p className="text-sm text-gray-700 mb-3">Where do you currently live?</p>
            <div className="grid grid-cols-3 gap-3">
              <input
                data-testid="location-city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-[#5a54d4] focus:ring-1 focus:ring-[#5a54d4] transition-colors"
                placeholder="City *"
              />
              <input
                data-testid="location-state"
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-[#5a54d4] focus:ring-1 focus:ring-[#5a54d4] transition-colors"
                placeholder="State/Province"
              />
              <input
                data-testid="location-country"
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-[#5a54d4] focus:ring-1 focus:ring-[#5a54d4] transition-colors"
                placeholder="Country *"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            data-testid="assessment-submit-btn"
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className="w-full py-3 rounded-lg font-medium text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#5a54d4] hover:bg-[#4e48c4] text-white"
          >
            {loading ? "Submitting..." : "Submit assessment"}
          </button>
        </div>
      </div>
    </div>
  );
};


// --- Confirmation Screen ---
const Confirmation = ({ name }) => (
  <div className="min-h-screen bg-[#f5f6f8] flex items-center justify-center p-4">
    <div className="text-center max-w-sm" data-testid="assessment-confirmation">
      <div className="w-16 h-16 rounded-full bg-green-50 border-2 border-green-500 flex items-center justify-center mx-auto mb-6">
        <Check size={32} className="text-green-500" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Assessment submitted</h2>
      <p className="text-gray-500 text-sm leading-relaxed">
        Thank you, {name}. Your responses have been recorded. We'll be in touch.
      </p>
    </div>
  </div>
);


// --- Main Assessment Component ---
export default function CandidateAssessment() {
  const [page, setPage] = useState(1);
  const [assessment, setAssessment] = useState(null);
  const [latestAnswers, setLatestAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);

  const handleStart = (data) => {
    setAssessment(data);
    if (data.status === "completed") {
      setPage(4);
    } else {
      setPage(2);
    }
  };

  const handleContinue = (answers, secondsRemaining) => {
    setLatestAnswers(answers);
    setTimeLeft(secondsRemaining);
    setPage(3);
  };

  const handleTimerExpire = useCallback(() => {
    setPage(3);
  }, []);

  const handleSubmit = () => {
    setPage(4);
  };

  if (page === 4) return <Confirmation name={assessment?.name || "Candidate"} />;
  if (page === 3) return <PageThree assessment={assessment} answers={latestAnswers} secondsLeft={timeLeft} onSubmit={handleSubmit} />;
  if (page === 2) return <PageTwo assessment={assessment} onContinue={handleContinue} onTimerExpire={handleTimerExpire} />;
  return <PageOne onStart={handleStart} />;
}
