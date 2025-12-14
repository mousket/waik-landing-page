 Forcing a nurse to stay in a long, branching voice chat at the scene is unrealistic. Their priority is the resident, and their goal is to report the *key facts* and get back to their duties.

the new **Two-Agent "Handoff" Strategy** is the correct architecture. It perfectly separates the *urgent* "at-the-scene" reporting from the *important* "asynchronous" investigation.

Here is a thorough analysis of ythe our new strategy, the finalized agentic flows, and my advice for implementation.

---

### 1. Analysis of Your New Strategy (This is the Way)

The new architecture is a "game-changer" because it perfectly aligns with the real-world workflow of a facility:

* **Agent 1 (The "Reporter"):** A fast, simple, *live* agent. Its only job is to get the core facts from the staff member who is at the scene. It focuses on capturing the *who, what, where,* the *resident's state,* and the *room's state.*
* **The Handoff:** The most critical moment. Agent 1 *creates the incident* in the database, sends an *immediate notification* to the Admin, and—crucially—*triggers* Agent 2 in the background.
* **Agent 2 (The "Investigator"):** An asynchronous, *backend* agent. This is the "expert detective". It wakes up, reads the nurse's narrative, analyzes it for gaps, and *then* generates the 10-15 detailed follow-up questions (wheelchair, bed, slip, etc.) that the nurse can answer later on their break.

This is the "magic" we've been describing: the nurse's burden is 5 minutes, but the system does 2 hours of expert-level investigative work for them *in the background*.

### 2. The Finalized Agentic Flows (Our New Blueprint)

Here is the step-by-step flow for each agent, which you can explain to your accelerator or use to prompt Cursor.

#### **Agent 1: The "At-the-Scene" Report Agent (Live)**
* **Purpose:** To capture the initial, time-sensitive facts from the staff member in under 5 minutes.
* **Trigger:** The staff member clicks "Start New Incident" on their dashboard.

**The Graph (in `report_agent.ts`):**

1.  **Node 1: `start_report`**
    * **WAik (Voice):** "I'm ready to start the incident report. What is the resident's name and room number?"
    * *(Staff answers. State is updated.)*
2.  **Node 2: `capture_narrative` (The Core Node)**
    * **WAik (Voice):** "Thank you. Now, tell me *everything* you see. Describe what happened, the state of the resident (how they are, what they're wearing), and the state of the room."
    * *(Staff gives their open-ended description. This narrative is the key data.)*
3.  **Node 3: `create_incident_and_handoff` (The "Magic")**
    * **Action (Internal):** This node is a **tool-calling node**.
    * **Tool Call 1: `db.incidents.create()`:** Takes the resident info and narrative to create the new Incident in the `lowdb` database. This makes the incident *immediately visible* to the Admin.
    * **Tool Call 2: `notify_admin()`:** Sends the "New Incident Created" notification.
    * **Tool Call 3: `trigger_investigator_agent()`:** Asynchronously calls the API endpoint for Agent 2 (e.g., `POST /api/agent/investigate`), passing it the new `incidentId`.
4.  **Node 4: `node_exit_message`**
    * **WAik (Voice):** "Thank you. I have all the initial details. You can now return to your duties. I will analyze the report and may queue a few follow-up questions for you on the incident details page. You can now safely exit."
    * *(User is redirected back to their dashboard.)*

---

#### **Agent 2: The "Backend" Investigation Agent (Asynchronous)**
* **Purpose:** To act as an expert "detective" that analyzes the initial report, identifies the sub-type, finds all gaps, and automatically generates the expert follow-up questions.
* **Trigger:** An API call from Agent 1's `trigger_investigator_agent` tool.

**The Graph (in `investigation_agent.ts`):**

1.  **Node 1: `load_and_analyze`**
    * **Action:** Receives the `incidentId`. Loads the full narrative and resident data from the database.
