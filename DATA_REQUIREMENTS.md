# Data Requirements for Real Dashboard

เอกสารนี้สรุปข้อมูลจริงที่ต้องใช้เพื่อให้ Badminton AI Coach Dashboard ทำงานได้ครบ ไม่ใช่ mock data

## 1. Player / Session Metadata

ข้อมูลระดับผู้เล่นและเซสชัน ใช้สำหรับแสดง header, filter, report และผูกข้อมูลทุก shot เข้าด้วยกัน

| Field | Type | Required | Example | Notes |
| --- | --- | --- | --- | --- |
| `player_id` | string | yes | `player_01` | รหัสผู้เล่น |
| `player_name` | string | yes | `Player 01` | ชื่อที่แสดงบนหน้าเว็บ |
| `skill_level` | string | yes | `Intermediate` | ระดับผู้เล่น |
| `session_id` | string | yes | `sess_2026_05_26_001` | รหัส session |
| `started_at` | ISO datetime | yes | `2026-05-26T18:00:00+07:00` | เวลาเริ่มฝึก |
| `ended_at` | ISO datetime | no | `2026-05-26T18:20:00+07:00` | เวลาจบฝึก |
| `duration_seconds` | number | yes | `1116` | ใช้คำนวณ session time |
| `court_location` | string | no | `Court A` | ใช้ใน report |

## 2. Device / Sensor Status

ใช้สำหรับ Connected Kit และ Hardware Status

| Field | Type | Required | Example | Notes |
| --- | --- | --- | --- | --- |
| `device_id` | string | yes | `core_sensor_01` | รหัสอุปกรณ์ |
| `device_type` | string | yes | `core_sensor`, `wrist_band`, `sensor_pod` | ประเภทอุปกรณ์ |
| `display_name` | string | yes | `Core Sensor` | ชื่อบน UI |
| `connected` | boolean | yes | `true` | สถานะเชื่อมต่อ |
| `battery_percent` | number | yes | `100` | 0-100 |
| `firmware_version` | string | no | `1.2.0` | สำหรับ debug |
| `last_seen_at` | ISO datetime | yes | `2026-05-26T18:18:30+07:00` | ตรวจว่า data สดไหม |
| `signal_strength` | number | no | `-55` | RSSI หรือ BLE signal |

## 3. Per-Shot Data

ข้อมูลต่อหนึ่งการตี เป็น input หลักของ dashboard เกือบทุกส่วน

| Field | Type | Required | Example | Notes |
| --- | --- | --- | --- | --- |
| `shot_id` | string | yes | `shot_0040` | รหัส shot |
| `session_id` | string | yes | `sess_2026_05_26_001` | ผูกกับ session |
| `shot_index` | number | yes | `40` | ลำดับ shot |
| `timestamp` | ISO datetime | yes | `2026-05-26T18:18:36+07:00` | เวลาที่ตี |
| `shot_type` | string | yes | `Smash`, `Clear`, `Drop`, `Drive` | ประเภทลูก |
| `result_label` | string | yes | `Sweet Spot`, `Timing`, `Good` | label สรุป |
| `power_score` | number | yes | `92` | 0-100 |
| `timing_score` | number | yes | `68` | 0-100 |
| `sweet_spot_score` | number | yes | `98` | 0-100 |
| `overall_score` | number | yes | `88` | 0-100 |
| `is_correct_form` | boolean | yes | `false` | ใช้ Form Analysis |
| `is_elbow_incorrect` | boolean | yes | `true` | ใช้ Injury Risk |

## 4. Motion / Gyro / IMU Data

ใช้สำหรับ Speed, Timing, Power และ swing analysis

| Field | Type | Required | Example | Notes |
| --- | --- | --- | --- | --- |
| `shot_id` | string | yes | `shot_0040` | ผูกกับ shot |
| `max_speed_kmh` | number | yes | `276` | ความเร็วสูงสุด |
| `average_speed_kmh` | number | yes | `198` | ความเร็วเฉลี่ย |
| `swing_acceleration_ms2` | number | yes | `32.6` | m/s² |
| `gyro_peak_dps` | number | no | `820` | degree per second |
| `accel_peak_ms2` | number | no | `38.2` | raw peak acceleration |
| `contact_time_ms` | number | no | `184` | เวลาจุดปะทะ |
| `swing_start_time_ms` | number | no | `0` | relative to shot window |
| `swing_end_time_ms` | number | no | `420` | relative to shot window |
| `raw_imu_url` | string | no | `/data/imu/shot_0040.json` | ถ้ามี raw data แยก |

