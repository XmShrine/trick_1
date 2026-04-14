import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

async function loadCore() {
  const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');
  const match = html.match(/\/\* CPTI_LOGIC_START \*\/([\s\S]*?)\/\* CPTI_LOGIC_END \*\//);

  assert.ok(match, 'Expected CPTI logic markers in index.html');

  const context = {
    window: {},
    globalThis: {},
    console,
    crypto: webcrypto,
    TextEncoder,
    TextDecoder,
    setTimeout,
    clearTimeout,
  };
  context.window = context;
  context.globalThis = context;

  vm.createContext(context);
  vm.runInContext(match[1], context);

  assert.ok(context.CPTICore, 'Expected script to expose CPTICore');
  return context.CPTICore;
}

function pick(core, mapping) {
  return core.QUESTIONS.map((question) => {
    if (!(question.id in mapping)) {
      return question.type === 'multiple' ? [] : null;
    }

    const value = mapping[question.id];

    if (question.type === 'multiple') {
      return value.map((key) => question.options.findIndex((option) => option.key === key));
    }

    return question.options.findIndex((option) => option.key === value);
  });
}

const twinFixture = {
  q1: 'B', q2: 'A', q3: 'A', q4: 'A', q5: 'A', q6: 'B', q7: 'B', q8: 'B', q9: 'B', q10: 'A',
  q11: 'B', q12: 'B', q13: 'A', q14: 'A', q15: 'B', q16: 'C', q17: 'A', q18: 'C', q19: 'A', q20: 'B',
  q21: 'A', q22: 'A', q23: 'C', q24: 'A', q25: 'A', q26: 'B', q27: 'CH', q28: 'D', q29: 'C', q30: 'A',
  q31: 'A', q32: 'B', q33: 'C', q34: 'A', q35: 'A', q36: 'B', q37: 'B', q38: 'B', q39: 'C', q40: 'A',
};

const loversFixtureA = {
  q1: 'B', q2: 'B', q3: 'A', q4: 'B', q5: 'A', q6: 'A', q7: 'C', q8: 'B', q9: 'A', q10: 'B',
  q11: 'A', q12: 'A', q13: 'A', q14: 'A', q15: 'A', q16: 'C', q17: 'B', q18: 'C', q19: 'B', q20: 'C',
  q21: 'C', q22: 'B', q23: 'B', q24: 'B', q25: 'C', q26: 'B', q27: 'IT', q28: 'D', q29: 'C', q30: 'A',
  q31: 'A', q32: 'A', q33: 'A', q34: 'D', q35: 'B', q36: 'C', q37: 'D', q38: 'A', q39: 'B', q40: 'B',
};

const loversFixtureB = {
  q1: 'B', q2: 'B', q3: 'B', q4: 'B', q5: 'A', q6: 'D', q7: 'B', q8: 'B', q9: 'B', q10: 'D',
  q11: 'B', q12: 'A', q13: 'A', q14: 'A', q15: 'A', q16: 'C', q17: 'B', q18: 'D', q19: 'B', q20: 'C',
  q21: 'A', q22: 'D', q23: 'C', q24: 'B', q25: 'D', q26: 'D', q27: 'FR', q28: 'D', q29: 'A', q30: 'B',
  q31: 'C', q32: 'A', q33: 'C', q34: 'D', q35: 'B', q36: 'C', q37: 'D', q38: 'A', q39: 'C', q40: 'D',
};

const rivalFixtureA = {
  q1: 'B', q2: 'A', q3: 'D', q4: 'B', q5: 'B', q6: 'A', q7: 'A', q8: 'A', q9: 'C', q10: 'B',
  q11: 'B', q12: 'B', q13: 'B', q14: 'B', q15: 'C', q16: 'A', q17: 'A', q18: 'A', q19: 'A', q20: 'A',
  q21: 'A', q22: 'A', q23: 'A', q24: 'A', q25: 'A', q26: 'A', q27: 'JP', q28: 'D', q29: 'A', q30: 'A',
  q31: 'A', q32: 'C', q33: 'B', q34: 'A', q35: 'C', q36: 'A', q37: 'C', q38: 'B', q39: 'B', q40: 'C',
};

const rivalFixtureB = {
  q1: 'B', q2: 'A', q3: 'A', q4: 'A', q5: 'B', q6: 'A', q7: 'A', q8: 'A', q9: 'B', q10: 'B',
  q11: 'B', q12: 'B', q13: 'D', q14: 'B', q15: 'C', q16: 'A', q17: 'A', q18: 'A', q19: 'D', q20: 'A',
  q21: 'A', q22: 'A', q23: 'A', q24: 'A', q25: 'B', q26: 'A', q27: 'US', q28: 'A', q29: 'A', q30: 'B',
  q31: 'A', q32: 'C', q33: 'B', q34: 'A', q35: 'C', q36: 'A', q37: 'B', q38: 'B', q39: 'B', q40: 'C',
};

const enemyFixtureA = {
  q1: 'B', q2: 'A', q3: 'A', q4: 'A', q5: 'B', q6: 'A', q7: 'B', q8: 'A', q9: 'B', q10: 'B',
  q11: 'A', q12: 'B', q13: 'D', q14: 'B', q15: 'D', q16: 'A', q17: 'A', q18: 'A', q19: 'A', q20: 'A',
  q21: 'A', q22: 'A', q23: 'A', q24: 'A', q25: 'B', q26: 'A', q27: 'US', q28: 'A', q29: 'A', q30: 'A',
  q31: 'A', q32: 'D', q33: 'D', q34: 'A', q35: 'C', q36: 'A', q37: 'B', q38: 'C', q39: 'A', q40: 'C',
};

const enemyFixtureB = {
  q1: 'C', q2: 'B', q3: 'B', q4: 'D', q5: 'A', q6: 'B', q7: 'A', q8: 'C', q9: 'A', q10: 'A',
  q11: 'D', q12: 'B', q13: 'A', q14: 'B', q15: 'D', q16: 'A', q17: 'A', q18: 'B', q19: 'D', q20: 'D',
  q21: 'C', q22: 'A', q23: 'B', q24: 'D', q25: 'A', q26: 'A', q27: 'AQ', q28: 'A', q29: 'A', q30: 'B',
  q31: 'B', q32: 'D', q33: 'D', q34: 'A', q35: 'D', q36: 'A', q37: 'A', q38: 'D', q39: 'B', q40: 'C',
};

const weirdFixture = {
  q1: 'C', q2: 'A', q3: 'D', q4: 'D', q5: 'B', q6: 'D', q7: 'D', q8: 'C', q9: 'D', q10: 'D',
  q11: 'D', q12: 'D', q13: 'D', q14: 'C', q15: 'D', q16: 'D', q17: 'D', q18: 'C', q19: 'A', q20: 'B',
  q21: 'C', q22: 'C', q23: 'B', q24: 'A', q25: 'C', q26: 'D', q27: 'AQ', q28: 'D', q29: 'D', q30: 'A',
  q31: 'D', q32: 'C', q33: 'D', q34: 'B', q35: 'B', q36: 'A', q37: 'A', q38: 'A', q39: 'B', q40: 'A',
};

const core = await loadCore();

{
  assert.equal(core.QUESTIONS.length, 40, 'Expected a 40-question questionnaire');
  assert.equal(core.QUESTIONS[0].id, 'q1', 'First question should remain q1');
  assert.match(core.QUESTIONS[0].question, /有界闭集/, 'q1 should ask the bounded closed set question');
}

{
  const q30 = core.QUESTIONS.find((question) => question.id === 'q30');
  assert.ok(q30, 'Expected q30 to exist');
  assert.equal(JSON.stringify(q30.options.map((option) => option.key)), JSON.stringify(['A', 'B']), 'q30 should only expose male/female options');
}

{
  const q27 = core.QUESTIONS.find((question) => question.id === 'q27');
  assert.ok(q27, 'Expected q27 to exist');
  assert.ok(q27.options.length > 150, 'q27 should expose a global country list');
}

{
  const answers = pick(core, twinFixture);
  const token = await core.encodeShareToken(answers);
  const roundTrip = await core.decodeShareToken(token);
  assert.equal(JSON.stringify(roundTrip.answers), JSON.stringify(answers), 'Share token should decode back to the original answers');
}

{
  const answers = pick(core, twinFixture);
  const result = core.compareAnswerSets(answers, answers);
  assert.equal(result.top.label, 'TWINS', 'Nearly identical same-gender answers should produce TWINS');
}

{
  const result = core.compareAnswerSets(pick(core, loversFixtureA), pick(core, loversFixtureB));
  assert.equal(result.top.label, 'LOVERS', 'Warm complementary pair should produce LOVERS');
}

{
  const result = core.compareAnswerSets(pick(core, rivalFixtureA), pick(core, rivalFixtureB));
  assert.equal(result.top.label, 'RIVALS', 'Parity plus collision should produce RIVALS');
}

{
  const result = core.compareAnswerSets(pick(core, enemyFixtureA), pick(core, enemyFixtureB));
  assert.equal(result.top.label, 'ENEMIES', 'Low-warmth high-friction pair should produce ENEMIES');
}

{
  const weirdA = pick(core, weirdFixture);
  const weirdB = pick(core, { ...weirdFixture, q27: 'NP', q30: 'B' });
  const result = core.compareAnswerSets(weirdA, weirdB);
  assert.equal(result.top.label, 'WEIRDOS', 'High weird-sync pairs should produce WEIRDOS');
}

{
  const mixedGenderMirror = { ...twinFixture, q30: 'A' };
  const mixedOther = { ...twinFixture, q30: 'B' };
  const result = core.compareAnswerSets(pick(core, mixedGenderMirror), pick(core, mixedOther));
  assert.notEqual(result.top.label, 'ECHO', 'Mixed-gender pairs should not be classified as 孪生姐妹 / ECHO');
}

{
  const collectable = core.getCollectableDeck(pick(core, loversFixtureA));
  const topLabels = collectable.primary.slice(0, 5).map((item) => item.label);
  assert.ok(
    topLabels.includes('LOVERS') || topLabels.includes('GLUED') || topLabels.includes('SETTLED'),
    'A warm attached profile should surface intimacy cards near the top',
  );
}

console.log('cpti-page tests passed');