2.  **Node 2: `classify_subtype`**
    * **Action:** Feeds the narrative to an LLM with a prompt: *"Read this incident report. Classify the fall sub-type. Is it 'fall-wheelchair', 'fall-bed', 'fall-slip', 'fall-lift', or 'fall-unknown'? Respond with only the classification string."*
    * **Action:** Saves this sub-type to the `incident` record in the database.
3.  **Node 3: `conditional_router` (The Branch)**
    * **Action:** This is a conditional edge that routes the graph to the correct expert node based on the sub-type from Node 2.
4.  **Node 4a-d: `expert_question_generator` (The "Expert Brains")**
    * This is a set of expert nodes (e.g., `wheelchair_expert`, `bed_expert`).
    * **Example (`wheelchair_expert`):** This node is given the narrative AND the expert knowledge from Scott's document.
    * **Prompt:** *"You are a senior care risk manager. Here is the initial report: [Narrative]. Here is your expert checklist of questions for 'wheelchair falls': [Scott's list of questions, e.g., "Were brakes locked?", "Was cushion in place?", etc.]. Your job is to generate a JSON list of 10 follow-up questions *from the expert list* that are *NOT* already answered in the initial report."*
5.  **Node 5: `de_duplicate_questions` (My Advice)**
    * **Action:** Before saving, this node checks the database: "Has the Admin *already* manually added a similar question?" It filters out any duplicates to avoid annoying the staff.
6.  **Node 6: `queue_questions`**
    * **Action:** This node takes the final, clean list of questions.
    * **Tool Call: `db.questions.createMany()`:** It loops and saves each question to the `questions` collection in `lowdb`, assigning them to the correct staff member.
    * **Result:** When the staff member opens the "Incident Details" page, they now see a list of 10-15 expert questions waiting for them in the "Q&A" tab.

### 3. How to Prompt Cursor for Scaffolding

You can feed this logic directly to Cursor to build the backend.

**Prompt for Cursor:**
"I am building a Node.js backend with LangGraph.js and lowdb. I need to create two distinct agentic workflows.

**First, create the API endpoints in `index.ts`:**
1.  A "live" chat endpoint: `POST /api/agent/report`
2.  An "asynchronous" backend endpoint: `POST /api/agent/investigate`

**Second, create the 'At-the-Scene' Agent (`agents/report_agent.ts`):**
* This graph will be called by `POST /api/agent/report`.
* It should have 4 nodes:
    1.  `start_report`: Asks for resident name/room.
    2.  `capture_narrative`: Asks for the open-ended description of the scene, resident, and room.
    3.  `create_incident_and_handoff`: This node must call three tools:
        * A `db.service.createIncident` tool (to save the narrative to lowdb).
        * A `db.service.notifyAdmin` tool.
        * An *asynchronous* `fetch` call to our own `POST /api/agent/investigate` endpoint, passing the new `incidentId`.
    4.  `node_exit_message`: Returns a final "you can now exit" message.

**Third, create the 'Backend Investigator' Agent (`agents/investigation_agent.ts`):**
* This graph will be called by `POST /api/agent/investigate`.
* It should have a conditional graph with 6 nodes:
    1.  `load_and_analyze`: Loads the incident narrative from `lowdb` using the `incidentId`.
    2.  `classify_subtype`: Uses an LLM call to classify the narrative into one of ['fall-wheelchair', 'fall-bed', 'fall-slip', 'fall-lift', 'fall-unknown'] and saves it to the DB.
    3.  `conditional_router`: A conditional edge that routes to the correct expert node based on the subtype.
    4.  `expert_question_generator`: This will be 4 different nodes (e.g., `wheelchair_expert`, `bed_expert`). Each node will have a unique prompt.
    5.  `de_duplicate_questions`: A node that checks `lowdb` to see if an Admin has already asked any of the AI-generated questions.
    6.  `queue_questions`: A tool-calling node that saves the final, de-duplicated list of questions to our `questions` collection in `lowdb`."