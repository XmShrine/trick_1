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
  q1: 'B',
  q2: 'A',
  q3: ['B', 'C'],
  q4: 'B',
  q5: 'B',
  q6: 'A',
  q7: 'A',
  q8: 'A',
  q9: 'B',
  q10: 'B',
  q11: 'A',
  q12: 'A',
  q13: 'B',
  q14: 'B',
  q15: 'A',
  q16: 'B',
  q17: 'B',
  q18: 'C',
  q19: 'D',
  q20: 'B',
  q21: 'A',
  q22: 'A',
  q23: 'B',
  q24: 'B',
  q25: 'A',
  q26: 'B',
  q27: 'IS',
  q28: 'B',
  q29: ['H'],
  q30: 'A',
};

const enemyFixtureA = {
  q4: 'A',
  q8: 'B',
  q10: 'A',
  q14: 'A',
  q16: 'A',
  q18: 'A',
  q21: 'A',
  q23: 'B',
  q28: 'A',
  q30: 'A',
};

const enemyFixtureB = {
  q4: 'B',
  q8: 'A',
  q10: 'B',
  q14: 'A',
  q16: 'A',
  q18: 'B',
  q21: 'A',
  q23: 'B',
  q28: 'B',
  q30: 'A',
};

const loversFixtureA = {
  q3: ['B'],
  q6: 'A',
  q8: 'A',
  q9: 'A',
  q12: 'A',
  q13: 'A',
  q15: 'B',
  q17: 'A',
  q20: 'A',
  q22: 'B',
  q23: 'A',
  q26: 'B',
  q27: 'CH',
  q30: 'A',
};

const loversFixtureB = {
  q3: ['B'],
  q6: 'A',
  q8: 'A',
  q9: 'B',
  q12: 'A',
  q13: 'B',
  q15: 'B',
  q17: 'A',
  q20: 'B',
  q22: 'A',
  q23: 'A',
  q26: 'B',
  q27: 'IT',
  q30: 'B',
};

const weirdFixture = {
  q1: 'C',
  q3: ['D'],
  q7: 'C',
  q19: 'E',
  q26: 'C',
  q27: 'AQ',
  q29: ['A', 'G'],
  q30: 'A',
};

const core = await loadCore();

{
  const q30 = core.QUESTIONS.find((question) => question.id === 'q30');
  assert.ok(q30, 'Expected q30 to exist');
  assert.equal(JSON.stringify(q30.options.map((option) => option.key)), JSON.stringify(['A', 'B']), 'q30 should only expose male/female options');
}

{
  const q27 = core.QUESTIONS.find((question) => question.id === 'q27');
  assert.ok(q27, 'Expected q27 to exist');
  assert.ok(q27.options.length > 150, 'q27 should expose a global country list, not a short curated set');
  const keys = new Set(q27.options.map((option) => option.key));
  ['CN', 'US', 'CH', 'IT', 'JP'].forEach((key) => {
    assert.ok(keys.has(key), `q27 country list should include ${key}`);
  });
}

 {
   const answers = pick(core, twinFixture);
   const token = await core.encodeShareToken(answers);
   const roundTrip = await core.decodeShareToken(token);
   assert.equal(
     JSON.stringify(roundTrip.answers),
     JSON.stringify(answers),
     'Share token should decode back to the original answers',
   );
 }

{
  const answers = pick(core, twinFixture);
  const result = core.compareAnswerSets(answers, answers);
  assert.equal(result.top.label, 'TWINS', 'Nearly identical answers should produce TWINS');
}

{
  const result = core.compareAnswerSets(pick(core, enemyFixtureA), pick(core, enemyFixtureB));
  assert.equal(result.top.label, 'ENEMIES', 'Opposed high-friction profiles should produce ENEMIES');
}

{
  const result = core.compareAnswerSets(pick(core, loversFixtureA), pick(core, loversFixtureB));
  assert.equal(result.top.label, 'LOVERS', 'Warm complementary pair should produce LOVERS');
}

{
  const weirdA = pick(core, weirdFixture);
  const weirdB = pick(core, { ...weirdFixture, q27: 'NP', q30: 'B' });
  const result = core.compareAnswerSets(weirdA, weirdB);
  assert.equal(result.top.label, 'WEIRDOS', 'High oddity pairs should produce WEIRDOS');
}

{
  const mixedGenderMirror = {
    q3: ['A', 'B'],
    q6: 'A',
    q8: 'A',
    q9: 'A',
    q12: 'A',
    q13: 'A',
    q15: 'B',
    q17: 'A',
    q20: 'A',
    q22: 'B',
    q23: 'A',
    q26: 'A',
    q27: 'JP',
  };
  const maleAnswers = pick(core, { ...mixedGenderMirror, q30: 'A' });
  const femaleAnswers = pick(core, { ...mixedGenderMirror, q30: 'B' });
  const result = core.compareAnswerSets(maleAnswers, femaleAnswers);
  assert.notEqual(result.top.label, 'ECHO', 'Mixed-gender pairs should not be classified as 孪生姐妹 / ECHO');
}

{
  const collectable = core.getCollectableDeck(pick(core, loversFixtureA));
  const topLabels = collectable.primary.slice(0, 4).map((item) => item.label);
  assert.ok(
    topLabels.includes('HOMIES') || topLabels.includes('PARTY') || topLabels.includes('LOVERS'),
    'A social warm profile should surface social-affection cards near the top',
  );
}

console.log('cpti-page tests passed');
