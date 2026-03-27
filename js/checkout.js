// ============================================================================
// CHECKOUT MODULE - Customer Tier Benefits Integration
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('=== CHECKOUT PAGE LOADED ===');
    // Initialize checkout
    initializeCheckout();
    console.log('After initializeCheckout - checkoutState:', checkoutState);
    setupEventListeners();
    loadCustomerInfo();
    loadOrderSummary();
    setOrderTypeSelection();
    calculateTotals();
    console.log('=== CHECKOUT INITIALIZATION COMPLETE ===');
});

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let checkoutState = {
    customer: null,
    cart: [],
    orderType: null,
    paymentMethod: null,
    customerNotes: '',
    discounts: {
        general: 0,
        tier: 0
    }
};

// ============================================================================
// INITIALIZATION
// ============================================================================

function initializeCheckout() {
    // Load customer data
    let customer = Storage.get('friedays_user');
    if (!customer) {
        const sessionUser = Storage.get('friedays_session');
        customer = accountModule.createUserAccount({
            name: sessionUser || 'Guest User'
        });
        Storage.set('friedays_user', customer);
    }
    checkoutState.customer = customer;

    // Load cart
    checkoutState.cart = Storage.get('friedays_cart') || [];

    // Load saved order type
    checkoutState.orderType = Storage.get('friedays_selected_order_type') || null;

    // Validate cart exists
    if (checkoutState.cart.length === 0) {
        showEmptyCartMessage();
    }
}

function setOrderTypeSelection() {
    // Pre-select the saved order type
    if (checkoutState.orderType) {
        const orderTypeRadio = document.querySelector(`input[name="orderType"][value="${checkoutState.orderType}"]`);
        if (orderTypeRadio) {
            orderTypeRadio.checked = true;
        }
    }
}

// ============================================================================
// CUSTOMER INFO MANAGEMENT
// ============================================================================

function loadCustomerInfo() {
    const customer = checkoutState.customer;

    // Get delivery address from storage or use default
    let deliveryAddress = Storage.get('friedays_delivery_address') || '';

    console.log('loadCustomerInfo called - Customer:', customer, 'DeliveryAddress from storage:', deliveryAddress);

    // Display customer info
    document.getElementById('displayName').textContent = customer.name || '-';
    document.getElementById('displayEmail').textContent = customer.email || '-';
    document.getElementById('displayPhone').textContent = customer.phone || '-';
    document.getElementById('displayDeliveryAddress').textContent = deliveryAddress || 'Not provided';

    console.log('Display updated with - Name:', customer.name, 'Email:', customer.email, 'Phone:', customer.phone, 'Address:', deliveryAddress);

    // Populate edit form
    document.getElementById('editName').value = customer.name || '';
    document.getElementById('editEmail').value = customer.email || '';
    document.getElementById('editPhone').value = customer.phone || '';
    document.getElementById('editDeliveryAddress').value = deliveryAddress || '';

    console.log('Edit form populated');
}

function toggleEditMode() {
    const display = document.getElementById('customerInfoDisplay');
    const edit = document.getElementById('customerInfoEdit');
    const editBtn = document.getElementById('editInfoBtn');

    const isEditing = edit.style.display !== 'none';
    
    console.log('toggleEditMode called - isEditing:', isEditing, 'edit.style.display:', edit.style.display);

    if (isEditing) {
        display.style.display = 'block';
        edit.style.display = 'none';
        editBtn.textContent = 'Edit';
        console.log('Switched to display mode - showing display form, hiding edit form');
    } else {
        display.style.display = 'none';
        edit.style.display = 'block';
        editBtn.textContent = 'Editing...';
        console.log('Switched to edit mode - hiding display form, showing edit form');
    }
}

