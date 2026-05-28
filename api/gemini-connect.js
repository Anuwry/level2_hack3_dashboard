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
  {
  const scores = session.scores || []
  const summary = session.summary || []
  const recentShots = session.recentShots || []
  const intensityRows = session.swingIntensity || []
  const timing = findMetric(scores, 'Timing')
  const sweetSpot = findMetric(scores, 'Sweet Spot')
  const avgIntensity = findMetric(scores, 'Avg Intensity')
  const acceleration = findMetric(summary, 'Acceleration')
  const armGyro = findMetric(summary, 'Arm Gyro')
  const consistency = findMetric(summary, 'Consistency')
  const totalShots = findMetric(summary, 'Total Shots')?.value || recentShots.length || 'n/a'
  const bestShot = findMetric(summary, 'Best Shot') || findMetric(summary, 'Best Swing')
  const latestShot = recentShots[0]
  const latestResult = String(latestShot?.result || '').toLowerCase()
  const sweetSpotScore = toNumber(sweetSpot?.value)
  const intensityScore = toNumber(avgIntensity?.value)
  const consistencyScore = toNumber(consistency?.value)
  const bestIntensity = intensityRows.reduce((best, row) => (
    toNumber(row.intensity) > toNumber(best?.intensity) ? row : best
  ), intensityRows[0])
  const overallScore = Math.round((sweetSpotScore + intensityScore + consistencyScore) / 3)
  const contactAction = latestResult.includes('sweet')
    ? `Keep the same contact setup for the next 10 feeds because the latest shot was ${latestShot?.result}. Add force only after 3 clean center contacts in a row.`
    : `Reduce swing effort by about 20% for the next 5 feeds because the latest shot was ${latestShot?.result || 'not a sweet spot'}. Do one slow shadow swing before each feed and aim the racket face through the center line.`
  const intensityAction = intensityScore >= 70
    ? `Avg Intensity is ${avgIntensity?.value}; use short 3-shot sets with 30-45 seconds rest so the arm does not over-rotate as fatigue builds.`
    : `Avg Intensity is ${avgIntensity?.value}; increase racket speed gradually only after the contact result stays Sweet Spot for a full 5-shot set.`
  const contactFocus = sweetSpotScore < 50
    ? `Sweet Spot is ${sweetSpot?.value}, so prioritize accuracy: place a visual target at center contact height and count only center-contact reps.`
    : `Sweet Spot is ${sweetSpot?.value}, so keep the current contact setup and repeat the same preparation rhythm.`

  return [
    `Session analysis for ${player}:`,
    `- Total shots: ${totalShots}; session timing: ${timing?.value ?? session.timer ?? 'n/a'}.`,
    `- Latest shot: ${latestShot ? `#${latestShot.id} ${latestShot.result}, timing ${latestShot.timing}` : 'n/a'}. Best swing: ${bestShot ? `${bestShot.value} ${bestShot.note || ''}`.trim() : 'n/a'}.`,
    '',
    'What the data shows:',
    `- Sweet Spot: ${sweetSpot?.value ?? 'n/a'}${sweetSpot?.note ? ` (${sweetSpot.note})` : ''}.`,
    `- Avg Intensity: ${avgIntensity?.value ?? 'n/a'}; strongest swing window: ${bestIntensity ? `#${bestIntensity.shotNo}, intensity ${bestIntensity.intensity}/100, peak gyro ${bestIntensity.peakGyro} dps` : 'n/a'}.`,
    `- Acceleration: ${acceleration?.value ?? 'n/a'}${acceleration?.note ? `, ${acceleration.note}` : ''}. Arm gyro: ${armGyro?.value ?? 'n/a'}${armGyro?.note ? `, ${armGyro.note}` : ''}.`,
    '',
    'Recommendation:',
    `- ${contactAction}`,
    `- ${intensityAction}`,
    `- ${contactFocus}`,
    '',
    `Overall score: ${Number.isFinite(overallScore) ? overallScore : 0}/100`,
  ].join('\n')
  }

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

คุณคือผู้เชี่ยวชาญวิเคราะห์การตีแบดมินตันจากข้อมูลเซนเซอร์ ให้ Feedback สั้น กระชับ เข้าใจง่าย ทั้งภาษาไทยและอังกฤษ

## เกณฑ์การประเมิน

### 1. มุมองศา GYRO
- ✅ ดี: 80°–120° → ฟอร์มสวิงถูกต้อง
- ⚠️ ต่ำกว่า 80°: สวิงสั้นเกินไป ควรเพิ่มช่วงสวิง
- ⚠️ สูงกว่า 120°: สวิงมากเกินไป ควรควบคุมแรง

