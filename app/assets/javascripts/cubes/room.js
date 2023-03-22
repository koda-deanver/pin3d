var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
var orbitControls = new THREE.OrbitControls(camera);
var renderer = new THREE.WebGLRenderer();
var cube = null;

setView(renderer);
loadGrid(scene);
loadCube(scene);
setupLights(scene);
// camera.position.set(0,5,0);
camera.position.set(0,0,0);
orbitControls.update();
renderer.render( scene, camera );

animate();

function setView(renderer) {
  // renderer.setSize(window.innerWidth, window.innerHeight);
  var width = 1400;
  var height = (width * window.innerHeight) / window.innerWidth;
  renderer.setSize(width, height);
  renderer.setClearColor(0xffffff, 1);
  document.body.appendChild(renderer.domElement);
}
function loadGrid(scene) {
  var size = 10;
  var divisions = 10;

  var gridHelper = new THREE.GridHelper(size, divisions);
  gridHelper.position.set(0.5,-0.5,0.5);
  gridHelper.colorGrid = 0xff0000;

  // plane to color the grid
  var planeGeometry = new THREE.PlaneGeometry(10,10);
  planeGeometry.rotateX(-1.57);
  var material = new THREE.MeshBasicMaterial( {color: 0xefefef });
  var plane = new THREE.Mesh(planeGeometry, material);
  plane.position.set(0.5,-0.51,0.5);
  plane.receiveShadow = true;

  // scene.add(gridHelper);
  // scene.add(plane);
}
function loadCube(scene) {
  var geometry = new THREE.BoxGeometry(1,1,1);
  var color = new THREE.Color();

  var materials = [];
  for(k=0;k<6;k++){
    materials.push(
      // new THREE.MeshToonMaterial( { color: color.setHSL(Math.random(), 0.25 + Math.random()%0.75, 0.25 + Math.random()%0.75), specular: 0xf0ffffff, transparent: true, side: THREE.BackSide } )
      new THREE.MeshToonMaterial( { color: color.setHSL(Math.random(), 0.25 + Math.random()%0.75, 0.25 + Math.random()%0.75), specular: 0x000000, transparent: true, side: THREE.BackSide } )
    );
  }

  cube = new THREE.Mesh( geometry, materials );
  cube.castShadow = true;
  cube.receiveShadow = true;

  scene.add(cube);
}
function setupLights(scene) {
  var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
  directionalLight.position.set(0,100,0);
  directionalLight.castShadow = true;
  scene.add( directionalLight );
}
function animate() {
  requestAnimationFrame( animate );
  // renderer.render( scene, camera );
  render();
}
function render() {
  renderer.render( scene, camera );
}
document.cookie = "ugenie_settings_member_type=open; ugenie_settings_tags=open;";

var isDragging = false;
var previousMousePosition = {
    x: 0,
    y: 0
};
$(renderer.domElement).on('mousedown', function(e) {
  isDragging = true;
}).on('mousemove', function(e) {
    //console.log(e);
    var deltaMove = {
        x: e.offsetX-previousMousePosition.x,
        y: e.offsetY-previousMousePosition.y
    };

    if(isDragging) {
            
        var deltaRotationQuaternion = new THREE.Quaternion()
            .setFromEuler(new THREE.Euler(
                toRadians(deltaMove.y * -1),
                toRadians(deltaMove.x * -1),
                0,
                'XYZ'
            ));
        
        cube.quaternion.multiplyQuaternions(deltaRotationQuaternion, cube.quaternion);
    }
    
    previousMousePosition = {
        x: e.offsetX,
        y: e.offsetY
    };
});
$(document).on('mouseup', function(e) {
  isDragging = false;
});
function toRadians(angle) {
  return angle * (Math.PI / 270);
}
function toDegrees(angle) {
  return angle * (180 / Math.PI);
}