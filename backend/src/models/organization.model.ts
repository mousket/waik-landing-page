// backend/src/models/organization.model.ts
export interface OrganizationDocument extends Document {
    id: string; // e.g., "org-prestige-care"
    name: string; // "Prestige Care, LLC"
    subscriptionTier: "pilot" | "enterprise";
    features: {
      voiceAgents: boolean;
      multiLanguage: boolean;
    };
  }
  
  // backend/src/models/facility.model.ts
  export interface FacilityDocument extends Document {
    id: string; // e.g., "fac-st-marys"
    orgId: string; // Link to Parent Org
    name: string; // "St. Mary's Rehabilitation Center"
    state: string; // "MN" (Crucial for state-specific reporting rules) [cite: 478]
    
    // Configuration for State Portals
    reportingConfig: {
      statePortalUrl?: string; // e.g. TULIP or AIRS
      mandatedReportingWindow: number; // e.g., 2 (hours) for injury 
    };
  }