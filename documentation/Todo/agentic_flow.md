*   **NEW Agentic Flow (Initial Report):**
    1.  **Initiation:** User starts a report for a specific incident type (e.g., Fall).
    2.  **Open Narration:** The agent asks for the story in the user's own words. This is crucial for capturing raw, unfiltered details.
    3.  **Keyword Extraction & Context ID:** The agent's brain analyzes the narration for keywords ("wheelchair," "slipped," "bed," "dizzy"). This is the new, critical step.
    4.  **Dynamic Question Branching:** Based on the identified context, the agent loads a specific, targeted question set from our database.
    5.  **Guided Q&A:** The agent intelligently asks the general questions *and* the context-specific questions, ensuring all compliance gaps are filled.
    6.  **Completion & Handoff:** The agent confirms the initial report is complete and automatically triggers the start of the asynchronous "Post-Incident Analysis" workflow.


### 🤖 How This Affects Our Agentic Flows

This document completely revolutionizes our "Agent 1" and massively enriches our other two.

#### **1. Agent 1: The "Incident Report Agent" (Major Overhaul)**
Our old flow was too simple. Here is the new, Scott-approved flow:

* **Node 1: `ask_general_questions`**
    * **Logic:** Asks the questions for *ALL* falls (Who, What, Where, When, Witnessed?) [cite: 653-667].
* **Node 2: `listen_and_classify`**
    * **Logic:** Listens to the staff's open-ended description for keywords (e.g., "wheelchair," "bed," "lift," "slip") [cite: 915-930].
* **Node 3: `conditional_edge_router` (The "Brain")**
    * **Logic:** This is the "conditional edge" we discussed. Based on the keyword found in Node 2, it routes the conversation to a specialized "sub-agent" or node.
* **Node 4a: `node_ask_wheelchair_questions`** [cite: 669-678]
* **Node 4b: `node_ask_bed_questions`** [cite: 679-686]
* **Node 4c: `node_ask_slip_questions`** [cite: 687-695]
* **Node 4d: `node_ask_lift_questions`** [cite: 804-861]
* **Node 5: `ask_post_fall_questions`**
    * **Logic:** Asks the ChatGPT-suggested questions about *after* the fall (e.g., "Any injuries? Was family notified? Vitals taken?") [cite: 734-740].
* **Node 6: `node_score_report` (The NEW "Report Card" Feature)**
    * **Logic:** This new node reviews the completed conversation state and provides immediate feedback to the staff member[cite: 647].
* **Node 7: `finalize_and_save`**
    * **Logic:** Saves the complete Q&A to the database and notifies the Admin.



1.  **Update the Database Schema:** We *must* add a `sub_type` column to our `incidents` table (e.g., 'fall-wheelchair', 'fall-bed'). This is no longer optional.
2.  **Rethink Vercel v0 Prompt 4:** The "Incident Reporting" prompt is now far more complex. We must build the UI to handle this *branching, multi-step conversation* instead of a simple linear one.
3.  **Build the "Keyword Router":** The `conditional_edge` in our `Incident Report Agent` is now the single most important piece of logic to build. It's the "magic" that makes the agent feel intelligent.


Changes 
app/api/users/route.ts