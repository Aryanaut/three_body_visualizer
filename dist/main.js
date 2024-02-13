import { OrbitControls } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/OrbitControls.js';
import * as dat from './dat.gui';
import * as THREE from 'https://cdn.skypack.dev/pin/three@v0.132.2-dLPTyDAYt6rc6aB18fLm/mode=imports/optimized/three.js';

const scene = new THREE.Scene();
var INTERVAL = 0.0001;

class Star {
	constructor(pos, vel, r, m, scene) {

		this.scale_f = 10e6; // scale of 1:10^6 meters

		// values for calculations
		this.vel = vel;
		this.m = m;

		this.acceleration = new THREE.Vector3(0.0, 0.0, 0.0);

		// values for geometry
		this.pos = pos;
		this.r = r;
		const geo = new THREE.SphereGeometry(this.r, 50, 50);
		const material = new THREE.MeshBasicMaterial({
				color:0xffffff
		})
		const sphere = new THREE.Mesh(geo,material);
		this.sphere = sphere;
		this.sphere.position.set(this.pos.x, this.pos.y, this.pos.z);
		scene.add(sphere);

		// orbit trails
		this.vertices = []; // path of movement
		this.trail_length = 300;
		this.trail_geo = new THREE.BufferGeometry()
		this.trail_geo.setAttribute( 'position', new THREE.BufferAttribute( this.trail_length, 3 ) );
		this.trail_geo.attributes.position.needsUpdate = true;
		this.trail_geo.setDrawRange( 0, 2 );


		this.line = new THREE.Line( geo, material );
		// scene.add(this.line);

		this.drawTrail = true;
	}

	draw_trails() {

		if (!this.drawTrail) {
			this.drawTrail = true;
			scene.add(this.line);
		}

		else if (this.drawTrail) {
			scene.remove(this.line);
			var newLineGeo = new THREE.BufferGeometry();
			newLineGeo.vertices = this.vertices.slice();
			// newLineGeo.geometry.setAttribute('position', true);
			
			while (newLineGeo.length > this.trail_length) {
				newLineGeo.vertices.shift();
			}

			this.line = new THREE.Line(newLineGeo, this.line.material);
			scene.add(this.line);
		}
	}

	updateMeshPositionTrail = function () {

		this.vertices.push(this.sphere.position.clone());
	}

	movement() {
		this.vel.add(this.acceleration);
		this.pos.add(this.vel);
		this.acceleration.multiplyScalar(0);

		this.sphere.position.copy(this.pos);
		this.vertices.push(this.pos.clone());

		if (this.drawTrail) this.draw_trails();
		
	}
}

class Engine {
	constructor(body_list, scene) {

		this.body_positions = [[]]
		this.render_bodies = new THREE.Group();

		for (let i = 0; i < body_list.length; i++) {
			this.render_bodies.add( body_list[i].sphere );
		}
		scene.add(this.render_bodies);

		this.bodies = body_list;

		this.collision = false;

		this.INTERVAL = 0.0001;

		this.CONST_G = 6.67e-11;
		// console.log(bodies);
	}

	calculate_collisions(s1, s2) {
		var collision_distance = s1.r + s2.r;
		if (s1.pos.distanceTo(s2.pos) <= collision_distance)
			this.collision = true;
	}

	calculate_force_vectors() {
		var force_list = [];

		for (let i = 0; i < this.bodies.length; i++) {

			var force = new THREE.Vector3(0, 0, 0);

			for (let j = 0; j < this.bodies.length; j++) {

				if (this.bodies[j] != this.bodies[i]) {

					var p = this.bodies[i];
					var s = this.bodies[j];

					let p_pos = new THREE.Vector3(p.pos.x, p.pos.y, p.pos.z);
					let s_pos = new THREE.Vector3(s.pos.x, s.pos.y, s.pos.z);

					this.calculate_collisions(p, s);

					var rel_pos_vector = new THREE.Vector3().subVectors(p_pos, s_pos);
					var d = rel_pos_vector.length();
					d = apply_scaling(d, 10e6)

					rel_pos_vector = rel_pos_vector.normalize();
					var strength = -1 * (this.CONST_G * p.m * s.m) / (d * d);
					var force = rel_pos_vector.multiplyScalar(strength);

					if (this.collision) {
						force.multiplyScalar(0);
						this.collision = false;
					}

				}
			}

			force_list.push(force);
		}

		return force_list;
	}

}

function apply_scaling(input, scale) {
	return input * scale;
}

function gen_random_vector3(low, high) {
	return new THREE.Vector3(
		THREE.MathUtils.randFloat(low, high),
		THREE.MathUtils.randFloat(low, high),
		THREE.MathUtils.randFloat(low, high)
	);
}

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

//scene.background = new THREE.Color(0xD3E8F0);

const camera = new THREE.PerspectiveCamera( 46, window.innerWidth / window.innerHeight, 0.1, 10 ** 10);

const controls = new OrbitControls( camera, renderer.domElement );

//controls.update() must be called after any manual changes to the camera's transform
camera.position.set( 500, 500, 500 );
camera.lookAt(0, 0, 0);	
controls.update();

//initialising stars
var bodies = [];
for (let i = 0; i < 3; i++) {
	bodies.push( 
		new Star(gen_random_vector3(-100, 100), gen_random_vector3(-0.1, 0.1), 3, 6e29, scene)
	);
}

const engine = new Engine(bodies, scene);

// GUI 

const gui = new dat.GUI();
var env = gui.addFolder('engine');
env.open();
env.add(engine, 'INTERVAL', 0, 0.001, 0.0001).name("Interval")

// GridHelper 

const size = 500;
const divisions = 50;

const gridHelper = new THREE.GridHelper( size, divisions );
scene.add( gridHelper );

console.log(scene.children);

function animate() {

	requestAnimationFrame( animate );
	var force_list = engine.calculate_force_vectors();

	for (let i = 0; i < bodies.length; i++) {
		var s = bodies[i];
		var f = force_list[i];
		f.divideScalar(s.m);
		s.acceleration.add(f);
		s.acceleration.multiplyScalar(engine.INTERVAL)
		s.INTERVAL = INTERVAL;
		console.log(i, f, engine.collision)
		// console.log(s.f)
		s.movement();
	}

	// required if controls.enableDamping or controls.autoRotate are set to true
	controls.update();
	renderer.render( scene, camera );

}	
animate()