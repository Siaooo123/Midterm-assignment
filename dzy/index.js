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
});