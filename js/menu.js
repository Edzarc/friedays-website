document.addEventListener('DOMContentLoaded', () => {
    // 1. DATA DEFINITION
    const menuData = [
        { category: "Chicken & Fried Items", items: [
            { id: 1, name: "Boneless Chicken", price: 150 },
            { id: 2, name: "Chicken Tenders", price: 120 },
            { id: 3, name: "Chicken Poppers", price: 110 },
            { id: 4, name: "Chicken Skin", price: 80 },
            { id: 5, name: "Isaw", price: 40 },
            { id: 6, name: "Proben", price: 50 },
            { id: 7, name: "Funshots", price: 90 },
            { id: 8, name: "Calamares", price: 130 },
            { id: 9, name: "Chicken Sisig", price: 160 }
        ]},
        { category: "Sides & Sandwiches", items: [
            { id: 10, name: "Pork Shanghai", price: 70 },
            { id: 11, name: "French Fries", price: 65 },
            { id: 12, name: "Nachos", price: 85 },
            { id: 13, name: "Hotdog", price: 40 },
            { id: 14, name: "Footlong", price: 80 },
            { id: 15, name: "Burger", price: 60 },
            { id: 16, name: "Egg Sandwich", price: 45 },
            { id: 17, name: "Chicken Burger", price: 95 }
        ]},
        { category: "Beverages", items: [
            { id: 18, name: "Coke Float", price: 65 },
            { id: 19, name: "Milktea", price: 90 },
            { id: 20, name: "Milk Shake", price: 85 },
            { id: 21, name: "Fruit Tea", price: 80 },
            { id: 22, name: "Fruit Series", price: 95 },
            { id: 23, name: "Fruit Soda", price: 75 },
            { id: 24, name: "Softdrinks", price: 40 }
        ]},
        { category: "Pasta & Mains", items: [
            { id: 25, name: "Solo Spaghetti", price: 80 },
            { id: 26, name: "Solo Carbonara", price: 90 },
            { id: 27, name: "Bilao Orders", price: 450 },
            { id: 28, name: "Spaghetti", price: 150 },
            { id: 29, name: "Creamy Carbonara", price: 170 },
            { id: 30, name: "Creamy Lasagna", price: 180 },
            { id: 31, name: "Baked Macaroni", price: 160 },
            { id: 32, name: "Pancit Guisado", price: 140 }
        ]}
    ];

    // 2. STATE MANAGEMENT
    let cart = Storage.get('friedays_cart') || [];
    let currentFilter = 'All';
    let searchQuery = '';

    // 3. DOM ELEMENTS
    const menuContainer = document.getElementById('menuContainer');
    const searchInput = document.getElementById('menuSearch');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const cartItemsContainer = document.getElementById('cartItems');
    const subtotalEl = document.getElementById('subtotal');
    const taxEl = document.getElementById('tax');
    const deliveryFeeLine = document.getElementById('deliveryFeeLine');
    const deliveryFeeEl = document.getElementById('deliveryFee');
    const totalEl = document.getElementById('total');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const orderTypeRadios = document.getElementsByName('orderType');
    const orderTypeError = document.getElementById('orderTypeError');
    const userGreeting = document.getElementById('userGreeting');

    // Set Greeting
    const sessionUser = Storage.get('friedays_session');
    if(sessionUser) userGreeting.textContent = `Welcome, ${sessionUser}!`;

    // 4. SEARCH & FILTER EVENT LISTENERS
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            renderMenu();
        });
    }

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-category');
            renderMenu();
        });
    });

    // 5. RENDERING THE MENU
    function renderMenu() {
        menuContainer.innerHTML = '';
        let hasVisibleItems = false;

        menuData.forEach(cat => {
            if (currentFilter !== 'All' && cat.category !== currentFilter) return;

            const filteredItems = cat.items.filter(item => 
                item.name.toLowerCase().includes(searchQuery)
            );

            if (filteredItems.length > 0) {
                hasVisibleItems = true;
                const section = document.createElement('section');
                section.className = 'category-section';
                
                section.innerHTML = `
                    <h2 class="category-title">${cat.category}</h2>
                    <div class="items-grid">
                        ${filteredItems.map(item => `
                            <div class="menu-card">
                                <img src="https://placehold.co/300x200/fffbeb/ea580c?text=${encodeURIComponent(item.name)}" alt="${item.name}" class="menu-img">
                                <div class="menu-info">
                                    <div class="item-name">${item.name}</div>
                                    <div class="item-price">${formatMoney(item.price)}</div>
                                    <button class="btn-secondary" onclick="addToCart(${item.id}, '${item.name}', ${item.price})">Add to Cart</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
                menuContainer.appendChild(section);
            }
        });

        if (!hasVisibleItems) {
            menuContainer.innerHTML = `<div class="no-results"><h3>No items found matching "${searchQuery}"</h3></div>`;
        }
    }

    // 6. CART FUNCTIONALITY
    window.addToCart = (id, name, price) => {
        const existing = cart.find(item => item.id === id);
        if (existing) { existing.qty += 1; } 
        else { cart.push({ id, name, price, qty: 1 }); }
        updateCart();
    };

    window.updateQty = (id, delta) => {
        const item = cart.find(i => i.id === id);
        if (item) {
            item.qty += delta;
            if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
            updateCart();
        }
    };

    window.removeItem = (id) => {
        cart = cart.filter(i => i.id !== id);
        updateCart();
    };

    function updateCart() {
        Storage.set('friedays_cart', cart);
        renderCart();
    }

    function getSelectedOrderType() {
        let selected = null;
        for (const radio of orderTypeRadios) {
            if (radio.checked) {
                selected = radio.value;
                break;
            }
        }
        return selected;
    }

    function renderCart() {
        cartItemsContainer.innerHTML = '';

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="empty-cart">Your cart is empty.</p>';
            checkoutBtn.disabled = true;
            subtotalEl.textContent = '₱0.00';
            taxEl.textContent = '₱0.00';
            deliveryFeeEl.textContent = '₱0.00';
            deliveryFeeLine.style.display = 'none';
            totalEl.textContent = '₱0.00';
            return;
        }

        checkoutBtn.disabled = false;
        let subtotal = 0;

        cart.forEach(item => {
            subtotal += item.price * item.qty;
            const itemEl = document.createElement('div');
            itemEl.className = 'cart-item';
            itemEl.innerHTML = `
                <div>
                    <strong>${item.name}</strong><br>
                    <small>${formatMoney(item.price)}</small>
                    <br><button class="remove-btn" onclick="removeItem(${item.id})">Remove</button>
                </div>
                <div class="qty-controls">
                    <button class="qty-btn" onclick="updateQty(${item.id}, -1)">-</button>
                    <span>${item.qty}</span>
                    <button class="qty-btn" onclick="updateQty(${item.id}, 1)">+</button>
                </div>
            `;
            cartItemsContainer.appendChild(itemEl);
        });

        const tax = subtotal * 0.12;
        const orderType = getSelectedOrderType();
        const deliveryFee = (orderType === 'Delivery') ? 50 : 0;

        subtotalEl.textContent = formatMoney(subtotal);
        taxEl.textContent = formatMoney(tax);

        if (deliveryFee > 0) {
            deliveryFeeLine.style.display = 'flex';
            deliveryFeeEl.textContent = formatMoney(deliveryFee);
        } else {
            deliveryFeeLine.style.display = 'none';
            deliveryFeeEl.textContent = '₱0.00';
        }

        const total = subtotal + tax + deliveryFee;
        totalEl.textContent = formatMoney(total);
    }

    // 7. CHECKOUT LOGIC
    for (const radio of orderTypeRadios) {
        radio.addEventListener('change', () => {
            orderTypeError.style.display = 'none';
            renderCart();
        });
    }

    checkoutBtn.addEventListener('click', () => {
        // Validate order type is selected
        const selectedOrderType = getSelectedOrderType();
        if (!selectedOrderType) {
            orderTypeError.style.display = 'block';
            orderTypeError.textContent = 'Please select an order type before proceeding to checkout';
            return;
        }

        // Save selected order type for checkout persistence
        Storage.set('friedays_selected_order_type', selectedOrderType);

        // Cart is saved automatically in updateCart()
        // Redirect to checkout page
        window.location.href = 'checkout.html';
    });

    // INITIALIZE
    renderMenu();
    renderCart();
});