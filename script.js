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
        this.showDebugLogs = false;

        this.init();
    }

    init() {
        this.logContainer = document.getElementById('logContent');
        this.setupLogVisibility();
        this.log('Initializing Image Receiver...');
        this.initializeCastReceiver();
        this.loadInitialImage();
        this.startImageUpdates();
    }

    setupLogVisibility() {
        const logContainer = document.getElementById('logContainer');
        if (logContainer) {
            logContainer.style.display = this.showDebugLogs ? 'block' : 'none';
        }
    }

    log(message) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.innerHTML = `[${timestamp}] ${message}`;
        logEntry.style.marginBottom = '8px';
        logEntry.style.borderBottom = '1px solid #333';
        logEntry.style.paddingBottom = '5px';
        logEntry.style.lineHeight = '1.4';
        
        if (this.logContainer) {
            this.logContainer.appendChild(logEntry);
            
            // Keep only last 100 log entries
            while (this.logContainer.children.length > 100) {
                this.logContainer.removeChild(this.logContainer.firstChild);
            }
            
            // Force scroll to bottom after a brief delay to ensure rendering
            setTimeout(() => {
                const logParent = this.logContainer.parentElement;
                if (logParent) {
                    logParent.scrollTop = logParent.scrollHeight;
                }
            }, 10);
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
            
            // Add comprehensive event listeners
            // playerManager.addEventListener(cast.framework.events.EventType.REQUEST_LOAD, (event) => {
            //     this.log(`<span style="color: #9C27B0;">🎬 REQUEST_LOAD Event Received</span>`);
            //     this.handleLoadEvent(event);
            // });

            playerManager.addEventListener(cast.framework.events.EventType.REQUEST_PLAY, (event) => {
                this.log(`<span style="color: #4CAF50;">▶️ PLAY Request Event</span>`);
                this.log(`Play event data: <pre>${JSON.stringify(event, null, 2)}</pre>`);
            });

            // Message interceptors for all possible message types
            playerManager.setMessageInterceptor(cast.framework.messages.MessageType.LOAD, (request) => {
                this.log('<span style="color: #9C27B0;">📦 LOAD Message Interceptor</span>');
                this.log(`Load request: <pre>${JSON.stringify(request, null, 2)}</pre>`);
                
                const mediaInformation = request.media;
                
                if (mediaInformation) {
                    this.log(`<span style="color: #03DAC6;">📋 MediaInfo from interceptor:</span>`);
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
                    this.log('<span style="color: #F44336;">❌ No media information in load request</span>');
                }
                return request;
            });

            playerManager.setMessageInterceptor(cast.framework.messages.MessageType.PLAY, (request) => {
                this.log('<span style="color: #4CAF50;">▶️ PLAY Message Interceptor</span>');
                this.log(`Play request: <pre>${JSON.stringify(request, null, 2)}</pre>`);
                return request;
            });

            // Add a catch-all message interceptor to see what messages are being sent
            const originalSendLocalMediaStatus = playerManager.sendLocalMediaStatus;
            playerManager.sendLocalMediaStatus = function() {
                this.log('<span style="color: #FF5722;">📤 Sending Local Media Status</span>');
                return originalSendLocalMediaStatus.apply(this, arguments);
            }.bind(this);

            // Intercept all possible message types
            // const messageTypes = [
            //     'LOAD', 'PLAY', 'PAUSE', 'STOP', 'SEEK', 'SET_VOLUME', 
            //     'GET_STATUS', 'EDIT_TRACKS_INFO', 'SET_PLAYBACK_RATE'
            // ];

            // messageTypes.forEach(messageType => {
            //     if (cast.framework.messages.MessageType[messageType]) {
            //         try {
            //             playerManager.setMessageInterceptor(cast.framework.messages.MessageType[messageType], (request) => {
            //                 this.log(`<span style="color: #795548;">📬 ${messageType} Message Intercepted</span>`);
            //                 this.log(`Request: <pre>${JSON.stringify(request, null, 2)}</pre>`);
            //                 return request;
            //             });
            //         } catch (error) {
            //             this.log(`<span style="color: #F44336;">❌ Failed to set interceptor for ${messageType}: ${error.message}</span>`);
            //         }
            //     }
            // });

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

    // handleLoadEvent(event) {
    //     this.log('<span style="color: #9C27B0;">📦 MediaInfo Load Event Details:</span>');
    //     this.log(`Full event data: <pre>${JSON.stringify(event.data, null, 2)}</pre>`);
        
    //     const mediaInformation = event.data.media;
        
    //     if (mediaInformation) {
    //         this.log(`<span style="color: #03DAC6;">📋 MediaInfo object received:</span>`);
    //         this.log(`<pre>${JSON.stringify(mediaInformation, null, 2)}</pre>`);
            
    //         if (mediaInformation.customData) {
    //             this.log(`<span style="color: #FF6D00;">🔧 CustomData found:</span>`);
    //             this.log(`<pre>${JSON.stringify(mediaInformation.customData, null, 2)}</pre>`);
                
    //             if (mediaInformation.customData.imageSource) {
    //                 const imageSource = mediaInformation.customData.imageSource;
    //                 this.log(`<span style="color: #4CAF50;">🖼️ Image source extracted: ${imageSource}</span>`);
    //                 this.updateImageSource(imageSource);
    //             } else {
    //                 this.log('<span style="color: #FF9800;">⚠️ No imageSource found in customData</span>');
    //             }
    //         } else {
    //             this.log('<span style="color: #FF9800;">⚠️ No customData found in MediaInfo</span>');
    //         }
    //     } else {
    //         this.log('<span style="color: #F44336;">❌ No media information in event</span>');
    //     }
    // }

    handleMediaStatusUpdate(event) {
        this.log('<span style="color: #2196F3;">📺 Media Status Update Details:</span>');
        this.log(`Full event data: <pre>${JSON.stringify(event, null, 2)}</pre>`);
        
        if (event.mediaStatus) {
            this.log(`Media Status: <pre>${JSON.stringify(event.mediaStatus, null, 2)}</pre>`);
            
            if (event.mediaStatus.media && event.mediaStatus.media.customData) {
                this.log(`<span style="color: #FF6D00;">🔧 CustomData in media status:</span>`);
                this.log(`<pre>${JSON.stringify(event.mediaStatus.media.customData, null, 2)}</pre>`);
                
                if (event.mediaStatus.media.customData.imageSource) {
                    const imageSource = event.mediaStatus.media.customData.imageSource;
                    this.log(`<span style="color: #4CAF50;">🖼️ Image source from media status: ${imageSource}</span>`);
                    this.updateImageSource(imageSource);
                }
            }
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
        // this.updateImage();
        this.startImageUpdates();
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
            // Swap the DOM elements instead of changing src attributes
            const currentParent = this.currentImage.parentNode;
            const nextParent = this.nextImage.parentNode;
            
            // Swap the elements
            [this.currentImage, this.nextImage] = [this.nextImage, this.currentImage];
            
            // Reset the new nextImage (previously currentImage)
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