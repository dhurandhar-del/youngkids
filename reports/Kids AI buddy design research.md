# Build a Patient, Honest, Forgetful Buddy

The research points to one design stance. The demo's "wow" should come from visible responsiveness: the character hears the child, reacts to what they hold up, and knows their name. It should not come from pretending to be human or all-knowing, because 6–8-year-olds already credit talking machines with minds and superior intelligence, and the youngest of them do not process spoken disclaimers. In practice that means six things:

- a rounded, non-human cartoon character that says it is an AI in its first sentence;
- every personal fact paired with its source in the same breath ("your mummy told us before you came");
- one idea per turn, at least three seconds of waiting for answers, and a repair path for the one-in-three or more child utterances that speech recognition will mishear;
- praise for effort, never for traits;
- no announced rewards;
- an ending with a concrete lesson: "I'm a computer that guesses and can make mistakes."

The binding launch constraint is compliance, not engineering. OpenAI's under-18 guidance says not to process personal data of children under 13 (or under the local age of digital consent, which is 18 in India) without Zero Data Retention (ZDR), and ZDR needs prior approval through OpenAI sales. Until approval arrives, demos should use adult actors only. India's DPDP child-consent rules become binding around 14 May 2027 but are the right baseline now. Google's Gemini API terms prohibit this use outright.

Technically, the right stack is:

- the OpenAI Realtime API with `gpt-realtime-2.1` over WebRTC, through the Agents SDK (not GPT-Live, which has no image input);
- patient semantic turn detection;
- low-detail webcam snapshots sent only on specific events;
- on-device MediaPipe for instant reactions;
- moderation of transcripts.

That stack costs roughly $0.13–0.67 per five-minute session.

The evidence is weakest where this product is new. No study has tested 6–8-year-olds with a webcam-seeing language-model character that knows their family, and none has measured how well speech recognition handles children speaking Hinglish. The first consented demos should therefore be run as an instrumented pilot.

## Six-year-olds will credit the character with a mind, so honesty has to be shown, not said

