// Probe every cue string build.mjs will use, against outputs/transcript-cut-v9.json
// through lib.mjs's cueIn (same validation the build runs). Prints a table; exits
// 1 on any miss so the build never discovers a bad cue half-way through emitting.
import { cueIn, span } from "./lib.mjs";
const TABLE = {
  g01: ["If your system", "it cannot learn", "baseline of chaos"],
  g02: ["introduce stochasticity", "into the learning", "you cannot get", "handle the real",
        "Dennis Noble said that", "biological intelligence", "quoting Alan Turing"],
  g03: ["failed miserably"],
  g04: ["missing success labels"],
  g05: ["physics has its own mind", "own mind"],
  g06: ["how I went about", "deterministic policy", "what failed", "learning from data", "met success"],
  g07: ["profiling", "what did I measure"],
  g08: ["gymnasium", "attached to the appropriate kernel", "not using MuJoCo", "Gym Push-T"],
  gZ1: ["Pymunk 2D physics"],
  gZ2: ["version zero", "observation type"],
  gZ2b: ["collect data", "instead of running"],
  gZ3: ["action space", "lowest", "highest"],
  gZ4: ["and 304", "where the actual block is", "outline is sitting", "degree angle", "goal"],
  gZ5: ["defined n and to be 100", "running 100"],
  gZ6: ["change the seed", "what the seed does"],
  gZ7: ["complete a task", "300", "you get a status of done"],
  gZ7b: ["not a real policy", "truly random", "read the current state", "sample of the action space", "random policy"],
  gZ8: ["zero successes", "max coverage"],
  gZ8a: ["pure chaos does not create order"],
  gZ8b: ["this is where my pusher", "where the star is", "straight line", "should work"],
  gZ9: ["unexpected happens", "circling", "call this a cowboy", "swinging it down", "would try to", "call this policy a cowboy"],
  gZ9b: ["attempt", "was a failure", "try AI"],
  gZ10: ["write me a policy", "goal is 400 by 400", "sits in a corner"],
  gZ11: ["five minutes", "whole week"],
  gZ11b: ["get a machine to learn", "level of randomness"],
  gZ12: ["promised about", "good chunk of successes"],
  gZ12b: ["successfully pushes", "was settled"],
  gZ13: ["80 to 90 minutes"],
  gZ14: ["74 percent"],
  gZ14b: ["built a profiler", "any outliers", "data is good", "Push-T community data", "Aloha community data", "my own data"],
  gZ15: ["push_t underscore sim", "FPS 10", "did not collect any", "machine capacity"],
  gZ15b: ["ds.add_frame"],
  gZ15c: ["schema"],
  gZ16: ["1,050 episodes", "1,000 are purely", "50 of them"],
  gZ16b: ["300 uh k plus frames"],
  gZ16b2: ["they match exactly", "count of zero"],
  gZ17: ["all have failures", "would skew my data"],
  gZ17b: ["all have 300 frames", "50 to 300", "succeed"],
  gZ18: ["IQR is 161", "below 139"],
  gZ19: ["idle episodes", "no dead joints", "null values", "nan values", "No cameras"],
  gZ19b: ["36 succeeded", "1,000 of them are random policies"],
  gZ19c: ["itself works", "written down into the file system"],
  gZ20: ["parrots", "whole corpus", "massive search", "AI parrot", "LLM star parrot"],
  gZ20b: ["In biological intelligence", "not a biologist", "cellular processes"],
  gZ20c: ["Alan Turing", "stochasticity built in"],
  gZ20d: ["large neural network", "corpus of data", "learn patterns"],
  gZ21: ["Hemingway", "Emerson", "something new", "create something new", "learned patterns"],
  g22: ["On the contrary"],
  g22b: ["AI downturn", "bubble may burst", "here to stay", "hopeful about the future"],
  g23: ["policy is a function of data", "garbage and garbage out", "curated clean"],
  g23b: ["black box", "falls into place", "life becomes easy"],
  g24: ["90 minutes", "thousand two thousand", "100k episodes", "not easy"],
  g24b: ["V2", "zero", "misleading"],
  g25: ["CUDA cores", "transfer my simulations", "maybe aloha", "so101", "teleop"],
  g26: ["hugging face", "leave me a comment"],
  gZ11: ["five minutes", "whole week"],
  g27: ["goodbye", "next week", "Thank you"],
};
let bad = 0;
for (const [id, list] of Object.entries(TABLE)) {
  const [s, e] = span(id);
  for (const q of list) {
    try { const t = cueIn(id, q); console.log(`ok   ${id}  "${q}"  +${t}`); }
    catch (err) { bad++; console.log(`MISS ${id}  "${q}"  (${s.toFixed(2)}-${e.toFixed(2)})  ${err.message}`); }
  }
}
console.log(bad ? `\n${bad} cue(s) MISS` : "\nall cues resolve");
process.exit(bad ? 1 : 0);
