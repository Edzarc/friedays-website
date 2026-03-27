# Visual System Overview

## Complete User Journey

```
┌─────────────────────────────────────────────────────────────────────┐
│                      FRIEDAYS PLATFORM FLOW                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────────┐  │
│  │ index.html   │      │  menu.html   │      │  account.html    │  │
│  │   LOGIN      │──────►  ORDER FOOD  │──────►  MY PROFILE      │  │
│  └──────────────┘      └──────────────┘      └──────────────────┘  │
│         │                      │                      │              │
│         │                      │                      │              │
│  ┌──────▼────────────────────────────────────────────▼────────┐   │
│  │           USER SESSION (localStorage)                      │   │
│  │       friedays_session: "username"                        │   │
│  │       friedays_user: { full account data }               │   │
│  │       friedays_cart: [ items in cart ]                   │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │               TIER SYSTEM ENGINE                            │   │
│  │  ┌────────────────────────────────────────────────────────┐ │   │
│  │  │ accountModule (Business Logic)                        │ │   │
│  │  │ • calculateTierFromSpending()                         │ │   │
│  │  │ • applyTierDiscount()                                 │ │   │
│  │  │ • calculateLoyaltyPoints()                            │ │   │
│  │  │ • getProgressToNextTier()                             │ │   │
│  │  │ • isFreeDelivery()                                    │ │   │
│  │  └────────────────────────────────────────────────────────┘ │   │
│  │  ┌────────────────────────────────────────────────────────┐ │   │
│  │  │ accountAPI (Data Access)                              │ │   │
│  │  │ • fetchUserAccount()                                  │ │   │
│  │  │ • recordPurchase()                                    │ │   │
│  │  │ • updateUserAccount()                                 │ │   │
│  │  └────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Tier Progression Visual

```
SPENDING TIMELINE
═══════════════════════════════════════════════════════════════════

₱0 ─────────────┬─────────────┬──────────────┬──────────────────►
    BRONZE 🥉   │   SILVER 🥈 │    GOLD 🥇   │   PLATINUM 💎
                │             │              │
        5% off  │   10% off   │   15% off    │   20% off
        ↓       │      ↓      │      ↓       │      ↓
   5% discount  │ 10% discount│ 15% discount │ 20% discount
   
Order₁  ₱850    Order₂ ₱4,200  Order₃ ₱2,500  Order₄ ₱8,200
 │        │       │      │        │      │      │      │
 └────────┼───────┴──────┼────────┴──────┼──────┴──────►
         ₱850           ₱5,050         ₱7,550        ₱15,700
         
     🥉 BRONZE        🥉→🥈 UPGRADE!    🥈→🥇 UPGRADE!
     (0% to 17%)      (8% to 50%)      (75% toward 💎)


BENEFITS UNLOCK
═══════════════════════════════════════════════════════════════════

