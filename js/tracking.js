document.addEventListener('DOMContentLoaded', () => {
    const activeOrder = Storage.get('friedays_active_order');

    // If no active order, redirect to menu or set dummy data
    const myOrderNumber = activeOrder ? activeOrder.orderNumber : 55;
    const orderType = activeOrder ? activeOrder.type : 'Dine In';

    document.getElementById('userOrderNumber').textContent = `#${myOrderNumber}`;
    document.getElementById('displayOrderType').textContent = orderType;

    // Simulate real-time queue
    // We start the "Now Serving" number slightly behind the user's order number
    let currentServing = myOrderNumber > 5 ? myOrderNumber - 4 : 1; 
    
    const nowServingEl = document.getElementById('nowServingNumber');
    const queueMessageEl = document.getElementById('queueMessage');
    const progressBarEl = document.getElementById('progressBar');

    const totalSteps = myOrderNumber - currentServing;
    
    function updateDisplay() {
        nowServingEl.textContent = `#${currentServing}`;
        
        const diff = myOrderNumber - currentServing;
        
        // Progress Bar Calculation
        let progressPercent = 100;
        if (totalSteps > 0) {
            progressPercent = ((totalSteps - diff) / totalSteps) * 100;
        }
        progressBarEl.style.width = `${progressPercent}%`;

        if (diff > 0) {
            queueMessageEl.textContent = `You are #${diff} in line. Preparing your food...`;
        } else {
            queueMessageEl.textContent = "Your order is ready!";
            queueMessageEl.style.color = "var(--clr-primary)";
            nowServingEl.classList.remove('pulse');
            Storage.remove('friedays_active_order'); // Order complete
        }
    }

    updateDisplay();

    // Increment queue every 4 seconds
    if (currentServing < myOrderNumber) {
        const queueInterval = setInterval(() => {
            currentServing++;
            updateDisplay();

            if (currentServing >= myOrderNumber) {
                clearInterval(queueInterval);
            }
        }, 4000);
    }
});