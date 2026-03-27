# Account Module Integration Guide

## Quick Start Integration

### Step 1: Basic Setup (No Backend Required)

The account system works out-of-the-box with localStorage. Users don't need a backend initially.

```javascript
// Everything is handled automatically:
// 1. Open account.html
// 2. System checks for existing user in localStorage
// 3. If no user exists, creates one from logged-in session
// 4. All data persists across browser sessions
```

### Step 2: Menu Integration

The menu page now has an account link in the header:

```html
<!-- Already updated in menu.html -->
<a href="account.html" class="account-link" title="View Account">
    <span class="material-symbols-outlined">account_circle</span>
</a>
```

Users can click this link to navigate to their account page.

### Step 3: Sync Purchases with Account

Update `menu.js` checkout function to record spending:

```javascript
function completePurchase(cartTotal, items) {
    // Get current user
    let user = Storage.get('friedays_user');
    if (!user) {
        user = accountModule.createUserAccount({
            name: Storage.get('friedays_session') || 'Guest'
        });
    }

    // Calculate loyalty points earned
    const pointsEarned = accountModule.calculateLoyaltyPoints(cartTotal, user.tier);

    // Record purchase in account system
    const purchaseData = {
        amount: cartTotal,
        items: items,
        points: pointsEarned,
        date: new Date().toISOString(),
        orderId: `ORD_${Date.now()}`
    };

    // Update user account
    accountAPI.recordPurchase(user.id, purchaseData).then(updatedUser => {
        Storage.set('friedays_user', updatedUser);
        console.log(`Purchase recorded! New tier: ${updatedUser.tier}`);
    });
}
```

### Step 4: Show Tier Discount in Menu Checkout

In the menu checkout summary, apply tier discount:

```javascript
function calculateCheckoutTotal(subtotal) {
    const user = Storage.get('friedays_user') || { tier: 'BRONZE' };
    
    // Apply tier discount
    const discountedSubtotal = accountModule.applyTierDiscount(subtotal, user.tier);
    const discount = subtotal - discountedSubtotal;
    
    // Check for free delivery
    const deliveryFee = accountModule.isFreeDelivery(subtotal, user.tier) ? 0 : 50;
    
    // Calculate tax on discounted amount
    const tax = discountedSubtotal * 0.10; // 10% tax
    
    // Final total
    const total = discountedSubtotal + tax + deliveryFee;
    
    // Display breakdown
    console.log(`Subtotal: ₱${subtotal.toFixed(2)}`);
    console.log(`Your ${user.tier} Discount: -₱${discount.toFixed(2)}`);
    console.log(`Delivery: ${deliveryFee === 0 ? 'FREE' : `₱${deliveryFee.toFixed(2)}`}`);
    console.log(`Tax: ₱${tax.toFixed(2)}`);
    console.log(`Total: ₱${total.toFixed(2)}`);
    
    return total;
}
```

---

## Backend Integration (When Ready)

### Replace Storage with API Calls

Modify `account.js` API calls when you have a backend:

```javascript
// BEFORE (localStorage):
async fetchUserAccount(userId) {
    return new Promise(resolve => {
        setTimeout(() => resolve(Storage.get('friedays_user')), 500);
    });
}

// AFTER (API):
async fetchUserAccount(userId) {
    const response = await fetch(`/api/users/${userId}`);
    return await response.json();
}
```

### Update Record Purchase Function

```javascript
// BEFORE (localStorage):
async recordPurchase(userId, purchaseData) {
    return new Promise(resolve => {
        const user = Storage.get('friedays_user');
        user.totalSpent += purchaseData.amount;
        user.loyaltyPoints += purchaseData.points;
        user.orderHistory.push(purchaseData);
        user.tier = accountModule.calculateTierFromSpending(user.totalSpent);
        Storage.set('friedays_user', user);
        resolve(user);
    });
}

// AFTER (API):
async recordPurchase(userId, purchaseData) {
    const response = await fetch(`/api/users/${userId}/purchases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(purchaseData)
    });
    return await response.json();
}
```

### Update Profile Changes

```javascript
// BEFORE (localStorage):
Storage.set('friedays_user', user);

