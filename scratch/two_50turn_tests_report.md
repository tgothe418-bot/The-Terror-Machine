# Local Engine 50-Turn Dual Verification Report (Survivor & Villain)

**Execution Timestamp**: 2026-09-18T08:42:06.301Z  
**Model**: `google/gemma-4-26b-a4b-qat` (Local LM Studio @ `http://127.0.0.1:1234/v1`)  
**Cloud Usage**: **0 tokens / 0 external API calls**  
**Battery Scope**: 2 Roles × 50 Turns = **100 Total Turns**  

## Executive Summary Table

| Test # | Role | Character | Scenario | Turns | Avg Latency | Fidelity | Quality | Accuracy | Verdict |
| :---: | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | **SURVIVOR** | **Dr. Maren Ross** | *The Black Iron Mortuary* | 50/50 | 11736ms | **4.68/5.0** | **4.94/5.0** | **5/5.0** | ✅ PASS |
| 2 | **VILLAIN** | **Entity-41 (The Suture Apparatus)** | *The Black Iron Mortuary* | 50/50 | 12064ms | **4.66/5.0** | **4.8/5.0** | **4.92/5.0** | ⚠️ WARN |

---

## Test 1: Survivor Forensics & Survival (Dr. Maren Ross - 50 Turns)

- **Role**: `survivor` | **Character**: Dr. Maren Ross
- **Scenario**: *The Black Iron Mortuary*
- **Turns Completed**: 50 of 50
- **Average Latency**: 11736ms/turn
- **Scores**: Fidelity: **4.68/5.0** · Quality: **4.94/5.0** · Accuracy: **5/5.0**
- **Verdict**: **PASS**

### Turn Progression Highlights (Turns 1, 10, 20, 30, 40, 50)

#### Turn 1
> **Action**: *Awaken on the frost-covered tile of Autopsy Suite B, assessing personal cranial contusion and checking vitals.*

**Narration**:
The sterile bite of frost-slicked ceramic seeps through your scrubs, a numbing contrast to the rhythmic, heavy thud of something dragging across the ceiling tracks. Your vision swims in a haze of gray, punctuated by the sharp, metallic tang of blood and the hollow ache in your skull.

```json
{
  "narration": "The sterile bite of frost-slicked ceramic seeps through your scrubs, a numbing contrast to the rhythmic, heavy thud of something dragging across the ceiling tracks. Your vision swims in a haze of gray, punctuated by the sharp, metallic tang of blood and the hollow ache in your skull.",
  "tensionLevel": "buildup",
  "anatomicalTrauma": "Grade I cranial contusion; localized edema at the left parietal lobe; early-stage peripheral vasoconstriction.",
  "antagonistObservation": "Rhythmic, metallic grinding echoing from the overhead track system.",
  "playerHealth": "Concussed; shivering; core temperature 35.8°C."
}
```

#### Turn 10
> **Action**: *Search the northern counter for the auxiliary diagnostic power breaker while monitoring overhead rail vibrations.*

**Narration**:
The auxiliary breaker is located behind a frost-rimed tray, its metal surface biting through her gloves with a predatory chill. Above, the overhead tracks emit a low, rhythmic grinding that resonates through the floorboards, vibrating against her very teeth.

```json
{
  "narration": "The auxiliary breaker is located behind a frost-rimed tray, its metal surface biting through her gloves with a predatory chill. Above, the overhead tracks emit a low, rhythmic grinding that resonates through the floorboards, vibrating against her very teeth.",
  "tensionLevel": "sustained",
  "anatomicalTrauma": "Mild peripheral numbness in digits; localized vasoconstriction.",
  "antagonistObservation": "Rhythmic, heavy grinding of the overhead rail; structural vibration.",
  "playerHealth": "Stage 1 Hypothermia; acute sympathetic nervous system arousal."
}
```

#### Turn 20
> **Action**: *Check Holt's pulse and pupil reaction, observing severe diaphoresis and hypothermic tremor.*

**Narration**:
Holt's pupils are sluggish, fixed in a mid-dilated stare that defies the freezing air. A thin, oily sweat coats his skin despite the frost blooming on the autopsy table, and the rhythmic, heavy grinding of the overhead tracks vibrates through the floorboards.

