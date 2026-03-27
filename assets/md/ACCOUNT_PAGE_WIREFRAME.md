# Account Page Wireframe & Layout Description

## Visual Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  [Restaurant Icon] Friedays Bocaue - My Account  [Account Icon] → account.html │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ PROFILE SECTION                                         │
│ ┌─────────┐                                             │
│ │  👤     │  John Doe                      [Edit Button] │
│ │ Avatar  │  john@example.com                           │
│ │         │  +63 9XX-XXX-XXXX                           │
│ └─────────┘                                             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ TIER STATUS SECTION                    "View All Benefits" │
│ ┌─────────────────────────────────────────────────────┐ │
│ │                                                     │ │
│ │  ┌─────────┐              Silver Tier Member      │ │
│ │  │   🥈    │              Enjoy premium benefits! │ │
│ │  │ SILVER  │                                       │ │
│ │  └─────────┘  Spending to Next Tier                │ │
│ │               ▓▓▓▓░░░░░░ 25%                        │ │
│ │               ₱2,500 of ₱10,000                     │ │
│ │                                                     │ │
│ │  Member Since: Jan 15, 2024  │ Total Spent: ₱7,500 │
│ │  Loyalty Points: 150                                │ │
│ │                                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Ready to unlock more benefits?                      │ │
│ │ Spend ₱2,500 more to reach Gold tier               │ │
│ │ [Learn About Premium Tiers]                         │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

┌────────────────┬──────────────────┬────────────────┬──────────────┐
│ BENEFITS GRID (4 Tier Comparison)                                   │
├────────────────┬──────────────────┬────────────────┬──────────────┤
│      🥉        │       🥈         │       🥇       │      💎       │
│    BRONZE      │     SILVER       │      GOLD      │   PLATINUM    │
│                │                  │  ← YOUR TIER   │               │
├────────────────┼──────────────────┼────────────────┼──────────────┤
│ ✓ 5% Discount  │ ✓ 10% Discount   │ ✓ 15% Discount │ ✓ 20% Discount│
│ ✓ Free Del ≥500│ ✓ Free Del ≥300  │ ✓ Free Delivery│ ✓ Free Del +  │
│ ✓ Birthday 10% │ ✓ Birthday 15%   │ ✓ Birthday 25% │ ✓ Birthday 30%│
│ ✓ Newsletters  │ ✓ Early Access   │ ✓ VIP Support  │ ✓ VIP Support │
│                │ ✓ Silver Deals   │ ✓ Events       │ ✓ Personal Mgr│
│                │                  │ ✓ 2x Points    │ ✓ 3x Points   │
│                │                  │                │ ✓ VIP Code    │
└────────────────┴──────────────────┴────────────────┴──────────────┘

┌──────────────────────────────────────────────────────────┐
│ BILLING & REWARDS (3 Card Grid)                          │
├───────────────┬──────────────────┬────────────────────┤
│  🎁 Loyalty    │ 🏷️ Promotions    │ 💳 Payment Methods│
│  Points        │                  │                    │
│  Available:    │ ✓ Friday Special: │ [+ Add Payment]   │
│  150           │   Extra 5% off    │                    │
│                │ ✓ Referral: ₱100  │                    │
│  Redeem for    │ ✓ Bundle: 10% off │                    │
│  discounts!    │                  │                    │
└───────────────┴──────────────────┴────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ ACCOUNT SETTINGS                                          │
│ ☑ Email Notifications                                   │
│ ☐ SMS Notifications                                     │
│ ☑ Promotional Emails                                    │
│ [Save Settings]  [Logout]                               │
└──────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. Profile Card
**Purpose**: Display user identity and quick actions
- **Elements**:
  - Avatar placeholder or user image
  - Full name (editable)
  - Email (editable)
  - Phone number (editable)
  - Edit button (opens modal)
- **Actions**:
  - Click "Edit" → Opens edit modal with pre-filled data
  - Save changes → Updates localStorage and displays confirmation

### 2. Tier Badge
**Purpose**: Visual tier indicator with clear branding
- **Design Features**:
  - Large circular badge with tier icon (🥉 🥈 🥇 💎)
  - Color-coded gradients per tier
  - Tier name below icon
  - Box shadow for depth
- **Color Scheme**:
  - Bronze: #cd7f32 (copper)
  - Silver: #c0c0c0 (metallic)
  - Gold: #ffd700 (golden)
  - Platinum: #e5e4e2 (platinum)

### 3. Tier Progress Bar
**Purpose**: Visualize advancement to next tier
- **Display Logic**:
  - Shows current spending vs. threshold
  - Animated fill percentage
  - Text label: "₱2,500 of ₱10,000"
  - Max tier shows "Max Tier - ₱50,000+ spent"
- **Update Trigger**: Recalculated on every page load

### 4. Tier Statistics
**Purpose**: Key account metrics at a glance
- **Stats**:
  - Member Since: Formatted join date
  - Total Spent: Lifetime spending total
  - Loyalty Points: Current redeemable balance
- **Layout**: Grid of 3 items, wraps to 1 column on mobile

