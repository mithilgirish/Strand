# Contributing to STRAND

Thank you for your interest in contributing to STRAND! This guide explains how to set up a local development environment and how to contribute new features, bug fixes, specification parsers, or agents.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Setup](#development-setup)
3. [How to Add a New Specification Parser](#how-to-add-a-new-specification-parser)
4. [How to Add a New Agent](#how-to-add-a-new-agent)
5. [How to Add a New Dashboard Widget](#how-to-add-a-new-dashboard-widget)
6. [Code Style](#code-style)
7. [Pull Request Process](#pull-request-process)

---

## Getting Started

1. **Fork** the repository and clone your fork.
2. Create a new branch: `git checkout -b feat/your-feature-name`
3. Make your changes, then open a Pull Request against the `main` branch.

---

## Development Setup

### Prerequisites
- Python 3.11+
- Node.js 20+
- Docker & Docker Compose (recommended for databases)

### 1. Start Databases (Neo4j + Redis)

```bash
docker compose up neo4j redis -d
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env       # Fill in your API keys
uv venv .venv              # or: python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev                # Opens at http://localhost:3000
```

---

## How to Add a New Specification Parser

STRAND's Guardian agent audits vendor submittals against specification clauses stored in Neo4j. Adding support for a new engineering standard (e.g., ASHRAE 90.4, NFPA 75, IEC 60364) requires defining new clause rules.

### Step 1: Define the Clause Rules

Create a new file in `backend/ingestion/spec_rules/` (e.g., `ashrae_90_4.py`):

```python
# backend/ingestion/spec_rules/ashrae_90_4.py

CLAUSES = [
    {
        "section": "6.3.1",
        "parameter_name": "pue_target",
        "required_value": 1.4,
        "unit": "",
        "operator": "lte",  # "lte", "gte", "eq"
        "document_source": "ashrae_90_4_2019.pdf",
        "text": "Data center PUE must not exceed 1.4 (ASHRAE 90.4-2019 §6.3.1)",
    },
]
```

### Step 2: Ingest the Rules into Neo4j

Run the ingestion command:

```bash
python scripts/ingest_spec_rules.py --standard ashrae_90_4
```

### Step 3: Test with a Sample Submittal

Upload a sample PDF via the Guardian page or via the API:

```bash
curl -X POST http://localhost:8000/api/v1/guardian/analyze \
  -F "file=@sample_submittal.pdf" \
  -F "submittal_id=TEST-001"
```

---

## How to Add a New Agent

Each agent lives in `backend/agents/` as a standalone Python module.

### Step 1: Create the Agent File

```python
# backend/agents/my_agent.py

async def run_my_agent(input_data: dict, project_id: str = "default") -> dict:
    """
    Describe what this agent does.
    """
    # Your logic here
    return {
        "result": "...",
        "confidence": "High",
    }
```

### Step 2: Register the Router

Add an API route in `backend/routers/` and register it in `backend/main.py`.

### Step 3: (Optional) Add a Frontend Page

Add a new page in `frontend/app/(main)/your-agent/page.tsx`.

---

## How to Add a New Dashboard Widget

Dashboard widgets live in `frontend/components/custom-dashboards/widgets/`.

### Step 1: Create the Widget Component

```tsx
// frontend/components/custom-dashboards/widgets/MyWidget.tsx
import { DashboardRow } from "../types";

interface Props {
  data: DashboardRow[];
  title?: string;
}

export default function MyWidget({ data, title }: Props) {
  return (
    <div>
      <h3>{title}</h3>
      {/* Your visualization here */}
    </div>
  );
}
```

### Step 2: Register the Widget Type

Add the type to `frontend/components/custom-dashboards/types.ts`:

```ts
export type WidgetType = 
  | "R0Gauge"
  | "DataGrid"
  | "MyWidget"   // ← add yours here
  // ...
```

### Step 3: Add the Renderer

Register it in `DashboardCanvas.tsx` in the widget render switch statement.

---

## Code Style

### Python
- Formatter: `ruff format`
- Linter: `ruff check`
- Type checker: `mypy` (optional but encouraged)

```bash
ruff format backend/
ruff check backend/
```

### TypeScript / React
- Formatter: Prettier (via ESLint config)
- Linter: ESLint

```bash
cd frontend
npm run lint
npx tsc --noEmit
```

---

## Pull Request Process

1. Ensure `ruff check` and `npx tsc --noEmit` both pass with no errors.
2. Write a clear PR description explaining **what** you changed and **why**.
3. For new specification parsers, include a sample PDF or test clause data.
4. A maintainer will review and merge within 5–7 days.

---

For questions, open a [GitHub Discussion](https://github.com/mithilgirish/Strand/discussions).
