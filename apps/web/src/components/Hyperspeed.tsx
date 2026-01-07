import { useEffect, useRef, FC } from 'react'
import * as THREE from 'three'
import {
  BloomEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
  SMAAEffect,
  SMAAPreset,
} from 'postprocessing'
import './Hyperspeed.css'

interface HyperspeedOptions {
  onSpeedUp?: (ev: MouseEvent | TouchEvent) => void
  onSlowDown?: (ev: MouseEvent | TouchEvent) => void
  distortion?: string | any
  length: number
  roadWidth: number
  islandWidth: number
  lanesPerRoad: number
  fov: number
  fovSpeedUp: number
  speedUp: number
  carLightsFade: number
  totalSideLightSticks: number
  lightPairsPerRoadWay: number
  shoulderLinesWidthPercentage: number
  brokenLinesWidthPercentage: number
  brokenLinesLengthPercentage: number
  lightStickWidth: [number, number]
  lightStickHeight: [number, number]
  movingAwaySpeed: [number, number]
  movingCloserSpeed: [number, number]
  carLightsLength: [number, number]
  carLightsRadius: [number, number]
  carWidthPercentage: [number, number]
  carShiftX: [number, number]
  carFloorSeparation: [number, number]
  colors: {
    roadColor: number
    islandColor: number
    background: number
    shoulderLines: number
    brokenLines: number
    leftCars: number[]
    rightCars: number[]
    sticks: number
  }
}

interface HyperspeedProps {
  effectOptions?: Partial<HyperspeedOptions>
}

const defaultOptions: HyperspeedOptions = {
  onSpeedUp: () => {},
  onSlowDown: () => {},
  distortion: 'turbulentDistortion',
  length: 400,
  roadWidth: 10,
  islandWidth: 2,
  lanesPerRoad: 4,
  fov: 90,
  fovSpeedUp: 150,
  speedUp: 2,
  carLightsFade: 0.4,
  totalSideLightSticks: 20,
  lightPairsPerRoadWay: 40,
  shoulderLinesWidthPercentage: 0.05,
  brokenLinesWidthPercentage: 0.1,
  brokenLinesLengthPercentage: 0.5,
  lightStickWidth: [0.12, 0.5],
  lightStickHeight: [1.3, 1.7],
  movingAwaySpeed: [60, 80],
  movingCloserSpeed: [-120, -160],
  carLightsLength: [400 * 0.03, 400 * 0.2],
  carLightsRadius: [0.05, 0.14],
  carWidthPercentage: [0.3, 0.5],
  carShiftX: [-0.8, 0.8],
  carFloorSeparation: [0, 5],
  colors: {
    roadColor: 0x080808,
    islandColor: 0x0a0a0a,
    background: 0x000000,
    shoulderLines: 0xffffff,
    brokenLines: 0xffffff,
    leftCars: [0xd856bf, 0x6750a2, 0xc247ac],
    rightCars: [0x03b3c3, 0x0e5ea5, 0x324555],
    sticks: 0x03b3c3,
  },
}