function saveCustomerInfo() {
    try {
        // Get form elements with error checking
        const nameInput = document.getElementById('editName');
        const emailInput = document.getElementById('editEmail');
        const phoneInput = document.getElementById('editPhone');
        const addressInput = document.getElementById('editDeliveryAddress');

        if (!nameInput || !emailInput || !phoneInput || !addressInput) {
            console.error('ERROR: One or more form elements not found in DOM');
            alert('ERROR: Form elements not found. Please refresh the page.');
            return;
        }

        // Get form values
        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const phone = phoneInput.value.trim();
        const deliveryAddress = addressInput.value.trim();

        console.log('Save attempt - Name:', name, 'Email:', email, 'Phone:', phone, 'Address:', deliveryAddress);

        // Validate required fields
        if (!name || !email || !phone || !deliveryAddress) {
            alert('Please fill in all required fields');
            console.log('Validation failed - one or more fields are empty');
            return;
        }

        // Update customer object
        checkoutState.customer.name = name;
        checkoutState.customer.email = email;
        checkoutState.customer.phone = phone;

        console.log('Updated customer object:', checkoutState.customer);

        // Save to storage
        Storage.set('friedays_user', checkoutState.customer);
        Storage.set('friedays_delivery_address', deliveryAddress);

        console.log('Saved to storage - Customer:', Storage.get('friedays_user'), 'Address:', Storage.get('friedays_delivery_address'));

        // Reload display and toggle edit mode
        loadCustomerInfo();
        toggleEditMode();
        
        console.log('Form saved and display reloaded');
        alert('Customer information saved successfully!');
    } catch (error) {
        console.error('ERROR in saveCustomerInfo:', error);
        alert('An error occurred while saving: ' + error.message);
    }
}

// ============================================================================
// ORDER SUMMARY & CALCULATIONS
// ============================================================================

function loadOrderSummary() {
    const cart = checkoutState.cart;
    const summaryItems = document.getElementById('summaryItems');

    summaryItems.innerHTML = '';

    if (cart.length === 0) {
        summaryItems.innerHTML = '<p class="empty-cart">Your cart is empty.</p>';
        return;
    }

    cart.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'summary-item';
        itemElement.innerHTML = `
            <div class="item-info">
                <span class="item-name">${item.name}</span>
                <span class="item-qty">×${item.qty}</span>
            </div>
            <span class="item-price">${formatMoney(item.price * item.qty)}</span>
        `;
        summaryItems.appendChild(itemElement);
    });
}

function calculateTotals() {
    const customer = checkoutState.customer;
    const cart = checkoutState.cart;
    const orderType = document.querySelector('input[name="orderType"]:checked')?.value;

    if (cart.length === 0) {
        resetTotals();
        return;
    }

    // Calculate subtotal
    let subtotal = 0;
    cart.forEach(item => {
        subtotal += item.price * item.qty;
    });

    // Get tier info
    const tierName = customer.tier || 'BRONZE';
    const tierInfo = accountModule.getTierInfo(tierName);
    const tierDiscount = subtotal * tierInfo.discount;

    // Calculate discounted subtotal
    const discountedSubtotal = subtotal - tierDiscount;

    // Calculate tax (12% on discounted amount)
    const tax = discountedSubtotal * 0.12;

    // Calculate delivery fee
    let deliveryFee = 0;
    if (orderType === 'Delivery') {
        const isFree = accountModule.isFreeDelivery(subtotal, tierName);
        deliveryFee = isFree ? 0 : 50;
    }

    // Calculate final total
    const total = discountedSubtotal + tax + deliveryFee;

    // Store calculations
    checkoutState.discounts.tier = tierDiscount;

    // Update display
    document.getElementById('summarySubtotal').textContent = formatMoney(subtotal);
    document.getElementById('summaryDiscountedSubtotal').textContent = formatMoney(discountedSubtotal);
    document.getElementById('summaryTax').textContent = formatMoney(tax);
    document.getElementById('summaryTotal').textContent = formatMoney(total);

    // Show/hide tier discount
    const tierDiscountRow = document.getElementById('tierDiscountRow');
    if (tierDiscount > 0) {
        tierDiscountRow.style.display = 'flex';
        document.getElementById('tierDiscountLabel').textContent = `${tierName} Tier Discount (${(tierInfo.discount * 100).toFixed(0)}%)`;
        document.getElementById('summaryTierDiscount').textContent = `-${formatMoney(tierDiscount)}`;
    } else {
        tierDiscountRow.style.display = 'none';
    }

    // Show/hide delivery fee
    const deliveryFeeRow = document.getElementById('deliveryFeeRow');
    if (deliveryFee > 0) {
        deliveryFeeRow.style.display = 'flex';
        document.getElementById('summaryDeliveryFee').textContent = formatMoney(deliveryFee);
    } else if (orderType === 'Delivery') {
        deliveryFeeRow.style.display = 'flex';
        document.getElementById('summaryDeliveryFee').textContent = 'FREE';
    } else {
        deliveryFeeRow.style.display = 'none';
    }

    // Show tier savings callout
    if (tierDiscount > 0) {
        const callout = document.getElementById('tierSavingsCallout');
        callout.style.display = 'flex';
        document.getElementById('tierBadge').textContent = tierName;
        document.getElementById('tierSavingsAmount').textContent = `You save ${formatMoney(tierDiscount)}`;
    }
}

