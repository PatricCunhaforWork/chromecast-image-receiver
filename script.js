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
        
        this.init();
    }

    init() {
        this.initializeCastReceiver();
        this.loadInitialImage();
        this.startImageUpdates();
    }

    initializeCastReceiver() {
        const castReceiverContext = cast.framework.CastReceiverContext.getInstance();
        const playbackConfig = new cast.framework.PlaybackConfig();
        
        castReceiverContext.addCustomMessageListener('urn:x-cast:custom-image-receiver', (customEvent) => {
            this.handleCustomMessage(customEvent);
        });

        const playerManager = castReceiverContext.getPlayerManager();
        
        playerManager.addEventListener(cast.framework.events.EventType.LOAD, (event) => {
            this.handleLoadEvent(event);
        });

        castReceiverContext.start();
        
        this.castContext = castReceiverContext;
        this.playerManager = playerManager;
        
        console.log('Cast Receiver initialized');
    }

    handleLoadEvent(event) {
        const mediaInformation = event.data.media;
        
        if (mediaInformation && mediaInformation.customData && mediaInformation.customData.imageSource) {
            const imageSource = mediaInformation.customData.imageSource;
            console.log('Received image source from MediaInfo:', imageSource);
            this.updateImageSource(imageSource);
        }
    }

    handleCustomMessage(customEvent) {
        const data = customEvent.data;
        if (data && data.imageSource) {
            console.log('Received custom message with image source:', data.imageSource);
            this.updateImageSource(data.imageSource);
        }
    }

    updateImageSource(newImageSource) {
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
        console.log('Showing loading placeholder image');
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