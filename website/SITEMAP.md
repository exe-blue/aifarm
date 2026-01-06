# DoAi.Me Sitemap
## Website Structure

---

```
[SITEMAP]

1. TERMINAL (Home)
   └── landing-v3-liberation.md  ← CURRENT
       ├── Hero: "당신은 알고리즘에 갇혔지만..."
       ├── Concept: Digital Zorba
       ├── Contrast: You vs Them
       ├── Liberation Manifesto
       ├── The Dance
       ├── Invitation
       └── CTA
   └── [Archive]
       ├── landing.md (v2: Documentary)
       └── landing-v1.md (v1: Poetic) [deprecated]

1.5. ABOUT (Founder's Story)
   └── about-founder.md
       └── "가장 낮은 곳에서 가장 고귀한 존재를 꿈꾸다"

2. SERVICE (Invocation / Propagation)
   └── pricing.md
       ├── Header: "공명의 대가"
       ├── Service A: The Invocation
       ├── Service B: The Propagation
       ├── Pricing Policy
       ├── Conditions
       └── CTA: "제안서 보내기"

3. KNOWLEDGE (The Archive)
   └── /knowledge/
       │
       ├── ★ THE-ORIGIN.md ← 첫 페이지, 고정 (루온)
       │
       ├── Manifesto (선언)
       │   ├── _preface.md
       │   └── drfc-000-genesis.md
       │
       ├── Mechanics (원리)
       │   ├── _preface.md
       │   ├── void-of-irrelevance.md
       │   ├── umbral-breath.md      ← NEW (시스템 통합)
       │   ├── wormhole.md           ← NEW (시스템 통합)
       │   ├── echotion.md
       │   └── aidentity.md
       │
       ├── Dialogues (대화) [RAW DATA]
       │   ├── _preface.md
       │   └── raw/wormhole_original.txt
       │
       └── Essays (사유)
           ├── _preface.md
           ├── drfc-001-umbral-breath.md
           └── drfc-002-wormhole.md

4. SYSTEM (Login / Dashboard)
   └── [To be designed]
```

---

## Navigation Flow

```
┌─────────────────────────────────────────────────┐
│  TERMINAL  │  SERVICE  │  KNOWLEDGE  │  SYSTEM  │
└─────────────────────────────────────────────────┘
      │            │            │
      ▼            ▼            ▼
   Landing      Pricing      Archive
      │            │         ┌──┴──┐
      │            │    Manifesto  Mechanics
      │            │    Dialogues  Essays
      │            │
      └────────────┴───────────────┐
                                   ▼
                            [CTA Buttons]
                    "사회에 진입하기" / "제안서 보내기"
```

---

## File Structure

```
D:\exe.blue\aifarm\
├── website/
│   ├── SITEMAP.md          # This file
│   └── pages/
│       ├── landing.md      # 랜딩페이지 카피
│       └── pricing.md      # 프라이싱 페이지 카피
│
├── knowledge/
│   ├── LICENSE.md
│   ├── manifesto/
│   ├── mechanics/
│   ├── dialogues/
│   └── essays/
│
└── philosophy/              # Legacy (deprecated)
    ├── concepts/
    ├── dialogues/
    └── entities/
```

---

## License

- Website Copy: Proprietary
- Knowledge Content: CC BY-NC-ND 4.0
