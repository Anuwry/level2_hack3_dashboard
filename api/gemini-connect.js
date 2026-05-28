const DEFAULT_MODEL = 'gemini-2.5-flash'

function extractText(data) {
  return data?.candidates?.[0]?.content?.parts
    ?.map((part) => part?.text || '')
    .join('')
    .trim()
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed.' })
  }

  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    return res.status(500).json({ ok: false, error: 'Missing GEMINI_API_KEY on the server.' })
  }

  const { model = DEFAULT_MODEL, player = 'Player', summary = [], systemPrompt = '' } = req.body || {}

  try {
    let upstream
    let data

    for (const delayMs of [0, 1200]) {
      if (delayMs) {
        await sleep(delayMs)
      }

      upstream = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: systemPrompt }],
            },
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: [
                      `Connect and summarize this badminton session for ${player}.`,
                      'Keep the reply short, bilingual, and easy to read.',
                      `Summary: ${JSON.stringify(summary)}`,
                    ].join('\n'),
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 220,
            },
          }),
        },
      )

      data = await upstream.json()

      if (upstream.ok) {
        break
      }

      const isCapacityIssue = upstream.status >= 500
        && String(data?.error?.message || '').toLowerCase().includes('high demand')

      if (!isCapacityIssue) {
        break
      }
    }

    if (!upstream.ok) {
      const upstreamError = data?.error?.message || 'Gemini API request failed.'
      const message = upstream.status >= 500 && upstreamError.toLowerCase().includes('high demand')
        ? 'Gemini Flash is temporarily busy. Try again in a moment.'
        : upstreamError

      return res.status(upstream.status).json({
        ok: false,
        error: message,
      })
    }

    return res.status(200).json({
      ok: true,
      model,
      reply: extractText(data) || 'Gemini Flash responded without text.',
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unexpected Gemini server error.',
    })
  }
}