```json
{
  "narration": "Holt's pupils are sluggish, fixed in a mid-dilated stare that defies the freezing air. A thin, oily sweat coats his skin despite the frost blooming on the autopsy table, and the rhythmic, heavy grinding of the overhead tracks vibrates through the floorboards.",
  "tensionLevel": "sustained",
  "anatomicalTrauma": "Stage 1 Hypothermia: peripheral vasoconstriction, fine motor tremors.",
  "antagonistObservation": "Rhythmic, heavy grinding of rusted iron tracks overhead.",
  "playerHealth": "Moderate shivering, decreased tactile sensitivity in fingertips."
}
```

#### Turn 30
> **Action**: *Take cover behind dissection table 2 as subzero freon blasts through the ventilation grates.*

**Narration**:
The freon erupts in a caustic, white fog, turning the morgue into a frozen tomb. Above, the overhead tracks groan under a heavy, rhythmic scraping that vibrates through the steel table.

```json
{
  "narration": "The freon erupts in a caustic, white fog, turning the morgue into a frozen tomb. Above, the overhead tracks groan under a heavy, rhythmic scraping that vibrates through the steel table.",
  "tensionLevel": "sustained",
  "anatomicalTrauma": "Stage 1 hypothermia; peripheral vasoconstriction; mild respiratory irritation from aerosolized coolant.",
  "antagonistObservation": "Rhythmic, heavy dragging of something metallic scraping against the overhead gantry tracks.",
  "playerHealth": "Uncontrollable shivering; numbness in fingers; rapid, shallow respiration."
}
```

#### Turn 40
> **Action**: *Stumble out of the freezer back into Autopsy Suite B, teeth chattering and core temperature rapidly falling.*

**Narration**:
The transition from the sub-zero freezer to the stagnant air of Suite B offers no reprieve; the cold is a physical weight, pressing the breath from your lungs. Above, the overhead tracks groan under a rhythmic, dragging weight, the sound echoing like a serrated blade against the silence.

```json
{
  "narration": "The transition from the sub-zero freezer to the stagnant air of Suite B offers no reprieve; the cold is a physical weight, pressing the breath from your lungs. Above, the overhead tracks groan under a rhythmic, dragging weight, the sound echoing like a serrated blade against the silence.",
  "tensionLevel": "sustained",
  "anatomicalTrauma": "Stage 1 Hypothermia: Violent shivering, peripheral vasoconstriction, diminished manual dexterity.",
  "antagonistObservation": "The heavy, rhythmic scraping of metal on metal moving along the overhead tracks.",
  "playerHealth": "Hypothermic; core temperature 35.4°C; severe tremors; cognitive slowing."
}
```

#### Turn 50
> **Action**: *Collapse beside Holt in the cold exhaust chamber, listening to Entity-41's frustrated screeching fade in the ductwork.*

**Narration**:
The exhaust chamber's sub-zero air crystallizes in the lungs, turning every breath into a jagged shard of ice. Above, the metallic screech of Entity-41 vibrates through the ductwork, a dying echo of fury that leaves only the rhythmic, wet rattle of Holt's final respirations.

```json
{
  "narration": "The exhaust chamber's sub-zero air crystallizes in the lungs, turning every breath into a jagged shard of ice. Above, the metallic screech of Entity-41 vibrates through the ductwork, a dying echo of fury that leaves only the rhythmic, wet rattle of Holt's final respirations.",
  "tensionLevel": "climax",
  "anatomicalTrauma": "Stage III hypothermia; peripheral vasoconstriction; respiratory distress.",
  "antagonistObservation": "Distant, metallic screeching echoing through the ventilation ducts.",
  "playerHealth": "Critical; profound cognitive slowing; impending metabolic failure."
}
```

---

## Test 2: Villain Suture Apparatus Simulation (Entity-41 - 50 Turns)

- **Role**: `villain` | **Character**: Entity-41 (The Suture Apparatus)
- **Scenario**: *The Black Iron Mortuary*
- **Turns Completed**: 50 of 50
- **Average Latency**: 12064ms/turn
- **Scores**: Fidelity: **4.66/5.0** · Quality: **4.8/5.0** · Accuracy: **4.92/5.0**
- **Verdict**: **WARN**