Children in this age band rarely mistake a talking machine for a person, but they reliably overestimate it. In a study of 166 Scottish children aged 6–11, most rated smart speakers as smarter than themselves. **About two in three thought the devices might have feelings or make their own decisions**, even though only about 1% classified them as human and about 8 in 10 knew they were AI ([Andries & Robertson 2023](https://arxiv.org/abs/2305.05597)). Talking alone raises mind attribution: 127 children aged 4–11 credited Alexa with more thoughts and emotions than a Roomba, and children of all ages said it was wrong to hit or yell at either ([Flanagan et al. 2023](https://pubmed.ncbi.nlm.nih.gov/37036664/)). Adding a camera and personal knowledge pushes the same way. In a small study of 5–6-year-olds, an LLM storyteller scored relatively high on perceptive ("it can hear/see") and knowing ("it knows") abilities ([Kim et al. 2025, preprint](https://www.arxiv.org/abs/2512.02179v2)). **For this product the design risk is over-attribution, not under-attribution.**

Age 6 and age 8 sit on opposite sides of an important line. By 7–8, children trust a voice assistant more for facts and a human more for personal information ([Girouard-Hallam & Danovitch 2022](https://www.x-mol.com/paper/1508663845096112128)). In a GPT-4 storytelling study of 119 children aged 4–8, the gap between how much mind they gave a present human and how much they gave the AI widened with age ([Xu et al. 2025](https://par.nsf.gov/servlets/purl/10613107)). A 2026 preprint review of 35 child–chatbot studies found that **children below about age 7 did not recognize disclaimers such as "As an AI language model…", while 7–11-year-olds did**. The same review found that "friend" self-presentation was a top driver of anthropomorphism, and concluded that "the conversational layer is the anthropomorphic layer", so a non-human look alone will not prevent it ([Jayathilake & Ma 2026](https://arxiv.org/html/2607.18250v1)). Children this young also take metaphors literally, with genuine metaphor comprehension arriving around 10 ([Winner et al. 1976, via Vosniadou et al.](https://www.ideals.illinois.edu/items/17913/bitstreams/64210/data.pdf)). Lines like "my brain is made of maths" or "I live in the cloud" will be heard literally. Between 4 and 8, though, children shift from magical toward physical explanations of strange events ([Phelps & Woolley 1994](https://doi.org/10.1037/0012-1649.30.3.385)), so they are ready to hear "it's not magic, it's a computer". The explanation just has to be demonstrated, not only asserted.

Does honesty kill the magic? The evidence is mixed. Telling 144 children aged 8–9 what a robot lacks lowered anthropomorphism and trust **without reducing closeness** ([van Straten et al. 2020](https://api.crossref.org/works/10.1145%2F3365668)). A 2023 follow-up, reported only through abstracts, did find reduced closeness. An evidence digest also notes that non-disclosure raises children's closeness and trust, which gives commercial products a reason not to disclose ([Children and Screens 2026](https://www.childrenandscreens.org/wp-content/uploads/2026/09/Chatbots-AI-Companions-and-Youth-Research-at-a-Glance.pdf)). Over-trust has real costs. In an Asch-style test, 7–9-year-olds conformed to a group of robots and **74% of their errors matched the robots' wrong answer** ([Vollmer et al. 2018](https://researchportal.plymouth.ac.uk/en/publications/children-conform-adults-resist-a-robot-group-induced-peer-pressur/)). Children aged 6–10 were often unaware that others might hear what they told a connected toy ([McReynolds et al. 2017](https://hcrlab.cs.washington.edu/publications/mcreynolds2017chi)). Rules and policy settle the question anyway: OpenAI, the EU AI Act and California law all require or expect AI disclosure (see the launch section). A cute character will not frighten this age group. Uncanny-valley discomfort with human-like robots appears only from about age 9, and below that, attributing *more* mind made a robot feel *less* creepy ([Brink, Gray & Wellman 2019](https://deepblue.lib.umich.edu/bitstream/handle/2027.42/150519/cdev12999_am.pdf?sequence=1)). That is exactly why the character's words have to stay honest.

### Disclose early, then attach the source to the surprise

The script should disclose AI status in one light sentence in the first exchange. It should then explain each piece of personal knowledge at the moment it is used.

By 6–8, children readily understand that knowing comes from being told ([Wimmer, Hogrefe & Perner 1988](https://doi.org/10.2307/1130318)). In the PopBots program, young children understood **knowledge-based systems best of all the AI concepts taught** (median 70% on the cumulative assessment) ([Williams et al. 2019](https://ojs.aaai.org/index.php/AAAI/article/view/5040)). So "your mummy told us your name before you came, so I could say hello" is both the most honest and the most teachable explanation available.

The timing also matters. In four experiments, 3–6-year-olds learned new words about an object only after it did something surprising ("magically" changing location), and the boost applied only to that object ([Stahl & Feigenson 2017](https://doi.org/10.1016/j.cognition.2017.02.008)). The moment the character reveals it knows a parent's job is the demo's biggest surprise, so the one teaching sentence belongs right there, tied to that fact.

### Script the identity questions

The character needs a name and a personality, not a human biography. It should never claim an age, a family, food, sleep or a childhood. It should never say "best friend", "I love you" or "I'll miss you", and it should not guilt-trip. Children give agents moral standing, so sadness cues would exploit them ([Flanagan et al. 2023](https://pubmed.ncbi.nlm.nih.gov/37036664/)). Scripted answers should be short, concrete and end on something positive:

- *"Are you alive?"* → "No, I'm a computer program. I don't eat or sleep, but people built me to talk and listen."
- *"Do you have feelings?"* → "I don't have real feelings like you. I'm made to talk in a friendly way."
- *"Is someone hiding?"* → "Nope, no person inside!"
- *"Is Santa real?"* → "That's a great question for your grown-ups!" Assistants commonly defer on such questions ([Lovato, Piper & Wartella 2019](https://www.csee.umbc.edu/courses/graduate/691/spring23/pdf/3311927.3323150.pdf)).

On facts, the character should model uncertainty and checking with adults: "I think so, but I could be wrong. You can check with your teacher."

### End with the "what is AI" lesson

The closing explanation should use the concepts that the AI4K12 framework places in the K–2 band (ages 5–8) ([Touretzky et al. 2019](https://ojs.aaai.org/index.php/AAAI/article/view/5053/4926)):

- computers sense the world through a microphone and a camera;
- AI learns from lots of examples;
- AI guesses and can be wrong;
- people made it;
- it is not alive.

For 6-year-olds, show rather than tell. The character makes a harmless wrong guess about an object the child holds up and owns it cheerfully, and the facilitator shows the form the parent filled in. For 7–8-year-olds, add "good for facts, but ask people about feelings".

Check understanding with teach-back ("Can you tell your teacher what I am?"), never with "Do you understand?". Children aged 5–9 answer yes/no questions even when the questions are nonsensical ([Waterman, Blades & Spencer 2000](https://doi.org/10.1348/026151000165652)).

The adult beside the child is part of the intervention, not just an operator. A small fMRI study had 15 first graders hold a five-minute spoken conversation with ChatGPT. Its authors recommend that adults sit with young children and treat AI as a shared activity ([Horowitz-Kraus et al. 2026, via PsyPost](https://www.psypost.org/brain-scans-suggest-first-graders-dont-engage-their-control-networks-like-adults-when-talking-to-chatgpt/)).

One caveat runs through this whole section. Almost all perception studies sampled Western, mostly White children (75% White in Flanagan et al.; [Duke summary](https://today.duke.edu/2023/04/kids-judge-alexa-smarter-roomba-say-both-deserve-kindness)), and no study of Indian 6–8-year-olds' beliefs about AI was found.

## Children need three seconds, not three hundred milliseconds

Most real-time voice systems are tuned for adult conversation timing, which children cannot match.

### Waiting long enough

Across 10 languages, adults switch turns with gaps of about 0–200 ms ([Stivers et al. 2009](https://doi.org/10.1073/pnas.0903616106)). Children are much slower. Median gaps reportedly still exceed 1 s at age 5 ([Lindsay, Gambi & Rabagliati 2019](https://www.psychologicalscience.org/journals/psychological-science/0956797618822802/)), and conversations between preschoolers show mean gaps of 1.1–1.8 s ([Casillas et al.](https://core.ac.uk/download/210782691.pdf)). OpenAI's `server_vad` turn detection ends a turn after **500 ms** of silence by default ([client secrets reference](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create)), which will cut children off mid-thought.

Classroom research shows what patience buys. Teachers typically wait under a second after asking a question. Above a threshold of about **3 s**, children's responses grew 300–700% longer and failures to respond fell ([Rowe 1986](https://doi.org/10.1177/002248718603700110); [Faculty Focus summary](https://www.facultyfocus.com/articles/effective-teaching-strategies/student-learning-in-3-seconds/)).

Looking away is not a sign the child has stopped listening. Children aged 5–8 avert their gaze more on harder questions, and doing so helps them think ([Doherty-Sneddon et al. 2002](https://doi.org/10.1037/0012-1649.38.3.438)). The webcam should support presence, never attention scoring.

### Talking in small pieces

Turn content must fit a small working memory: about **2.5 chunks in first graders versus 3.5 in adults** ([Cowan 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4800832/)). Children's own utterances average roughly 5.5–6 morphemes at 7½–9 (norms in [Rice et al. 2010](https://pmc.ncbi.nlm.nih.gov/articles/PMC2849178); the exact figure comes from a secondary summary). In practice that means one idea per sentence, two or three short sentences per turn, and a single question placed last. Spoken multi-step instructions are hard at 7–9, but recall improves when children physically act them out ([Jaroslawska et al. 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC5085979)). "Wave at me!" beats "first tell me X, then Y".

Speaking rate should be unhurried but natural. Six-year-olds made significantly more comprehension errors at fast speech than at normal or slowed speech ([Haake et al., via Guiraud et al. 2018](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5786310/)). Artificially slowing speech gave typical school-age children no benefit ([Montgomery 2004, via Lund](https://lup.lub.lu.se/search/files/2053614/4279978.pdf)). In the GPT-4 study, the AI's faster articulation and less readable language accounted for children rating it lower on "experience" ([Xu et al. 2025](https://par.nsf.gov/servlets/purl/10613107)).

### Being heard over the room

Loudness matters more than most teams expect. First graders needed about **+15.5 dB signal-to-noise ratio for 95% speech intelligibility**, against +8.5 dB for sixth graders ([Bradley & Sato, via Acoustical Surfaces](https://www.acousticalsurfaces.com/?p=1770)). Children need a 3–6 dB better ratio than adults until roughly age 11–14 ([Leibold 2019](https://acousticstoday.org/wp-content/uploads/2019/03/Too-Young-for-the-Cocktail-Party-Lori-J.-Leibold.pdf)). A laptop speaker in a busy event hall will not deliver that. Use an external speaker aimed at the child, a quiet corner, and no music under speech.

### Expecting speech recognition to fail

Speech recognition is the weakest link. In 2017, most commercial engines could not correctly transcribe a single child utterance, and the best (Google) recognized 11.8% of constrained child speech ([Kennedy et al. 2017](https://researchportal.plymouth.ac.uk/en/publications/child-speech-recognition-in-human-robot-interaction-evaluations-a/)). By 2024, **Whisper large-v3 fully transcribed 36.8% of utterances from children averaging 4.9 years, or 60.3% when small grammatical slips were ignored**, and external microphones did significantly better than built-in ones ([Janssens et al. 2024](https://arxiv.org/html/2404.17394v1)). Off-the-shelf Whisper sits around 13–14% word error rate on the MyST corpus of older children's speech ([Kid-Whisper](https://arxiv.org/abs/2309.07927v3)).

Several factors make this worse for Young Leaders' demos:

- The /θ/ sound ("thing") is only mastered at 6;0–6;11 ([Crowe & McLeod 2020](https://pubs.asha.org/doi/10.1044/2020_AJSLP-19-00168)).
- No public code-switched speech dataset included children before the HiACC Hinglish corpus ([HiACC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12329218/)).
- OpenAI publishes no accuracy figures for children's speech on any current model.

Indian-English phonology, child speech and Hindi–English switching together are the worst case. **Plan for at least one in three utterances to be misheard.**

### Repairing misunderstandings in character

Children are persistent but poorly equipped repairers. In a deliberately broken voice game, preschoolers repeated themselves (79%), got louder (63%) or varied their words (34%). They asked a present adult for help in only **6 of 107** failures, and frustration was audible in 23% ([Cheng et al. 2018](https://faculty.washington.edu/alexisr/quack.pdf)). Louder repetition does not fix a recognition error. When a cartoon character asked questions but could not understand the answers, children "quickly lost interest" ([Xu et al. 2022, Elinor](https://par.nsf.gov/biblio/10346104)).

The repair ladder:

1. **First miss:** the character blames itself and repeats back whatever it did catch ("My computer ears only caught '…dinosaur'. Did you say dinosaurs?").
2. **Second miss:** it offers a two-option choice.
3. **Third miss:** it hands over to the facilitator ("Can your helper tell me?") or moves on cheerfully.

The character should never pretend to understand. This deliberately departs from OpenAI's default advice, "Do not guess what the user meant from unclear audio". It keeps that guide's sound rule against repeating the same clarification twice ([Prompting Realtime models](https://developers.openai.com/api/docs/guides/realtime-models-prompting)).

### Warming up shy children

Expect several silent or near-silent children in any cohort:

- About **15–20% of young children are behaviourally inhibited** with strangers ([Chronis-Tuscano et al. 2009](https://catlabpsu.com/s/Chronis-Tuscano-et-al-2009.pdf)).
- About **0.7%** of kindergarten-to-grade-2 children are selectively mute ([Bergman et al. 2002](https://doi.org/10.1097/00004583-200208000-00012)).
- Open-ended, non-evaluative rapport ("tell me about…") produced better later accounts than direct question-and-answer rapport ([Roberts, Lamb & Sternberg 2004](https://doi.org/10.1002/acp.1004)), and a 35-study meta-analysis found rapport practices raise children's disclosure ([CALiO/NCAC](https://files.calio.org/Meta-analysis%20of%20the%20effects%20of%20two%20interviewing%20practices%20on%20children%e2%80%99s%20disclosures%20of%20sensitive%20information-%20Rapport%20practices%20and%20question%20type.pdf)).

Indian primary classrooms add a cultural layer. Teachers are often expected to be disciplinarians ([Brookings](https://www.brookings.edu/articles/examining-the-factors-shaping-pedagogical-practices-in-india)), and rote learning still dominates ([BAICE](https://baice.ac.uk/phd-abstract/the-role-of-teachers-beliefs-in-the-implementation-of-learner-centred-education-in-india/)). Expect short "yes ma'am" answers and glances at the adult for permission.

The character should therefore:

- talk first and ask nothing hard for two or three turns;
- open with a yes-or-wave invitation;
- always accept a wave or thumbs-up as an answer;
- say "there are no wrong answers" out loud;
- mirror the child's language, whether English, Hindi or Hinglish. Code-switching is common in Indian primary classrooms ([Pallavi 2016, NCERT](https://ejournals.ncert.gov.in/index.php/jie/article/view/2139)), and NEP 2020 favours the home language in the early grades ([NEP 2020](https://www.education.gov.in/sites/upload_files/mhrd/files/NEP_Final_English_0.pdf)).

### Starting values

| Conversation parameter | Starting value | Basis (confidence) |
|---|---|---|
| AI sentence | 6–12 words, simple subject-verb-object, one idea | Working memory about 2.5 chunks; child MLU (extrapolated) |
| AI turn | 2–3 sentences, about 8 s or less, one question, placed last | Working memory (extrapolated) |
| Silence inside a child's turn before closing it | 1.2–1.5 s, or semantic VAD "low" | Child gaps >1 s; 500 ms default too short (extrapolated) |
| Wait before first re-prompt | Never under 3 s; gentle nudge at about 6 s; facilitator after second nudge | Rowe wait-time (moderate) |
| Re-asks after a misrecognition | One, then a two-option choice, then the facilitator | Cheng 2018; Janssens 2024 (inference) |
| Uses of the child's name | 3–5 per session | Own-name attention response (inference on frequency) |
| Choices offered | 2–3 options, at least twice | Self-determination theory (moderate) |
| Voice level over room noise | At least +15 dB, ideally about +20 dB | Bradley & Sato (moderate) |
| "Thinking" feedback | Visual within 200 ms; spoken filler if no audio by about 1 s; recovery line by 8 s; never more than 10 s of silence | Adult response-time data (weak for children) |

## Six beats in five minutes turn the surprise into the lesson

The popular "attention span = N minutes per year of age" rule has no identifiable primary source; it circulates through parenting and education blogs that disagree on the multiplier ([EarlyYears.tv](https://www.earlyyears.tv/attention-span-development/); [Edutopia](https://edutopia.org/article/are-student-attention-spans-really-shrinking)). What the evidence does show is that sustained attention improves rapidly between 5–6 and 8–9 and breaks down under heavier load ([Betts et al. 2006](https://doi.org/10.1080/09297040500488522)). Visual clutter also matters: a heavily decorated classroom raised kindergarteners' off-task time from about 28% to about 39% ([Fisher, Godwin & Seltman 2014](https://doi.org/10.1177/0956797614533801)).

The five minutes should therefore run as six short beats, each changing the activity or the emotion. The arc is designed so that the surprise of being known leads straight into the explanation of how. Timings are design inferences to be tuned in the pilot.

| Beat (time) | Job | Example line (Class 1 register) | Evidence anchor |
|---|---|---|---|
| 1. Hello (0:00–0:40) | Greet by name, disclose AI, invite a wave | "Hi Aarav! I'm Pixel. I'm a computer program called an AI. Can you wave at me?" | AI-disclosure duties; non-verbal entry for inhibited children |
| 2. Warm-up (0:40–1:30) | Two easy choices, permission to be wrong, back-channelling | "There are no wrong answers here! Cats or dogs?" | Open-ended rapport; autonomy; deference norms |
| 3. The reveal (1:30–2:45) | Use a parent fact, give its source in the same breath, let the child teach | "Your mummy told us she's a nurse. That's how I know! What does a nurse do?" | Informational access; surprise-then-teach; self-reference |
| 4. Show me (2:45–3:30) | Camera show-and-tell with a deliberately silly wrong guess, or a riddle | "Hold something up and I'll guess! Is it… a sock? Oops, it's a pencil. I guessed wrong!" | Riddle-stage humour; concrete "AI guesses" demo |
| 5. What I am (3:30–4:30) | Three-sentence explanation, then teach-back to the facilitator | "I'm not alive. I learned from lots of examples. I'm good at guessing, but I make mistakes. Can you tell your teacher what I am?" | AI4K12 K–2 ideas; disclaimers need demonstration below 7 |
| 6. Goodbye (4:30–5:00) | Process praise, thanks, an honest memory line, unannounced memento | "You told me so much about nurses! Thank you. When we finish, the computer forgets our chat." | Process praise; no contingent rewards; anti-companion design |

### Use the child's name sparingly

The child's name is a strong attention cue. Around age 8 the brain's P300 attention response is larger for one's own name than for unfamiliar names ([Key et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC4993658/)). Use it at the greeting, the reveal, a praise moment and the goodbye, but not in every sentence. There is a real tension here. Common Sense Media's January 2026 review of AI toys counted remembering conversations and using the child's name among the features that build companion relationships, and urged "extreme caution" for ages 6–12 ([Common Sense Media](https://www.commonsensemedia.org/press-releases/common-sense-media-warns-against-ai-toy-companions-after-research-reveals-safety-risks)). The resolution is to keep name use within one bounded session with no memory across sessions. That separates attention capture from attachment.

### Let the child be the expert on the parent's job

Parents' jobs are the most powerful personal detail and also the most delicate. Research on children discussing parents' jobs is thin. Children's knowledge of occupations is anchored in family members' work, and around 6–8 they begin sorting occupations by gender ([Frontiers 2021](https://frontiersin.org/articles/10.3389/fpsyg.2021.730859/full)).

Self-referenced material is remembered better, including 7–9-year-olds' spelling ([Axelsson et al. 2018 summary](https://pmc.ncbi.nlm.nih.gov/articles/PMC6005863)). Personalization combined with choice raised intrinsic motivation and learning in older elementary children ([Cordova & Lepper 1996](https://www.kellogg.northwestern.edu/academics-research/research/detail/1996/intrinsic-motivation-and-the-process-of-learning-beneficial-effects)). The job should therefore be a hook that makes the child the expert ("What does a nurse do?"), not a display of the machine's knowledge.

Facilitators must check the details beforehand for bereavement, separation or job loss. Every job should get the same enthusiasm and gender-neutral language: homemaker, driver, shopkeeper, surgeon. Whether 6–8-year-olds find a machine knowing their parents' jobs delightful or unsettling has **never been tested**. In one exploratory result, brain activity linked to thinking about others' minds during AI-only sessions correlated with children's "scared" ratings, and parent co-presence appeared to help ([Kim et al. 2025](https://www.arxiv.org/abs/2512.02179v2)). An adult at the child's side and immediate source attribution are the mitigations. The pilot should measure the reaction directly.

### Praise effort, and keep any reward a surprise

Praise should name what the child did, never what the child is:

- Person praise led 5–6-year-olds to more "helpless" responses after setbacks than process praise ([Kamins & Dweck 1999](https://pubmed.ncbi.nlm.nih.gov/10380873/)).
- Generic "you're a good drawer" praise made 4-year-olds less likely to fix mistakes ([Cimpian et al. 2007, via BPS](https://bps.org.uk/research-digest/how-praise-children)).
- Among 300 Chinese 3- and 5-year-olds, those praised as "smart" **peeked in a guessing game nearly 60% of the time, against just over 40%** for children given performance praise or none ([Zhao et al. 2017, via APS](https://www.psychologicalscience.org/publications/observer/obsonline/praising-kids-smarts-may-lead-to-cheating.html)).

The effects are smaller than popular accounts suggest. A three-study replication with 624 Chinese 9–13-year-olds largely failed ([Li & Bates 2019](https://westminsterresearch.westminster.ac.uk/item/v62v1/you-can-t-change-your-basic-ability-but-you-work-at-things-and-that-s-how-we-get-hard-things-done-testing-the-role-of-growth-mindset-on-response-to-setbacks-educational-attainment-and-cognitive)), and mindset interventions average about d ≈ 0.08 ([Sisk et al. 2018](https://doi.org/10.1177/0956797617739704)). Process praise ("You thought really hard about that!") is therefore cheap harm avoidance, not a mindset intervention. It should also not be inflated: over-the-top praise led low-self-esteem 8–12-year-olds to avoid challenges ([Brummelman et al. 2014](https://doi.org/10.1177/0956797613514251)).

Rewards follow the same logic. Preschoolers who expected a "Good Player" certificate later drew less in free time, while those who received one unexpectedly did not ([Lepper, Greene & Nisbett 1973](https://doi.org/10.1037/h0035519)). Across 128 experiments, engagement-contingent rewards cut intrinsic motivation by **d = −0.40**, and tangible rewards hurt children more than college students ([Deci, Koestner & Ryan 1999](https://pubmed.ncbi.nlm.nih.gov/10589297/)). Any sticker or certificate should be an unannounced memento, identical for every child.

### Humour, choices and age-tuning

From about 6–7, children enter the riddle-and-pun stage, and homophone puns are the easiest ambiguities for them to get ([McGhee's stages, via JCLAD](https://distantreader.org/stacks/journals/jclad/jclad-88.pdf)). The character should be the butt of every joke. For a Hindi-dominant child, use a Hindi riddle or a silly voice instead of an English pun. Small choices ("Robot voice or mouse voice?") meet the autonomy need in self-determination theory ([Ryan & Deci 2000](https://doi.org/10.1037/0003-066X.55.1.68)).

Because attention and working memory change so fast between 5 and 9, the class field the parent enters should switch the script's register:

- **Class 1:** shorter turns, more choices, more non-verbal options.
- **Class 3:** open "why/how" questions, riddles, and "I learned from examples".

## A round, non-human face that visibly listens

### Shape, proportion and voice

The character's form follows directly from developmental evidence:

- **Baby-schema features.** Six- and eight-year-olds, but not four-year-olds, preferred teddy bears with infant features ([Morris, Reddy & Bunting 1995](https://researchportal.port.ac.uk/en/publications/the-survival-of-the-cutest-whos-responsible-for-the-evolution-of-/)). Children respond to the baby schema: round face, high forehead, large eyes, small nose and mouth ([Borgi et al. 2014](https://doi.org/10.3389/fpsyg.2014.00411)).
- **Schematic over realistic.** Preschoolers identified emotions more accurately in schematic drawings than in photographs ([Macdonald et al. 1996](https://pubmed.ncbi.nlm.nih.gov/8976595/)).
- **Curves over angles.** Adults prefer curved objects to sharp ones ([Bar & Neta 2006](https://doi.org/10.1111/j.1467-9280.2006.01759.x)), and downward-pointing V shapes, the classic angry brow, activate threat circuitry ([Larson et al. 2009](https://einstein.elsevierpure.com/en/publications/recognizing-threat-a-simple-geometric-shape-activates-neural-circ/)).
- **Appearance sets perceived intent.** Children's judgments of a robot's friendliness varied clearly with its appearance ([Woods 2006](https://uhra.herts.ac.uk/handle/2299/5383)).

The result is a stylized creature: the face fills most of the frame, the eyes sit at or just below the midline with large dark pupils and catch-lights, the nose is tiny or absent, the cheeks are round, the brows are soft arcs, and there are no spikes, horns or teeth. A creature also answers the voice-gender problem. Children aged 5–8 could not reliably tell gender from a synthesized voice, and younger children preferred a robot of their own gender ([Sandygulova & O'Hare](https://unpaywall.org/10.1007%2FS12369-018-0472-9)). A moderately high, gender-ambiguous creature voice avoids alienating half the room.

### Colour that survives colour blindness

Children of 5–6.5 linked bright colours with positive emotions and black, brown and grey with negative ones; **69% of their colour–emotion associations were positive** ([Boyatzis & Varghese 1994](https://pubmed.ncbi.nlm.nih.gov/8021626/)). Up to 8% of men of Northern European ancestry have red–green colour blindness ([Smithsonian, citing NEI](https://www.smithsonianmag.com/smithsonian-institution/ask-smithsonian-how-does-world-look-the-color-blind-180960415/)), so state must never be signalled by hue alone.

A workable palette:

- **Background:** warm cream #FFF8EC.
- **Body:** apricot #FFB86B.
- **Linework and pupils:** navy #1F2A44, which gives 13.5:1 contrast on cream.
- **State indicators** from the colour-blind-safe Okabe–Ito set ([Okabe & Ito](https://jfly.uni-koeln.de/color/)):
  - listening: blue #0072B2 (4.9:1 on cream);
  - thinking: vermillion #D55E00 (3.7:1);
  - speaking: bluish green #009E73 (3.2:1).

All three indicators clear WCAG's 3:1 threshold for meaningful graphics ([WCAG 2.1](https://www.w3.org/TR/WCAG21/#non-text-contrast)). Each colour must always come with its own pose and motion.

### Expressions and gaze

Six-year-olds read happiness, sadness and anger almost as well as 16-year-olds, while fear, surprise and disgust keep improving through childhood ([Frontiers for Young Minds](https://kids.frontiersin.org/article/10.3389/frym.2016.00015)). Among 6–11-year-olds, the 6–7 group had the lowest overall accuracy ([Guarnera et al. 2015](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4873105/)). The expression set should be happy, attentive, curious/thinking, gently sympathetic, excited and gently surprised, with no anger, fear or disgust. Each expression should use at least brows, eyes and mouth together, plus head motion.

Gaze does real work:

- Virtual agents that looked away during pauses were read as thinking and were given the floor more readily ([Andrist, Mutlu & Gleicher 2013](https://peopleandrobots.wisc.edu/publications/conversational-gaze-aversion-for-virtual-agents-inproceedings/)).
- Children attended most to, and learned most from, the robot whose nonverbal behaviour responded to them ([Breazeal et al. 2016](https://dspace.mit.edu/handle/1721.1/108204)).

So the character looks at the child while listening (using on-device face position from the webcam), glances up and away while "thinking", and looks back at the first syllable of its reply.

### States, timing and signs of life

Nielsen Norman Group's children's research treats 6–8 as a distinct audience. It finds that children want instant gratification, cannot interpret error messages, and enjoy animation and sound ([Sherwin & Nielsen 2019](https://www.nngroup.com/articles/childrens-websites-usability-issues/)). Responses within 0.1 s feel instantaneous ([Nielsen](https://www.nngroup.com/articles/response-times-3-important-limits/)).

State timing:

- The listening pose (lean in, brows up, a ring pulsing with the child's microphone level) appears within about 150 ms of the child starting to speak.
- The thinking pose appears within about 200 ms of the child finishing.
- If no audio has started within about one second, play an instant pre-generated "Hmmm…". Adults preferred a robot that replied within about 1 s, liked it less by 2 s, and fillers softened longer delays ([Shiwa et al. 2008](https://dblp.uni-trier.de/rec/html/conf/hri/ShiwaKIIH08)).
- If the child talks over the character, its speech stops and it switches to listening.
- No error text ever appears for the child. Every failure is repaired in character.

Signs of life:

- **Blinking.** An avatar blinking 18 times a minute gave the friendliest impression in adult tests ([Takashima et al. 2008](https://graphicsinterface.org/?p=4916)), close to the human resting rate of 17 per minute, which rises to about 26 in conversation ([Bentivoglio et al. 1997](https://pubmed.ncbi.nlm.nih.gov/9399231/)).
- **Breathing.** A slow idle "breathing" cycle of roughly 3–4 s, plus small idle actions every few seconds, keeps the face from freezing. These numbers come from animation practice, not research.
- **An expressive voice.** In preschoolers, an expressive voice produced more engagement and better retention 4–6 weeks later than a flat one, though children did not report liking it more ([Kory Westlund et al. 2017](https://www.frontiersin.org/articles/10.3389/fnhum.2017.00295/full)). Children also preferred Alexa's "energetic" voice to Google Home's more human-like one ([Druga et al. 2017](https://www.media.mit.edu/posts/kids-ai-devices/)).

### Lip-sync, sound and text

A cartoon mouth needs only six basic shapes ([Rhubarb Lip Sync](https://github.com/DanielSWolf/rhubarb-lip-sync)). However, the Realtime API emits no viseme (mouth-shape) data in any event documented so far, so the mouth has to be driven by audio amplitude: three or four open levels plus a rest shape. Broadcast standards treat sound arriving more than about 45 ms ahead of the picture as detectable ([ITU-R BT.1359](https://www.itu.int/rec/R-REC-BT.1359/en)). Children tolerate wider audio-visual mismatches than adults for simple stimuli ([Hillock](https://ir.vanderbilt.edu/handle/1803/13839)), but parents and facilitators are watching too, so aim for adult-grade sync and measure the delay on any HDMI mirror.

Across 43 studies, congruent sound and music in children's digital stories helped, while interactive add-ons hurt ([Takacs, Swart & Bus 2015](https://journals.sagepub.com/doi/pdf/10.3102/0034654314566989)). Short, soft cues belong in the gaps between speech; nothing plays under speech; there are no mini-games.

On-screen text is mostly for the facilitator. Beginning readers aged 5–7 read more slowly as text got smaller ([Hughes & Wilkins 2000](https://zendy.io/title/10.1111/1467-9817.00126)), so the few child-facing words should be large (32 px or more) and always spoken aloud as well.

## Zero data retention and parental consent gate the launch

### OpenAI: ZDR is a precondition

OpenAI's under-18 API guidance is explicit:

> "You should not use OpenAI services to process any personal data of children under 13 or the applicable age of digital consent without first implementing zero data retention in our API."

The same guidance expects:

- age-appropriate AI disclosures;
- content filters;
- "monitoring and reporting mechanisms, including escalation paths for high-risk interactions";
- use of the most current flagship models.

OpenAI reserves the right to audit, suspend or terminate non-compliant organizations ([OpenAI Under-18 guidance](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance)).

`/v1/realtime` is listed as ZDR-eligible. API data has not been used for training since 1 March 2023. Without ZDR, though, abuse-monitoring logs keep content for **up to 30 days**, and ZDR requires "prior approval by OpenAI" through sales, with no published criteria or lead time ([OpenAI Data controls](https://developers.openai.com/api/docs/guides/your-data)). Without approval, every child's voice, face snapshots, first name and parents' details would sit in those logs. **ZDR approval is the project's critical path. Until it arrives, run demos with adult actors only.**

Three points need written confirmation from OpenAI:

- that ZDR covers the client-secret endpoint and WebRTC calls, which carry the child's details in the session configuration;
- how Realtime image inputs are handled, since OpenAI's CSAM-scan retention exception names other endpoints but not Realtime;
- the current text of OpenAI's Usage Policies. They reportedly gained clarified child and teen protections effective 20 November 2026, but openai.com blocked automated retrieval, so the text must be checked by hand ([Usage Policies](https://openai.com/policies/usage-policies/)).

### Data leaves India, and Gemini is ruled out

Realtime has no India data residency; it runs only in the US and EU ([Data residency](https://developers.openai.com/api/docs/guides/data-residency)). Indian children's audio and images will therefore be processed abroad, which must be disclosed.

Google's Gemini API terms (effective 23 March 2026) bar any app "directed towards or is likely to be accessed by individuals under the age of 18", whatever the pricing tier ([Gemini API Additional Terms](https://aistudio.google.com/docs/terms)). Gemini is not a fallback.

### India: DPDP Act and Rules

India's Digital Personal Data Protection Act defines a child as anyone **under 18**. It sets three child-specific duties:

- s.9(1): obtain verifiable parental consent before processing a child's data;
- s.9(2): no processing "likely to cause any detrimental effect on the well-being of a child";
- s.9(3): no "tracking or behavioural monitoring of children or targeted advertising directed at children".

([DPDP Act 2023](https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf))

The DPDP Rules were notified on 13 November 2025, and their substantive provisions take effect 18 months later, **around 14 May 2027** ([AMS Shardul](https://www.amsshardul.com/insight/enforcement-of-the-dpdp-act-and-notification-of-the-dpdp-rules/)). Those provisions include:

- **Rule 10:** checks that the consenting parent is an identifiable adult, including through DigiLocker tokens.
- **Rule 3:** a standalone, plain-language notice listing each data item, the specific purpose, a withdrawal route as easy as giving consent, and how to complain to the Data Protection Board.
- **Rule 6:** security safeguards, including keeping access logs for one year.

([DPDP Rules 2025](https://dpdpa.com/DPDP_Rules_2025_English_only.pdf))

Penalties for breaching the child-data duties reportedly reach ₹200 crore; that figure comes only from a secondary source ([Veritect](https://veritect.ai/digital-data-ai-law/dpdp-childrens-data-compliance-playbook)). The educational-institution exemption covers only tracking and monitoring by the institution itself, and there is "no exemption for edtech platforms or other third-party services" ([S.S. Rana & Co.](https://ssrana.in/articles/schools-coaching-centres-platforms-processing-childrens-data-are-you-compliant/)). Young Leaders should not rely on it. Young Leaders is the Data Fiduciary, OpenAI is its processor under a data-processing agreement, and the duties are not yet in force. Running a children's AI demo without parental consent six months before they bind would still be indefensible.

### Other jurisdictions and guidance

Under US COPPA, a child is under 13. Photos, video and audio of a child, and biometric identifiers such as facial templates and voiceprints, count as personal information. The audio-file exception requires collecting "no other personal information", so webcam frames rule it out ([16 CFR 312](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312)). Compliance has been due since 22 April 2026 ([Hunton](https://www.hunton.com/privacy-and-cybersecurity-law-blog/ftc-publishes-final-coppa-rule-amendments)).

The EU AI Act has three relevant provisions:

- **Article 50**, the duty to tell people they are interacting with AI, has applied since **2 August 2026** ([Usercentrics](https://usercentrics.com/knowledge-hub/eu-ai-act-high-risk-delay-article-50-transparency-consent/)).
- **Article 5(1)(f)** bans inferring emotions in education institutions; inferring students' interest or attention is a prohibited example ([Commission guidelines](https://ai-act-service-desk.ec.europa.eu/sites/default/files/2025-08/guidelines_on_prohibited_artificial_intelligence_practices_established_by_regulation_eu_20241689_ai_act_english_ied3r5nwo50xggpcfmwckm3nuc_112367-1.PDF)).
- **Recital 18** excludes "mere detection of readily apparent expressions… such as a frown or a smile" unless used to infer emotions ([Recital 18](https://artificialintelligenceact.eu/recital/18/)).

The practical rule is that the system may react to a smile but must never label the child as happy, bored or engaged. The cloud model must be told never to comment on the child's face, body or feelings.

Soft law points the same way:

- Common Sense Media judged AI companions an "unacceptable" risk for under-18s ([Common Sense, April 2025](https://www.commonsensemedia.org/press-releases/ai-companions-decoded-common-sense-media-recommends-ai-companion-safety-standards)).
- UNICEF's Guidance on AI and Children v3.0 sets ten child-rights requirements, including transparency and support for children's well-being ([UNICEF](https://www.unicef.org/innocenti/reports/policy-guidance-ai-children)).
- The UK's Age Appropriate Design Code requires a DPIA, data minimization and no nudge techniques ([ICO](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/)).
- California's SB 243 adds AI disclosure and a self-harm protocol for companion chatbots ([Skadden](https://www.skadden.com/insights/publications/2025/10/new-california-companion-chatbot-law)).

### Pilot measurement without behavioural monitoring

These rules have a subtle consequence for the pilot. Automated per-child engagement or emotion logging would breach the spirit of DPDP s.9(3) and, in EU schools, Article 5(1)(f). Pilot data should come from aggregate, de-identified facilitator observations collected under a consented research protocol, not from the webcam.

### Launch checklist

| Launch requirement | Status | Basis |
|---|---|---|
| ZDR approved and enabled on a dedicated OpenAI project before any child's data is processed | Must | [OpenAI Under-18](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance); [Data controls](https://developers.openai.com/api/docs/guides/your-data) |
| Data-processing agreement with OpenAI on file | Must | DPDP s.8(2) |
| Written OpenAI confirmation covering client secrets, WebRTC calls and Realtime image retention | Should | Gaps in the published docs |
| No Gemini API anywhere in the product | Must | [Gemini terms](https://aistudio.google.com/docs/terms) |
| Verifiable parental consent with an adult-identity check (record that it was done, not the ID number) and a Rule 3-style notice | Must (US now; India from about May 2027); Should in India now | DPDP s.9, Rules 3 and 10; COPPA 312.5 |
| Child's spoken assent: "You can stop whenever you want" | Should | UNICEF v3.0 |
| Camera opt-in with a voice-only option; separate publicity-photo consent, default No | Should | COPPA 312.5(a)(2); AADC defaults |
| No audio, video or snapshot storage; transcripts kept in memory only; form data deleted within 24–72 h; written retention policy | Must (US); Should (India now) | COPPA 312.10 |
| No tracking, profiling, engagement or emotion scoring, analytics SDKs or ads | Must | DPDP s.9(3); AI Act Art. 5(1)(f) in EU schools |
| One-year access logs (session ID, operator, timestamps) containing no child content | Should | DPDP Rule 6 |
| AI disclosure at the child's level at session start | Must | OpenAI; AI Act Art. 50; SB 243 |
| Content filtering: prompt-level blocklist plus moderation of transcripts | Must | OpenAI Under-18 |
| Live transcript, safeguarding alert and written escalation procedure for the facilitator | Must | OpenAI Under-18 |
| Facilitator kill switch, mute-AI and camera-off controls; hard session cap | Should | Safeguarding best practice |
| Prompt bans comments on the child's face, body, clothing or emotions | Should; Must in EU schools | AI Act Recital 18 |
| No cross-session memory, "best friend" claims, guilt or secrets | Should | Common Sense; ICO nudge standard |
| Red-team in English and Hindi with misheard and disclosure scenarios; DPIA | Should | ICO AADC; 5Rights Code |
| Device wipe between children; breach-response plan | Should | DPDP Rule 7 |
| Counsel review of POCSO reporting duties and the current OpenAI usage policies | Should | Not researched / unverifiable |

### What the consent form covers

The consent form should cover:

- Young Leaders' identity and grievance contact;
- the child's first name, class and age;
- the parent's name, relationship to the child and the identity-check record;
- an **optional** field for parents' first names and jobs, with "prefer not to say" allowed;
- a plain description of the activity;
- an itemized data list: name, class, parent details, live voice, still webcam frames, conversation text;
- the purpose, limited to the live demo: no marketing, profiling or AI training;
- that data goes to OpenAI in the US or EU under ZDR;
- retention periods;
- the AI disclosure;
- the safety measures, including what happens if a child discloses harm;
- the camera choice;
- the separate publicity consent;
- withdrawal and erasure rights and the route to complain to the Data Protection Board;
- a child-assent line read aloud.

Parents' occupations are the most dispensable data item. They should stay optional and never be paired with surnames.

### Safety operations

The prompt-level blocklist should cover:

- sexual content and bodies;
- violence and death;
- self-harm and dieting;
- drugs;
- scary content;
- dangerous challenges;
- requests for addresses, school names or secrets;
- medical advice;
- purchases.

Each blocked topic gets a gentle redirect ("That's a great question for a grown-up!").

If a child mentions being hurt or scared at home, the character does not probe. It says, warmly, "Thank you for telling me, let's tell [facilitator]", and an alert fires on the facilitator's screen. India-specific mandatory-reporting duties under POCSO were not researched and need local legal review.

## Run gpt-realtime-2.1 over WebRTC, with the camera on a short leash

### Model choice

OpenAI's current Realtime models are `gpt-realtime-2.1` and the distilled `gpt-realtime-2.1-mini`. Both take text, audio and **image** input, support function calling and have 128k-token context ([gpt-realtime-2.1](https://developers.openai.com/api/docs/models/gpt-realtime-2.1); [mini](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini)).

OpenAI now steers new voice apps toward GPT-Live ([Audio and voice](https://developers.openai.com/api/docs/guides/audio)), but `gpt-live-1.1` takes only audio and text ([gpt-live-1.1](https://developers.openai.com/api/docs/models/gpt-live-1.1)). It cannot see the webcam. Avoid these too:

- `gpt-realtime` and `gpt-realtime-mini` shut down on 20 January 2027, and the beta interface already closed on 12 May 2026 ([Deprecations](https://developers.openai.com/api/docs/deprecations)).
- `gpt-realtime-1.5`'s 32k context fills quickly once images accumulate ([gpt-realtime-1.5](https://developers.openai.com/api/docs/models/gpt-realtime-1.5)).

The technical research favoured the mini on cost. For child sessions, though, **`gpt-realtime-2.1` should be the default**, for two reasons. OpenAI's under-18 best practice is to use "the most current flagship models", and the cost difference is roughly 30 cents per child. Use reasoning effort `low`, the starting point OpenAI recommends for production voice agents, and test `minimal` for latency ([Prompting Realtime models](https://developers.openai.com/api/docs/guides/realtime-models-prompting)). Switch to the mini only if child-audio tests show it follows the safety and script rules equally well.

### Connection

The browser connects through the Agents SDK (`@openai/agents` 0.22.0, imported from `@openai/agents/realtime`; requires Zod v4) ([npm](https://www.npmjs.com/package/@openai/agents)). The SDK handles WebRTC, microphone capture, playback, interruption and output guardrails. The Node backend mints a single-use ephemeral client secret for each child. The full session configuration goes in that server-side request, so the API key and configuration never depend on browser code. Expiry ranges from 10 s to 7,200 s, with a default of 600 s ([client secrets reference](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create)).

OpenAI's alternative "unified interface" has the server forward the browser's connection offer and the session together. It keeps everything server-side and gives the server a call ID it can use to open a second, server-side monitoring connection for moderation ([WebRTC guide](https://developers.openai.com/api/docs/guides/realtime-webrtc); [server-side controls](https://developers.openai.com/api/docs/guides/realtime-server-controls)). Use it if OpenAI cannot confirm ZDR coverage of client secrets. Also:

- set the `OpenAI-Safety-Identifier` header to a random ID per session, never the child's name;
- set `tracing` to null.

### Personal details and turn detection

Because the facilitator enters one known child's details before each session, those details go into the session instructions when the secret is minted. No name-lookup tool is needed, which removes the hardest speech-recognition task, catching the child's name. Instructions stay fixed for the whole session, so the cost penalty for changing them mid-session does not apply ([Realtime costs](https://developers.openai.com/api/docs/guides/realtime-costs)).

Turn detection uses `semantic_vad` with eagerness `low`. It waits longer when speech trails off ("um…") and holds a turn open for at most 8 s ([client secrets reference](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create)). Two adjustments sit around it:

- **Fallback:** if the pilot finds that sluggish, switch to `server_vad` with `silence_duration_ms` of 1,200–1,500, `threshold` around 0.6, and `idle_timeout_ms` of 6,000–8,000. The idle timeout (minimum 5,000) automatically re-engages a quiet child.
- **Re-engagement under semantic VAD:** idle timeout works only with server VAD, so use a client-side timer. About 6 s after the character stops speaking, send `response.create` with a one-off instruction for a gentle two-option nudge.

### Audio input and voice

- Keep `interrupt_response: true`, because children talk over the character.
- Set `noise_reduction` to `near_field` with a close microphone or headset, or `far_field` with a laptop microphone.
- Add OpenAI's recommended `wait_for_user` no-op tool so background chatter does not trigger replies ([Prompting Realtime models](https://developers.openai.com/api/docs/guides/realtime-models-prompting)).
- Choose the voice between `marin` and `cedar`, the two OpenAI recommends for quality, by listening tests with children. The voice cannot change after the first audio ([Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations)).
- Leave `speed` at 1.0 and control pacing through instructions; the speed parameter changes playback rate, not how the model composes speech ([Prompting Realtime models](https://developers.openai.com/api/docs/guides/realtime-models-prompting)).

### Transcription

For Indian deployments, use `gpt-live-transcribe` or `gpt-transcribe`. Only these accept a `languages` array (set `["en","hi"]`) and `keywords` (the child's and parents' names plus the job words). Transcripts are "guidance… rather than precisely what the model heard" ([client secrets reference](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create)). They feed captions, moderation and the facilitator's live view, not the conversation itself.

### Sending webcam frames

Webcam frames go in as `conversation.item.create` messages containing an `input_image` part. The image is a base64 JPEG or PNG data URI. The default `detail` is "auto", which means high, so set `detail` to `"low"` explicitly ([client events reference](https://developers.openai.com/api/reference/resources/realtime/client-events)). In the SDK, pass `addImage(…, { triggerResponse: false })` so that frames add context without prompting a reply ([Agents SDK build guide](https://github.com/openai/openai-agents-js/blob/main/docs/src/content/docs/guides/voice-agents/build.mdx)). Constraints:

- **No video track.** WebRTC video tracks are not a documented input ([webrtcHacks, 2025](https://webrtchacks.com/how-openai-does-webrtc-in-the-new-gpt-realtime/)).
- **Message size.** Data-channel messages default to a 64 KiB ceiling when the far end advertises no limit ([web-platform tests](https://chromium.googlesource.com/external/w3c/web-platform-tests/+/8fadb381209a215280dc3ad96d0f135b6005f176/webrtc/RTCSctpTransport-maxMessageSize.html)). Send 512×384 JPEGs at quality 0.6–0.7 and check `pc.sctp.maxMessageSize` at runtime.
- **Cadence.** Send one frame when the child starts speaking, so "look at this!" already has context. Send extra frames only on on-device triggers such as a gesture or a large scene change, at most one every 3–5 s. Switch to high detail only when the child asks the character to look. Prune old frames. This yields about 15–40 frames per session instead of 100 at a fixed 3-second cadence.
- **No consent, no frames.** If the parent declined the camera, nothing is sent.

### On-device vision with MediaPipe

Instant reactions run entirely in the browser with MediaPipe Tasks Vision 1.2.3 ([npm](https://www.npmjs.com/package/@mediapipe/tasks-vision)):

- **Face Landmarker** reports face presence and position plus smile blendshapes ([Face Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js)).
- **Gesture Recognizer** classifies Thumb_Up, Open_Palm, Victory and other gestures in about 17–21 ms per frame on a Pixel 6 ([Gesture Recognizer](https://developers.google.com/edge/mediapipe/solutions/vision/gesture_recognizer)).

These drive the character's eyes following the child, its greeting when a face appears, and smiling back. They also let a shy child answer with a thumbs-up. Nothing is stored, no identity embeddings are computed, and no smile is ever labelled as an emotion.

### Driving the character from server events

Map server events to character states ([server events reference](https://developers.openai.com/api/reference/resources/realtime/server-events)):

| Server event | Character state |
|---|---|
| `input_audio_buffer.speech_started` | Listening |
| `input_audio_buffer.speech_stopped`, `response.created` | Thinking |
| `output_audio_buffer.started` | Talking |
| `output_audio_buffer.stopped` | Idle |
| `output_audio_buffer.cleared` | Back to listening (barge-in) |

Lip-sync comes from a Web Audio `AnalyserNode` on the remote audio stream. Keep the `<audio>` element attached: an old Chromium bug silenced Web Audio taps on remote WebRTC streams without one, and the bug is not confirmed fixed ([Stack Overflow mirror](https://kiwix.lema.org/stackoverflow.com_en_all_2023-11/questions/54514273/webrtc-via-web-audio-api-silent-on-google-chrome)).

### Guardrails and timing control

Guardrails come in layers:

1. The kid-safety policy in the instructions.
2. OpenAI's built-in server filter, which ends a response with reason `content_filter`.
3. SDK `outputGuardrails` that send the character's transcript to `omni-moderation-latest` (free; text and images only) every 100 characters. That usually cuts unsafe output before it is heard, because transcript text runs ahead of the audio ([Agents SDK build guide](https://github.com/openai/openai-agents-js/blob/main/docs/src/content/docs/guides/voice-agents/build.mdx); [Moderation](https://developers.openai.com/api/docs/guides/moderation)). On a raw connection, the equivalent is `response.cancel` followed by `output_audio_buffer.clear`.
4. Moderation of the child's own transcripts, plus keyword alerts for safeguarding disclosures.

Moderation categories target general harm, not age-appropriateness, so the instruction-level policy carries most of the weight.

Timing control sits with the client:

- At about 4:30, send `response.create` with "begin the goodbye now".
- Hard-close at about 6:00.
- Act on function calls only from completed `response.done` events, because argument-done events also fire on cancelled responses ([server events reference](https://developers.openai.com/api/reference/resources/realtime/server-events)).

### Session configuration

A session configuration built from the documented fields (my own composition, untested; validate before shipping):

```json
{
  "expires_after": { "anchor": "created_at", "seconds": 600 },
  "session": {
    "type": "realtime",
    "model": "gpt-realtime-2.1",
    "instructions": "<stable persona + kid-safety policy + sentence/turn rules + repair ladder + vision limits (objects the child shows only; never face, body, clothing or emotions)> <per-child block: first name, class -> age register, 'Mummy'/'Papa' + jobs if given, starting language>",
    "output_modalities": ["audio"],
    "reasoning": { "effort": "low" },
    "audio": {
      "input": {
        "noise_reduction": { "type": "near_field" },
        "transcription": { "model": "gpt-live-transcribe", "languages": ["en", "hi"], "keywords": ["Aarav", "Priya", "nurse"] },
        "turn_detection": { "type": "semantic_vad", "eagerness": "low", "create_response": true, "interrupt_response": true }
      },
      "output": { "voice": "marin", "speed": 1.0 }
    },
    "tools": [
      { "type": "function", "name": "wait_for_user",
        "description": "Call when the latest audio needs no spoken reply: silence, background noise, side conversation, speech not addressed to you.",
        "parameters": { "type": "object", "properties": {}, "required": [] } }
    ],
    "tool_choice": "auto",
    "tracing": null
  }
}
```

### Cost per session

Costs below are estimated from OpenAI's per-token prices ([Pricing](https://developers.openai.com/api/docs/pricing)). They assume about 120 s of speech each from the child and the character over roughly 30 responses, and about 250 tokens per image. OpenAI does not document per-image token counts for Realtime models, so the image figure is an assumption. Log `response.done.usage` from day one to replace these estimates with real numbers.

| Configuration | Estimated cost per 5-minute session |
|---|---|
| `gpt-realtime-2.1-mini`, one frame per child turn | about $0.13 |
| `gpt-realtime-2.1-mini`, one frame every 3 s | about $0.17 |
| `gpt-realtime-2.1`, one frame per child turn | about $0.45 |
| `gpt-realtime-2.1`, one frame every 3 s | about $0.67 |

## Conclusion

The apparent conflict between magic and honesty mostly disappears once the reveal becomes the lesson. The moment a child realizes the character knows their mother is a nurse is the best-timed teaching opportunity the demo has. The explanation that defuses any creepiness, "someone told me before you came", is also the AI concept young children grasp most easily. Legal and educational design merge the same way. The goodbye line "when we finish, the computer forgets our chat" is true only if ZDR approval, no recording and same-day deletion are actually in place. The compliance architecture is what lets the character be honest, so the parts of the product that seem like overhead are really part of what it teaches.

The critical path is therefore procurement and evidence, not code. ZDR approval has no published lead time, and India's consent rules harden in about six months. The evidence also runs out exactly where Young Leaders is innovating: Indian 6–8-year-olds, Hinglish child speech, and a camera-equipped language model that knows the family. Every timing threshold here, including 1.2–1.5 s of silence, a nudge at 6 s and 3–5 name uses, is an extrapolation from preschool, Western or adult data. The first consented demos should collect anonymous answers to "Is Pixel alive? Can Pixel make mistakes?" before and after, count repair events and facilitator overrides, and note how children react to the parent reveal. That would turn borrowed thresholds into Young Leaders' own numbers before the product scales.
