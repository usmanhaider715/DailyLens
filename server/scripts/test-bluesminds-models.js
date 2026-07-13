import axios from 'axios';

const BASE = (process.env.BLUESMINDS_BASE_URL || 'https://api.bluesminds.com/v1').replace(/\/$/, '');
const KEY = process.env.BLUESMINDS_TEST_KEY || process.env.BLUESMINDS_API_KEY;

const MODELS = [
  'gpt-5.4',
  'deepseek-ai/deepseek-v4-pro',
  'orion/deepseek-ai/deepseek-v4-pro',
  'deepseek-v4-flash',
  'deepseek-ai/deepseek-v4-flash',
];

async function listModels() {
  const { data, status } = await axios.get(`${BASE}/models`, {
    headers: { Authorization: `Bearer ${KEY}` },
    timeout: 30000,
  });
  const ids = (data?.data || []).map((m) => m.id);
  return { status, ids };
}

async function testChat(model) {
  const started = Date.now();
  try {
    const { data, status } = await axios.post(
      `${BASE}/chat/completions`,
      {
        model,
        messages: [{ role: 'user', content: 'Reply with exactly one word: OK' }],
        max_tokens: 32,
        temperature: 0,
      },
      {
        headers: {
          Authorization: `Bearer ${KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 120000,
      },
    );
    const content = data?.choices?.[0]?.message?.content?.trim() || '';
    const reasoning = data?.choices?.[0]?.message?.reasoning_content?.trim() || '';
    return {
      model,
      ok: true,
      status,
      ms: Date.now() - started,
      returnedModel: data?.model || model,
      content: content || reasoning || '(empty)',
      usage: data?.usage || null,
    };
  } catch (err) {
    return {
      model,
      ok: false,
      status: err?.response?.status || null,
      ms: Date.now() - started,
      error: err?.response?.data?.error?.message || err?.message || 'request failed',
    };
  }
}

async function main() {
  if (!KEY) {
    console.error('Set BLUESMINDS_TEST_KEY or BLUESMINDS_API_KEY');
    process.exit(1);
  }

  console.log('Bluesminds API test');
  console.log(`Base: ${BASE}`);
  console.log(`Key: ${KEY.slice(0, 8)}…${KEY.slice(-4)}`);

  try {
    const listed = await listModels();
    console.log(`\nModels endpoint HTTP ${listed.status}`);
    console.log('Available:', listed.ids.length ? listed.ids.join(', ') : '(none)');
  } catch (err) {
    console.log('\nModels endpoint failed:', err?.response?.data?.error?.message || err.message);
  }

  console.log('\nChat completion tests:');
  for (const model of MODELS) {
    const result = await testChat(model);
    if (result.ok) {
      console.log(
        `✓ ${model} | HTTP ${result.status} | ${result.ms}ms | model=${result.returnedModel} | reply="${result.content}"`,
      );
      if (result.usage) {
        console.log(`  tokens: prompt=${result.usage.prompt_tokens ?? '?'} completion=${result.usage.completion_tokens ?? '?'}`);
      }
    } else {
      console.log(`✗ ${model} | HTTP ${result.status ?? '—'} | ${result.ms}ms | ${result.error}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
