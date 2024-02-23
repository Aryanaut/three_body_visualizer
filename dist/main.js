import { OrbitControls } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/OrbitControls.js';
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

	}

	updateMeshPositionTrail = function () {

		this.vertices.push(this.sphere.position.clone());
	}

	movement() {
		this.vel.add(this.acceleration);
		this.pos.add(this.vel);
		this.acceleration.multiplyScalar(0);

		this.sphere.position.copy(this.pos);
	}
}

class Engine {
	constructor(body_list, scene) {

		this.render_bodies = new THREE.Group();

		for (let i = 0; i < body_list.length; i++) {
			this.render_bodies.add( body_list[i].sphere );
		}
		scene.add(this.render_bodies);

		this.bodies = body_list;

		this.collision = false;

		this.INTERVAL = 0.0001;

		this.CONST_G = 6.67e-11;

		this.scene = scene;

		this.freeze = false;
		this.frozen_positions = [];

		this.out_of_bounds = false;

		const size = 500;
		const divisions = 50;
		this.gridHelper = new THREE.GridHelper( size, divisions );
		scene.add( this.gridHelper );
		this.gridHelper.visible = false;
		// console.log(bodies);

		this.trail = new THREE.BufferGeometry();

		this.reset_engine = function() {

			for (let i = 0; i < this.bodies.length; i++) {
				var s = this.bodies[i];
				s.pos = gen_random_vector3(-100, 100);
				s.vel = gen_random_vector3(-0.1, 0.1);
				s.acceleration.multiplyScalar(0);
			}

			this.freeze = false;
			this.collision = false;
			this.out_of_bounds = false;
		}

		this.freeze_sim = function() {
			this.freeze = !this.freeze;
			for ( let i = 0; i < this.bodies.length; i++ ) {
				this.frozen_positions.push(this.bodies[i].pos);
			}
		}
	}

	calculate_collisions(s1, s2) {
		var collision_distance = s1.r + s2.r;
		if (s1.pos.distanceTo(s2.pos) <= collision_distance)
			this.collision = true;
	}

	check_out_of_bounds() {
		for (let i = 0; i < this.bodies.length; i++) {
			var pos = this.bodies[i].pos;
			if ( pos.distanceTo(new THREE.Vector3(0, 0, 0)) > 800 )
				this.out_of_bounds = true;
		}
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
					this.check_out_of_bounds();

					var rel_pos_vector = new THREE.Vector3().subVectors(p_pos, s_pos);
					var d = rel_pos_vector.length();
					d = apply_scaling(d, 10e6)

					rel_pos_vector = rel_pos_vector.normalize();
					var strength = -1 * (this.CONST_G * p.m * s.m) / (d * d);
					var force = rel_pos_vector.multiplyScalar(strength);

					if (this.collision) {
						force.multiplyScalar(0);
						this.reset_engine;
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

function getRandomStarField(numberOfStars, width, height) {
    var canvas = document.createElement('CANVAS');

	canvas.width = width;
	canvas.height = height;

	var ctx = canvas.getContext('2d');

	ctx.fillStyle="black";
	ctx.fillRect(0, 0, width, height);

	for (var i = 0; i < numberOfStars; ++i) {
		var radius = Math.random() * 2;
		var x = Math.floor(Math.random() * width);
		var y = Math.floor(Math.random() * height);

		ctx.beginPath();
		ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
		ctx.fillStyle = 'white';
		ctx.fill();
	}

	var texture = new THREE.Texture(canvas);
	texture.needsUpdate = true;
	return texture;
};

var skyBox = new THREE.SphereGeometry(800, 50, 50);
var skyBoxMaterial = new THREE.MeshBasicMaterial({
    map: getRandomStarField(600, 2048, 2048),
	side: THREE.BackSide
});
var sky = new THREE.Mesh(skyBox, skyBoxMaterial);
scene.add(sky);

// GUI 

const gui = new dat.GUI();
var env = gui.addFolder('engine');
env.open();
env.add(engine, 'INTERVAL', 0, 0.001, 0.0001).name("Interval")
var grid_checkbox = env.add(engine.gridHelper, 'visible').name('Show Grid')
var sky_checkbox = env.add(sky, 'visible').name('Show Starfield')

env.add(engine, 'freeze_sim').name("Freeze Simulation")
env.add(engine, 'reset_engine').name("Randomize Positions");

function animate() {

	requestAnimationFrame( animate );
	var force_list = engine.calculate_force_vectors();

	if ( !engine.freeze ) {
		for (let i = 0; i < bodies.length; i++) {
			var s = bodies[i];
			var f = force_list[i];
			f.divideScalar(s.m);
			s.acceleration.add(f);
			s.acceleration.multiplyScalar(engine.INTERVAL) 
			s.INTERVAL = INTERVAL;
			// console.log(i, f, engine.collision)
			s.movement();
		}

		if ( engine.out_of_bounds )
			engine.reset_engine();

	} else {
		
		for (let i = 0; i < bodies.length; i++) {
			var s = bodies[i];
			s.pos = engine.frozen_positions[i];
		}
	}

	// required if controls.enableDamping or controls.autoRotate are set to true
	controls.update();
	renderer.render( scene, camera );

}	
animate()