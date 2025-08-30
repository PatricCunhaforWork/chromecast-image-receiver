class ImageReceiver {
    constructor() {
        this.currentImage = document.getElementById('currentImage');
        this.nextImage = document.getElementById('nextImage');
        this.radarOverlay = document.querySelector('.radar-overlay');
        this.imageUrl = null;
        this.updateInterval = 3000;
        this.isTransitioning = false;
        this.castContext = null;
        this.playerManager = null;
        this.logContainer = null;
        
        this.init();
    }

    init() {
        this.logContainer = document.getElementById('logContent');
        this.log('Initializing Image Receiver...');
        this.initializeCastReceiver();
        this.loadInitialImage();
        this.startImageUpdates();
    }

    log(message) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.innerHTML = `[${timestamp}] ${message}`;
        logEntry.style.marginBottom = '5px';
        logEntry.style.borderBottom = '1px solid #444';
        logEntry.style.paddingBottom = '2px';
        
        if (this.logContainer) {
            this.logContainer.appendChild(logEntry);
            this.logContainer.scrollTop = this.logContainer.scrollHeight;
            
            // Keep only last 50 log entries
            while (this.logContainer.children.length > 50) {
                this.logContainer.removeChild(this.logContainer.firstChild);
            }
        }
        
        console.log(`[${timestamp}] ${message}`);
    }

    initializeCastReceiver() {
        try {
            this.log('Setting up Cast Receiver Context...');
            const castReceiverContext = cast.framework.CastReceiverContext.getInstance();
            const playbackConfig = new cast.framework.PlaybackConfig();
            
            // Add sender connection listeners
            castReceiverContext.addEventListener(cast.framework.system.EventType.SENDER_CONNECTED, (event) => {
                this.log(`<span style="color: #4CAF50;">✓ Sender Connected: ${event.senderId}</span>`);
                this.log(`Sender Info: ${JSON.stringify(event.data, null, 2)}`);
            });

            castReceiverContext.addEventListener(cast.framework.system.EventType.SENDER_DISCONNECTED, (event) => {
                this.log(`<span style="color: #FF9800;">✗ Sender Disconnected: ${event.senderId}</span>`);
            });

            // Add custom message listener
            castReceiverContext.addCustomMessageListener('urn:x-cast:custom-image-receiver', (customEvent) => {
                this.log(`<span style="color: #2196F3;">📨 Custom Message Received</span>`);
                this.handleCustomMessage(customEvent);
            });

            const playerManager = castReceiverContext.getPlayerManager();
            
            // Add load event listener
            playerManager.addEventListener(cast.framework.events.EventType.REQUEST_LOAD, (event) => {
                this.log(`<span style="color: #9C27B0;">🎬 Load Event Received</span>`);
                this.handleLoadEvent(event);
            });

            this.log('Starting Cast Receiver Context...');
            castReceiverContext.start();
            
            this.castContext = castReceiverContext;
            this.playerManager = playerManager;
            
            this.log('<span style="color: #4CAF50;">✓ Cast Receiver initialized successfully</span>');
        } catch (error) {
            this.log(`<span style="color: #F44336;">✗ Cast Receiver initialization failed: ${error.message}</span>`);
            console.error('Cast Receiver initialization error:', error);
        }
    }

    handleLoadEvent(event) {
        this.log('<span style="color: #9C27B0;">📦 MediaInfo Load Event Details:</span>');
        this.log(`Full event data: <pre>${JSON.stringify(event.data, null, 2)}</pre>`);
        
        const mediaInformation = event.data.media;
        
        if (mediaInformation) {
            this.log(`<span style="color: #03DAC6;">📋 MediaInfo object received:</span>`);
            this.log(`<pre>${JSON.stringify(mediaInformation, null, 2)}</pre>`);
            
            if (mediaInformation.customData) {
                this.log(`<span style="color: #FF6D00;">🔧 CustomData found:</span>`);
                this.log(`<pre>${JSON.stringify(mediaInformation.customData, null, 2)}</pre>`);
                
                if (mediaInformation.customData.imageSource) {
                    const imageSource = mediaInformation.customData.imageSource;
                    this.log(`<span style="color: #4CAF50;">🖼️ Image source extracted: ${imageSource}</span>`);
                    this.updateImageSource(imageSource);
                } else {
                    this.log('<span style="color: #FF9800;">⚠️ No imageSource found in customData</span>');
                }
            } else {
                this.log('<span style="color: #FF9800;">⚠️ No customData found in MediaInfo</span>');
            }
        } else {
            this.log('<span style="color: #F44336;">❌ No media information in event</span>');
        }
    }

    handleCustomMessage(customEvent) {
        this.log('<span style="color: #2196F3;">📨 Custom Message Details:</span>');
        this.log(`SenderId: ${customEvent.senderId}`);
        this.log(`Message data: <pre>${JSON.stringify(customEvent.data, null, 2)}</pre>`);
        
        const data = customEvent.data;
        if (data && data.imageSource) {
            this.log(`<span style="color: #4CAF50;">🖼️ Image source from custom message: ${data.imageSource}</span>`);
            this.updateImageSource(data.imageSource);
        } else {
            this.log('<span style="color: #FF9800;">⚠️ No imageSource found in custom message data</span>');
        }
    }

    updateImageSource(newImageSource) {
        this.log(`<span style="color: #E91E63;">🔄 Updating image source to: ${newImageSource}</span>`);
        this.imageUrl = newImageSource;
        this.updateImage();
    }

    createLoadingImageDataUrl() {
        const svg = `
            <svg width="800" height="450" xmlns="http://www.w3.org/2000/svg">
                <rect width="800" height="450" fill="#A8DADC"/>
                <text x="400" y="225" font-family="Arial, sans-serif" font-size="32" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="#6C757D">Loading Image</text>
            </svg>
        `;
        return `data:image/svg+xml;base64,${btoa(svg)}`;
    }

    async loadInitialImage() {
        const loadingImageUrl = this.createLoadingImageDataUrl();
        this.currentImage.src = loadingImageUrl;
        this.currentImage.style.opacity = '1';
        this.log('📺 Showing loading placeholder image');
    }

    preloadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    async startImageUpdates() {
        // Only start updates when we have a valid image source
        if (this.imageUrl) {
            setInterval(async () => {
                if (!this.isTransitioning) {
                    await this.updateImage();
                }
            }, this.updateInterval);
        }
    }

    async updateImage() {
        if (this.isTransitioning || !this.imageUrl) return;
        
        this.isTransitioning = true;

        try {
            await this.preloadImage(this.imageUrl);
            
            this.nextImage.src = this.imageUrl;
            this.nextImage.style.opacity = '1';
            
            this.performRadarTransition();
            
        } catch (error) {
            console.error('Failed to load new image:', error);
            this.isTransitioning = false;
        }
    }

    performRadarTransition() {
        this.nextImage.classList.add('reveal');
        this.radarOverlay.classList.add('radar-transition');
        
        setTimeout(() => {
            this.currentImage.src = this.nextImage.src;
            this.nextImage.style.opacity = '0';
            this.nextImage.classList.remove('reveal');
            this.nextImage.style.clipPath = 'circle(0% at center)';
            this.radarOverlay.classList.remove('radar-transition');
            this.isTransitioning = false;
        }, 1500);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ImageReceiver();
});