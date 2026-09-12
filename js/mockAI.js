export async function generateFeedback(answers, language) {
  try {
    // Simulate API delay
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        // Occasionally simulate a network failure (10% chance) just to ensure the UI handles it,
        // but for this MVP reliability pass, let's keep it safe. We will NOT randomly fail.
        resolve();
      }, 1500);
    });

    // Defensive checks
    if (!answers || typeof answers !== 'object') {
      throw new Error("Invalid answers provided to AI");
    }

    const applyAnswer = answers.apply || '';
    const isVague = applyAnswer.trim().length > 0 && applyAnswer.trim().length < 40;

    const feedback = {
      scores: {
        conceptual: Math.floor(Math.random() * 3) + 7,
        clarity: Math.floor(Math.random() * 3) + 7,
        application: isVague ? 4 : Math.floor(Math.random() * 3) + 7,
        criticalThinking: Math.floor(Math.random() * 3) + 7,
        connections: Math.floor(Math.random() * 3) + 7
      },
      strengths: [
        "You clearly understood the core mechanism.",
        "Good connection to your previous knowledge."
      ],
      weaknesses: [
        isVague ? "Your application is a bit vague. It sounds like an intention rather than an action." : "You didn't explore the limitations deeply enough.",
        "Some explanations rely too much on the author's vocabulary."
      ],
      followUpQuestions: [
        "If the opposite were true, how would your strategy change?",
        "Can you think of a specific situation where this principle would definitively fail?"
      ],
      vagueApplicationChallenge: isVague ? "That is an intention, not an application. What observable action would you perform differently?" : null
    };

    if (language === 'English') {
      const mainIdeaSnippet = answers.mainIdea ? answers.mainIdea.substring(0, 20) + "..." : "Missing text";
      feedback.english = {
        scores: {
          grammar: 8,
          vocabulary: 7,
          naturalness: 8
        },
        mistakes: [
          {
            original: mainIdeaSnippet,
            explanation: "Watch out for subject-verb agreement or direct translations from Spanish.",
            correction: "A more natural way to phrase this."
          }
        ]
      };
    }

    return feedback;
  } catch (error) {
    console.error("AI Feedback Generation Failed:", error);
    throw error; // Re-throw to let the UI handle the graceful degradation
  }
}
