# Friedays Account Module Documentation

## System Overview

This comprehensive account management system implements a 4-tier membership structure (Bronze, Silver, Gold, Platinum) with progressive benefits, loyalty rewards, and tier-based discounts.

---

## 1. DATA MODEL & SCHEMA

### User Account Schema

```json
{
  "id": "user_1234567890",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+63 9XX-XXX-XXXX",
  "joinDate": "2024-01-15T10:30:00Z",
  "tier": "SILVER",
  "totalSpent": 7500,
  "loyaltyPoints": 150,
  "orderHistory": [
    {
      "orderId": "ORD_001",
      "date": "2024-03-20T14:25:00Z",
      "amount": 850,
      "items": ["Boneless Chicken", "French Fries"],
      "points": 17
    }
  ],
  "preferences": {
    "emailNotifications": true,
    "smsNotifications": false,
    "promotionalEmails": true
  }
}
```

### Tier Definitions

Each tier has specific thresholds and benefits:

```json
{
  "BRONZE": {
    "level": 0,
    "name": "Bronze",
    "icon": "🥉",
    "spendingThreshold": 0,
    "nextThreshold": 5000,
    "discount": 0.05,
    "deliveryThreshold": 500,
    "birthdayBonus": 0.10,
    "pointsMultiplier": 1
  },
  "SILVER": {
    "level": 1,
    "name": "Silver",
    "icon": "🥈",
    "spendingThreshold": 5000,
    "nextThreshold": 15000,
    "discount": 0.10,
    "deliveryThreshold": 300,
    "birthdayBonus": 0.15,
    "pointsMultiplier": 1.5
  },
  "GOLD": {
    "level": 2,
    "name": "Gold",
    "icon": "🥇",
    "spendingThreshold": 15000,
    "nextThreshold": 50000,
    "discount": 0.15,
    "deliveryThreshold": 0,
    "birthdayBonus": 0.25,
    "pointsMultiplier": 2
  },
  "PLATINUM": {
    "level": 3,
    "name": "Platinum",
    "icon": "💎",
    "spendingThreshold": 50000,
    "nextThreshold": null,
    "discount": 0.20,
    "deliveryThreshold": 0,
    "birthdayBonus": 0.30,
    "pointsMultiplier": 3
  }
}
```

### Purchase/Order Schema

```json
{
  "orderId": "ORD_001",
  "userId": "user_1234567890",
  "date": "2024-03-20T14:25:00Z",
  "amount": 850,
  "discountApplied": 85,
  "finalAmount": 765,
  "items": [
    {
      "itemId": 1,
      "name": "Boneless Chicken",
      "quantity": 2,
      "price": 150,
      "subtotal": 300
    }
  ],
  "deliveryFee": 50,
  "loyaltyPointsEarned": 17,
  "tierAtPurchase": "SILVER",
  "status": "completed"
}
```

---

## 2. TIER BENEFITS

### Bronze Tier (₱0 - ₱4,999)
- **Discount**: 5% on all orders
- **Free Delivery**: On orders ≥ ₱500
- **Birthday Bonus**: 10% off birthday month
- **Features**: 
  - Email newsletters
  - Basic loyalty points (1 point per ₱50)

### Silver Tier (₱5,000 - ₱14,999)
- **Discount**: 10% on all orders
- **Free Delivery**: On orders ≥ ₱300
- **Birthday Bonus**: 15% off
- **Features**: 
  - Early access to new menu items
  - Exclusive Silver-only deals (weekly)
  - 1.5x loyalty points multiplier
  - Weekly email deals

### Gold Tier (₱15,000 - ₱49,999)
- **Discount**: 15% on all orders
- **Free Delivery**: Always free
- **Birthday Bonus**: 25% off + free appetizer
- **Features**: 
  - Priority customer support
  - Exclusive Gold events & tastings
  - 2x loyalty points multiplier
  - VIP deals and promotions

### Platinum Tier (₱50,000+)
- **Discount**: 20% on all orders
- **Free Delivery**: Always free + express delivery option
- **Birthday Bonus**: 30% off + free item of choice
- **Features**: 
  - VIP 24/7 customer support
  - Personal account manager
  - 3x loyalty points multiplier
  - Exclusive discount code monthly
  - VIP-only events and tastings
  - Priority order processing