### 5. Benefits Comparison Grid
**Purpose**: Show all tier features for informed decisions
- **Grid Layout**: 4 columns (1 per tier)
- **Each Tier Card**:
  - Colored header with icon + tier name
  - List of benefits with checkmarks
  - Bronze: 4 benefits
  - Silver: 5 benefits
  - Gold: 6 benefits
  - Platinum: 7 benefits
- **Current Tier Indicator**: Border highlight + "YOUR TIER" ribbon
- **Responsive**: 2 columns on tablet, 1 column on mobile

### 6. Billing Cards (3-Column Grid)
**Card 1 - Loyalty Points**:
- Icon: 🎁
- Available balance
- Redemption info

**Card 2 - Active Promotions**:
- Icon: 🏷️
- Bullet list of current deals
- Updated weekly

**Card 3 - Payment Methods**:
- Icon: 💳
- Button to add new payment method
- Will expand to show saved cards

### 7. Account Settings
**Purpose**: User preferences and logout
- **Checkboxes**:
  - Email Notifications
  - SMS Notifications
  - Promotional Emails
- **Buttons**:
  - Save Settings (primary)
  - Logout (danger style)

### 8. Edit Profile Modal
**Overlay Modal with**:
- Semi-transparent backdrop
- Centered white panel
- Form fields:
  - Full Name (text input)
  - Email (email input)
  - Phone Number (tel input)
- **Actions**:
  - Save Changes button
  - Cancel button
  - Close (X) button

---

## Color & Typography

### Color Palette (from styles.css)
```css
--clr-primary: #f97415;        /* Deep Orange - CTA, highlights */
--clr-primary-hover: #c2410c;  /* Dark Orange - Hover states */
--clr-secondary: #431407;      /* Warm Red - Text headings */
--clr-background: #fdfdfd;     /* Creamy off-white - Page bg */
--clr-surface: #ffffff;        /* White - Card backgrounds */
--clr-text: #451a03;           /* Dark Brown - Main text */
--clr-text-light: #78350f;     /* Light Brown - Secondary text */
--clr-border: #f9edbb;         /* Light Beige - Borders */
```

### Typography
```css
Font Family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI'
Main heading: 1.75rem, bold
Section heading: 1.5rem, bold
Card title: 1.15rem, bold
Body text: 1rem, regular
Small text: 0.9rem, regular
```

---

## Responsive Breakpoints

### Desktop (1024px+)
- Tier card: Horizontal layout (badge left, details right)
- Benefits grid: 4 columns
- Profile card: Horizontal with edit button right
- Spacing: 2rem gaps

### Tablet (768px - 1023px)
- Tier card: Horizontal layout maintained
- Benefits grid: 2 columns
- Cart cards: 2 columns
- Settings form: Single column

### Mobile (<768px)
- Profile card: Vertical stacking (center aligned)
- Edit button: Full width
- Tier card: Vertical layout (badge top, details below)
- Benefits grid: 1 column
- Billing cards: 1 column
- All buttons: Full width
- Font sizes: Slightly reduced
- Padding: 1rem instead of 2rem

---

## Interactions & Animations

### Hover Effects
- Buttons: Smooth color transition (200ms)
- Cards: Subtle lift 2px with shadow (200ms)
- Account link: Scale up 5% (200ms)
- Links: Color fade to primary (200ms)

### Transitions
- Modal: Fade in/out (300ms)
- Notifications: Slide up from bottom (300ms)
- Progress bar: Width animation (300ms)

### Form Validation
- Input focus: Blue glow border
- Error state: Red border + error message
- Success: Green checkmark + confirmation toast

---

## Accessibility Features

- **Semantic HTML**: Proper heading hierarchy
- **ARIA Labels**: Icon buttons have descriptions
- **Color Contrast**: WCAG AA compliant
- **Keyboard Navigation**: Tab through all interactive elements
- **Mobile Touch**: 44px minimum touch targets
- **Alternative Text**: All icons have alt text or titles

---

## Page States

### Initial Load State
- Profile data loaded from localStorage
- Tier calculated from totalSpent
- Progress bar animated to current percentage
- All benefits visible

### Loading State
- Skeleton placeholders for profile data
- Progress indicator while fetching

### Logged Out State
- Redirect to login page
- Session cleared

### Max Tier State (Platinum)
- Progress bar shows 100%
- Upgrade CTA hidden
- Statistics display lifetime achievement

---

## Performance Considerations

- Page renders in <100ms
- Tier calculations in <5ms per operation
- Smooth 60fps animations
- Lazy loading for benefit images
- Minimal DOM repaints

---

## Future UI Enhancements

1. **Chart Integration**: Visual spending trends (Chart.js)
2. **Tier Timeline**: Animation showing tier progression history
3. **Social Proof**: Member testimonials carousel
4. **Birthday Banner**: Special designs year-round
5. **Achievement Badges**: Gamification elements
6. **Dark Mode**: Alternative color scheme
7. **Customizable Avatar**: Upload user photo
8. **Export Report**: PDF statement download

---

This wireframe provides a production-ready blueprint for implementation.