// AFTER (API):
const response = await fetch(`/api/users/${user.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
});
const updatedUser = await response.json();
Storage.set('friedays_user', updatedUser); // Cache locally
```

---

## Database Schema (PostgreSQL Example)

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    join_date TIMESTAMP DEFAULT NOW(),
    tier VARCHAR(50) DEFAULT 'BRONZE',
    total_spent DECIMAL(10, 2) DEFAULT 0,
    loyalty_points INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    order_date TIMESTAMP DEFAULT NOW(),
    amount DECIMAL(10, 2) NOT NULL,
    discount_applied DECIMAL(10, 2) DEFAULT 0,
    loyalty_points_earned INT DEFAULT 0,
    tier_at_purchase VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    items JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User preferences
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id),
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    promotional_emails BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Loyalty transactions (for audit trail)
CREATE TABLE loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    transaction_type VARCHAR(50),
    points_amount INT,
    order_id UUID REFERENCES orders(id),
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tier definitions (configurable)
CREATE TABLE tier_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_name VARCHAR(50) UNIQUE NOT NULL,
    spending_threshold DECIMAL(10, 2),
    discount_percentage DECIMAL(5, 2),
    free_delivery_threshold DECIMAL(10, 2),
    birthday_bonus DECIMAL(5, 2),
    points_multiplier DECIMAL(3, 2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Implementation Examples

### Node.js/Express Example

```javascript
// routes/accounts.js
const express = require('express');
const router = express.Router();

// Get user account
router.get('/users/:userId', async (req, res) => {
    try {
        const user = await db.query(
            'SELECT u.*, up.* FROM users u LEFT JOIN user_preferences up ON u.id = up.user_id WHERE u.id = $1',
            [req.params.userId]
        );
        res.json(user.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Record purchase
router.post('/users/:userId/purchases', async (req, res) => {
    const { amount, items, orderType } = req.body;
    
    try {
        // Create order
        const order = await db.query(
            'INSERT INTO orders (user_id, amount, items, tier_at_purchase) VALUES ($1, $2, $3, $4) RETURNING *',
            [req.params.userId, amount, JSON.stringify(items), req.body.tier]
        );

        // Calculate tier from new total
        const user = await db.query(
            'UPDATE users SET total_spent = total_spent + $1 WHERE id = $2 RETURNING total_spent',
            [amount, req.params.userId]
        );

        const newTier = calculateTier(user.rows[0].total_spent);
        
        // Update tier if changed
        await db.query(
            'UPDATE users SET tier = $1 WHERE id = $2',
            [newTier, req.params.userId]
        );

        res.json({ success: true, newTier });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update user profile
router.put('/users/:userId', async (req, res) => {
    const { name, email, phone } = req.body;
    
    try {
        const user = await db.query(
            'UPDATE users SET name = $1, email = $2, phone = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
            [name, email, phone, req.params.userId]
        );
        res.json(user.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

---

## Testing the Integration

### Manual Testing Checklist

```
□ Can navigate to account.html from menu
□ User info displays correctly
□ Tier badge shows correct icon/color
□ Progress bar calculates correctly
□ All 4 tiers display in benefits section
□ Current tier highlights in benefits
□ Edit profile modal opens and closes
□ Profile changes save to localStorage
□ Settings checkboxes work
□ Logout button clears session
□ Discount applies in menu checkout
□ Loyalty points display correctly
□ Tier changes on spending threshold
□ Page is responsive on mobile
□ No console errors
```

### Test Data

```javascript
// Test with different tier users:

// Bronze user (₱0 spent)
Storage.set('friedays_user', {
    name: 'Bronze User', email: 'bronze@test.com', 
    tier: 'BRONZE', totalSpent: 0, loyaltyPoints: 0
});

// Silver user (₱7,500 spent - 50% to Gold)
Storage.set('friedays_user', {
    name: 'Silver User', email: 'silver@test.com',
    tier: 'SILVER', totalSpent: 7500, loyaltyPoints: 112
});

// Gold user (₱20,000 spent)
Storage.set('friedays_user', {
    name: 'Gold User', email: 'gold@test.com',
    tier: 'GOLD', totalSpent: 20000, loyaltyPoints: 500
});

// Platinum user (₱60,000 spent - max tier)
Storage.set('friedays_user', {
    name: 'Platinum User', email: 'plat@test.com',
    tier: 'PLATINUM', totalSpent: 60000, loyaltyPoints: 1800
});
```

---

## Troubleshooting

### Issue: Account data not persisting
**Solution**: Check browser localStorage is enabled (not in private mode)

### Issue: Tier not updating after purchase
**Solution**: Make sure to call `accountAPI.recordPurchase()` after checkout

### Issue: Modal not closing
**Solution**: Ensure click handler calls `closeModal('editProfileModal')`

### Issue: Styles not applying
**Solution**: Verify `account.css` is linked in `<head>` before body close

### Issue: Loyalty points not calculating
**Solution**: Check user.tier is valid before calling `calculateLoyaltyPoints()`

---

## File Dependencies

```
account.html
├── Requires: js/main.js (Storage utility)
├── Requires: js/account.js (Account logic)
├── Requires: css/styles.css (Global styles)
└── Requires: css/account.css (Page styles)

menu.html
├── Updated: Added account link in header
├── Updated: Can call accountAPI from menu.js
└── Updated: Can apply tier discounts to checkout

js/account.js
├── Exports: accountModule (tier calculations)
├── Exports: accountAPI (API/storage methods)
├── Uses: Storage from js/main.js
└── Depends: formatMoney() from js/main.js
```

---

## Support & Maintenance

- **Updates**: Tier definitions can be updated in database without code changes
- **Monitoring**: Track tier distribution and average spending by tier
- **Audit**: Log all tier changes and loyalty point transactions
- **Backup**: Regular database backups of user and order data

---

## Final Checklist Before Production

- [ ] All API endpoints tested and working
- [ ] Database indexes created for performance
- [ ] Error handling implemented
- [ ] Rate limiting configured
- [ ] HTTPS enabled for all endpoints
- [ ] Authentication/authorization verified
- [ ] Data validation on server-side
- [ ] Monitoring and logging configured
- [ ] User documentation written
- [ ] Admin tools for tier management created

---

Integration complete! The account system is ready to use. Start with localStorage for development, switch to backend API when ready.
