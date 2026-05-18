import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import TWEEN from "@tweenjs/tween.js";

document.addEventListener('DOMContentLoaded', () => {
    const scene = new THREE.Scene();
    createSkybox(scene);
    
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 3000);
    const initialCameraPosition = new THREE.Vector3(350, 150, 500);
    camera.position.copy(initialCameraPosition);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.alpha = true;
    document.body.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    const initialControlsTarget = new THREE.Vector3(0, 0, 0);
    controls.target.copy(initialControlsTarget);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let videoScreenGroup = null;
    let videoScreen = { video: null, videoTexture: null };
    let baiban1 = null;
    let baiban2 = null; 
    let animateRequestId = null;
    let lights = null; 

    // 白板2动画控制变量
    let baiban2AnimationState = {
        isMoving: false,   
        isAtTarget: false,  
        startX: 0,          
        targetX: 0,         
        animationId: null   
    };

    // 复位
    function resetCameraView() {
        camera.position.copy(initialCameraPosition);
        controls.target.copy(initialControlsTarget);
        controls.update();
    }

    // 创建视频屏幕
    function createVideoScreen() {
        const video = document.createElement('video');
        video.src = '123.mp4'; 
        video.loop = true;
        video.muted = true;
        video.crossOrigin = 'anonymous';
        video.setAttribute('playsinline', 'true');
        document.body.appendChild(video);

        video.addEventListener('loadeddata', () => {
            console.log('[视频屏幕] 视频加载完成，创建纹理');
            const videoTexture = new THREE.VideoTexture(video);
            videoTexture.encoding = THREE.sRGBEncoding;
            videoTexture.minFilter = THREE.LinearFilter;
            videoTexture.magFilter = THREE.LinearFilter;
            videoTexture.wrapS = THREE.ClampToEdgeWrapping;
            videoTexture.wrapT = THREE.ClampToEdgeWrapping;

            const screenMaterial = new THREE.MeshStandardMaterial({
                map: videoTexture,
                roughness: 0.1,
                metalness: 0.2,
                emissive: 0x222222,
                emissiveIntensity: 0.3
            });
            createScreenMesh(screenMaterial);
            videoScreen = { screenGroup: videoScreenGroup, video, videoTexture };
        });

        video.addEventListener('error', (err) => {
            console.error('[视频屏幕] 视频加载失败', err);
            createScreenMesh(new THREE.MeshStandardMaterial({
                color: 0x333333,
                roughness: 0.1,
                metalness: 0.2
            }));
        });

        function createScreenMesh(material) {
            const screenWidth = 140;
            const screenHeight = 60;
            const screenThickness = 3;
            const frameWidth = 5;

            const screenGeometry = new THREE.BoxGeometry(screenWidth, screenHeight, screenThickness);
            const screenMesh = new THREE.Mesh(screenGeometry, material);
            screenMesh.userData.isVideoScreen = true;

            const topFrame = new THREE.Mesh(
                new THREE.BoxGeometry(screenWidth + frameWidth * 2, frameWidth, screenThickness + 2),
                new THREE.MeshStandardMaterial({color: 0x111111, roughness: 0.3, metalness: 0.8})
            );
            topFrame.position.y = screenHeight / 2 + frameWidth / 2;
            topFrame.userData.isVideoScreen = true;

            const bottomFrame = new THREE.Mesh(
                new THREE.BoxGeometry(screenWidth + frameWidth * 2, frameWidth, screenThickness + 2),
                new THREE.MeshStandardMaterial({color: 0x111111, roughness: 0.3, metalness: 0.8})
            );
            bottomFrame.position.y = -screenHeight / 2 - frameWidth / 2;
            bottomFrame.userData.isVideoScreen = true;

            const leftFrame = new THREE.Mesh(
                new THREE.BoxGeometry(frameWidth, screenHeight, screenThickness + 2),
                new THREE.MeshStandardMaterial({color: 0x111111, roughness: 0.3, metalness: 0.8})
            );
            leftFrame.position.x = -screenWidth / 2 - frameWidth / 2;
            leftFrame.userData.isVideoScreen = true;

            const rightFrame = new THREE.Mesh(
                new THREE.BoxGeometry(frameWidth, screenHeight, screenThickness + 2),
                new THREE.MeshStandardMaterial({color: 0x111111, roughness: 0.3, metalness: 0.8})
            );
            rightFrame.position.x = screenWidth / 2 + frameWidth / 2;
            rightFrame.userData.isVideoScreen = true;

            const screenGroup = new THREE.Group();
            screenGroup.add(screenMesh, topFrame, bottomFrame, leftFrame, rightFrame);
            screenGroup.position.set(-80, 45, -350);
            screenGroup.castShadow = true;
            screenGroup.receiveShadow = true;
            scene.add(screenGroup);
            videoScreenGroup = screenGroup;
        }

        console.log('视频屏幕初始化完成（若视频加载失败将显示纯色）');
        return videoScreen;
    }

    // 创建墙面/地面纹理
    function createWalls() {
        const textureLoader = new THREE.TextureLoader();
        const floorTexture = textureLoader.load('diban.jpg', () => {
           
        }
         );
        const backWallTexture = textureLoader.load('wall01.jpg', () => {
            
        });
        const pillarTexture = textureLoader.load('wall01.jpg', () => {
           
        });

        floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(17, 17);
        floorTexture.encoding = THREE.sRGBEncoding;

        backWallTexture.wrapS = backWallTexture.wrapT = THREE.RepeatWrapping;
        backWallTexture.repeat.set(1, 1);
        backWallTexture.encoding = THREE.sRGBEncoding;
        backWallTexture.needsUpdate = true;

        pillarTexture.wrapS = pillarTexture.wrapT = THREE.RepeatWrapping;
        pillarTexture.repeat.set(0.2, 1);
        pillarTexture.encoding = THREE.sRGBEncoding;
        pillarTexture.needsUpdate = true;

        const backWallMaterial = new THREE.MeshStandardMaterial({map: backWallTexture, roughness: 0.7, metalness: 0.1, side: THREE.DoubleSide});
        const pillarMaterial = new THREE.MeshStandardMaterial({map: pillarTexture, roughness: 0.7, metalness: 0.1, side: THREE.DoubleSide});
        const floorMaterial = new THREE.MeshStandardMaterial({map: floorTexture, roughness: 0.8, metalness: 0.1, side: THREE.DoubleSide});
        const ceilingMaterial = new THREE.MeshStandardMaterial({color: 0xffffff, roughness: 0.7, metalness: 0.1, side: THREE.FrontSide});

        const thickness = 5;
        const floor = new THREE.Mesh(new THREE.BoxGeometry(700, thickness, 700), floorMaterial);
        floor.position.y = -40 + thickness/2;
        floor.receiveShadow = true;
        scene.add(floor);

        const backWall = new THREE.Mesh(new THREE.BoxGeometry(710, 200, thickness), backWallMaterial);
        backWall.position.set(0, 60, -350 - thickness/2);
        backWall.receiveShadow = true;
        scene.add(backWall);

        const ceiling = new THREE.Mesh(new THREE.BoxGeometry(700, thickness, 700), ceilingMaterial);
        ceiling.position.y = 160 - thickness/2;
        ceiling.receiveShadow = true;
        scene.add(ceiling);

        const pillarGeometry = new THREE.BoxGeometry(25, 195, 25);
        const pillarGeometry2 = new THREE.BoxGeometry(40, 195, 40);
        const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        pillar.position.set(340, 60, -25);
        pillar.castShadow = pillar.receiveShadow = true;
        scene.add(pillar);

        const pillar2 = new THREE.Mesh(pillarGeometry, pillarMaterial);
        pillar2.position.set(340, 60, 120);
        pillar2.castShadow = pillar2.receiveShadow = true;
        scene.add(pillar2);

        const pillar3 = new THREE.Mesh(pillarGeometry2, pillarMaterial);
        pillar3.position.set(330, 60, 300);
        pillar3.castShadow = pillar3.receiveShadow = true;
        scene.add(pillar3);

        const pillar4 = new THREE.Mesh(pillarGeometry2, pillarMaterial);
        pillar4.position.set(-125, 60, 300);
        pillar4.castShadow = pillar4.receiveShadow = true;
        scene.add(pillar4);

        console.log('[场景构建] 墙面/地面/承重柱创建完成');
        return { floor, backWall, ceiling, pillar, pillar2, pillar3, pillar4 };
    }

    // 创建玻璃
    function createGlassBox() {
        const glassMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9,
            roughness: 0.0,
            metalness: 0.0,
            transmission: 0.9,
            ior: 1.5,
            side: THREE.DoubleSide,
            clearcoat: 0.8,
            clearcoatRoughness: 0.01
        });
        const glassGeometry = new THREE.BoxGeometry(2, 180, 500, 10, 10, 10);
        const glassBox = new THREE.Mesh(glassGeometry, glassMaterial);
        glassBox.position.set(353, 60, 50);
        glassBox.castShadow = glassBox.receiveShadow = true;
        scene.add(glassBox);
        console.log('[场景构建] 透明玻璃长方体创建完成');
        return glassBox;
    }
     // 创建灯光
    function createLights() {
        console.log('[灯光系统] 开始创建灯光');
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        scene.add(ambientLight);

        const tubeLights = new THREE.Group();
        const tubeCount = 10;
        const tubeColor = 0xffffff;
        const tubeIntensity = 12;
        const tubeAngle = Math.PI / 2;

        for (let i = 0; i < tubeCount; i++) {
            const light = new THREE.SpotLight(tubeColor, tubeIntensity);
            light.position.set(-300 + i * 65, 160, 0);
            light.angle = tubeAngle;
            light.penumbra = 0.2;
            light.distance = 1200;
            light.decay = 1;
            light.target.position.set(-300 + i * 65, -40, 0);
            tubeLights.add(light.target);
            light.castShadow = true;
            light.shadow.mapSize.set(2048, 2048);
            light.shadow.camera.near = 0.1;
            light.shadow.camera.far = 700;
            light.shadow.camera.fov = 90;
            tubeLights.add(light);
            console.log(`[灯光系统] 创建室内射灯 ${i+1}/${tubeCount}，ID: ${light.id}`);
        }
        scene.add(tubeLights);

        const sunlight = new THREE.DirectionalLight(0xffffe0, 1.5);
        sunlight.position.set(-600, 300, 600);
        sunlight.target.position.set(-300, -40, 300);
        sunlight.castShadow = true;
        sunlight.shadow.camera.left = -800;
        sunlight.shadow.camera.right = 800;
        sunlight.shadow.camera.top = 800;
        sunlight.shadow.camera.bottom = -800;
        sunlight.shadow.camera.near = 0.1;
        sunlight.shadow.camera.far = 1500;
        sunlight.shadow.mapSize.set(4096, 4096);
        sunlight.shadow.radius = 4;
        scene.add(sunlight);
        scene.add(sunlight.target);
        console.log('[灯光系统] 创建模拟阳光，ID: ', sunlight.id);

        const lightStates = {
            ambient: true,
            tube: true,
            tubeIntensity: tubeIntensity,
            tubeAngle: tubeAngle,
            sunlight: true,
            sunlightIntensity: 1.5,
            
        };

        console.log('[灯光系统] 灯光创建完成，初始状态：', lightStates);
        return { ambientLight, tubeLights, sunlight, lightStates };
    }

    // 创建控制面板
    function createLightControlPanel() {
        const panel = document.createElement('div');
        panel.style.position = 'absolute';
        panel.style.top = '20px';
        panel.style.left = '20px';
        panel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        panel.style.padding = '15px';
        panel.style.borderRadius = '8px';
        panel.style.color = 'white';
        panel.style.fontFamily = 'Arial, sans-serif';
        panel.style.zIndex = '1000';
        panel.style.cursor = 'pointer';

        panel.innerHTML = `
            <h3 id="panelTitle" style="margin:0; user-select: none;">控制面板 ▶</h3>
            <div id="panelContent" style="margin-top:15px; display:none;">
                <label style="display:block; margin:8px 0;">
                    <input type="checkbox" id="ambientLightToggle" checked> 环境光
                </label>
                <label style="display:block; margin:8px 0;">
                    <input type="checkbox" id="tubeLightToggle" checked> 室内灯
                </label>
                <label style="display:block; margin:8px 0;">
                    <input type="checkbox" id="sunlightToggle" checked> 模拟阳光
                </label>
                <div style="margin:15px 0;">
                    <label style="display:block; margin:8px 0;">
                        室内灯强度: <span id="intensityValue">12</span>
                    </label>
                    <input type="range" id="intensitySlider" min="0" max="25" step="0.1" value="12" style="width:100%;">
                </div>
                <div style="margin:15px 0;">
                    <label style="display:block; margin:8px 0;">
                        阳光强度: <span id="sunlightValue">1.5</span>
                    </label>
                    <input type="range" id="sunlightSlider" min="0" max="5" step="0.1" value="1.5" style="width:100%;">
                </div>
                <div style="margin:15px 0; border-top:1px solid #666; padding-top:10px;">
                    <button id="playVideoBtn" style="padding:5px 10px; cursor:pointer;">播放视频</button>
                    <button id="pauseVideoBtn" style="padding:5px 10px; cursor:pointer; margin-left:10px;">暂停视频</button>
                </div>
                <div style="margin:15px 0; border-top:1px solid #666; padding-top:10px;">
                    <button id="resetViewBtn" style="padding:8px 15px; cursor:pointer; background:#4CAF50; color:white; border:none; border-radius:4px;">一键复位视角</button>
                </div>
            </div>
        `;
        document.body.appendChild(panel);

        const panelTitle = document.getElementById('panelTitle');
        const panelContent = document.getElementById('panelContent');
        panelTitle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (panelContent.style.display === 'none') {
                panelContent.style.display = 'block';
                panelTitle.textContent = '灯光控制 ▼';
            } else {
                panelContent.style.display = 'none';
                panelTitle.textContent = '控制面板 ▶';
            }
        });

        setTimeout(() => {
            const resetBtn = document.getElementById('resetViewBtn');
            if (resetBtn) {
                resetBtn.addEventListener('click', resetCameraView);
                
            } 
        }, 0);

        document.getElementById('ambientLightToggle').addEventListener('change', (e) => {
            if (lights) {
                lights.ambientLight.intensity = e.target.checked ? 0.3 : 0;
               
            }
        });
        
        document.getElementById('tubeLightToggle').addEventListener('change', (e) => {
            if (lights) {
                lights.tubeLights.children.forEach(light => {
                    if (light.isSpotLight) {
                        light.intensity = e.target.checked ? lights.lightStates.tubeIntensity : 0;
                    }
                });
               
            }
        });
        
        document.getElementById('sunlightToggle').addEventListener('change', (e) => {
            if (lights) {
                lights.sunlight.intensity = e.target.checked ? lights.lightStates.sunlightIntensity : 0;
                
            }
        });

        const intensitySlider = document.getElementById('intensitySlider');
        const intensityValue = document.getElementById('intensityValue');
        intensitySlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            intensityValue.textContent = value.toFixed(1);
            if (lights) {
                lights.lightStates.tubeIntensity = value;
                if (lights.lightStates.tube) {
                    lights.tubeLights.children.forEach(light => {
                        if (light.isSpotLight) {
                            light.intensity = value;
                        }
                    });
                }
                
            }
        });

        const sunlightSlider = document.getElementById('sunlightSlider');
        const sunlightValue = document.getElementById('sunlightValue');
        sunlightSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            sunlightValue.textContent = value.toFixed(1);
            if (lights) {
                lights.lightStates.sunlightIntensity = value;
                if (lights.lightStates.sunlight) {
                    lights.sunlight.intensity = value;
                }
                
            }
        });

        document.getElementById('playVideoBtn').addEventListener('click', () => {
            if (videoScreen.video) {
                videoScreen.video.play().then(() => {
                    console.log('[控制面板] 视频播放');
                }).catch(err => {
                   
                });
            } 
        });
        
        document.getElementById('pauseVideoBtn').addEventListener('click', () => {
            if (videoScreen.video) {
                videoScreen.video.pause();
                console.log('[控制面板] 视频暂停');
            } 
        });

        
    }

    // 创建天空盒
    function createSkybox(scene) {
        const textureLoader = new THREE.CubeTextureLoader();
        const skyboxTextures = textureLoader.load([
            'px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png'
        ], () => {
            
        }, (err) => {
           scene.background = new THREE.Color(0x87CEEB); 
        });
        skyboxTextures.encoding = THREE.sRGBEncoding;
        scene.background = skyboxTextures;
    }

    // 加载模型 - 椅子
    function loadChairModel() {
        const loader = new GLTFLoader();
        loader.load('chair.glb', (gltf) => {
            const chair = gltf.scene;
            chair.position.set(-20, -11, 15);
            chair.scale.set(-11, 11, -11);
            chair.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = child.receiveShadow = true;
                    if (child.material) {
                        child.material.roughness = 0.3;
                        child.material.metalness = 0.2;
                    }
                }
            });
            scene.add(chair);
            
        });
    }

    // 加载模型 - CEWall
    function loadCEWallModel() {
        const loader = new GLTFLoader();
        loader.load('cewall.glb', (gltf) => {
            const cewall = gltf.scene;
            cewall.position.set(25, -25, 15);
            cewall.scale.set(-11, 7.3, -11);
            cewall.traverse(child => {
                if (child.isMesh) child.castShadow = child.receiveShadow = true;
            });
            scene.add(cewall);
           
        });
    }

    // 加载模型 - 窗户
    function loadChuangkModel() {
        const loader = new GLTFLoader();
        loader.load('chuangk.glb', (gltf) => {
            const chuangk = gltf.scene;
            chuangk.position.set(25, -25, 15);
            chuangk.scale.set(-11, 7.3, -11);
            chuangk.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = child.receiveShadow = true;
                    const originalMaterial = child.material;
                    child.material = new THREE.MeshStandardMaterial({
                        color: 0xffffff,
                        metalness: 0.6,
                        roughness: 0.1,
                        map: originalMaterial.map || null,
                        normalMap: originalMaterial.normalMap || null,
                        transparent: originalMaterial.transparent || false,
                        opacity: originalMaterial.opacity || 1,
                        side: originalMaterial.side || THREE.FrontSide
                    });
                }
            });
            scene.add(chuangk);
           
        });
    }

    // 重构：白板2动画函数（线性平移到目标位置后停止）
    function animateBaiban2() {
        if (!baiban2 || !baiban2AnimationState.isMoving) return;

        const speed = 0.8; // 平移速度，可根据需要调整
        let targetX = baiban2AnimationState.isAtTarget 
            ? baiban2AnimationState.startX  // 反向：回到初始位置
            : baiban2AnimationState.targetX; // 正向：到目标位置

        // 计算当前位置到目标位置的差值
        const deltaX = targetX - baiban2.position.x;
        
        // 如果差值足够小（到达目标），停止动画
        if (Math.abs(deltaX) < 0.1) {
            baiban2.position.x = targetX; // 修正到精确位置
            baiban2AnimationState.isMoving = false;
            cancelAnimationFrame(baiban2AnimationState.animationId);
            return;
        }

        // 平滑移动（按速度比例）
        baiban2.position.x += deltaX > 0 ? speed : -speed;
        
        baiban2AnimationState.animationId = requestAnimationFrame(animateBaiban2);
    }

    // 重构：触发白板2平移（切换方向）
    function triggerBaiban2Move() {
        // 如果正在移动中，不响应（避免重复触发）
        if (baiban2AnimationState.isMoving) return;

        // 切换目标状态
        baiban2AnimationState.isAtTarget = !baiban2AnimationState.isAtTarget;
        // 启动动画
        baiban2AnimationState.isMoving = true;
        animateBaiban2();
    }

    // 加载模型 - 白板
    function loadBaibanModels() {
        const loader = new GLTFLoader();
        // 加载第一个白板
        loader.load('baiban.glb', (gltf) => {
            baiban1 = gltf.scene;
            baiban1.position.set(-20, -11, 15);
            baiban1.scale.set(-11, 11, -11);
            baiban1.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = child.receiveShadow = true;
                    child.userData.isBaiban = true;
                    child.userData.baibanId = 1;
                    const originalMaterial = child.material;
                    child.material = new THREE.MeshPhysicalMaterial({
                        color: 0xffffff,
                        metalness: 0.1,
                        roughness: 0.05,
                        clearcoat: 1.0,
                        clearcoatRoughness: 0.0,
                        map: originalMaterial.map || null,
                        normalMap: originalMaterial.normalMap || null,
                        transparent: originalMaterial.transparent || false,
                        opacity: originalMaterial.opacity || 1,
                        side: THREE.DoubleSide
                    });
                }
            });
            scene.add(baiban1);
            
        });

        // 加载第二个白板
        loader.load('baiban.glb', (gltf) => {
            baiban2 = gltf.scene;
            baiban2.position.set(-100, -11, 19);
            baiban2.scale.set(-11, 11, -11);
            baiban2.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = child.receiveShadow = true;
                    child.userData.isBaiban = true;
                    child.userData.baibanId = 2;
                    const originalMaterial = child.material;
                    child.material = new THREE.MeshPhysicalMaterial({
                        color: 0xffffff,
                        metalness: 0.1,
                        roughness: 0.05,
                        clearcoat: 1.0,
                        clearcoatRoughness: 0.0,
                        map: originalMaterial.map || null,
                        normalMap: originalMaterial.normalMap || null,
                        transparent: originalMaterial.transparent || false,
                        opacity: originalMaterial.opacity || 1,
                        side: THREE.DoubleSide
                    });
                }
            });

            // 初始化白板2动画参数
            baiban2AnimationState.startX = baiban2.position.x;
            baiban2AnimationState.targetX = baiban2AnimationState.startX + 80; 
            baiban2AnimationState.isMoving = false;
            baiban2AnimationState.isAtTarget = false; 

            scene.add(baiban2);
            
        });
    }

    // 加载模型 - 讲台
    function loadJiangtaiModel() {
        const loader = new GLTFLoader();
        loader.load('jiangtai.glb', (gltf) => {
            const jiangtai = gltf.scene;
            jiangtai.position.set(-20, -11, 15);
            jiangtai.scale.set(-11, 11, -11);
            jiangtai.traverse(child => {
                if (child.isMesh) child.castShadow = child.receiveShadow = true;
            });
            scene.add(jiangtai);
            
        });
    }

    // 加载模型 - 台阶
    function loadTaijieModel() {
        const loader = new GLTFLoader();
        const textureLoader = new THREE.TextureLoader();
        const dibanTexture = textureLoader.load('diban.jpg', () => {
           
        });
        dibanTexture.wrapS = dibanTexture.wrapT = THREE.RepeatWrapping;
        dibanTexture.repeat.set(5, 5);
        dibanTexture.encoding = THREE.sRGBEncoding;

        loader.load('taijie.glb', (gltf) => {
            const taijie = gltf.scene;
            taijie.position.set(-20, -11, 15);
            taijie.scale.set(-11, 11, -11);
            taijie.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = child.receiveShadow = true;
                    const originalMaterial = child.material;
                    child.material = new THREE.MeshStandardMaterial({
                        map: dibanTexture,
                        roughness: 0.8,
                        metalness: 0.1,
                        color: 0xffffff,
                        side: originalMaterial.side || THREE.FrontSide,
                        transparent: originalMaterial.transparent || false,
                        opacity: originalMaterial.opacity || 1
                    });
                }
            });
            scene.add(taijie);
          
        });
    }

    // 点击事件
    function onMouseClick(event) {
        console.log('[交互] 检测到鼠标点击');
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        // 检测是否点击了白板2
        if (baiban2) {
            const baiban2Intersects = raycaster.intersectObjects(baiban2.children, true);
            if (baiban2Intersects.length > 0 && baiban2Intersects[0].object.userData.isBaiban && baiban2Intersects[0].object.userData.baibanId === 2) {
                console.log('[交互] 点击了白板2，触发平移');
                triggerBaiban2Move(); // 触发平移
                return; 
            }
        }

        // 视频屏幕点击逻辑
        if (videoScreenGroup) {
            const screenIntersects = raycaster.intersectObjects(videoScreenGroup.children, true);
            if (screenIntersects.length > 0 && screenIntersects[0].object.userData.isVideoScreen && videoScreen.video) {
                if (videoScreen.video.paused) {
                    videoScreen.video.play().catch(err => console.error('[交互] 视频播放失败:', err));
                } else {
                    videoScreen.video.pause();
                }
                console.log('[交互] 点击视频屏幕，切换播放状态');
            }
        }
    }

    // 窗口自适应
    window.addEventListener('resize', () => {
        console.log('[窗口] 窗口大小变更，更新相机和渲染器');
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // 绑定点击事件到渲染画布
    renderer.domElement.addEventListener('click', onMouseClick);

    // 动画循环
    function animate() {
        animateRequestId = requestAnimationFrame(animate);
        controls.update(); // 更新控制器
        TWEEN.update(); // 更新TWEEN动画
    
        renderer.render(scene, camera);
    }

    // 清理动画循环
    window.addEventListener('beforeunload', () => {
        console.log('[页面] 页面即将卸载，清理动画循环');
        cancelAnimationFrame(animateRequestId);
        
        if (baiban2AnimationState.animationId) {
            cancelAnimationFrame(baiban2AnimationState.animationId);
        }
    });

    // 初始化所有组件
    console.log('[初始化] 开始初始化场景组件');
    const walls = createWalls();
    lights = createLights(); 
    const glassBox = createGlassBox();
    videoScreen = createVideoScreen();
    createLightControlPanel();

    loadChairModel();
    loadCEWallModel();
    loadChuangkModel();
    loadBaibanModels();
    loadJiangtaiModel();
    loadTaijieModel();
    
    
    console.log('[初始化] 启动核心动画循环');
    animate();
});