const Hyperspeed: FC<HyperspeedProps> = ({ effectOptions = {} }) => {
  const mergedOptions = { ...defaultOptions, ...effectOptions }
  const hyperspeed = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = hyperspeed.current
    if (!container) return

    // CLEANUP
    while (container.firstChild) {
      container.removeChild(container.firstChild)
    }

    // --- THREE.JS LOGIC START ---

    // Helper Functions
    function random(base: number | [number, number]): number {
      if (Array.isArray(base)) return Math.random() * (base[1] - base[0]) + base[0]
      return Math.random() * base
    }
    function pickRandom<T>(arr: T | T[]): T {
      if (Array.isArray(arr)) return arr[Math.floor(Math.random() * arr.length)]
      return arr
    }
    function lerp(current: number, target: number, speed = 0.1, limit = 0.001): number {
      let change = (target - current) * speed
      if (Math.abs(change) < limit) change = target - current
      return change
    }

    // Distortions
    const distortions: any = {
      turbulentDistortion: {
        uniforms: {
          uFreq: { value: new THREE.Vector4(4, 8, 8, 1) },
          uAmp: { value: new THREE.Vector4(25, 5, 10, 10) },
        },
        getDistortion: `
                uniform vec4 uFreq;
                uniform vec4 uAmp;
                float nsin(float val){ return sin(val) * 0.5 + 0.5; }
                #define PI 3.14159265358979
                float getDistortionX(float progress){ return (cos(PI * progress * uFreq.r + uTime) * uAmp.r + pow(cos(PI * progress * uFreq.g + uTime * (uFreq.g / uFreq.r)), 2. ) * uAmp.g); }
                float getDistortionY(float progress){ return (-nsin(PI * progress * uFreq.b + uTime) * uAmp.b + -pow(nsin(PI * progress * uFreq.a + uTime / (uFreq.b / uFreq.a)), 5.) * uAmp.a); }
                vec3 getDistortion(float progress){ return vec3(getDistortionX(progress) - getDistortionX(0.0125), getDistortionY(progress) - getDistortionY(0.0125), 0.); }
            `,
        getJS: (progress: number, time: number) => {
          const uFreq = new THREE.Vector4(4, 8, 8, 1)
          const uAmp = new THREE.Vector4(25, 5, 10, 10)
          const getX = (p: number) =>
            Math.cos(Math.PI * p * uFreq.x + time) * uAmp.x +
            Math.pow(Math.cos(Math.PI * p * uFreq.y + time * (uFreq.y / uFreq.x)), 2) * uAmp.y
          const getY = (p: number) =>
            -(Math.sin(Math.PI * p * uFreq.z + time) * 0.5 + 0.5) * uAmp.z -
            Math.pow(
              Math.sin(Math.PI * p * uFreq.w + time / (uFreq.z / uFreq.w)) * 0.5 + 0.5,
              5,
            ) *
              uAmp.w
          return new THREE.Vector3(getX(progress) - getX(progress + 0.007), getY(progress) - getY(progress + 0.007), 0)
            .multiply(new THREE.Vector3(-2, -5, 0))
            .add(new THREE.Vector3(0, 0, -10))
        },
      },
    }

    // Shaders - FIXED FORMATTING
    const roadBaseFragment = `
        #define USE_FOG
        varying vec2 vUv; 
        uniform vec3 uColor;
        uniform float uTime;
        #include <roadMarkings_vars>
        ${THREE.ShaderChunk['fog_pars_fragment']}
        void main() {
            vec2 uv = vUv;
            vec3 color = vec3(uColor);
            #include <roadMarkings_fragment>
            gl_FragColor = vec4(color, 1.);
            ${THREE.ShaderChunk['fog_fragment']}
        }
    `
    const roadMarkings_vars = `
        uniform float uLanes;
        uniform vec3 uBrokenLinesColor;
        uniform vec3 uShoulderLinesColor;
        uniform float uShoulderLinesWidthPercentage;
        uniform float uBrokenLinesWidthPercentage;
        uniform float uBrokenLinesLengthPercentage;
        highp float random(vec2 co) {
            highp float a = 12.9898;
            highp float b = 78.233;
            highp float c = 43758.5453;
            highp float dt = dot(co.xy, vec2(a, b));
            highp float sn = mod(dt, 3.14);
            return fract(sin(sn) * c);
        }
    `
    const roadMarkings_fragment = `
        uv.y = mod(uv.y + uTime * 0.05, 1.);
        float laneWidth = 1.0 / uLanes;
        float brokenLineWidth = laneWidth * uBrokenLinesWidthPercentage;
        float laneEmptySpace = 1. - uBrokenLinesLengthPercentage;
        float brokenLines = step(1.0 - brokenLineWidth, fract(uv.x * 2.0)) * step(laneEmptySpace, fract(uv.y * 10.0));
        float sideLines = step(1.0 - brokenLineWidth, fract((uv.x - laneWidth * (uLanes - 1.0)) * 2.0)) + step(brokenLineWidth, uv.x);
        brokenLines = mix(brokenLines, sideLines, uv.x);
    `
    const roadFragment = roadBaseFragment
      .replace('#include <roadMarkings_fragment>', roadMarkings_fragment)
      .replace('#include <roadMarkings_vars>', roadMarkings_vars)
    const islandFragment = roadBaseFragment
      .replace('#include <roadMarkings_fragment>', '')
      .replace('#include <roadMarkings_vars>', '')
    const roadVertex = `
        #define USE_FOG
        uniform float uTime;
        ${THREE.ShaderChunk['fog_pars_vertex']}
        uniform float uTravelLength;
        varying vec2 vUv; 
        #include <getDistortion_vertex>
        void main() {
            vec3 transformed = position.xyz;
            vec3 distortion = getDistortion((transformed.y + uTravelLength / 2.) / uTravelLength);
            transformed.x += distortion.x;
            transformed.z += distortion.y;
            transformed.y += -1. * distortion.z;
            vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.);
            gl_Position = projectionMatrix * mvPosition;
            vUv = uv;
            ${THREE.ShaderChunk['fog_vertex']}
        }
    `
    const carLightsFragment = `
        #define USE_FOG
        ${THREE.ShaderChunk['fog_pars_fragment']}
        varying vec3 vColor;
        varying vec2 vUv;
        uniform vec2 uFade;
        void main() {
            vec3 color = vec3(vColor);
            float alpha = smoothstep(uFade.x, uFade.y, vUv.x);
            gl_FragColor = vec4(color, alpha);
            if (gl_FragColor.a < 0.0001) discard;
            ${THREE.ShaderChunk['fog_fragment']}
        }
    `
    const carLightsVertex = `
        #define USE_FOG
        ${THREE.ShaderChunk['fog_pars_vertex']}
        attribute vec3 aOffset;
        attribute vec3 aMetrics;
        attribute vec3 aColor;
        uniform float uTravelLength;
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vColor; 
        #include <getDistortion_vertex>
        void main() {
            vec3 transformed = position.xyz;
            float radius = aMetrics.r;
            float myLength = aMetrics.g;
            float speed = aMetrics.b;
            transformed.xy *= radius;
            transformed.z *= myLength;
            transformed.z += myLength - mod(uTime * speed + aOffset.z, uTravelLength);
            transformed.xy += aOffset.xy;
            float progress = abs(transformed.z / uTravelLength);
            transformed.xyz += getDistortion(progress);
            vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.);
            gl_Position = projectionMatrix * mvPosition;
            vUv = uv;
            vColor = aColor;
            ${THREE.ShaderChunk['fog_vertex']}
        }
    `
    const sideSticksVertex = `
        #define USE_FOG
        ${THREE.ShaderChunk['fog_pars_vertex']}
        attribute float aOffset;
        attribute vec3 aColor;
        attribute vec2 aMetrics;
        uniform float uTravelLength;
        uniform float uTime;
        varying vec3 vColor;
        mat4 rotationY( in float angle ) {
            return mat4(cos(angle), 0, sin(angle), 0, 0, 1.0, 0, 0, -sin(angle), 0, cos(angle), 0, 0, 0, 0, 1);
        }
        #include <getDistortion_vertex>
        void main(){
            vec3 transformed = position.xyz;
            float width = aMetrics.x;
            float height = aMetrics.y;
            transformed.xy *= vec2(width, height);
            float time = mod(uTime * 60. * 2. + aOffset, uTravelLength);
            transformed = (rotationY(3.14/2.) * vec4(transformed,1.)).xyz;
            transformed.z += - uTravelLength + time;
            float progress = abs(transformed.z / uTravelLength);
            transformed.xyz += getDistortion(progress);
            transformed.y += height / 2.;
            transformed.x += -width / 2.;
            vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.);
            gl_Position = projectionMatrix * mvPosition;
            vColor = aColor;
            ${THREE.ShaderChunk['fog_vertex']}
        }
    `
    const sideSticksFragment = `
        #define USE_FOG
        ${THREE.ShaderChunk['fog_pars_fragment']}
        varying vec3 vColor;
        void main(){
            vec3 color = vec3(vColor);
            gl_FragColor = vec4(color,1.);
            ${THREE.ShaderChunk['fog_fragment']}
        }
    `

    // APP CLASS
    class App {
      container: HTMLElement
      options: HyperspeedOptions
      renderer: THREE.WebGLRenderer
      composer: EffectComposer
      camera: THREE.PerspectiveCamera
      scene: THREE.Scene
      clock: THREE.Clock
      road: any
      leftCarLights: any
      rightCarLights: any
      leftSticks: any
      fogUniforms: any
      speedUp = 0
      timeOffset = 0
      fovTarget: number
      speedUpTarget = 0
      constructor(container: HTMLElement, options: HyperspeedOptions) {
        this.container = container
        this.options = options
        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
        this.renderer.setSize(container.offsetWidth, container.offsetHeight, false)
        this.renderer.setPixelRatio(window.devicePixelRatio)
        this.composer = new EffectComposer(this.renderer)
        container.appendChild(this.renderer.domElement)
        this.camera = new THREE.PerspectiveCamera(
          options.fov,
          container.offsetWidth / container.offsetHeight,
          0.1,
          10000,
        )
        this.camera.position.set(0, 8, -5)
        this.scene = new THREE.Scene()
        const fog = new THREE.Fog(options.colors.background, options.length * 0.2, options.length * 500)
        this.scene.fog = fog
        this.fogUniforms = {
          fogColor: { value: fog.color },
          fogNear: { value: fog.near },
          fogFar: { value: fog.far },
        }
        this.clock = new THREE.Clock()

        // Initialization
        this.initPasses()
        this.road = new Road(this, options)
        this.road.init()
        this.leftCarLights = new CarLights(
          this,
          options,
          options.colors.leftCars,
          options.movingAwaySpeed,
          new THREE.Vector2(0, 1 - options.carLightsFade),
        )
        this.leftCarLights.init()
        this.leftCarLights.mesh.position.setX(-options.roadWidth / 2 - options.islandWidth / 2)
        this.rightCarLights = new CarLights(
          this,
          options,
          options.colors.rightCars,
          options.movingCloserSpeed,
          new THREE.Vector2(1, 0 + options.carLightsFade),
        )
        this.rightCarLights.init()
        this.rightCarLights.mesh.position.setX(options.roadWidth / 2 + options.islandWidth / 2)
        this.leftSticks = new LightsSticks(this, options)
        this.leftSticks.init()
        this.leftSticks.mesh.position.setX(-(options.roadWidth + options.islandWidth / 2))
        this.fovTarget = options.fov

        // Listeners
        window.addEventListener('resize', this.onResize.bind(this))
        container.addEventListener('mousedown', () => {
          this.fovTarget = options.fovSpeedUp
          this.speedUpTarget = options.speedUp
        })
        container.addEventListener('mouseup', () => {
          this.fovTarget = options.fov
          this.speedUpTarget = 0
        })
        this.tick()
      }
      initPasses() {
        const renderPass = new RenderPass(this.scene, this.camera)
        const bloomPass = new EffectPass(
          this.camera,
          new BloomEffect({ luminanceThreshold: 0.2, resolutionScale: 1 }),
        )
        const smaaPass = new EffectPass(this.camera, new SMAAEffect({ preset: SMAAPreset.MEDIUM }))
        renderPass.renderToScreen = false
        bloomPass.renderToScreen = false
        smaaPass.renderToScreen = true
        this.composer.addPass(renderPass)
        this.composer.addPass(bloomPass)
        this.composer.addPass(smaaPass)
      }
      onResize() {
        const width = this.container.offsetWidth
        const height = this.container.offsetHeight
        this.renderer.setSize(width, height)
        this.camera.aspect = width / height
        this.camera.updateProjectionMatrix()
        this.composer.setSize(width, height)
      }
      update(delta: number) {
        const lerpPercentage = Math.exp(-(-60 * Math.log2(1 - 0.1)) * delta)
        this.speedUp += lerp(this.speedUp, this.speedUpTarget, lerpPercentage, 0.00001)
        this.timeOffset += this.speedUp * delta
        const time = this.clock.elapsedTime + this.timeOffset
        this.rightCarLights.update(time)
        this.leftCarLights.update(time)
        this.leftSticks.update(time)
        this.road.update(time)
        const fovChange = lerp(this.camera.fov, this.fovTarget, lerpPercentage)
        if (fovChange !== 0) {
          this.camera.fov += fovChange * delta * 6
          this.camera.updateProjectionMatrix()
        }

        // Distortion lookAt
        const distortion = distortions[this.options.distortion as string].getJS(0.025, time)
        this.camera.lookAt(
          new THREE.Vector3(
            this.camera.position.x + distortion.x,
            this.camera.position.y + distortion.y,
            this.camera.position.z + distortion.z,
          ),
        )
        this.camera.updateProjectionMatrix()
      }
      tick() {
        const delta = this.clock.getDelta()
        this.composer.render(delta)
        this.update(delta)
        requestAnimationFrame(this.tick.bind(this))
      }
    }

    // SUBCLASSES (Road, CarLights, LightsSticks)
    class Road {
      webgl: App
      options: HyperspeedOptions
      uTime = { value: 0 }
      constructor(webgl: App, options: HyperspeedOptions) {
        this.webgl = webgl
        this.options = options
      }
      createPlane(side: number, width: number, isRoad: boolean) {
        const geometry = new THREE.PlaneGeometry(
          isRoad ? this.options.roadWidth : this.options.islandWidth,
          this.options.length,
          20,
          100,
        )
        const material = new THREE.ShaderMaterial({
          fragmentShader: isRoad ? roadFragment : islandFragment,
          vertexShader: roadVertex,
          side: THREE.DoubleSide,
          uniforms: Object.assign(
            {
              uTravelLength: { value: this.options.length },
              uColor: {
                value: new THREE.Color(
                  isRoad ? this.options.colors.roadColor : this.options.colors.islandColor,
                ),
              },
              uTime: this.uTime,
              uLanes: { value: this.options.lanesPerRoad },
              uBrokenLinesColor: { value: new THREE.Color(this.options.colors.brokenLines) },
              uShoulderLinesColor: { value: new THREE.Color(this.options.colors.shoulderLines) },
              uShoulderLinesWidthPercentage: { value: this.options.shoulderLinesWidthPercentage },
              uBrokenLinesWidthPercentage: { value: this.options.brokenLinesWidthPercentage },
              uBrokenLinesLengthPercentage: { value: this.options.brokenLinesLengthPercentage },
            },
            this.webgl.fogUniforms,
            distortions.turbulentDistortion.uniforms,
          ),
        })
        material.onBeforeCompile = (shader) => {
          shader.vertexShader = shader.vertexShader.replace(
            '#include <getDistortion_vertex>',
            distortions.turbulentDistortion.getDistortion,
          )
        }
        const mesh = new THREE.Mesh(geometry, material)
        mesh.rotation.x = -Math.PI / 2
        mesh.position.z = -this.options.length / 2
        mesh.position.x +=
          (this.options.islandWidth / 2 + this.options.roadWidth / 2) * side
        this.webgl.scene.add(mesh)
      }
      init() {
        this.createPlane(-1, this.options.roadWidth, true)
        this.createPlane(1, this.options.roadWidth, true)
        this.createPlane(0, this.options.islandWidth, false)
      }
      update(time: number) {
        this.uTime.value = time
      }
    }
    class CarLights {
      webgl: App
      options: HyperspeedOptions
      colors: any
      speed: any
      fade: any
      mesh: any
      constructor(webgl: App, options: HyperspeedOptions, colors: any, speed: any, fade: any) {
        this.webgl = webgl
        this.options = options
        this.colors = colors
        this.speed = speed
        this.fade = fade
      }
      init() {
        const geometry = new THREE.TubeGeometry(
          new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)),
          40,
          1,
          8,
          false,
        )
        const instanced = new THREE.InstancedBufferGeometry().copy(geometry as any) as THREE.InstancedBufferGeometry
        instanced.instanceCount = this.options.lightPairsPerRoadWay * 2
        const aOffset: number[] = []
        const aMetrics: number[] = []
        const aColor: number[] = []
        const colors = Array.isArray(this.colors)
          ? this.colors.map((c: any) => new THREE.Color(c))
          : [new THREE.Color(this.colors)]
        for (let i = 0; i < this.options.lightPairsPerRoadWay; i++) {
          const laneWidth = this.options.roadWidth / this.options.lanesPerRoad
          const carLane = i % this.options.lanesPerRoad
          let laneX = carLane * laneWidth - this.options.roadWidth / 2 + laneWidth / 2
          laneX += random(this.options.carShiftX) * laneWidth
          const offsetY =
            random(this.options.carFloorSeparation) + random(this.options.carLightsRadius) * 1.3
          const offsetZ = -random(this.options.length)
          const carWidth = random(this.options.carWidthPercentage) * laneWidth
          const radius = random(this.options.carLightsRadius)
          const length = random(this.options.carLightsLength)
          const speed = random(this.speed)
          const color = pickRandom(colors)
          aOffset.push(laneX - carWidth / 2, offsetY, offsetZ, laneX + carWidth / 2, offsetY, offsetZ)
          aMetrics.push(radius, length, speed, radius, length, speed)
          aColor.push(color.r, color.g, color.b, color.r, color.g, color.b)
        }
        instanced.setAttribute(
          'aOffset',
          new THREE.InstancedBufferAttribute(new Float32Array(aOffset), 3, false),
        )
        instanced.setAttribute(
          'aMetrics',
          new THREE.InstancedBufferAttribute(new Float32Array(aMetrics), 3, false),
        )
        instanced.setAttribute(
          'aColor',
          new THREE.InstancedBufferAttribute(new Float32Array(aColor), 3, false),
        )
        const material = new THREE.ShaderMaterial({
          fragmentShader: carLightsFragment,
          vertexShader: carLightsVertex,
          transparent: true,
          uniforms: Object.assign(
            {
              uTime: { value: 0 },
              uTravelLength: { value: this.options.length },
              uFade: { value: this.fade },
            },
            this.webgl.fogUniforms,
            distortions.turbulentDistortion.uniforms,
          ),
        })
        material.onBeforeCompile = (shader) => {
          shader.vertexShader = shader.vertexShader.replace(
            '#include <getDistortion_vertex>',
            distortions.turbulentDistortion.getDistortion,
          )
        }
        const mesh = new THREE.Mesh(instanced, material)
        mesh.frustumCulled = false
        this.webgl.scene.add(mesh)
        this.mesh = mesh
      }
      update(time: number) {
        this.mesh.material.uniforms.uTime.value = time
      }
    }
    class LightsSticks {
      webgl: App
      options: HyperspeedOptions
      mesh: any
      constructor(webgl: App, options: HyperspeedOptions) {
        this.webgl = webgl
        this.options = options
      }
      init() {
        const geometry = new THREE.PlaneGeometry(1, 1)
        const instanced = new THREE.InstancedBufferGeometry().copy(geometry as any) as THREE.InstancedBufferGeometry
        instanced.instanceCount = this.options.totalSideLightSticks
        const aOffset: number[] = []
        const aColor: number[] = []
        const aMetrics: number[] = []
        const colors = Array.isArray(this.options.colors.sticks)
          ? this.options.colors.sticks.map((c: any) => new THREE.Color(c))
          : [new THREE.Color(this.options.colors.sticks)]
        for (let i = 0; i < this.options.totalSideLightSticks; i++) {
          const width = random(this.options.lightStickWidth)
          const height = random(this.options.lightStickHeight)
          aOffset.push(
            (i - 1) * (this.options.length / (this.options.totalSideLightSticks - 1)) * 2 +
              (this.options.length / (this.options.totalSideLightSticks - 1)) * Math.random(),
          )
          const color = pickRandom(colors)
          aColor.push(color.r, color.g, color.b)
          aMetrics.push(width, height)
        }
        instanced.setAttribute(
          'aOffset',
          new THREE.InstancedBufferAttribute(new Float32Array(aOffset), 1, false),
        )
        instanced.setAttribute(
          'aColor',
          new THREE.InstancedBufferAttribute(new Float32Array(aColor), 3, false),
        )
        instanced.setAttribute(
          'aMetrics',
          new THREE.InstancedBufferAttribute(new Float32Array(aMetrics), 2, false),
        )
        const material = new THREE.ShaderMaterial({
          fragmentShader: sideSticksFragment,
          vertexShader: sideSticksVertex,
          side: THREE.DoubleSide,
          uniforms: Object.assign(
            { uTravelLength: { value: this.options.length }, uTime: { value: 0 } },
            this.webgl.fogUniforms,
            distortions.turbulentDistortion.uniforms,
          ),
        })
        material.onBeforeCompile = (shader) => {
          shader.vertexShader = shader.vertexShader.replace(
            '#include <getDistortion_vertex>',
            distortions.turbulentDistortion.getDistortion,
          )
        }
        const mesh = new THREE.Mesh(instanced, material)
        mesh.frustumCulled = false
        this.webgl.scene.add(mesh)
        this.mesh = mesh
      }
      update(time: number) {
        this.mesh.material.uniforms.uTime.value = time
      }
    }

    // MAIN INIT
    const myApp = new App(container, mergedOptions)
    return () => {
      // Simple Cleanup
      while (container.firstChild) container.removeChild(container.firstChild)
    }
  }, [mergedOptions])

  return <div id="lights" ref={hyperspeed}></div>
}

export default Hyperspeed
