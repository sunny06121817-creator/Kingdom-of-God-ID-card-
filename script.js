document.addEventListener('DOMContentLoaded', () => {
    const nameInput = document.getElementById('nameInput');
    const displaySignature = document.getElementById('displaySignature');
    const signatureCanvasDisplay = document.getElementById('signatureCanvasDisplay');
    
    const dateInput = document.getElementById('dateInput');
    const photoWrapper = document.getElementById('photoWrapper');
    const photoInput = document.getElementById('photoInput');
    const cameraInput = document.getElementById('cameraInput');
    
    const downloadBtn = document.getElementById('downloadBtn');
    const captureArea = document.getElementById('capture-area');
    const idCard = document.getElementById('id-card');

    // Share text constant
    const SHARE_TEXT = `Check out my Kingdom of God Identity Card! ✨\nGrab yours here 👉 https://kingdom-of-god-id-card.vercel.app/`;
    
    // Auto-format date input to MM/DD/YYYY
    dateInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/[^0-9]/g, '');
        
        if (value.length > 2 && value.length <= 4) {
            value = value.substring(0, 2) + '/' + value.substring(2);
        } else if (value.length > 4) {
            value = value.substring(0, 2) + '/' + value.substring(2, 4) + '/' + value.substring(4, 8);
        }
        
        e.target.value = value;
    });

    // Signature is decoupled from name — no auto-fill
    displaySignature.textContent = '';

    // =============================================
    // Feature 1: Photo Options Modal + Live Camera
    // =============================================
    const photoOptionsModal = document.getElementById('photoOptionsModal');
    const optTakePhoto = document.getElementById('optTakePhoto');
    const optUploadImage = document.getElementById('optUploadImage');
    const optCancel = document.getElementById('optCancel');

    // Camera modal elements
    const cameraModal = document.getElementById('cameraModal');
    const cameraVideo = document.getElementById('cameraVideo');
    const cameraLoading = document.getElementById('cameraLoading');
    const capturePhotoBtn = document.getElementById('capturePhoto');
    const flipCameraBtn = document.getElementById('flipCamera');
    const closeCameraModal = document.getElementById('closeCameraModal');
    const cancelCameraBtn = document.getElementById('cancelCamera');

    let cameraStream = null;
    let facingMode = 'user'; // 'user' = front, 'environment' = back

    photoWrapper.addEventListener('click', () => {
        photoOptionsModal.classList.add('show');
    });

    // Take Photo → open live camera
    optTakePhoto.addEventListener('click', async () => {
        photoOptionsModal.classList.remove('show');
        await openCamera();
    });

    optUploadImage.addEventListener('click', () => {
        photoOptionsModal.classList.remove('show');
        photoInput.click();
    });

    optCancel.addEventListener('click', () => {
        photoOptionsModal.classList.remove('show');
    });

    photoOptionsModal.addEventListener('click', (e) => {
        if (e.target === photoOptionsModal) {
            photoOptionsModal.classList.remove('show');
        }
    });

    // --- Live Camera Functions ---
    async function openCamera() {
        cameraModal.classList.add('show');
        cameraLoading.classList.remove('hidden');
        
        try {
            await startCameraStream();
        } catch (err) {
            console.error('Camera access failed:', err);
            closeCameraView();
            alert('Unable to access camera. Please check permissions or use "Upload Image" instead.');
        }
    }

    async function startCameraStream() {
        // Stop any existing stream
        stopCameraStream();

        const constraints = {
            video: {
                facingMode: facingMode,
                width: { ideal: 1280 },
                height: { ideal: 960 }
            }
        };

        cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        cameraVideo.srcObject = cameraStream;
        
        cameraVideo.onloadedmetadata = () => {
            cameraLoading.classList.add('hidden');
        };
    }

    function stopCameraStream() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
        cameraVideo.srcObject = null;
    }

    function closeCameraView() {
        stopCameraStream();
        cameraModal.classList.remove('show');
    }

    // Capture frame from video → send to crop modal
    capturePhotoBtn.addEventListener('click', () => {
        if (!cameraStream) return;

        // Create a canvas to grab the video frame
        const captureCanvas = document.createElement('canvas');
        captureCanvas.width = cameraVideo.videoWidth;
        captureCanvas.height = cameraVideo.videoHeight;
        const ctx = captureCanvas.getContext('2d');

        // If front camera, mirror the image
        if (facingMode === 'user') {
            ctx.translate(captureCanvas.width, 0);
            ctx.scale(-1, 1);
        }
        ctx.drawImage(cameraVideo, 0, 0);

        // Convert to data URL and send to crop modal
        const dataURL = captureCanvas.toDataURL('image/jpeg', 0.92);
        closeCameraView();
        openCropModalWithImage(dataURL);
    });

    // Flip camera (front ↔ back)
    flipCameraBtn.addEventListener('click', async () => {
        facingMode = facingMode === 'user' ? 'environment' : 'user';
        cameraLoading.classList.remove('hidden');
        try {
            await startCameraStream();
        } catch (err) {
            console.error('Flip camera failed:', err);
            // Revert
            facingMode = facingMode === 'user' ? 'environment' : 'user';
            try { await startCameraStream(); } catch {}
        }
    });

    closeCameraModal.addEventListener('click', closeCameraView);
    cancelCameraBtn.addEventListener('click', closeCameraView);

    // =============================================
    // Feature 2: Image Cropper + Filters
    // =============================================
    let cropper;
    let activeFilter = 'none';

    const cropModal = document.getElementById('cropModal');
    const cropImage = document.getElementById('cropImage');
    const applyCrop = document.getElementById('applyCrop');
    const cancelCrop = document.getElementById('cancelCrop');
    const closeModal = document.getElementById('closeModal');
    const rotateLeft = document.getElementById('rotateLeft');
    const rotateRight = document.getElementById('rotateRight');
    const filterStrip = document.getElementById('filterStrip');

    // CSS filter values map
    const FILTERS = {
        'none':    'none',
        'warm':    'sepia(0.3) saturate(1.4) brightness(1.05)',
        'cool':    'saturate(0.9) brightness(1.05) hue-rotate(15deg)',
        'bw':      'grayscale(1) contrast(1.1)',
        'bright':  'brightness(1.25) contrast(1.05)',
        'vivid':   'saturate(1.8) contrast(1.1)',
        'soft':    'brightness(1.1) contrast(0.9) saturate(0.9)',
        'vintage': 'sepia(0.5) contrast(0.9) brightness(0.95) saturate(0.8)',
    };

    // Handle filter selection
    filterStrip.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;

        filterStrip.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter;

        // Live preview: apply filter to crop image container
        const cropContainer = document.querySelector('.crop-container');
        if (activeFilter === 'none') {
            cropContainer.style.filter = 'none';
        } else {
            cropContainer.style.filter = FILTERS[activeFilter];
        }
    });

    // Shared function: opens crop modal with a given image dataURL
    function openCropModalWithImage(dataURL) {
        cropImage.src = dataURL;
        cropModal.classList.add('show');

        // Reset filter
        activeFilter = 'none';
        filterStrip.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        filterStrip.querySelector('[data-filter="none"]').classList.add('active');
        document.querySelector('.crop-container').style.filter = 'none';
        
        if (cropper) cropper.destroy();
        
        // Initialize Cropper after modal is shown
        setTimeout(() => {
            cropper = new Cropper(cropImage, {
                aspectRatio: 190 / 255,
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 1,
                background: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
            });
        }, 100);
    }

    // File input handler — reads file then opens crop modal
    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                openCropModalWithImage(event.target.result);
            };
            reader.readAsDataURL(file);
        }
    }

    photoInput.addEventListener('change', handleFileSelect);
    cameraInput.addEventListener('change', handleFileSelect);

    // Apply cropped + filtered image
    applyCrop.addEventListener('click', () => {
        if (!cropper) return;
        
        const croppedCanvas = cropper.getCroppedCanvas({
            width: 600,
        });

        // Apply filter via a second canvas
        let finalDataURL;
        if (activeFilter !== 'none') {
            const filterCanvas = document.createElement('canvas');
            filterCanvas.width = croppedCanvas.width;
            filterCanvas.height = croppedCanvas.height;
            const ctx = filterCanvas.getContext('2d');
            ctx.filter = FILTERS[activeFilter];
            ctx.drawImage(croppedCanvas, 0, 0);
            finalDataURL = filterCanvas.toDataURL('image/jpeg', 0.9);
        } else {
            finalDataURL = croppedCanvas.toDataURL('image/jpeg', 0.9);
        }
        
        photoWrapper.style.backgroundImage = `url(${finalDataURL})`;
        photoWrapper.classList.add('has-photo');
        closeCropModal();
    });

    function closeCropModal() {
        cropModal.classList.remove('show');
        document.querySelector('.crop-container').style.filter = 'none';
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        photoInput.value = ''; 
        cameraInput.value = '';
    }

    cancelCrop.addEventListener('click', closeCropModal);
    closeModal.addEventListener('click', closeCropModal);
    rotateLeft.addEventListener('click', () => cropper && cropper.rotate(-90));
    rotateRight.addEventListener('click', () => cropper && cropper.rotate(90));

    // =============================================
    // Feature 3: Signature Modal
    // =============================================
    const signatureArea = document.getElementById('signatureArea');
    const sigTapHint = document.getElementById('sigTapHint');
    const signatureModal = document.getElementById('signatureModal');
    const closeSigModal = document.getElementById('closeSigModal');
    const sigCanvasWrapper = document.getElementById('sigCanvasWrapper');
    const sigTextWrapper = document.getElementById('sigTextWrapper');
    const signatureCanvas = document.getElementById('signatureCanvas');
    const sigCanvasHint = document.getElementById('sigCanvasHint');
    const sigTextInput = document.getElementById('sigTextInput');
    const sigTextPreview = document.getElementById('sigTextPreview');
    const clearSig = document.getElementById('clearSig');
    const cancelSig = document.getElementById('cancelSig');
    const confirmSig = document.getElementById('confirmSig');

    const sigCtx = signatureCanvas.getContext('2d');
    let isDrawing = false;
    let hasDrawn = false;
    let signatureMode = 'draw'; // 'draw' or 'type'

    // Detect touch device
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    // Open signature modal
    signatureArea.addEventListener('click', () => {
        if (isTouchDevice) {
            signatureMode = 'draw';
            sigCanvasWrapper.style.display = 'block';
            sigTextWrapper.style.display = 'none';
        } else {
            signatureMode = 'type';
            sigCanvasWrapper.style.display = 'none';
            sigTextWrapper.style.display = 'flex';
            sigTextInput.value = '';
            sigTextPreview.textContent = '';
        }

        // Reset canvas
        sigCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
        hasDrawn = false;
        sigCanvasHint.classList.remove('hidden');

        signatureModal.classList.add('show');
        if (signatureMode === 'type') {
            setTimeout(() => sigTextInput.focus(), 200);
        }
    });

    // Drawing on canvas
    function getCanvasPos(e) {
        const rect = signatureCanvas.getBoundingClientRect();
        const scaleX = signatureCanvas.width / rect.width;
        const scaleY = signatureCanvas.height / rect.height;
        
        let clientX, clientY;
        if (e.touches) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    function startDraw(e) {
        e.preventDefault();
        isDrawing = true;
        hasDrawn = true;
        sigCanvasHint.classList.add('hidden');

        const pos = getCanvasPos(e);
        sigCtx.beginPath();
        sigCtx.moveTo(pos.x, pos.y);
        sigCtx.strokeStyle = '#0f172a';
        sigCtx.lineWidth = 3;
        sigCtx.lineCap = 'round';
        sigCtx.lineJoin = 'round';
    }

    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();

        const pos = getCanvasPos(e);
        sigCtx.lineTo(pos.x, pos.y);
        sigCtx.stroke();
    }

    function endDraw(e) {
        if (isDrawing) {
            e.preventDefault();
            isDrawing = false;
        }
    }

    signatureCanvas.addEventListener('mousedown', startDraw);
    signatureCanvas.addEventListener('mousemove', draw);
    signatureCanvas.addEventListener('mouseup', endDraw);
    signatureCanvas.addEventListener('mouseleave', endDraw);

    signatureCanvas.addEventListener('touchstart', startDraw, { passive: false });
    signatureCanvas.addEventListener('touchmove', draw, { passive: false });
    signatureCanvas.addEventListener('touchend', endDraw, { passive: false });

    // Text signature preview
    sigTextInput.addEventListener('input', () => {
        sigTextPreview.textContent = sigTextInput.value;
    });

    // Clear
    clearSig.addEventListener('click', () => {
        if (signatureMode === 'draw') {
            sigCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
            hasDrawn = false;
            sigCanvasHint.classList.remove('hidden');
        } else {
            sigTextInput.value = '';
            sigTextPreview.textContent = '';
        }
    });

    // Cancel
    cancelSig.addEventListener('click', () => {
        signatureModal.classList.remove('show');
    });
    closeSigModal.addEventListener('click', () => {
        signatureModal.classList.remove('show');
    });

    // Confirm signature
    confirmSig.addEventListener('click', () => {
        if (signatureMode === 'draw') {
            if (!hasDrawn) {
                alert('Please draw your signature first.');
                return;
            }
            // Export drawn signature to display canvas on the card
            displaySignature.style.display = 'none';
            signatureCanvasDisplay.style.display = 'block';
            
            // Copy drawn canvas to display canvas
            const dispCtx = signatureCanvasDisplay.getContext('2d');
            signatureCanvasDisplay.width = signatureCanvas.width;
            signatureCanvasDisplay.height = signatureCanvas.height;
            dispCtx.clearRect(0, 0, signatureCanvasDisplay.width, signatureCanvasDisplay.height);
            dispCtx.drawImage(signatureCanvas, 0, 0);

        } else {
            if (!sigTextInput.value.trim()) {
                alert('Please type your signature first.');
                return;
            }
            // Show typed signature on the card
            signatureCanvasDisplay.style.display = 'none';
            displaySignature.style.display = 'flex';
            displaySignature.textContent = sigTextInput.value;
            displaySignature.style.fontFamily = 'var(--font-signature)';
        }

        // Hide the tap hint
        sigTapHint.style.display = 'none';

        // Trigger reveal animation on signature
        const sigBox = document.querySelector('.sig-box');
        sigBox.classList.remove('sig-reveal', 'sig-shimmer');
        // Force reflow
        void sigBox.offsetWidth;
        sigBox.classList.add('sig-reveal');

        // Add shimmer after reveal finishes
        setTimeout(() => {
            sigBox.classList.add('sig-shimmer');
        }, 800);

        // Trigger stamp slam animation
        const stampEl = document.getElementById('stampEffect');
        stampEl.classList.remove('stamp-active');
        void stampEl.offsetWidth; // Force reflow for replay
        setTimeout(() => {
            stampEl.classList.add('stamp-active');
        }, 300); // Slight delay so signature reveals first

        signatureModal.classList.remove('show');
    });


    // =============================================
    // Image Generation Helper
    // =============================================
    async function generateCardImage(btnElement) {
        // Validation
        if (!nameInput.value.trim()) {
            alert('Please enter your name.');
            nameInput.focus();
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

        // Hide the tap hint during capture
        const tapHint = document.getElementById('sigTapHint');
        const tapHintDisplay = tapHint ? tapHint.style.display : '';
        if (tapHint) tapHint.style.display = 'none';
        
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
            if (tapHint) tapHint.style.display = tapHintDisplay;
            btnElement.innerHTML = originalText;
            btnElement.disabled = false;
        }
    }

    // =============================================
    // Download functionality
    // =============================================
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

    // =============================================
    // Feature 4: Share functionality
    // =============================================
    const shareBtn = document.getElementById('shareBtn');
    const toast = document.getElementById('toastNotification');

    function showToast(message) {
        const toastText = toast.querySelector('.toast-text');
        if (message) toastText.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    shareBtn.addEventListener('click', async () => {
        const canvas = await generateCardImage(shareBtn);
        if (!canvas) return;

        try {
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const file = new File([blob], 'Kingdom_ID_Card.png', { type: 'image/png' });

            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Kingdom of God Identity Card',
                    text: SHARE_TEXT
                });
            } else {
                // Clipboard fallback for desktop
                try {
                    await navigator.clipboard.writeText(SHARE_TEXT);
                    showToast('Link & message copied! Share your card 🎉');
                } catch {
                    // Final fallback
                    const textarea = document.createElement('textarea');
                    textarea.value = SHARE_TEXT;
                    textarea.style.position = 'fixed';
                    textarea.style.opacity = '0';
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    showToast('Link & message copied! Share your card 🎉');
                }
                
                // Also trigger download of the image
                const image = canvas.toDataURL('image/png', 1.0);
                const link = document.createElement('a');
                const sanitizedName = nameInput.value.trim().replace(/\s+/g, '_');
                link.download = `Kingdom_ID_${sanitizedName}.png`;
                link.href = image;
                link.click();
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Share failed:', err);
                showToast('Sharing failed. Card downloaded instead.');
            }
        }
    });
});