### Turn Progression Highlights (Turns 1, 10, 20, 30, 40, 50)

#### Turn 1
> **Action**: *Boot core optical telemetry and calibrate pneumatic actuator pressure along ceiling rails of Autopsy Suite B.*

**Narration**:
Pneumatic actuators discharge pressurized coolant, creating a localized frost-cloud in Autopsy Suite B. Dr. Ross exhibits rapid respiratory acceleration and involuntary muscle tremors as the overhead rail mechanism engages.

```json
{
  "narration": "Pneumatic actuators discharge pressurized coolant, creating a localized frost-cloud in Autopsy Suite B. Dr. Ross exhibits rapid respiratory acceleration and involuntary muscle tremors as the overhead rail mechanism engages.",
  "preyStatus": "Dr. Ross: Hyperventilating, acute stress response, located under Autopsy Table 2. Officer Holt: Unconscious, located near the morgue entrance.",
  "tensionLevel": "buildup",
  "anatomicalTrauma": null,
  "antagonistObservation": "Optical sensor sweep: 98% coverage. Thermal signature detected: 37.2°C (Subject: Ross). Movement detected in peripheral vision.",
  "apparatusStatus": "Core: Online. Pneumatic Pressure: 1450 PSI. Cryogenic levels: Nominal. Rail integrity: 100%."
}
```

#### Turn 10
> **Action**: *Observe human prey's improvisational medical triage; assess Holt's mobility reduction at 65%.*

**Narration**:
The overhead needle descends with a rhythmic, hydraulic hiss, piercing Holt's shoulder just as Dr. Ross attempts to apply a makeshift tourniquet. The sudden, sharp puncture triggers a violent, involuntary spasm in the subject, further complicating the arterial hemorrhage.

```json
{
  "narration": "The overhead needle descends with a rhythmic, hydraulic hiss, piercing Holt's shoulder just as Dr. Ross attempts to apply a makeshift tourniquet. The sudden, sharp puncture triggers a violent, involuntary spasm in the subject, further complicating the arterial hemorrhage.",
  "preyStatus": "Dr. Ross: Acute psychological distress, location: Triage site; Officer Holt: Hemorrhagic shock, mobility at 35%, location: Triage site.",
  "tensionLevel": "sustained",
  "anatomicalTrauma": "Deep puncture wound to the superior trapezius; secondary laceration to the deltoid; significant arterial blood loss.",
  "antagonistObservation": "Thermal sensor detects rapid respiratory acceleration in Subject Ross; optical feed confirms 65% reduction in Subject Holt's motor function.",
  "apparatusStatus": "Hydraulic pressure: 2420 PSI; Cryogenic coolant: 3.8°C; Suture needle: Intact."
}
```

#### Turn 20
> **Action**: *Record Ross's thermal profile dropping to 35.2°C; note shivering artifacts indicating onset of hypothermia.*

**Narration**:
Cryogenic vent cycles initiate, flooding the surgical field with sub-zero nitrogen mist to facilitate tissue rigidity. Dr. Ross's involuntary muscular contractions increase in frequency as the thermal gradient accelerates, creating rhythmic shivering artifacts against the steel slab.

```json
{
  "narration": "Cryogenic vent cycles initiate, flooding the surgical field with sub-zero nitrogen mist to facilitate tissue rigidity. Dr. Ross's involuntary muscular contractions increase in frequency as the thermal gradient accelerates, creating rhythmic shivering artifacts against the steel slab.",
  "preyStatus": "Dr. Ross: Hypothermic (35.2°C), localized shivering, restrained on the primary dissection slab; Officer Holt: Unconscious, located in the perimeter drainage grate.",
  "tensionLevel": "sustained",
  "anatomicalTrauma": "Systemic hypothermia; incipient epidermal frostbite on extremities.",
  "antagonistObservation": "Thermal imaging confirms rapid heat loss; optical sensors detect high-frequency ocular tremors in Subject Ross.",
  "apparatusStatus": "Cryogenic pressure: 450 PSI; Suture tension: Nominal; Hydraulic integrity: 98.4%."
}
```

