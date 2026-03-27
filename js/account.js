// ============================================================================
// USER ACCOUNT MODULE - Tier Management System
// ============================================================================

// Account Data Model & Constants
const accountModule = {
    // Tier Definitions with thresholds and benefits
    TIERS: {
        BRONZE: {
            level: 0,
            name: 'Bronze',
            icon: '🥉',
            description: 'Get started with exclusive discounts and rewards!',
            spendingThreshold: 0,
            nextThreshold: 5000,
            discount: 0.05,
            deliveryThreshold: 500,
            birthdayBonus: 0.10,
            pointsMultiplier: 1
        },
        SILVER: {
            level: 1,
            name: 'Silver',
            icon: '🥈',
            description: 'Enjoy premium benefits with Silver status!',
            spendingThreshold: 5000,
            nextThreshold: 15000,
            discount: 0.10,
            deliveryThreshold: 300,
            birthdayBonus: 0.15,
            pointsMultiplier: 1.5
        },
        GOLD: {
            level: 2,
            name: 'Gold',
            icon: '🥇',
            description: 'Unlock elite perks and exclusive experiences!',
            spendingThreshold: 15000,
            nextThreshold: 50000,
            discount: 0.15,
            deliveryThreshold: 0,
            birthdayBonus: 0.25,
            pointsMultiplier: 2
        },
        PLATINUM: {
            level: 3,
            name: 'Platinum',
            icon: '💎',
            description: 'VIP treatment with our most exclusive tier!',
            spendingThreshold: 50000,
            nextThreshold: Infinity,
            discount: 0.20,
            deliveryThreshold: 0,
            birthdayBonus: 0.30,
            pointsMultiplier: 3
        }
    },

    // User Account Schema - structure for user data
    createUserAccount(userData = {}) {
        return {
            id: `user_${Date.now()}`,
            name: userData.name || 'Guest User',
            email: userData.email || 'notregistered@friedays.com',
            phone: userData.phone || '',
            joinDate: userData.joinDate || new Date().toISOString(),
            tier: userData.tier || 'BRONZE',
            totalSpent: userData.totalSpent || 0,
            loyaltyPoints: userData.loyaltyPoints || 0,
            orderHistory: userData.orderHistory || [],
            preferences: {
                emailNotifications: userData.emailNotifications !== false,
                smsNotifications: userData.smsNotifications || false,
                promotionalEmails: userData.promotionalEmails !== false
            }
        };
    },

    // Calculate user tier based on spending
    calculateTierFromSpending(totalSpent) {
        if (totalSpent >= this.TIERS.PLATINUM.spendingThreshold) return 'PLATINUM';
        if (totalSpent >= this.TIERS.GOLD.spendingThreshold) return 'GOLD';
        if (totalSpent >= this.TIERS.SILVER.spendingThreshold) return 'SILVER';
        return 'BRONZE';
    },

    // Get tier object by tier name
    getTierInfo(tierName) {
        return this.TIERS[tierName] || this.TIERS.BRONZE;
    },

    // Calculate loyalty points earned from purchase
    calculateLoyaltyPoints(amount, tierName) {
        const tier = this.getTierInfo(tierName);
        return Math.floor((amount / 50) * tier.pointsMultiplier);
    },

    // Apply discount based on tier
    applyTierDiscount(amount, tierName) {
        const tier = this.getTierInfo(tierName);
        return amount * (1 - tier.discount);
    },

    // Check if delivery is free for tier
    isFreeDelivery(amount, tierName) {
        const tier = this.getTierInfo(tierName);
        if (tier.deliveryThreshold === 0) return true; // Always free
        return amount >= tier.deliveryThreshold;
    },

    // Get spending progress to next tier
    getProgressToNextTier(totalSpent, tierName) {
        const tier = this.getTierInfo(tierName);
        const nextThreshold = tier.nextThreshold;
        
        if (nextThreshold === Infinity) {
            return { current: totalSpent, target: totalSpent, percentage: 100, isMaxTier: true };
        }

        const needed = Math.max(0, nextThreshold - totalSpent);
        const percentage = Math.min(100, (totalSpent - tier.spendingThreshold) / (tier.nextThreshold - tier.spendingThreshold) * 100);
        
        return {
            current: totalSpent - tier.spendingThreshold,
            target: nextThreshold - tier.spendingThreshold,
            percentage: percentage,
            isMaxTier: false
        };
    }
};

// ============================================================================
// UI MANAGEMENT
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Only run account page initialization if we're on the account page
    if (document.getElementById('profileName')) {
        // Initialize user account
        initializeAccount();
        setupEventListeners();
        renderAccountPage();
    }
});

function initializeAccount() {
    // Get user from session or create new account
    let user = Storage.get('friedays_user');
    
    if (!user) {
        const sessionUser = Storage.get('friedays_session');
        user = accountModule.createUserAccount({
            name: sessionUser || 'Guest User',
            email: sessionUser ? `${sessionUser}@friedays.com` : 'notregistered@friedays.com'
        });
        Storage.set('friedays_user', user);
    }

    // Auto-calculate tier from spending
    user.tier = accountModule.calculateTierFromSpending(user.totalSpent);
    Storage.set('friedays_user', user);
}

function setupEventListeners() {
    const editProfileBtn = document.getElementById('editProfileBtn');
    const editProfileForm = document.getElementById('editProfileForm');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => openEditProfileModal());
    }

    if (editProfileForm) {
        editProfileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveProfileChanges();
        });
    }

    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => saveAccountSettings());
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => logoutUser());
    }
}

