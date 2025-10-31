# Bug Fixes

This document tracks all bug fixes applied to the WAiK Landing Page project.

---

## [Fixed] Memory Leak in DemoModal Component

**Date:** October 31, 2025  
**Component:** `components/demo-modal.tsx`  
**Severity:** Medium

### Issue Description

The `DemoModal` component had a memory leak caused by an uncleaned `setTimeout` callback. When a user submitted the demo request form successfully, a 2-second timeout would be set to reset the form and close the modal. However, if the user clicked the X button to close the modal before the timeout completed, the callback would still fire and attempt to update state on an unmounted or hidden component, causing React warnings.

### Root Cause

The `setTimeout` at line 48 was not being tracked or cleaned up:

```typescript
// BEFORE - Memory leak present
setTimeout(() => {
  setFormData({ ... })
  setSubmitStatus({ ... })
  onClose()
}, 2000)
```

### Solution Implemented

1. Added `useRef` to track the timeout ID
2. Added `useEffect` with cleanup to clear timeout on unmount
3. Added second `useEffect` to clear timeout when modal closes (`isOpen` changes)
4. Stored timeout reference in `timeoutRef.current`

```typescript
// AFTER - Memory leak fixed
const timeoutRef = useRef<NodeJS.Timeout | null>(null)

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }
}, [])

// Cleanup when modal closes
useEffect(() => {
  if (!isOpen && timeoutRef.current) {
    clearTimeout(timeoutRef.current)
    timeoutRef.current = null
  }
}, [isOpen])

// Store timeout reference
timeoutRef.current = setTimeout(() => {
  setFormData({ ... })
  setSubmitStatus({ ... })
  onClose()
  timeoutRef.current = null
}, 2000)
```

### Impact

- ✅ Eliminates React warnings about updating unmounted components
- ✅ Prevents potential memory leaks in long-running sessions
- ✅ Improves component lifecycle management
- ✅ Better user experience (no console errors)

### Testing Notes

To verify the fix:
1. Open the demo modal
2. Fill out and submit the form
3. Immediately click the X button before the 2-second auto-close
4. Check browser console - should have no React warnings

### Related Files

- `components/demo-modal.tsx` - Main component file

---