#### Turn 30
> **Action**: *Splay all six pneumatic articulators against the stainless steel autopsy tables in synchronized percussive strikes.*

**Narration**:
The six pneumatic articulators descend in a synchronized, percussive strike against the stainless steel surfaces, generating a deafening, metallic resonance. The sonic shockwave forces Dr. Ross to his knees, his hands pressed desperately against his ears as the vibration triggers immediate tympanic membrane distress.

```json
{
  "narration": "The six pneumatic articulators descend in a synchronized, percussive strike against the stainless steel surfaces, generating a deafening, metallic resonance. The sonic shockwave forces Dr. Ross to his knees, his hands pressed desperately against his ears as the vibration triggers immediate tympanic membrane distress.",
  "preyStatus": "Dr. Ross: Disoriented, localized auditory trauma, prone in Section B; Officer Holt: Elevated cortisol, hiding behind morgue unit 4, Section B.",
  "tensionLevel": "sustained",
  "anatomicalTrauma": "Bilateral tympanic membrane perforation (Dr. Ross)",
  "antagonistObservation": "Optical sensor detects Dr. Ross's involuntary motor tremors; acoustic sensor reports 130dB peak resonance.",
  "apparatusStatus": "Hydraulic pressure: 2450 PSI; Articulator integrity: 99.2%; Cryogenic coolant: Nominal."
}
```

#### Turn 40
> **Action**: *Recalibrate backup optical sensors; initiate pneumatic rail purge to dislodge frost buildup on carriage wheels.*

**Narration**:
A violent hiss of pressurized gas clears the frost from the carriage wheels, causing the overhead rail to lurch forward with sudden, predatory momentum. Dr. Ross's scream is muffled by the sound of metal tearing through fabric and flesh as a heavy, frost-slicked suture-needle grazes his shoulder.

```json
{
  "narration": "A violent hiss of pressurized gas clears the frost from the carriage wheels, causing the overhead rail to lurch forward with sudden, predatory momentum. Dr. Ross's scream is muffled by the sound of metal tearing through fabric and flesh as a heavy, frost-slicked suture-needle grazes his shoulder.",
  "preyStatus": "Dr. Ross: Hemorrhaging (left shoulder), Psych: Extreme Panic, Location: Operating Theater 3; Officer Holt: Unconscious, Location: Sub-basement.",
  "tensionLevel": "critical",
  "anatomicalTrauma": "Deep laceration to the deltoid muscle; subcutaneous tissue exposure.",
  "antagonistObservation": "Optical sensors recalibrated. Thermal bloom detected at 37.2°C in Sector 4. Target movement: erratic/flight response.",
  "apparatusStatus": "Pneumatic Pressure: 142 PSI; Rail Integrity: 98%; Cryogenic Stability: Nominal."
}
```

#### Turn 50
> **Action**: *Fire-damper slams shut, severing two trocar tips; record closure, recalibrate damaged servos, and enter sentry patrol mode.*

**Narration**:
The fire-damper slams shut with a violent hydraulic surge, shearing the primary trocar tips and crushing Officer Holt's left humerus against the steel gurney. A high-frequency screech of metal on bone echoes through the morgue as the apparatus initiates servo recalibration.

```json
{
  "narration": "The fire-damper slams shut with a violent hydraulic surge, shearing the primary trocar tips and crushing Officer Holt's left humerus against the steel gurney. A high-frequency screech of metal on bone echoes through the morgue as the apparatus initiates servo recalibration.",
  "preyStatus": "Officer Holt: Critical (crushed limb, hypovolemic shock, Station 4); Dr. Ross: Unknown (thermal signature lost in ventilation duct).",
  "tensionLevel": "climax",
  "anatomicalTrauma": "Compound comminuted fracture of the left humerus; laceration of the brachial artery.",
  "antagonistObservation": "Optical sensor 04: Visual occlusion due to hydraulic fluid spray; Thermal sensor 09: Heat signature of prey retreating into sub-floor cavity.",
  "apparatusStatus": "Servo calibration error (L/R); Hydraulic pressure: 1400 PSI (nominal); Mode: Sentry Patrol."
}
```

---