## 5. Pose / Elbow Form Data

ใช้สำหรับ Elbow Form Analysis และ Injury Risk

| Field | Type | Required | Example | Notes |
| --- | --- | --- | --- | --- |
| `shot_id` | string | yes | `shot_0040` | ผูกกับ shot |
| `elbow_angle_deg` | number | yes | `122` | มุมข้อศอกปัจจุบัน |
| `recommended_min_deg` | number | yes | `85` | ช่วงแนะนำต่ำสุด |
| `recommended_max_deg` | number | yes | `105` | ช่วงแนะนำสูงสุด |
| `shoulder_angle_deg` | number | no | `68` | ใช้เพิ่มความแม่น |
| `wrist_angle_deg` | number | no | `34` | ใช้เพิ่มความแม่น |
| `pose_confidence` | number | yes | `0.91` | 0-1 |
| `form_status` | string | yes | `incorrect` | `correct`, `warning`, `incorrect` |
| `injury_risk_level` | string | yes | `medium` | `low`, `medium`, `high` |

## 6. Sweet Spot / Impact Data

ใช้สำหรับจุดสีเขียวบนหน้าไม้และ Impact Score

| Field | Type | Required | Example | Notes |
| --- | --- | --- | --- | --- |
| `shot_id` | string | yes | `shot_0040` | ผูกกับ shot |
| `impact_x_percent` | number | yes | `72` | ตำแหน่ง X บนภาพไม้แบด 0-100 |
| `impact_y_percent` | number | yes | `22` | ตำแหน่ง Y บนภาพไม้แบด 0-100 |
| `sweet_spot_center_x_percent` | number | yes | `68` | จุดกลาง sweet spot |
| `sweet_spot_center_y_percent` | number | yes | `31` | จุดกลาง sweet spot |
| `distance_from_center` | number | yes | `0.08` | normalized 0-1 |
| `impact_score` | number | yes | `98` | 0-100 |
| `racket_face_confidence` | number | yes | `0.87` | 0-1 |

หมายเหตุ: ถ้า UI ต้องการแสดงแค่จุดเดียว ให้ใช้ `impact_x_percent`, `impact_y_percent` เท่านั้น

## 7. Aggregated Session Metrics

Backend ควรส่งค่ารวมมาให้ dashboard โดยตรง เพื่อลด logic ซ้ำใน frontend

| Field | Type | Required | Example | Notes |
| --- | --- | --- | --- | --- |
| `total_shots` | number | yes | `40` | จำนวน shot ทั้งหมด |
| `correct_shots` | number | yes | `28` | จำนวน form ถูก |
| `incorrect_shots` | number | yes | `12` | จำนวน form ผิด |
| `elbow_incorrect_count` | number | yes | `12` | ใช้ donut/stat |
| `avg_power_score` | number | yes | `76.5` | ค่าเฉลี่ย power |
| `max_power_score` | number | yes | `98` | ค่าสูงสุด |
| `avg_timing_score` | number | yes | `68` | ค่าเฉลี่ย timing |
| `avg_sweet_spot_score` | number | yes | `88` | ค่าเฉลี่ย sweet spot |
| `consistency_percent` | number | yes | `72` | ความสม่ำเสมอ |
| `calories_kcal` | number | no | `210` | ถ้าวัดได้ |
| `best_shot_id` | string | no | `shot_0024` | ใช้โชว์ Best Shot |
| `best_shot_label` | string | no | `Smash #24` | ข้อความบน UI |

## 8. AI Coach Suggestion Input / Output

ใช้สร้างคำแนะนำใน AI Coach Suggestion

### Input ที่ AI ควรได้รับ