---

## 3. BACKEND API ENDPOINTS

### Authentication
```
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout
```

### User Account
```
GET /api/users/:userId
  Response: Complete user account object

PUT /api/users/:userId
  Body: { name, email, phone, ... }
  Response: Updated user object

GET /api/users/:userId/preferences
  Response: User preferences object

PUT /api/users/:userId/preferences
  Body: { emailNotifications, smsNotifications, promotionalEmails }
  Response: Updated preferences
```

### Tier & Membership
```
GET /api/users/:userId/tier
  Response: Current tier information with benefits

GET /api/tiers
  Response: Array of all tier definitions with benefits

GET /api/users/:userId/tier-progress
  Response: {
    currentTier: "SILVER",
    spentInCurrentTier: 2500,
    spendToNextTier: 7500,
    percentageProgress: 25
  }
```

### Orders & Purchases
```
POST /api/users/:userId/orders
  Body: { items: [...], deliveryAddress, ... }
  Response: Order object with applied discounts/loyalty

GET /api/users/:userId/orders
  Response: Array of order history

POST /api/users/:userId/purchases
  Body: { amount, items: [...], orderType: "pickup" | "delivery" }
  Response: Purchase confirmation with loyalty points earned

POST /api/users/:userId/purchases/:purchaseId/apply-points
  Body: { pointsToRedeem: 100 }
  Response: Updated loyalty points balance
```

### Loyalty & Rewards
```
GET /api/users/:userId/loyalty-points
  Response: { available: 150, redeemable: true, redemptionOptions: [...] }

POST /api/users/:userId/loyalty-points/redeem
  Body: { pointsToRedeem: 100, redeemAs: "discount" }
  Response: Redemption confirmation

GET /api/referrals/program
  Response: Referral program details

POST /api/referrals/invite
  Body: { friendEmail: "friend@example.com" }
  Response: Invitation sent confirmation
```

---

## 4. FRONTEND INTEGRATION

### File Structure
```
friedays-website/
├── account.html           # Account page
├── menu.html             # Updated with account link
├── js/
│   ├── main.js          # Shared utilities (Storage, formatMoney)
│   └── account.js       # Account module logic
├── css/
│   ├── styles.css       # Global styles
│   ├── menu.css         # Updated menu header
│   └── account.css      # Account page styles
```

### JavaScript Module Usage

The `accountModule` object provides core functionality:

```javascript
// Calculate tier from spending
const tier = accountModule.calculateTierFromSpending(7500); // Returns "SILVER"

// Get tier information
const tierInfo = accountModule.getTierInfo("SILVER");

// Calculate loyalty points
const points = accountModule.calculateLoyaltyPoints(500, "SILVER"); // 15 points

// Apply tier discount
const discountedPrice = accountModule.applyTierDiscount(100, "SILVER"); // ₱90

// Check free delivery
const isFree = accountModule.isFreeDelivery(250, "SILVER"); // true

// Get progress to next tier
const progress = accountModule.getProgressToNextTier(7500, "SILVER");
// Returns: { current: 2500, target: 10000, percentage: 25, isMaxTier: false }
```

### Recording a Purchase

```javascript
// When user completes an order in menu.js:
const user = Storage.get('friedays_user');
const purchaseAmount = 850;
const points = accountModule.calculateLoyaltyPoints(purchaseAmount, user.tier);

const purchaseData = {
  amount: purchaseAmount,
  items: cartItems,
  points: points,
  date: new Date().toISOString(),
  orderId: `ORD_${Date.now()}`
};

// Record in account system
accountAPI.recordPurchase(user.id, purchaseData).then(updatedUser => {
  // Update UI with new tier/points
  Storage.set('friedays_user', updatedUser);
  console.log(`Tier: ${updatedUser.tier}, Points: ${updatedUser.loyaltyPoints}`);
});
```

### Checking Account Status

```javascript
// In menu.js, apply discount to checkout:
const user = Storage.get('friedays_user');
const tierInfo = accountModule.getTierInfo(user.tier);
const discountedTotal = accountModule.applyTierDiscount(totalAmount, user.tier);
const freeDelivery = accountModule.isFreeDelivery(subtotal, user.tier);

// Display in cart
const discount = totalAmount - discountedTotal;
console.log(`You save: ₱${discount.toFixed(2)} as a ${tierInfo.name} member!`);
```

