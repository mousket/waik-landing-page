// backend/src/models/user.model.ts
export interface UserDocument extends Document {
    // ... existing auth fields ...
    
    // Multi-Tenancy
    orgId: string;
    facilityIds: string[]; // Can belong to multiple (e.g., Regional VP)
    
    // Role Definition
    role: "cna" | "nurse" | "don" | "admin" | "regional_vp" | "dietary" | "therapy" | "activities";
    
    // Profile
    phone?: string; // For Red Alert SMS [cite: 219]
  }