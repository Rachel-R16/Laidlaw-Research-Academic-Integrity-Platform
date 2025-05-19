# Laidlaw-Research-Academic-Integrity-Platform

This repository contains the research and prototype for a novel system to detect AI-generated content in academic writing by analyzing the **writing process** rather than the final written product. Developed as part of the Laidlaw Research and Leadership Programme (Summer 1), this project aims to create a transparent, ethical, and technically feasible approach to safeguarding academic integrity in the era of generative AI.

## 🧠 Project Overview

Conventional AI-detection tools rely on linguistic analysis and writing style, which are increasingly unreliable and can lead to false accusations. This project proposes a **process-based framework** using:

- **Keystroke Logging**: Capturing real-time typing behavior.
- **AI Interaction Tracking**: Monitoring queries to AI tools during writing.

By focusing on how a piece of work was created, this system provides a more robust foundation for identifying suspicious behavior (e.g., mass pastes, large inactivity gaps, or hidden AI use) without penalizing stylistic nuance or legitimate student work.

## 📌 Objectives

- Develop a prototype that simulates behavioral tracking during academic writing.
- Integrate logging for keystroke activity and AI interactions.
- Evaluate the system’s potential for real-world deployment in educational settings.
- Explore ethical, privacy, and scalability concerns.

## 🔧 Features (Planned / In Progress)

- [x] Basic keystroke logger
- [x] Interaction logger for AI queries
- [ ] Behavior-based anomaly detection
- [ ] Simulation tests for academic writing scenarios


## 🧪 Running the Prototype

> ⚠️ *Note: This is an early-stage prototype. Modules are in development and subject to change.*

To test the logger:
```bash
cd prototype/logger
python keystroke_logger.py
````

To simulate an AI query logging session:

```bash
cd prototype/logger
python ai_interaction_simulator.py
```

Outputs will be saved in the `results/` folder for analysis.

## 🧭 Methodology

The research is structured in three phases:

1. **Review**: Analysis of existing detection tools, keystroke dynamics, and privacy models.
2. **Development**: Building the logging system and integrating behavior detection logic.
3. **Evaluation**: Testing use cases, assessing reliability, scalability, and ethical impact.

## 🙋‍♀️ Author

**\Rachel Ranjith** – Laidlaw Scholar (Trinity College Dublin)
Part of the Laidlaw Research & Leadership Programme (Summer 1)

## 📢 Disclaimer

This repository is part of an academic research project. The prototype is not intended for immediate institutional use without further testing, stakeholder consultation, and ethical review.