function resetTotals() {
    document.getElementById('summarySubtotal').textContent = '₱0.00';
    document.getElementById('summaryDiscountedSubtotal').textContent = '₱0.00';
    document.getElementById('summaryTax').textContent = '₱0.00';
    document.getElementById('summaryTotal').textContent = '₱0.00';
    document.getElementById('tierDiscountRow').style.display = 'none';
    document.getElementById('deliveryFeeRow').style.display = 'none';
}

// ============================================================================
// ORDER SUBMISSION
// ============================================================================

function validateCheckout() {
    const errors = [];

    // Validate customer info
    if (!checkoutState.customer.name || !checkoutState.customer.email || !checkoutState.customer.phone) {
        errors.push('Please complete customer information');
    }

    // Validate order type
    const orderType = document.querySelector('input[name="orderType"]:checked');
    if (!orderType) {
        document.getElementById('orderTypeError').style.display = 'block';
        errors.push('Please select an order type');
    } else {
        document.getElementById('orderTypeError').style.display = 'none';
    }

    // Validate payment method
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked');
    if (!paymentMethod) {
        document.getElementById('paymentError').style.display = 'block';
        errors.push('Please select a payment method');
    } else {
        document.getElementById('paymentError').style.display = 'none';
    }

    // Validate cart not empty
    if (checkoutState.cart.length === 0) {
        errors.push('Your cart is empty');
    }

    return errors;
}