---

## 5. STATE MANAGEMENT

### localStorage Keys
```javascript
'friedays_session'    // Username string
'friedays_user'       // Complete user account object
'friedays_cart'       // Shopping cart array
```

### User Initialization Flow
```
1. User logs in → username stored in 'friedays_session'
2. Account module creates user object on first visit
3. User object stored in 'friedays_user'
4. Tier calculated from totalSpent on every app load
5. Profile data persists across page navigations
```

---

## 6. MIGRATION FROM EXISTING SYSTEM

### Step 1: Update menu.js to track spending

```javascript
// In menu.js checkout function:
function checkoutOrder() {
  const user = Storage.get('friedays_user') || { totalSpent: 0 };
  const tierDiscount = accountModule.applyTierDiscount(total, user.tier || 'BRONZE');
  
  // Record purchase
  accountAPI.recordPurchase(user.id, {
    amount: total,
    items: cart,
    points: accountModule.calculateLoyaltyPoints(total, user.tier)
  });
  
  // Apply tier discount
  const finalTotal = tierDiscount;
  // Continue with payment...
}
```

### Step 2: Display tier info in menu header

```javascript
// In menu.js DOMContentLoaded:
const user = Storage.get('friedays_user');
if (user) {
  const tierInfo = accountModule.getTierInfo(user.tier);
  userGreeting.textContent = `Welcome, ${user.name}! (${tierInfo.name} Member)`;
}
```

### Step 3: Link account page from menu

Already done - account link added to menu.html header.

---

## 7. RESPONSIVE DESIGN

Account page is fully responsive:
- **Desktop (1024px+)**: Full layout with all sections visible
- **Tablet (768px)**: Adjusted tier card layout, benefits in 2 columns
- **Mobile (<768px)**: Single column, touch-optimized buttons

---

## 8. ERROR HANDLING & VALIDATION

### Input Validation
- Email: Valid email format required
- Phone: Accepts various phone formats
- Name: 2-255 characters

### API Error Handling (Backend)
```javascript
try {
  const user = await accountAPI.fetchUserAccount(userId);
} catch (error) {
  showNotification('Failed to load account. Please refresh.', 'error');
}
```

### Data Validation
- Tier recalculated on every account access
- Loyalty points capped at max redeemable value
- Discount can't exceed order total

---

## 9. PRODUCTION CHECKLIST

- [ ] Replace all Storage calls with actual API endpoints
- [ ] Implement server-side tier calculation validation
- [ ] Add rate limiting to API endpoints
- [ ] Encrypt sensitive user data in transit
- [ ] Implement audit logging for tier changes
- [ ] Set up automated birthday bonus trigger
- [ ] Create admin dashboard for tier management
- [ ] Add email notifications for tier promotions
- [ ] Implement mobile app integration
- [ ] Set up analytics for tier engagement

---

## 10. TECHNICAL SPECIFICATIONS

### Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Dependencies
- None (vanilla JavaScript)
- Uses localStorage API
- CSS Grid & Flexbox

### Performance Metrics
- Account page load: <100ms
- Tier calculation: <5ms
- Loyalty point calculation: <1ms

### Security Considerations
- Validate all user inputs server-side
- Never trust client-side tier calculations for discount application
- Implement JWT tokens for API authentication
- Use HTTPS for all API calls
- Rate limit API endpoints

---

## 11. FUTURE ENHANCEMENTS

1. **Tier Expiration**: Auto-demote inactive members after 12 months
2. **Seasonal Bonuses**: Special tier benefits during holidays
3. **Social Features**: Referral bonuses with tracking
4. **Gamification**: Badges and achievements
5. **Subscription Plans**: Optional paid tier upgrades
6. **Analytics Dashboard**: Personal spending insights
7. **Integration**: Sync with email marketing platform
8. **Mobile App**: Native tier status display
9. **SMS Alerts**: Tier upgrade notifications
10. **AI Recommendations**: Personalized promotions based on tier

---

For questions or support, contact the development team.
Last Updated: March 27, 2024
