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
});