function renderAccountPage() {
    const user = Storage.get('friedays_user');
    const tierInfo = accountModule.getTierInfo(user.tier);
    const progress = accountModule.getProgressToNextTier(user.totalSpent, user.tier);

    // Render Profile Section
    document.getElementById('profileName').textContent = user.name;
    document.getElementById('profileEmail').textContent = user.email;
    document.getElementById('profilePhone').textContent = user.phone || 'Not provided';

    // Render Tier Section
    document.getElementById('tierIcon').textContent = tierInfo.icon;
    document.getElementById('tierName').textContent = tierInfo.name;
    document.getElementById('tierDescription').textContent = tierInfo.description;
    document.getElementById('memberSince').textContent = formatDate(user.joinDate);
    document.getElementById('totalSpent').textContent = formatMoney(user.totalSpent);
    document.getElementById('loyaltyPoints').textContent = user.loyaltyPoints.toLocaleString();
    document.getElementById('availablePoints').textContent = user.loyaltyPoints.toLocaleString();

    // Render progress bar
    if (progress.isMaxTier) {
        document.getElementById('spendingTarget').textContent = `Max Tier - ₱${user.totalSpent.toLocaleString()} spent`;
        document.getElementById('progressFill').style.width = '100%';
        document.getElementById('upgradeCTA').style.display = 'none';
    } else {
        const remaining = progress.target - progress.current;
        document.getElementById('spendingTarget').textContent = `₱${progress.current.toLocaleString()} of ₱${progress.target.toLocaleString()}`;
        document.getElementById('progressFill').style.width = progress.percentage + '%';
        document.getElementById('upgradeCTA').style.display = 'block';
        document.getElementById('upgradeCTAText').textContent = 
            `Spend ₱${remaining.toLocaleString()} more to reach ${accountModule.getTierInfo(accountModule.calculateTierFromSpending(user.totalSpent + remaining)).name} tier`;
    }

    // Update tier badge styling
    const tierBadge = document.getElementById('tierBadge');
    tierBadge.className = `tier-badge tier-${user.tier.toLowerCase()}`;

    // Load account settings
    document.getElementById('notifEmail').checked = user.preferences.emailNotifications;
    document.getElementById('notifSMS').checked = user.preferences.smsNotifications;
    document.getElementById('notifPromo').checked = user.preferences.promotionalEmails;

    // Highlight current tier in benefits
    highlightCurrentTier(user.tier);
}

function highlightCurrentTier(currentTier) {
    document.querySelectorAll('.benefit-tier').forEach(el => {
        el.classList.remove('current');
    });
    
    const tierMap = { BRONZE: 0, SILVER: 1, GOLD: 2, PLATINUM: 3 };
    const tierElements = document.querySelectorAll('.benefit-tier');
    if (tierElements[tierMap[currentTier]]) {
        tierElements[tierMap[currentTier]].classList.add('current');
    }
}

function openEditProfileModal() {
    const user = Storage.get('friedays_user');
    document.getElementById('editName').value = user.name;
    document.getElementById('editEmail').value = user.email;
    document.getElementById('editPhone').value = user.phone || '';
    document.getElementById('editProfileModal').style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function saveProfileChanges() {
    const user = Storage.get('friedays_user');
    user.name = document.getElementById('editName').value;
    user.email = document.getElementById('editEmail').value;
    user.phone = document.getElementById('editPhone').value;
    
    Storage.set('friedays_user', user);
    Storage.set('friedays_session', user.name);
    
    closeModal('editProfileModal');
    renderAccountPage();
    
    // Show success message
    showNotification('Profile updated successfully!', 'success');
}

function saveAccountSettings() {
    const user = Storage.get('friedays_user');
    user.preferences.emailNotifications = document.getElementById('notifEmail').checked;
    user.preferences.smsNotifications = document.getElementById('notifSMS').checked;
    user.preferences.promotionalEmails = document.getElementById('notifPromo').checked;
    
    Storage.set('friedays_user', user);
    showNotification('Settings saved successfully!', 'success');
}

function logoutUser() {
    if (confirm('Are you sure you want to logout?')) {
        Storage.remove('friedays_session');
        Storage.remove('friedays_user');
        window.location.href = 'index.html';
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Animate out and remove
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    const modal = document.getElementById('editProfileModal');
    if (event.target === modal) {
        closeModal('editProfileModal');
    }
});

// ============================================================================
// API SIMULATION - Ready for backend integration
// ============================================================================

const accountAPI = {
    // Simulated API calls - replace with actual endpoints
    
    async fetchUserAccount(userId) {
        // Replace with: return fetch(`/api/users/${userId}`).then(r => r.json());
        return new Promise(resolve => {
            setTimeout(() => resolve(Storage.get('friedays_user')), 500);
        });
    },

    async updateUserAccount(userId, userData) {
        // Replace with: return fetch(`/api/users/${userId}`, { method: 'PUT', body: JSON.stringify(userData) });
        return new Promise(resolve => {
            const user = Storage.get('friedays_user');
            const updated = { ...user, ...userData };
            Storage.set('friedays_user', updated);
            resolve(updated);
        });
    },

    async recordPurchase(userId, purchaseData) {
        // Replace with: return fetch(`/api/users/${userId}/purchases`, { method: 'POST', body: JSON.stringify(purchaseData) });
        return new Promise(resolve => {
            const user = Storage.get('friedays_user');
            user.totalSpent += purchaseData.amount;
            user.loyaltyPoints += purchaseData.points;
            user.orderHistory.push(purchaseData);
            user.tier = accountModule.calculateTierFromSpending(user.totalSpent);
            Storage.set('friedays_user', user);
            resolve(user);
        });
    },

    async getTierBenefits(tier) {
        // Replace with: return fetch(`/api/tiers/${tier}`).then(r => r.json());
        return new Promise(resolve => {
            resolve(accountModule.TIERS[tier]);
        });
    }
};