| Field | Type | Required | Example |
| --- | --- | --- | --- |
| `avg_power_score` | number | yes | `84` |
| `avg_timing_score` | number | yes | `68` |
| `avg_sweet_spot_score` | number | yes | `88` |
| `injury_risk_level` | string | yes | `medium` |
| `elbow_angle_deg` | number | yes | `122` |
| `incorrect_shots` | number | yes | `12` |
| `recent_shot_types` | string[] | yes | `["Smash", "Clear", "Drop"]` |

### Output ที่ UI ต้องใช้

| Field | Type | Required | Example |
| --- | --- | --- | --- |
| `priority` | string | yes | `timing` |
| `title` | string | yes | `Start the swing slightly earlier` |
| `summary` | string | yes | `Timing is the weakest score at 68/100.` |
| `action_steps` | string[] | yes | `["Bring elbow angle closer to 100°"]` |
| `severity` | string | yes | `warning` |

## 9. Recommended API Shape

ตัวอย่าง response เดียวที่ frontend สามารถใช้ render dashboard ได้

```json
{
  "player": {
    "player_id": "player_01",
    "player_name": "Player 01",
    "skill_level": "Intermediate"
  },
  "session": {
    "session_id": "sess_2026_05_26_001",
    "started_at": "2026-05-26T18:00:00+07:00",
    "duration_seconds": 1116
  },
  "devices": [
    {
      "device_id": "core_sensor_01",
      "device_type": "core_sensor",
      "display_name": "Core Sensor",
      "connected": true,
      "battery_percent": 100,
      "last_seen_at": "2026-05-26T18:18:30+07:00"
    }
  ],
  "aggregates": {
    "total_shots": 40,
    "correct_shots": 28,
    "incorrect_shots": 12,
    "elbow_incorrect_count": 12,
    "avg_power_score": 76.5,
    "max_power_score": 98,
    "avg_timing_score": 68,
    "avg_sweet_spot_score": 88,
    "consistency_percent": 72,
    "calories_kcal": 210,
    "best_shot_label": "Smash #24"
  },
  "latest_shot": {
    "shot_id": "shot_0040",
    "shot_index": 40,
    "shot_type": "Smash",
    "power_score": 92,
    "timing_score": 68,
    "sweet_spot_score": 98,
    "elbow_angle_deg": 122,
    "impact_x_percent": 72,
    "impact_y_percent": 22,
    "max_speed_kmh": 276,
    "swing_acceleration_ms2": 32.6,
    "injury_risk_level": "medium"
  },
  "recent_shots": [
    {
      "shot_id": "shot_0040",
      "shot_index": 40,
      "shot_type": "Smash",
      "result_label": "Sweet Spot",
      "power_score": 92,
      "timestamp": "2026-05-26T18:18:36+07:00"
    }
  ],
  "coach_suggestion": {
    "priority": "timing",
    "title": "Start the swing slightly earlier",
    "summary": "Timing is the weakest score at 68/100.",
    "action_steps": [
      "Bring elbow angle closer to 100°",
      "Keep impact point near the center of the racket",
      "Add Drop and Drive shots for more variety"
    ],
    "severity": "warning"
  }
}
```

## 10. Minimum Data Needed for First Real Version

ถ้าต้องทำ MVP ให้ใช้ข้อมูลขั้นต่ำนี้ก่อน

1. `player`
2. `session`
3. `devices`
4. `aggregates`
5. `latest_shot`
6. `recent_shots`
7. `coach_suggestion`

ข้อมูล raw เช่น IMU เต็มชุด, pose keypoints, video frame สามารถเก็บแยกและค่อยเพิ่มทีหลังได้

## 11. Data Quality Rules

- คะแนนทุกตัวควรอยู่ในช่วง `0-100`
- ค่า percent ตำแหน่ง impact ต้องอยู่ในช่วง `0-100`
- `pose_confidence` และ `racket_face_confidence` ต้องอยู่ในช่วง `0-1`
- ถ้า `connected = false` ควรมี `last_seen_at`
- ถ้าไม่มี video/pose ให้ส่ง `form_status = "unknown"` แทนการเดาค่า
- เวลาทุก field ควรใช้ ISO datetime พร้อม timezone

