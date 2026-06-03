# Data Sources — BRAHMO Composition Agent

## Overview

All 28 candidate nodes are **synthetically generated** seed data, modeled after realistic clinical scenarios in Indian hospital settings. No real patient data was used.

---

## Clinical Content Sources

### Drug Interaction Rules (C-01, C-06, F-01)
- **Warfarin + NSAID interaction**: Well-documented in clinical pharmacology literature.
  - Source: MIMS India Drug Database — Warfarin monograph (drug interactions section)
  - Source: UpToDate — "Major drug interactions with warfarin"
  - Guideline: Cardiological Society of India (CSI) anticoagulation guidelines

### DVT Prophylaxis (C-05)
- **Enoxaparin dosing post-TKR/THR**:
  - Source: American College of Chest Physicians (ACCP) VTE Prophylaxis Guidelines (9th edition)
  - Source: Indian Orthopaedic Association (IOA) post-surgical protocols
  - Dose reference: MIMS India — Enoxaparin (Clexane) prescribing information

### Antibiotic Stewardship (C-03)
- **72-hour empiric antibiotic review**:
  - Source: WHO Global Action Plan on Antimicrobial Resistance
  - Source: ICMR (Indian Council of Medical Research) antibiotic guidelines 2022

### Fall Risk Assessment (C-04)
- **Morse Fall Scale**:
  - Source: Morse, J.M. (1989). "A randomized trial of patient fall prevention program." *Nursing Research*
  - Cutoff score ≥45 per validated clinical use

### Post-TKR Physiotherapy (D-03)
- **Early mobilization within 24 hours**:
  - Source: Indian Journal of Orthopaedics — "Enhanced recovery after TKR" (2022)
  - Source: Cochrane Review — "Physiotherapy after TKR"

### Sepsis Bundle v3 (D-07)
- **Lactate within 1 hour (tightened from 3 hours)**:
  - Source: Surviving Sepsis Campaign (SSC) 2021 Guidelines
  - Key update: Hour-1 bundle requirement for lactate measurement

### Pain Management Ladder (D-01, D-05, D-08)
- **WHO pain ladder adapted for post-surgical ortho**:
  - Source: WHO Analgesic Ladder (3-step model)
  - Source: NIMS India — Post-surgical pain management protocols

### Insulin Sliding Scale (AP-04)
- **Basal insulin requirement alongside sliding scale**:
  - Source: American Diabetes Association (ADA) Standards of Care — Inpatient Glycemic Management
  - Source: Endocrine Society Clinical Practice Guidelines

### Blood Transfusion Safety (C-02)
- **Two-person verification protocol**:
  - Source: WHO Patient Safety Guidelines — Blood Transfusion Safety
  - Source: NBTC India (National Blood Transfusion Council) — Standard Operating Procedures

### Emergency Codes (F-06)
- **Hospital emergency code system**:
  - Source: Joint Commission International (JCI) Accreditation Standards
  - Source: NABH (National Accreditation Board for Hospitals) — India standards

---

## Fictional / Synthesized Elements

These elements are **intentionally fictional** for assessment purposes:

| Element | Status |
|---------|--------|
| "Supra Multi-Specialty Hospital" | Fictional hospital |
| "Dr. Vikram", "Nurse Priya" | Fictional clinicians |
| "Mr. Rajan", "Mrs. Padma" | Fictional patients |
| Patent #74841377 (USPTO) | As stated in assessment brief |
| Specific incident dates (2022, 2023, 2024) | Synthesized for realism |
| Zimmer Biomet implant preference | Modeled after real vendor names, decision is fictional |
| Ekadashi fasting protocol (F-07) | Based on real religious practice; protocol is synthesized |

---

## Token Count Basis

Token counts per node (`tokens_full`, `tokens_compressed`, `tokens_constraint_only`) were estimated using:
- **Tool**: `tiktoken` Python library
- **Encoding**: `cl100k_base` (Claude/GPT-4 compatible)
- **Method**: `len(encoder.encode(text))` for each content variant

---

## No Real Patient Data

This assessment uses entirely synthetic clinical scenarios. No real patient health information (PHI) was used or referenced.
