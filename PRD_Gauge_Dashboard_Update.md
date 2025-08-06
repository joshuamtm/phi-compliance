# Product Requirements Document (PRD)
## PHI Compliance Dashboard - Gauge Visualization Enhancement

### Version 1.0
### Date: December 2024
### Requested by: Mélange Matthews (Public Health Institute)
### Board Requirement: Yes

---

## 1. EXECUTIVE SUMMARY

The PHI Board of Directors has requested the addition of gauge visualizations to the FY 2025 Compliance & Ethics Workplan dashboard to enhance readability and provide quick visual understanding of program status metrics. This PRD outlines the requirements for implementing interactive gauge components while preserving the existing color-coded status system.

## 2. BACKGROUND & CONTEXT

### Current State
- Dashboard currently uses color-coded system with numeric statuses (1-4)
- Excel spreadsheet source with status colors: Gray (Ongoing), Blue (On Track), Green (Complete), Yellow (Delayed)
- Board wants visual gauges to supplement the existing analytics

### Key Stakeholder Requirements (from meetings)
- **Mélange Matthews**: "I was okay leaving it with the Excel spreadsheet and the colors, but our board wants gauges, and so we'll give them gauges"
- **Critical Requirement**: "Be attentive to the gray zone, to the ongoing work, so that it's credited responsibly in the gauge"
- **Concern**: Gray status for "Ongoing" work shouldn't appear stuck but should show it's actually on track

## 3. FUNCTIONAL REQUIREMENTS

### 3.1 Gauge Components

#### 3.1.1 Overall Program Completion Gauge
**Purpose**: Display overall program completion status at a glance
**Specifications**:
- **Type**: Semi-circular gauge (180-degree arc)
- **Scale**: 0-100%
- **Current Value**: Display `data.summary.avgCompletion`
- **Color Zones**:
  - Red Zone: 0-40% (Behind Schedule)
  - Yellow Zone: 40-70% (Needs Attention)
  - Green Zone: 70-100% (On Track)
- **Center Display**: Large percentage value with label "Overall Completion"
- **Needle**: Animated pointer showing current value

