# VibeDrive.je — Tournament Mode Spec: T-REAL-ROADS

## Tournament: Real Jersey Road Network Rendering

### Problem
Render real Jersey street networks from OpenStreetMap onto the Three.js terrain so players drive on actual roads. This is the most architecturally complex ticket — multiple valid approaches exist, and the wrong choice means costly rework.

### Contenders

| # | Model | LiteLLM ID | Approach |
|---|-------|-----------|----------|
| 1 | Kimi K2.7 Code | `ollama-kimi-k2.7-code` | Open — model chooses its own architecture |
| 2 | GLM 5.2 | `ollama-glm-5.2` | Open — model chooses its own architecture |
| 3 | DeepSeek Pro V4 | `ollama-deepseek-v4-pro` | Open — model chooses its own architecture |

### Judge
`litellm-pro` — evaluates all 3 proposals against criteria below.

### Input (same prompt to all 3)
Each contender receives:
- Current game architecture: single HTML file, Three.js via import maps, procedural terrain via Perlin noise + elliptical island mask
- Coordinate mapping: lng center=-2.1976, lat center=49.1654, scale_x=496/deg, scale_z=747.8/deg, z offset=-50
- Jersey OSM data (if research stream finds it) or instructions to fetch it
- The existing `islandMask()`, `getTerrainHeight()`, `createCar()` functions
- Target platform: iPad Safari, touch controls, 60fps

### Evaluation Criteria (Judge scores 1-10 each)
1. **Feasibility** — Can this be implemented in a reasonable timeframe?
2. **iPad Performance** — Will this run at 60fps on mobile Safari?
3. **Accuracy** — How closely does it match real Jersey roads?
4. **Maintainability** — Is the code clean and extensible?
5. **Integration** — How well does it fit with existing game code?
6. **Progressive Enhancement** — Can we phase it in without breaking the current game?

### Output
Each contender produces:
1. Architecture document (500-1000 words)
2. Key code structure (function signatures, data structures)
3. Implementation phases (what to build first)
4. Risk assessment (what could go wrong)

Judge produces:
1. Winner selection with rationale
2. Merged/synthesized approach (best ideas from all 3)
3. Recommended implementation order

### Execution
Run all 3 contenders in parallel via LiteLLM. Collect outputs. Send to judge. Present results to Will for approval before implementation.