function submitOrder() {
    // Validate all required data
    const errors = validateCheckout();
    if (errors.length > 0) {
        console.error('Validation errors:', errors);
        return;
    }

    // Get all form values
    const orderType = document.querySelector('input[name="orderType"]:checked').value;
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    const customerNotes = document.getElementById('customerNotes').value.trim();

    // Get delivery address
    let deliveryAddress = Storage.get('friedays_delivery_address') || '';

    // Calculate order totals
    let subtotal = 0;
    checkoutState.cart.forEach(item => {
        subtotal += item.price * item.qty;
    });

    const tierName = checkoutState.customer.tier || 'BRONZE';
    const tierDiscount = subtotal * accountModule.getTierInfo(tierName).discount;
    const discountedSubtotal = subtotal - tierDiscount;
    const tax = discountedSubtotal * 0.12;
    const isFree = accountModule.isFreeDelivery(subtotal, tierName);
    const deliveryFee = (orderType === 'Delivery' && !isFree) ? 50 : 0;
    const total = discountedSubtotal + tax + deliveryFee;

    // Create order record
    const order = {
        orderId: `ORD_${Date.now()}`,
        orderNumber: Math.floor(Math.random() * 900) + 100,
        orderDate: new Date().toISOString(),
        customerInfo: {
            name: checkoutState.customer.name,
            email: checkoutState.customer.email,
            phone: checkoutState.customer.phone,
            deliveryAddress: deliveryAddress
        },
        items: checkoutState.cart,
        orderType: orderType,
        paymentMethod: paymentMethod,
        customerNotes: customerNotes,
        pricing: {
            subtotal: subtotal,
            tierDiscount: tierDiscount,
            discountedSubtotal: discountedSubtotal,
            tax: tax,
            deliveryFee: deliveryFee,
            total: total
        },
        tierAtPurchase: tierName,
        status: 'pending',
        userId: checkoutState.customer.id
    };

    // Save order to storage
    let orders = Storage.get('friedays_orders') || [];
    orders.push(order);
    Storage.set('friedays_orders', orders);

    // Update user's order history and loyalty points
    const loyaltyPoints = accountModule.calculateLoyaltyPoints(total, tierName);
    checkoutState.customer.orderHistory.push({
        orderId: order.orderId,
        date: order.orderDate,
        amount: total,
        items: checkoutState.cart,
        points: loyaltyPoints
    });
    checkoutState.customer.totalSpent += total;
    checkoutState.customer.loyaltyPoints += loyaltyPoints;

    // Recalculate tier based on new total spent
    const newTier = accountModule.calculateTierFromSpending(checkoutState.customer.totalSpent);
    if (newTier !== checkoutState.customer.tier) {
        checkoutState.customer.tier = newTier;
        console.log(`Tier upgraded to ${newTier}!`);
    }

    // Save updated user
    Storage.set('friedays_user', checkoutState.customer);

    // Clear cart and active order
    Storage.remove('friedays_cart');
    Storage.remove('friedays_selected_order_type'); // Clear saved order type
    Storage.set('friedays_active_order', {
        orderNumber: order.orderNumber,
        type: orderType,
        items: checkoutState.cart,
        total: total,
        orderId: order.orderId
    });

    // Redirect to tracking page
    window.location.href = 'tracking.html';
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
    // Customer info editing
    document.getElementById('editInfoBtn').addEventListener('click', () => {
        console.log('Edit button clicked');
        toggleEditMode();
    });
    document.getElementById('saveInfoBtn').addEventListener('click', () => {
        console.log('Save button clicked');
        saveCustomerInfo();
    });
    document.getElementById('cancelInfoBtn').addEventListener('click', () => {
        console.log('Cancel button clicked');
        toggleEditMode();
    });

    // Customer notes character limit
    document.getElementById('customerNotes').addEventListener('input', (e) => {
        if (e.target.value.length > 500) {
            e.target.value = e.target.value.substring(0, 500);
        }
        checkoutState.customerNotes = e.target.value;
    });

    // Order type change
    document.querySelectorAll('input[name="orderType"]').forEach(radio => {
        radio.addEventListener('change', () => {
            checkoutState.orderType = radio.value;
            Storage.set('friedays_selected_order_type', radio.value);
            calculateTotals();
        });
    });

    // Payment method change
    document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener('change', () => {
            checkoutState.paymentMethod = radio.value;
        });
    });

    // Form submission
    document.getElementById('submitOrderBtn').addEventListener('click', submitOrder);

    // Cancel button
    document.getElementById('cancelOrderBtn').addEventListener('click', () => {
        if (confirm('Are you sure you want to cancel this order?')) {
            Storage.remove('friedays_selected_order_type'); // Clear saved order type
            window.location.href = 'menu.html';
        }
    });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function showEmptyCartMessage() {
    // If cart is empty, show message and disable checkout
    document.getElementById('summaryItems').innerHTML = '<p class="empty-cart">Your cart is empty. Please add items from the menu first.</p>';
    document.getElementById('submitOrderBtn').disabled = true;
}