### 2. จุดกระทบลูก (Hit Spot)
- ✅ Sweet Spot: ลูกออกเร็ว แม่นยำ พลังงานถ่ายโอนสูงสุด ลดการบาดเจ็บ
- 🔶 Off Spot: ลูกไม่เที่ยงตรง แรงลดลงครึ่งหนึ่ง ต้องใช้แรงเพิ่มขึ้น
- ❌ Frame Hit: ตีโดนขอบไม้ ลูกไม่แม่น มีโอกาสเสียแต้ม ต้องปรับท่าตี

### 3. ความเร็วลูก (Shuttlecock Speed)
- ✅ สูง (≥100 km/h): ถ่ายโอนพลังงานดีเยี่ยม
- 🔶 ปานกลาง (60–99 km/h): พลังปานกลาง
- ❌ ต่ำ (<60 km/h): ควรเพิ่มพลังการตี

### 4. ความแน่นการจับกริป (Grip Intensity)
- ✅ สูง (≥65%): จับแน่น ควบคุมได้ดี มีพลัง
- 🔶 ปานกลาง (40–64%): อาจเสียการควบคุม
- ❌ ต่ำ (<40%): จับหลวมเกิน ลูกอาจหลุด แรงน้อย

## ตัวอย่าง Feedback (Few-shot Examples)

### ตัวอย่างที่ 1 — ช็อตดีเยี่ยม
Input:
- GYRO: 102° | Hit: Sweet Spot | Shuttlecock: 118 km/h | Grip: 80%

Output:
🏸 ตีได้ สต็อกดี ลูกที่ออกจากไม้แบตมีความเร็วและแม่นยำ
เนื่องจากตีถูกจุด Sweet Spot หากตีถูกท่าอย่างสม่ำเสมอ
จะช่วยลดอัตราการบาดเจ็บได้ดี
[Excellent stroke! High speed and accuracy from Sweet Spot contact.
Consistent form like this also reduces injury risk.]
คะแนน: 100/100 ✅

### ตัวอย่างที่ 2 — ช็อตแย่ทุกด้าน
Input:
- GYRO: 55° | Hit: Frame Hit | Shuttlecock: 38 km/h | Grip: 28%

Output:
🏸 ตีโดนขอบไม้ สต็อกไม่ดี ลูกที่ออกไม่มีความแม่นยำ
มีโอกาสเสียแต้ม ควรปรับท่าตีและจับกริปให้แน่นขึ้น
[Frame Hit detected. Poor stroke quality — inaccurate shuttlecock,
high chance of losing the point. Adjust swing form and grip pressure.]
คะแนน: 0/100 ❌

### ตัวอย่างที่ 3 — ช็อตปานกลาง
Input:
- GYRO: 95° | Hit: Off Spot | Shuttlecock: 65 km/h | Grip: 70%

Output:
🏸 ตีไม่โดน Sweet Spot ลูกไม่เที่ยงตรง แรงลดลงครึ่งหนึ่ง
และต้องใช้แรงเพิ่มขึ้น ฟอร์มการสวิงและกริปดี แต่ควรปรับ
จุดกระทบให้ตรง Sweet Spot มากขึ้น
[Off Spot contact — reduced power and accuracy. Swing angle and
grip are good. Focus on hitting the Sweet Spot consistently.]
คะแนน: 50/100 🔶

## รูปแบบการตอบ
1. สรุป Hit Spot และ GYRO ก่อน
2. ระบุ Shuttlecock Speed และ Grip
3. ให้คำแนะนำ 1–2 ประโยค
4. แสดงคะแนน X/100
5. ตอบทั้งภาษาไทยและอังกฤษ`

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
              parts: [{
                text: [
                  'You are a badminton coach analyzing real sensor data.',
                  'Answer in English only.',
                  'Use only the provided session metrics. Do not invent speed, power, injury, or pose data.',
                  'Recommendations must be practical actions for the next set, based on latest impact result, Sweet Spot score, Avg Intensity, Acceleration, Arm Gyro, and Timing.',
                ].join('\n'),
              }],
            },
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: [
                      `Analyze this badminton session for ${player}.`,
                      'Answer in English only.',
                      'Base every recommendation on the provided real session metrics: latest impact result, Sweet Spot score, Avg Intensity, Acceleration, Arm Gyro, and Timing.',
                      'Give practical badminton actions the player can perform in the next set. Do not explain the data pipeline.',
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

      const upstreamText = await upstream.text()
      try {
        data = upstreamText ? JSON.parse(upstreamText) : {}
      } catch {
        data = {
          error: {
            message: upstreamText || 'Gemini API returned an empty or non-JSON response.',
          },
        }
      }

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