BRONZE                  SILVER                  GOLD               PLATINUM
🥉──────────────────────🥈──────────────────────🥇──────────────────💎
│                       │                       │                  │
├─ 5% discount         ├─ 10% discount⬆️       ├─ 15% discount⬆️  ├─ 20% discount⬆️
├─ Free del ≥₱500      ├─ Free del ≥₱300⬆️    ├─ Free delivery⬆️  ├─ Free + express⬆️
├─ 1x points           ├─ 1.5x points⬆️       ├─ 2x points⬆️      ├─ 3x points⬆️
├─ Birthday 10%        ├─ Birthday 15%⬆️      ├─ Birthday 25%⬆️   ├─ Birthday 30%⬆️
│                      ├─ Early access        ├─ VIP support      ├─ Personal mgr
│                      ├─ Silver deals        ├─ Events           ├─ 24/7 support
│                      │                      ├─ Double points    ├─ VIP events
│                      │                      │                   ├─ VIP code
```

---

## Account Page Component Layout

```
╔═══════════════════════════════════════════════════════════════╗
║          ACCOUNT HEADER - Back & Title                        ║
║  [← Back] My Account                         [Account Icon]   ║
╚═══════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════╗
║  PROFILE SECTION                                              ║
║  ┌────────┐        John Doe                        [Edit ✎]  ║
║  │ AVATAR │        john@example.com                         ║
║  │  👤    │        +63 9XX-XXX-XXXX                         ║
║  └────────┘                                                  ║
╚═══════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════╗
║  TIER STATUS SECTION                    [View All Benefits →] ║
║                                                               ║
║  ┌──────────┐       Silver Tier Member                       ║
║  │    🥈    │       Enjoy premium benefits!                  ║
║  │ SILVER   │                                                ║
║  └──────────┘       Spending to Next Tier                    ║
║                     █████░░░░░ 25%                           ║
║                     ₱2,500 of ₱10,000                        ║
║                                                               ║
║  Member Since: Jan 15, 2024 │ Total: ₱7,500 │ Points: 150   ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │ Ready to unlock more benefits?                          │ ║
║  │ Spend ₱2,500 more to reach Gold tier                   │ ║
║  │            [Learn About Premium Tiers]                  │ ║
║  └─────────────────────────────────────────────────────────┘ ║
╚═══════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════╗
║  BENEFITS COMPARISON                                          ║
║  ┌──────────┬──────────┬──────────┬──────────┐               ║
║  │   🥉     │   🥈     │ 🥇 ←YOU  │   💎     │               ║
║  │ BRONZE   │ SILVER   │  GOLD    │PLATINUM  │               ║
║  ├──────────┼──────────┼──────────┼──────────┤               ║
║  │✓ 5%      │✓ 10%     │✓ 15%     │✓ 20%     │               ║
║  │✓ Free≥500│✓ Free≥300│✓ Always  │✓ Always  │               ║
║  │✓ Email   │✓ Access  │✓ VIP sup │✓ Personal│               ║
║  │✗ Support │✓ Deals   │✓ Events  │✓ 24/7    │               ║
║  │          │          │✓ 2x pts  │✓ Monthly │               ║
║  │          │          │          │✓ 3x pts  │               ║
║  └──────────┴──────────┴──────────┴──────────┘               ║
╚═══════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════╗
║  BILLING & REWARDS (3 Cards)                                  ║
║  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        ║
║  │ 🎁 Loyalty   │  │ 🏷 Promotions│  │ 💳 Payments  │        ║
║  │ Points: 150  │  │ Friday: 5%   │  │ [+ Add Card] │        ║
║  │ Redeem now   │  │ Referral: 100│  │              │        ║
║  │              │  │ Bundle: 10%  │  │              │        ║
║  └──────────────┘  └──────────────┘  └──────────────┘        ║
╚═══════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════╗
║  ACCOUNT SETTINGS                                             ║
║  ☑ Email Notifications                                       ║
║  ☐ SMS Notifications                                         ║
║  ☑ Promotional Emails                                        ║
║                                                               ║
║  [Save Settings]  [Logout]                                   ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## Loyalty Points Calculation Flow

```
SHOP ORDER
│
├─ Order Amount: ₱500
├─ Tier: SILVER (1.5x multiplier)
│
▼
CALCULATE POINTS
│
├─ Base Points: 500 ÷ 50 = 10 points
├─ Apply Multiplier: 10 × 1.5 = 15 points
│
▼
TIER COMPARISON
│
├─ BRONZE: 500 ÷ 50 × 1.0 = 10 points ⭐
├─ SILVER: 500 ÷ 50 × 1.5 = 15 points ⭐⭐
├─ GOLD:   500 ÷ 50 × 2.0 = 20 points ⭐⭐⭐
├─ PLAT:   500 ÷ 50 × 3.0 = 30 points ⭐⭐⭐⭐
│
▼
ADD TO ACCOUNT
│
├─ User.loyaltyPoints += 15
├─ User.orderHistory.push(order)
│
▼
SAVE TO STORAGE
│
└─ Storage.set('friedays_user', updatedUser)
```

---

## Discount Application Example

```
CHECKOUT: ₱750 BURGER ORDER
═════════════════════════════════════════════

CUSTOMER: John Doe (SILVER TIER)

LINE ITEM CALCULATION
┌─────────────────────────────────────┐
│ Subtotal:         ₱750.00           │
│                                      │
│ SILVER DISCOUNT (10%):              │
│ ₱750 × 0.10 = ₱75.00 ← SAVINGS!    │
│                                      │
│ Subtotal After Discount: ₱675.00    │
│                                      │
│ Tax (10% on discounted):             │
│ ₱675 × 0.10 = ₱67.50                │
│                                      │
│ Delivery Fee:                        │
│ ₱0.00 (FREE - Order ≥ ₱300) ← FREE! │
│                                      │
├─────────────────────────────────────┤
│ TOTAL:            ₱742.50           │
│ YOU SAVED:        ₱75.00 (10%)      │
│ MEMBER PERK:      FREE DELIVERY     │
└─────────────────────────────────────┘


COMPARISON BY TIER
₱750 Order Breakdown
─────────────────────────────────────
          BRONZE    SILVER    GOLD    PLATINUM
Discount   -37.50   -75.00   -112.50  -150.00
Tax        +71.25   +67.50   +63.75   +60.00
Delivery   +50.00   +0.00    +0.00    +0.00
─────────────────────────────────────
Total      ₱833.75  ₱742.50  ₱701.25  ₱660.00
SAVE vs    BASE     +91.25   +132.50  +173.75
BRONZE
```

---

## Data Modification Timeline

