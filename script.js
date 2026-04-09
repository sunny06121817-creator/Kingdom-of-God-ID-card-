document.addEventListener('DOMContentLoaded', () => {
    const nameInput = document.getElementById('nameInput');
    const displaySignature = document.getElementById('displaySignature');
    
    const dateInput = document.getElementById('dateInput');
    const photoWrapper = document.getElementById('photoWrapper');
    const photoInput = document.getElementById('photoInput');
    
    const downloadBtn = document.getElementById('downloadBtn');
    const captureArea = document.getElementById('capture-area');
    const idCard = document.getElementById('id-card');
    
    // Auto-format date input to YYYY/MM/DD
    dateInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/[^0-9]/g, '');
        
        if (value.length > 2 && value.length <= 4) {
            value = value.substring(0, 2) + '/' + value.substring(2);
        } else if (value.length > 4) {
            value = value.substring(0, 2) + '/' + value.substring(2, 4) + '/' + value.substring(4, 8);
        }
        
        e.target.value = value;
    });
    
    // Update real-time signature
    nameInput.addEventListener('input', (e) => {
        displaySignature.textContent = e.target.value;
    });

    // Provide default empty signature
    displaySignature.textContent = '';

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

        try {
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const file = new File([blob], 'Kingdom_ID_Card.png', { type: 'image/png' });

            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Kingdom ID Card',
                    text: 'Checkout my Kingdom ID Card!'
                });
            } else {
                alert('Your browser does not support direct image sharing. Please download the card and share it manually.');
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Share failed:', err);
                alert('Sharing failed. Please try downloading instead.');
            }
        }
    });
});
