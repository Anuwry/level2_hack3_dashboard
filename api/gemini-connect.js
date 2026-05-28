const DEFAULT_MODEL = 'gemini-2.5-flash'

function extractText(data) {
  return data?.candidates?.[0]?.content?.parts
    ?.map((part) => part?.text || '')
    .join('')
    .trim()
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function findMetric(items = [], label) {
  return items.find((item) => String(item.label || '').toLowerCase() === label.toLowerCase())
}

function toNumber(value, fallback = 0) {
  const parsed = Number(String(value ?? '').replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : fallback
}

function buildSessionAnalysis(session = {}, player = 'Player') {
  const scores = session.scores || []
  const summary = session.summary || []
  const formStats = session.formStats || []
  const recentShots = session.recentShots || []
  const intensityRows = session.swingIntensity || []
  const power = findMetric(scores, 'Power')
  const timing = findMetric(scores, 'Timing')
  const sweetSpot = findMetric(scores, 'Sweet Spot')
  const injuryRisk = findMetric(scores, 'Injury Risk')
  const totalShots = findMetric(summary, 'Total Shots')?.value || recentShots.length || 'n/a'
  const bestShot = findMetric(summary, 'Best Shot')
  const consistency = findMetric(summary, 'Consistency')
  const elbowIncorrect = findMetric(formStats, 'Elbow Incorrect')
  const latestShot = recentShots[0]
  const bestIntensity = intensityRows.reduce((best, row) => (
    toNumber(row.peakSpeed) > toNumber(best?.peakSpeed) ? row : best
  ), intensityRows[0])
  const powerScore = toNumber(power?.value)
  const timingScore = toNumber(timing?.value)
  const sweetSpotScore = toNumber(sweetSpot?.value)
  const consistencyScore = toNumber(consistency?.value)
  const overallScore = Math.round((powerScore + timingScore + sweetSpotScore + consistencyScore) / 4)

  return [
    'สรุปภาพรวม:',
    `- ${player} ทำได้ ${totalShots} shots ใน drill ${session.drill || 'current session'} โดยจุดแข็งคือ Power ${power?.value ?? 'n/a'} และ Sweet Spot ${sweetSpot?.value ?? 'n/a'}.`,
    `- ช็อตล่าสุดคือ ${latestShot ? `${latestShot.shot} #${latestShot.id} (${latestShot.result}, Power ${latestShot.power})` : 'ยังไม่มี recent shot'} และช็อตที่ดีที่สุดคือ ${bestShot ? `${bestShot.value} ${bestShot.note || ''}`.trim() : 'n/a'}.`,
    '',
    'จุดที่ทำได้ดี:',
    `- Impact quality ดีจาก Sweet Spot score ${sweetSpot?.value ?? 'n/a'}${sweetSpot?.note ? ` (${sweetSpot.note})` : ''}.`,
    `- พลังสวิงเด่น โดย IMU peak speed สูงสุด ${bestIntensity?.peakSpeed ?? 'n/a'} และ peak gyro ${bestIntensity?.peakGyro ?? 'n/a'} จากระดับ ${bestIntensity?.level ?? 'n/a'}.`,
    '',
    'จุดที่ควรแก้:',
    `- Timing ยังต่ำกว่าด้านอื่นที่ ${timing?.value ?? 'n/a'}${timing?.note ? ` (${timing.note})` : ''} ควรเริ่มสวิงให้เร็วขึ้นก่อนจุดกระทบ.`,
    `- Injury risk อยู่ที่ ${injuryRisk?.value ?? 'n/a'} และพบ ${elbowIncorrect?.value ?? 'n/a'} elbow incorrect shots ควรคุมมุมศอกไม่ให้เปิดเกินไป.`,
    '',
    'คำแนะนำรอบถัดไป:',
    '- ทำ drill 10 ลูกแรกด้วยจังหวะช้าลง แล้วโฟกัสให้หน้าไม้เข้ากลาง Sweet Spot ก่อนเพิ่มแรง.',
    '- หลังทุก 5 shots ให้เช็ก timing และ elbow angle ถ้าช็อตเริ่มเป็น Frame Hit ให้ลดแรงแล้วรีเซ็ตฟอร์ม.',
    '',
    `คะแนนรวม: ${Number.isFinite(overallScore) ? overallScore : 0}/100`,
  ].join('\n')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed.' })
  }

  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    return res.status(500).json({ ok: false, error: 'Missing GEMINI_API_KEY on the server.' })
  }

  const { model = DEFAULT_MODEL, player = 'Player', session = {}, systemPrompt = '' } = req.body || {}
  const coachPrompt = `${systemPrompt}

วิเคราะห์จากข้อมูล session ที่ส่งมาเท่านั้น ห้ามตอบแค่หัวข้อหรือประโยคสั้น ๆ
ให้ตอบเป็น feedback ที่นำไปใช้ได้ทันที โดยมีรูปแบบนี้:

สรุปภาพรวม:
- 2-3 ประโยคจากคะแนน, shot, impact, speed และ form

จุดที่ทำได้ดี:
- 2 bullet

จุดที่ควรแก้:
- 2 bullet พร้อมอ้างอิงตัวเลขจากข้อมูล

คำแนะนำรอบถัดไป:
- 2 action ที่ทำได้ทันที

คะแนนรวม: X/100

ใช้ภาษาไทยเป็นหลัก และใส่ภาษาอังกฤษสั้น ๆ ในวงเล็บเมื่อช่วยให้เข้าใจง่าย`

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
              parts: [{ text: coachPrompt }],
            },
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: [
                      `Analyze this badminton session for ${player}.`,
                      'Use the numbers directly. Do not say you need more data.',
                      `Session data: ${JSON.stringify(session)}`,
                    ].join('\n'),
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.35,
              maxOutputTokens: 760,
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

    const modelReply = extractText(data)
    const reply = modelReply && modelReply.length >= 220
      ? modelReply
      : buildSessionAnalysis(session, player)

    return res.status(200).json({
      ok: true,
      model,
      reply,
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unexpected Gemini server error.',
    })
  }
}