```
USER JOURNEY WITH DATA CHANGES
════════════════════════════════════════════════════════

DAY 1: Login
└─► friedays_session = "john_doe"
└─► friedays_user = NEW Account (Bronze tier)

DAY 5: First Order ₱850
└─► Check tier (BRONZE)
└─► Apply 5% discount
└─► Calculate points (17)
└─► Update friedays_user:
    • totalSpent: 0 → 850
    • loyaltyPoints: 0 → 17
    • orderHistory: [...] + order
    • tier: BRONZE (recalculated)

DAY 15: Order ₱4,200
└─► Check tier (BRONZE)
└─► Apply 5% discount
└─► Calculate points (84)
└─► Update friedays_user:
    • totalSpent: 850 → 5,050
    • loyaltyPoints: 17 → 101
    • orderHistory: [...] + order
    • tier: 🎉 AUTO-UPGRADE TO SILVER! 🎉

DAY 25: Open Account Page
└─► Load user from storage (SILVER tier)
└─► Render account with:
    • Silver badge ✅
    • Updated benefits ✅
    • Progress toward Gold ✅
    • 10% discount info ✅

DAY 30: Order ₱2,500
└─► Check tier (SILVER)
└─► Apply 10% discount (down from 5%)
└─► Calculate points (75 × 1.5)
└─► Update friedays_user:
    • totalSpent: 5,050 → 7,550
    • loyaltyPoints: 101 → 213
    • orderHistory: [...] + order
    • tier: SILVER (recalculated)
    • Progress: 25% toward Gold
```

---

## API Integration Points

```
CURRENT (localStorage)
══════════════════════════════════════════════════

Storage.get('friedays_user')
    ↓
Returns: Stored user object

Storage.set('friedays_user', userObject)
    ↓
Saves to browser storage


FUTURE (Backend API)
══════════════════════════════════════════════════

GET /api/users/:userId
    ↓
Returns: User object from server

PUT /api/users/:userId
    ↓
Updates user in database

POST /api/users/:userId/purchases
    ↓
Records purchase & updates tier

GET /api/users/:userId/tier-progress
    ↓
Returns: Spending progress data
```

---

## Error Handling Flow

```
USER ACTION
│
▼
VALIDATE INPUT
│
├─── VALID ───┐
│             │
▼             ▼
PROCESS    SHOW ERROR
│          (Toast Message)
▼          │
SUCCESS    └──► USER RETRIES
│
SHOW SUCCESS
(Toast + Update UI)
```

---

## Responsive Design Breakpoints

```
DESKTOP (1024px+)
┌──────────────────────────────────────┐
│ Header with all actions visible      │
├──────────────────────────────────────┤
│ ┌─────────┐  Content                 │
│ │ Sidebar │  2-3 columns layout      │
│ └─────────┘                          │
│ Benefits grid: 4 columns             │
└──────────────────────────────────────┘


TABLET (768-1023px)
┌──────────────────────────────────────┐
│ Header - Compact                     │
├──────────────────────────────────────┤
│ Full-width content                   │
│ Benefits grid: 2 columns             │
│ Stacked sections                     │
└──────────────────────────────────────┘


MOBILE (<768px)
┌──────────────────────────┐
│ Header - Minimal         │
├──────────────────────────┤
│ Full-width, single col   │
│ Benefits grid: 1 column  │
│ Full-width buttons       │
│ Touch-friendly sizes     │
└──────────────────────────┘
```

---

## Production Deployment Steps

```
DEVELOPMENT (Current)
├─ [✓] Code complete
├─ [✓] localStorage working
└─ [✓] UI responsive

         ↓

TESTING
├─ [ ] Test all tiers
├─ [ ] Test purchase flow
├─ [ ] Test responsiveness
└─ [ ] Manual QA

         ↓

BACKEND SETUP
├─ [ ] Database schema created
├─ [ ] API endpoints built
├─ [ ] Authentication ready
└─ [ ] Error handling tested

         ↓

INTEGRATION
├─ [ ] Replace Storage calls
├─ [ ] API endpoints connected
├─ [ ] Server-side validation
└─ [ ] Testing completed

         ↓

STAGING
├─ [ ] Deployed to staging
├─ [ ] Performance tested
├─ [ ] Security reviewed
└─ [ ] User testing

         ↓

PRODUCTION
├─ [ ] HTTPS enabled
├─ [ ] Monitoring setup
├─ [ ] Rate limiting active
└─ [ ] Backups configured

         ↓

LAUNCH
└─ [✓] Ready for customers!
```

---

This visual overview shows:
- The complete flow from login to account
- How tiers progress visually
- The page layout structure
- How points are calculated
- How discounts apply
- Data change timeline
- API integration points
- Error handling
- Responsive design
- Production path

All components work together to create a seamless membership system!
