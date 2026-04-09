document.addEventListener('DOMContentLoaded', () => {
    const nameInput = document.getElementById('nameInput');
    const displaySignature = document.getElementById('displaySignature');
    const dateInput = document.getElementById('dateInput');
    const photoWrapper = document.getElementById('photoWrapper');
    const photoInput = document.getElementById('photoInput');
    const downloadBtn = document.getElementById('downloadBtn');
    const captureArea = document.getElementById('capture-area');
    const idCard = document.getElementById('id-card');

    const browserGuide = document.getElementById('browserGuide');
    const closeGuide = document.getElementById('closeGuide');
    const gotItBtn = document.getElementById('gotItBtn');
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    const dateError = document.getElementById('dateError');

    /** 1. URL State Management **/
    function updateURLParams() {
        const params = new URLSearchParams(window.location.search);
        if (nameInput.value.trim()) params.set('n', nameInput.value.trim());
        else params.delete('n');
        
        if (dateInput.value.trim()) params.set('d', dateInput.value.trim());
        else params.delete('d');

        const newURL = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
        window.history.replaceState({}, '', newURL);
    }

    function loadURLParams() {
        const params = new URLSearchParams(window.location.search);
        if (params.has('n')) {
            nameInput.value = params.get('n');
            displaySignature.textContent = nameInput.value;
        }
        if (params.has('d')) {
            dateInput.value = params.get('d');
        }
    }

    // Call on load
    loadURLParams();

    /** 2. Environment Detection **/
    const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = () => /Android/i.test(navigator.userAgent);
    const isInAppBrowser = () => {
        const ua = navigator.userAgent || navigator.vendor || window.opera;
        return (ua.indexOf('FBAN') > -1) || (ua.indexOf('FBAV') > -1) || (ua.indexOf('Instagram') > -1) || (ua.indexOf('KAKAOTALK') > -1) || (ua.indexOf('Telegram') > -1 || (ua.indexOf('Line') > -1));
    };

    // Show Guide if In-App
    if (isInAppBrowser()) {
        browserGuide.classList.add('show');
    }

    closeGuide.addEventListener('click', () => browserGuide.classList.remove('show'));
    gotItBtn.addEventListener('click', () => browserGuide.classList.remove('show'));

    /** 3. Dynamic Scaling for Mobile **/
    function adjustCardScale() {
        // app-container is used for width because it takes full window width minus padding
        const containerWidth = document.body.clientWidth;
        const cardOriginalWidth = 720; // Width from CSS
        const padding = 32; // Total horizontal padding (from body padding: 1rem * 2)
        
        let scale = (containerWidth - padding) / cardOriginalWidth;
        if (scale > 1) scale = 1;
        
        document.documentElement.style.setProperty('--card-scale', scale);
    }

    window.addEventListener('resize', adjustCardScale);
    adjustCardScale(); // Initial call

    /** 3. Validation Logic **/
    function validateDate(dateString) {
        if (!dateString) return { valid: true }; // Allow empty until submission if needed, but we'll check on blur

        // Format check: MM/DD/YYYY
        const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        if (!regex.test(dateString)) {
            return { valid: false, message: 'Format must be MM/DD/YYYY.' };
        }

        const [mm, dd, yyyy] = dateString.split('/').map(Number);
        const date = new Date(yyyy, mm - 1, dd);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Reality check (e.g. Feb 30)
        if (date.getFullYear() !== yyyy || date.getMonth() !== mm - 1 || date.getDate() !== dd) {
            return { valid: false, message: 'This date does not exist on the calendar.' };
        }

        // Future check
        if (date > today) {
            return { valid: false, message: 'Date cannot be in the future.' };
        }

        // Age check (120 years)
        const minDate = new Date();
        minDate.setFullYear(today.getFullYear() - 120);
        if (date < minDate) {
            return { valid: false, message: 'Age cannot exceed 120 years.' };
        }

        return { valid: true };
    }

    function checkDateValidity() {
        const result = validateDate(dateInput.value);
        if (!result.valid) {
            dateInput.classList.add('invalid');
            dateError.textContent = result.message;
            dateError.classList.add('show');
            return false;
        } else {
            dateInput.classList.remove('invalid');
            dateError.classList.remove('show');
            return true;
        }
    }

    dateInput.addEventListener('blur', checkDateValidity);

    /** 4. UI Helpers **/
    function showToast(message) {
        toastMsg.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            showToast('Link copied to clipboard! 📋');
        } catch (err) {
            console.error('Failed to copy:', err);
            // Fallback for older browsers or restricted environments
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                showToast('Link copied to clipboard! 📋');
            } catch (e) {
                alert('Please copy the URL manually.');
            }
            document.body.removeChild(textArea);
        }
    }

    // Auto-format date input to YYYY/MM/DD
    dateInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/[^0-9]/g, '');
        
        if (value.length > 2 && value.length <= 4) {
            value = value.substring(0, 2) + '/' + value.substring(2);
        } else if (value.length > 4) {
            value = value.substring(0, 2) + '/' + value.substring(2, 4) + '/' + value.substring(4, 8);
        }
        
        e.target.value = value;
        updateURLParams();
    });
    
    // Update real-time signature
    nameInput.addEventListener('input', (e) => {
        displaySignature.textContent = e.target.value;
        updateURLParams();
    });

    // Provide default empty signature
    if (!nameInput.value) displaySignature.textContent = '';

    // Image Cropper Logic
    let cropper;
    const cropModal = document.getElementById('cropModal');
    const cropImage = document.getElementById('cropImage');
    const applyCrop = document.getElementById('applyCrop');
    const cancelCrop = document.getElementById('cancelCrop');
    const closeModal = document.getElementById('closeModal');
    const rotateLeft = document.getElementById('rotateLeft');
    const rotateRight = document.getElementById('rotateRight');

    // Handle photo upload trigger
    photoWrapper.addEventListener('click', () => {
        photoInput.click();
    });

    // Handle file selection and open cropper
    photoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                cropImage.src = event.target.result;
                cropModal.classList.add('show');
                
                if (cropper) cropper.destroy();
                
                // Initialize Cropper after modal is shown to ensure correct dimensions
                setTimeout(() => {
                    cropper = new Cropper(cropImage, {
                        aspectRatio: 190 / 255, // Match our scaled ID card photo ratio
                        viewMode: 1,
                        dragMode: 'move',
                        autoCropArea: 1,
                        background: false,
                        cropBoxMovable: true,
                        cropBoxResizable: true,
                    });
                }, 100);
            };
            reader.readAsDataURL(file);
        }
    });

    // Apply cropped image to the ID card
    applyCrop.addEventListener('click', () => {
        if (!cropper) return;
        
        const canvas = cropper.getCroppedCanvas({
            width: 600, // High quality output
        });
        
        photoWrapper.style.backgroundImage = `url(${canvas.toDataURL('image/jpeg', 0.9)})`;
        photoWrapper.classList.add('has-photo');
        closeCropModal();
    });

    function closeCropModal() {
        cropModal.classList.remove('show');
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        photoInput.value = ''; 
    }

    cancelCrop.addEventListener('click', closeCropModal);
    closeModal.addEventListener('click', closeCropModal);
    rotateLeft.addEventListener('click', () => cropper && cropper.rotate(-90));
    rotateRight.addEventListener('click', () => cropper && cropper.rotate(90));

    // Image Generation Helper
    async function generateCardImage(btnElement) {
        // Validation
        if (!nameInput.value.trim()) {
            alert('Please enter your name.');
            nameInput.focus();
            return null;
        }

        if (!checkDateValidity()) {
            dateInput.focus();
            return null;
        }

        const originalText = btnElement.innerHTML;
        btnElement.innerHTML = 'Processing...';
        btnElement.disabled = true;
        captureArea.classList.add('generating');
        
        // Swap inputs with divs for html2canvas compatibility
        const inputs = idCard.querySelectorAll('input[type="text"]');
        const replacements = [];
        inputs.forEach(input => {
            const div = document.createElement('div');
            div.className = 'static-val';
            div.style.width = '100%';
            let val = input.value;
            if (!val) {
                val = input.placeholder;
                div.style.color = 'var(--border-color)';
                div.style.fontWeight = '500';
            }
            div.textContent = val;
            input.parentNode.insertBefore(div, input);
            input.style.display = 'none';
            replacements.push({input, div});
        });
        
        try {
            await new Promise(resolve => setTimeout(resolve, 300));
            const canvas = await html2canvas(idCard, {
                scale: 3, 
                backgroundColor: null,
                logging: false,
                useCORS: true
            });
            return canvas;
        } catch (error) {
            console.error('Error generating ID card:', error);
            alert('Something went wrong. Please try again.');
            return null;
        } finally {
            captureArea.classList.remove('generating');
            replacements.forEach(item => {
                item.input.style.display = '';
                item.div.remove();
            });
            btnElement.innerHTML = originalText;
            btnElement.disabled = false;
        }
    }

    // Download functionality
    downloadBtn.addEventListener('click', async () => {
        const canvas = await generateCardImage(downloadBtn);
        if (canvas) {
            const image = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            const sanitizedName = nameInput.value.trim().replace(/\s+/g, '_');
            link.download = `Kingdom_ID_${sanitizedName}.png`;
            link.href = image;
            link.click();
        }
    });

    // Share functionality
    const shareBtn = document.getElementById('shareBtn');
    shareBtn.addEventListener('click', async () => {
        const canvas = await generateCardImage(shareBtn);
        if (!canvas) return;

        const shareTitle = 'Kingdom of God ID Card';
        const shareText = 'Check out my Kingdom of God Identity Card! ✨';
        const shareUrl = window.location.href;

        try {
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const file = new File([blob], 'Kingdom_ID_Card.png', { type: 'image/png' });

            // Attempt 1: Full Image Share (Web Share API Level 2)
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: shareTitle,
                    text: shareText
                });
            } 
            // Attempt 2: Text/Link Share (Web Share API Level 1)
            else if (navigator.share) {
                await navigator.share({
                    title: shareTitle,
                    text: shareText,
                    url: shareUrl
                });
            }
            // Attempt 3: Clipboard Fallback
            else {
                await copyToClipboard(shareUrl);
            }
        } catch (err) {
            // AbortError is common when user cancels the share sheet
            if (err.name !== 'AbortError') {
                console.error('Sharing attempt failed:', err);
                // Last resort: Copy link
                await copyToClipboard(shareUrl);
            }
        }
    });
});