#### 3.1.2 Status Distribution Gauges (Set of 4)
**Purpose**: Show individual status category percentages
**Specifications**:
- **Gauge 1 - Ongoing Activities**:
  - Color: Gray (#6B7280)
  - Value: Percentage of ongoing activities
  - Special Note: Include indicator showing this is "Active/In Progress" not "Stuck"
  
- **Gauge 2 - On Track Activities**:
  - Color: Blue (#3B82F6)
  - Value: Percentage of on-track activities
  
- **Gauge 3 - Complete Activities**:
  - Color: Green (#10B981)
  - Value: Percentage of completed activities
  
- **Gauge 4 - Delayed Activities**:
  - Color: Yellow/Amber (#F59E0B)
  - Value: Percentage of delayed activities

**Common Specifications for Status Gauges**:
- **Type**: Circular progress rings or compact semi-circular gauges
- **Size**: Smaller than main gauge, arranged in a 2x2 grid
- **Display**: Percentage value in center with activity count below
- **Animation**: Smooth fill animation on load

#### 3.1.3 Compliance Element Maturity Gauges (Set of 7)
**Purpose**: Display maturity score for each of the 7 compliance elements
**Specifications**:
- **One gauge per element** (E1-E7)
- **Type**: Compact radial or linear progress gauges
- **Scale**: 0-100% maturity score
- **Color Coding**:
  - Red: 0-40% (Needs Immediate Attention)
  - Orange: 40-60% (Developing)
  - Yellow: 60-80% (Maturing)
  - Green: 80-100% (Mature)
- **Labels**: Element code and abbreviated name
- **Tooltip**: Full element description on hover

### 3.2 Data Integration Requirements

#### 3.2.1 Status Number Mapping
- Add numeric status column to Excel source data:
  - 1 = Ongoing (Gray)
  - 2 = On Track (Blue)
  - 3 = Complete (Green)
  - 4 = Delayed (Yellow)

#### 3.2.2 Real-time Calculations
- All gauge values must update dynamically when new Excel file is uploaded
- Maintain existing data processing logic from `processActivitiesData` function

### 3.3 Layout & Positioning

#### 3.3.1 Dashboard Section Hierarchy
1. **Executive Summary** (existing) - Add main completion gauge here
2. **NEW: Gauge Dashboard Section** - Primary gauge display area
   - Overall Completion Gauge (prominent, centered)
   - Status Distribution Gauges (4-gauge grid below)
3. **Compliance Maturity Gauges** - Integrate into existing maturity section
4. Existing visualizations remain below gauges

#### 3.3.2 Responsive Design
- Desktop: Full gauge display with animations
- Tablet: Maintain gauge visibility with slight size reduction
- Mobile: Stack gauges vertically, maintain readability

## 4. TECHNICAL REQUIREMENTS

### 4.1 Technology Stack
- **Framework**: React with TypeScript (existing)
- **Gauge Library Options**:
  - Option A: `react-gauge-chart` (lightweight, customizable)
  - Option B: `recharts` gauge components (consistent with existing charts)
  - Option C: `react-circular-progressbar` for ring-style gauges
  
### 4.2 Performance Requirements
- Gauge rendering should not impact page load time by more than 200ms
- Smooth animations (60 fps) for needle movements and fills
- Lazy loading for gauge components if needed

### 4.3 Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 5. USER EXPERIENCE REQUIREMENTS

### 5.1 Visual Design
- Consistent with existing dashboard aesthetic
- Clear, professional appearance suitable for board presentations
- High contrast for projector/screen sharing visibility

### 5.2 Interactivity
- **Hover States**: Display detailed tooltips with explanatory text
- **Click Actions**: Optional drill-down to detailed view
- **Animation**: Subtle entrance animations on initial load
- **Print View**: Static gauge representation for PDF exports

### 5.3 Accessibility
- WCAG 2.1 AA compliant
- Screen reader compatible with appropriate ARIA labels
- Keyboard navigation support
- Alternative text representation available

## 6. IMPLEMENTATION NOTES

### 6.1 Special Considerations for "Ongoing" Status
As emphasized by Mélange: "Be attentive to the gray zone, to the ongoing work, so that it's credited responsibly in the gauge."

**Solution Approach**:
- Add subtle animation or pulsing effect to Ongoing gauge to show it's active
- Include explanatory text: "Active & On Schedule" beneath Ongoing gauge
- Consider different visual treatment (e.g., striped fill pattern) to distinguish from "stuck"

### 6.2 Board Presentation Mode
- Add "Presentation Mode" toggle that:
  - Enlarges gauges
  - Hides detailed tables
  - Focuses on key metrics
  - Increases font sizes

## 7. ACCEPTANCE CRITERIA

### 7.1 Functional Acceptance
- [ ] All specified gauges are implemented and display correct data
- [ ] Gauges update when new Excel file is uploaded
- [ ] Gray/Ongoing status shows as "active" not "stuck"
- [ ] All gauge colors match status legend
- [ ] Tooltips provide context for each gauge

### 7.2 Performance Acceptance
- [ ] Page load time increase < 200ms
- [ ] Smooth animations without stuttering
- [ ] No memory leaks from gauge components

### 7.3 User Acceptance
- [ ] Board members can quickly understand status at a glance
- [ ] Gauges are visible and clear in presentation settings
- [ ] Print/PDF export maintains gauge readability

## 8. DEVELOPMENT PHASES

### Phase 1: Core Gauge Implementation (Week 1)
- Implement overall completion gauge
- Add status distribution gauges
- Basic styling and positioning

### Phase 2: Enhanced Features (Week 2)
- Add compliance element maturity gauges
- Implement animations and transitions
- Add presentation mode

### Phase 3: Polish & Testing (Week 3)
- User acceptance testing with stakeholders
- Performance optimization
- Accessibility compliance
- Documentation

## 9. SUCCESS METRICS

- Board satisfaction with visual clarity
- Reduction in time to understand compliance status (target: < 10 seconds)
- Positive feedback on "Ongoing" status representation
- Zero critical bugs in production

## 10. APPENDIX

### A. Color Codes Reference
```javascript
const statusColors = {
  ongoing: '#6B7280',    // Gray
  onTrack: '#3B82F6',    // Blue
  complete: '#10B981',   // Green
  delayed: '#F59E0B'     // Yellow/Amber
};
```

### B. Sample Gauge Configuration
```javascript
const gaugeConfig = {
  overall: {
    min: 0,
    max: 100,
    segments: 3,
    colors: ['#EF4444', '#F59E0B', '#10B981'],
    needle: {
      color: '#464A4F',
      width: 5,
      animate: true
    }
  }
};
```

### C. Excel Data Structure Requirement
The Excel file must include a new "Status_Numeric" column with values 1-4 corresponding to the status categories.

---

**Document Status**: Ready for Developer Implementation
**Next Steps**: 
1. Technical team to review and provide effort estimates
2. Select gauge library based on technical evaluation
3. Begin Phase 1 implementation upon approval